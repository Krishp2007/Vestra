const cron = require('node-cron');
const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Stock = require('../models/Stock');
const Alert = require('../models/Alert');

/**
 * Automatically backfills and recalculates all historical payments, units, 
 * total invested capital, and the current value for a given Mutual Fund SIP.
 * 
 * @param {Object} sip - Mongoose SIP Document
 * @param {Array} navHistory - Array of objects returned from mfapi: [ { date: "DD-MM-YYYY", nav: "NAV" }, ... ]
 */
function recalculateSipLedger(sip, navHistory) {
  if (!navHistory || navHistory.length === 0) return false;

  // Build key-value map for fast NAV lookup (YYYY-MM-DD)
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
  
  // Calculate all scheduled SIP months since startDate
  // We always start from the start month itself to capture the first installment (e.g. March 2026 starts in March)
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), sip.sipDate || 1);

  // Generate expected investment months up to the current date or final inactive limit
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

  // Ensure every expected date has a completed payment record
  expectedDates.forEach(expectedDate => {
    const startOfMonth = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), 1);
    const endOfMonth = new Date(expectedDate.getFullYear(), expectedDate.getMonth() + 1, 0);

    let existingPayment = sip.payments?.find(p => {
      const d = new Date(p.date);
      return d >= startOfMonth && d <= endOfMonth;
    });

    if (!existingPayment) {
      // Find the closest NAV for this date (accounts for weekends/holidays up to 10 days back)
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

      // Fallback to the latest available NAV in series if no historical entry
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
      // Backfill missing NAV or units for manually created/stub records
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

  // Calculate strict aggregates from completed payments
  const completedPayments = sip.payments.filter(p => p.status === 'completed');
  const calculatedTotalInvested = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const calculatedTotalUnits = completedPayments.reduce((sum, p) => sum + (p.units || 0), 0);

  const latestNav = parseFloat(navHistory[0].nav);
  const calculatedCurrentValue = calculatedTotalUnits * latestNav;

  // Save the calculated metrics onto the document
  sip.totalInvested = calculatedTotalInvested;
  sip.totalUnits = Math.round(calculatedTotalUnits * 10000) / 10000;
  sip.currentValue = Math.round(calculatedCurrentValue * 100) / 100;

  return true;
}

const startCronJobs = () => {
  // 1. Update Stock Prices and SIP NAVs every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      // Update Stock Prices
      const stocks = await Stock.find();
      if (stocks.length > 0) {
        const uniqueSymbols = [...new Set(stocks.map(s => s.symbol))];
        for (const symbol of uniqueSymbols) {
          try {
            const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
                if (price) await Stock.updateMany({ symbol }, { currentPrice: price });
              } else {
                console.warn(`[Cron] Yahoo Finance returned non-JSON for ${symbol}: ${contentType}`);
              }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) { console.error(`Error updating price for ${symbol}:`, err.message); }
        }
      }

      // Update SIP NAVs & Recalculate historical units/payments
      const activeSips = await SIP.find({ status: 'active', schemeCode: { $exists: true, $ne: null } });
      for (const sip of activeSips) {
        try {
          if (!sip.schemeCode || sip.schemeCode === 'undefined' || sip.schemeCode === 'null') continue;
          
          const res = await fetch(`https://api.mfapi.in/mf/${sip.schemeCode}`);
          if (!res.ok) {
            console.warn(`[Cron] API request failed for ${sip.fundName} (Code: ${sip.schemeCode}): Status ${res.status}`);
            continue;
          }
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn(`[Cron] Non-JSON response for ${sip.fundName}: ${contentType}`);
            continue;
          }

          const data = await res.json();
          if (data.data && data.data.length > 0) {
            // Recalculate ledger, backfill missing transactions, and update units/currentValue
            recalculateSipLedger(sip, data.data);
            await sip.save();
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) { console.error(`Error updating NAV for ${sip.fundName}:`, err.message); }
      }
      
      console.log(`📈 Auto-refreshed ${stocks.length} Stocks and ${activeSips.length} SIP values`);
    } catch (error) {
      console.error('Automation cron error:', error);
    }
  });

  // 2. Check SIP due dates every day at 8 AM and AUTO-ADD payments
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running SIP automation...');
    try {
      const today = new Date();
      const dayOfMonth = today.getDate();

      const dueSips = await SIP.find({
        status: 'active',
        sipDate: dayOfMonth
      }).populate('memberId', 'name');

      for (const sip of dueSips) {
        // Check if payment already recorded for this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const existingPayment = sip.payments?.find(p => {
          const d = new Date(p.date);
          return d >= startOfMonth && d <= endOfMonth;
        });

        if (!existingPayment) {
          // AUTO-ADD PAYMENT
          sip.payments.push({
            date: today,
            amount: sip.amountPerMonth,
            status: 'completed',
            notes: 'Auto-added by system'
          });
          
          // Update total invested and current value (basic logic)
          sip.totalInvested += sip.amountPerMonth;
          // Note: Current value usually needs NAV, but for now we just increment to show activity
          sip.currentValue = (sip.currentValue || 0) + sip.amountPerMonth;
          
          await sip.save();

          // Also create alert
          await Alert.create({
            familyId: sip.familyId,
            memberId: sip.memberId?._id,
            type: 'sip_due',
            title: `SIP Processed: ${sip.fundName}`,
            message: `₹${sip.amountPerMonth.toLocaleString('en-IN')} auto-invested for ${sip.memberId?.name}`,
            severity: 'info',
            triggerDate: today,
            relatedEntity: { id: sip._id, type: 'sip' }
          });
        }
      }
      console.log(`✅ SIP automation: Processed ${dueSips.length} SIPs`);
    } catch (error) {
      console.error('SIP cron error:', error);
    }
  });

  // 3. Check FD maturity dates and AUTO-RENEW
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running FD automation...');
    try {
      const today = new Date();
      
      // Handle Auto-Renewal
      const maturedFds = await FD.find({
        status: 'active',
        maturityDate: { $lte: today }
      });

      for (const fd of maturedFds) {
        if (fd.isAutoRenew) {
          // Calculate duration of the previous cycle to apply to the next
          const oldStart = new Date(fd.startDate);
          const oldMaturity = new Date(fd.maturityDate);
          const durationMs = oldMaturity.getTime() - oldStart.getTime();
          
          // Renew: Start from old maturity, add same duration
          const newStart = oldMaturity;
          const newMaturity = new Date(newStart.getTime() + durationMs);
          
          // We reinvest the maturity amount as the new principal
          const newPrincipal = fd.maturityAmount || fd.principalAmount;
          
          fd.startDate = newStart;
          fd.maturityDate = newMaturity;
          fd.principalAmount = newPrincipal;
          fd.maturityAmount = undefined; // Force pre-save hook to recalculate with new principal
          fd.status = 'active';
          
          await fd.save();

          await Alert.create({
            familyId: fd.familyId,
            memberId: fd.memberId?._id,
            type: 'fd_maturity',
            title: `FD Auto-Renewed: ${fd.bankName}`,
            message: `FD of ₹${newPrincipal.toLocaleString('en-IN')} has been renewed until ${newMaturity.toLocaleDateString()}`,
            severity: 'success',
            triggerDate: today,
            relatedEntity: { id: fd._id, type: 'fd' }
          });
        } else {
          fd.status = 'matured';
          await fd.save();
        }
      }

      // Pre-maturity Alerts (30 days window)
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const soonMaturing = await FD.find({
        status: 'active',
        maturityDate: { $gt: today, $lte: thirtyDaysFromNow }
      }).populate('memberId', 'name');

      for (const fd of soonMaturing) {
        const daysLeft = Math.ceil((new Date(fd.maturityDate) - today) / (1000 * 60 * 60 * 24));
        if ([30, 15, 7, 3, 1].includes(daysLeft)) {
          await Alert.create({
            familyId: fd.familyId,
            memberId: fd.memberId?._id,
            type: 'fd_maturity',
            title: `FD Maturing in ${daysLeft} days`,
            message: `₹${fd.principalAmount.toLocaleString('en-IN')} FD in ${fd.bankName} is maturing soon.`,
            severity: 'warning',
            triggerDate: today,
            relatedEntity: { id: fd._id, type: 'fd' }
          });
        }
      }
      console.log(`✅ FD automation complete`);
    } catch (error) {
      console.error('FD cron error:', error);
    }
  });

  console.log('🕐 Full Automation Suite Started (Stocks 30s | SIP/FD Daily)');
};

module.exports = { startCronJobs, recalculateSipLedger };
