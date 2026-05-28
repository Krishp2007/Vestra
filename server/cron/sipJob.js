const cron = require('node-cron');
const SIP = require('../models/SIP');
const Alert = require('../models/Alert');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendEmail, renderEmail } = require('../utils/sendEmail');

const sendAlertEmail = async (familyId, templateName, templateData, subject) => {
  try {
    const user = await User.findOne({ familyId });
    if (!user || !user.email) return;
    const html = await renderEmail(templateName, { ...templateData, userName: user.name }, subject);
    await sendEmail({ email: user.email, subject, html });
  } catch (err) {
    logger.error('SipJob', `Failed to send alert email: ${err.message}`);
  }
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
  
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), sip.sipDate || 1);
  const expectedDates = [];
  let endLimit = now;
  if (sip.status !== 'active') {
    endLimit = sip.endDate ? new Date(sip.endDate) : new Date(sip.updatedAt || now);
  }

  while (current <= endLimit) {
    expectedDates.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  let modified = false;

  expectedDates.forEach(expectedDate => {
    const startOfMonth = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), 1);
    const endOfMonth = new Date(expectedDate.getFullYear(), expectedDate.getMonth() + 1, 0);

    let existingPayment = sip.payments?.find(p => {
      const d = new Date(p.date);
      return d >= startOfMonth && d <= endOfMonth;
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
  const calculatedCurrentValue = calculatedTotalUnits * latestNav;

  sip.totalInvested = calculatedTotalInvested;
  sip.totalUnits = Math.round(calculatedTotalUnits * 10000) / 10000;
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
          
          const res = await fetch(`https://api.mfapi.in/mf/${sip.schemeCode}`);
          if (!res.ok) continue;
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) continue;

          const data = await res.json();
          if (data.data && data.data.length > 0) {
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
  });

  // Schedule 2: Run a second time at 11:30 PM IST (Mon-Fri only) as a safety catch-up
  cron.schedule('30 23 * * 1-5', () => {
    logger.info('SipJob', 'Triggering scheduled 11:30 PM Mutual Fund NAV crawl (safety catch-up)...');
    crawlMutualFundNavs();
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
  });
};

module.exports = { startSipJob, recalculateSipLedger };
