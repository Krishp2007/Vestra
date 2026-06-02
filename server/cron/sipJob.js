const cron = require('node-cron');
const https = require('https');
const SIP = require('../models/SIP');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { sendAlertEmail } = require('../utils/sendAlertEmail');

// Robust native helper to bypass native fetch/undici DNS bugs on local machines
const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

function recalculateSipLedger(sip, navHistory) {
  if (!navHistory || navHistory.length === 0) return false;

  const lookup = {};
  navHistory.forEach(item => {
    const parts = item.date.split('-');
    if (parts.length === 3) {
      const key = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      lookup[key] = parseFloat(item.nav);
    }
  });

  const startDate = new Date(sip.startDate);
  const now = new Date();
  const expectedDates = [];

  // 1. If start date is on a different day than sipDate, count it as the first payment (e.g. initial activation purchase)
  if (startDate.getDate() !== sip.sipDate) {
    expectedDates.push(new Date(startDate));
  }

  // 2. Add regular monthly schedules starting from the start month's sipDate
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), sip.sipDate || 1);
  let endLimit = now;
  if (sip.status !== 'active') {
    endLimit = sip.endDate ? new Date(sip.endDate) : new Date(sip.updatedAt || now);
  }

  while (current <= endLimit) {
    // Avoid duplicate check if start date aligns exactly
    if (current.getTime() !== startDate.getTime()) {
      expectedDates.push(new Date(current));
    }
    current.setMonth(current.getMonth() + 1);
  }

  let modified = false;

  // 3. Smart Mandate Setup Delay Detection:
  // If the user manually specified a non-zero totalInvested, we calculate the max payments they actually made.
  // If expectedDates is larger than this limit and contains both the startDate and the first month's regular sipDate,
  // it means the regular payment in the first month was skipped due to mandate setup delay. We remove it!
  if (sip.totalInvested && sip.totalInvested > 0 && sip.amountPerMonth > 0) {
    const maxAllowedPayments = Math.round(sip.totalInvested / sip.amountPerMonth);
    if (expectedDates.length > maxAllowedPayments) {
      if (expectedDates.length >= 2 && expectedDates[0].getTime() === startDate.getTime()) {
        const regularFirstMonthDate = expectedDates[1];
        expectedDates.splice(1, 1); // Prune July 25th from expected schedules

        // Also proactively prune any existing transaction in sip.payments that falls on this month's regular date
        if (sip.payments) {
          const startOfPruneMonth = new Date(regularFirstMonthDate.getFullYear(), regularFirstMonthDate.getMonth(), 1);
          const endOfPruneMonth = new Date(regularFirstMonthDate.getFullYear(), regularFirstMonthDate.getMonth() + 1, 0);
          
          sip.payments = sip.payments.filter(p => {
            const d = new Date(p.date);
            if (d >= startOfPruneMonth && d <= endOfPruneMonth) {
              const diffTime = Math.abs(d.getTime() - startDate.getTime());
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              if (diffDays > 5) {
                modified = true;
                return false; // Prune skipped July 25th regular payment
              }
            }
            return true;
          });
        }
      }
    }
  }

  expectedDates.forEach(expectedDate => {
    let existingPayment = sip.payments?.find(p => {
      const d = new Date(p.date);
      const diffTime = Math.abs(d.getTime() - expectedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    });

    if (!existingPayment) {
      let closestNav = null;
      let checkDate = new Date(expectedDate);

      for (let offset = 0; offset < 10; offset++) {
        const yyyy = checkDate.getFullYear();
        const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
        const dd = String(checkDate.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;

        if (lookup[key]) {
          closestNav = lookup[key];
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }

      if (!closestNav && navHistory.length > 0) {
        closestNav = parseFloat(navHistory[0].nav);
      }

      if (closestNav) {
        const units = sip.amountPerMonth / closestNav;
        sip.payments.push({
          date: expectedDate,
          amount: sip.amountPerMonth,
          nav: closestNav,
          units: units,
          status: 'completed',
          notes: 'Auto-recalculated historical transaction'
        });
        modified = true;
      }
    } else {
      if (!existingPayment.nav || !existingPayment.units) {
        let closestNav = null;
        let checkDate = new Date(existingPayment.date);

        for (let offset = 0; offset < 10; offset++) {
          const yyyy = checkDate.getFullYear();
          const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
          const dd = String(checkDate.getDate()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;

          if (lookup[key]) {
            closestNav = lookup[key];
            break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }

        if (!closestNav && navHistory.length > 0) {
          closestNav = parseFloat(navHistory[0].nav);
        }

        if (closestNav) {
          existingPayment.nav = closestNav;
          existingPayment.units = existingPayment.amount / closestNav;
          existingPayment.status = 'completed';
          modified = true;
        }
      }
    }
  });

  const completedPayments = sip.payments.filter(p => p.status === 'completed');
  const calculatedTotalInvested = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const calculatedTotalUnits = completedPayments.reduce((sum, p) => sum + (p.units || 0), 0);

  const latestNav = parseFloat(navHistory[0].nav);

  // PRESERVE user manual inputs if they explicitly typed non-zero totalInvested/totalUnits.
  // Otherwise, default to the calculated ledger sums.
  if (!sip.totalInvested || sip.totalInvested === 0) {
    sip.totalInvested = calculatedTotalInvested;
  }
  if (!sip.totalUnits || sip.totalUnits === 0) {
    sip.totalUnits = Math.round(calculatedTotalUnits * 10000) / 10000;
  }

  // Value is ALWAYS calculated from the active units
  const calculatedCurrentValue = sip.totalUnits * latestNav;
  sip.currentValue = Math.round(calculatedCurrentValue * 100) / 100;

  return true;
}

const startSipJob = () => {
  // Reusable core crawler task for Mutual Fund NAVs
  const crawlMutualFundNavs = async () => {
    logger.info('SipJob', 'Initiating active mutual fund NAV crawler...');
    try {
      const activeSips = await SIP.find({ status: 'active', schemeCode: { $exists: true, $ne: null } });
      let updatedCount = 0;

      for (const sip of activeSips) {
        try {
          if (!sip.schemeCode || sip.schemeCode === 'undefined' || sip.schemeCode === 'null') continue;
          
          const data = await httpsGet(`https://api.mfapi.in/mf/${sip.schemeCode}`);
          if (data && data.data && data.data.length > 0) {
            recalculateSipLedger(sip, data.data);
            await sip.save();
            updatedCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) { 
          logger.error('SipJob', `Error updating NAV for ${sip.fundName}: ${err.message}`); 
        }
      }
      
      logger.info('SipJob', `Completed NAV crawl. Recalculated ${updatedCount}/${activeSips.length} active SIP ledgers.`);
    } catch (error) {
      logger.error('SipJob', `NAV Cron automation failed: ${error.message}`);
    }
  };

  // Schedule 1: Run once a day at 10:00 PM IST (Mon-Fri only)
  cron.schedule('0 22 * * 1-5', () => {
    logger.info('SipJob', 'Triggering scheduled 10:00 PM Mutual Fund NAV crawl...');
    crawlMutualFundNavs();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // Schedule 2: Run a second time at 11:30 PM IST (Mon-Fri only) as a safety catch-up
  cron.schedule('30 23 * * 1-5', () => {
    logger.info('SipJob', 'Triggering scheduled 11:30 PM Mutual Fund NAV crawl (safety catch-up)...');
    crawlMutualFundNavs();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // B. Process daily due dates at 10:30 AM IST (Mon-Fri only) with weekend rollover logic
  cron.schedule('30 10 * * 1-5', async () => {
    logger.info('SipJob', 'Checking weekday SIP schedules and processing payouts with weekend rollover checks...');
    try {
      const today = new Date();
      const targetDates = [today.getDate()]; // Always check today's date

      // If today is Monday (getDay() === 1), roll over scheduled dates for Saturday (today - 2) and Sunday (today - 1)
      if (today.getDay() === 1) {
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - 1);
        const saturday = new Date(today);
        saturday.setDate(today.getDate() - 2);

        targetDates.push(sunday.getDate());
        targetDates.push(saturday.getDate());
        logger.info('SipJob', `Monday Rollover Active: sweeping scheduled calendar dates [${targetDates.join(', ')}]`);
      }

      const dueSips = await SIP.find({
        status: 'active',
        sipDate: { $in: targetDates }
      }).populate('memberId', 'name');

      let processedCount = 0;

      for (const sip of dueSips) {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const existingPayment = sip.payments?.find(p => {
          const d = new Date(p.date);
          return d >= startOfMonth && d <= endOfMonth;
        });

        if (!existingPayment) {
          sip.payments.push({
            date: today,
            amount: sip.amountPerMonth,
            status: 'completed',
            notes: 'Auto-added by system'
          });
          
          sip.totalInvested += sip.amountPerMonth;
          sip.currentValue = (sip.currentValue || 0) + sip.amountPerMonth;
          await sip.save();

          await Alert.create({
            familyId: sip.familyId, memberId: sip.memberId?._id,
            type: 'sip_due', title: `SIP Processed: ${sip.fundName}`,
            message: `₹${sip.amountPerMonth.toLocaleString('en-IN')} auto-invested for ${sip.memberId?.name}`,
            severity: 'info', relatedEntity: { id: sip._id, type: 'sip' }
          });

          sendAlertEmail(sip.familyId, 'sipProcessed', {
            fundName: sip.fundName, amount: sip.amountPerMonth.toLocaleString('en-IN'),
            sipDate: sip.sipDate, memberName: sip.memberId?.name || ''
          }, `📈 SIP Auto-Processed: ${sip.fundName} — Vestra Vault`);

          logger.info('SipJob', `Auto-processed monthly installment for ${sip.fundName} (₹${sip.amountPerMonth})`);
          processedCount++;
        }
      }
      logger.info('SipJob', `SIP due date sweep complete. Processed ${processedCount} transactions.`);
    } catch (error) {
      logger.error('SipJob', `Error during daily SIP check: ${error.message}`);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
};

module.exports = { startSipJob, recalculateSipLedger };
