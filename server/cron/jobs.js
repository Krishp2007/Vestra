const cron = require('node-cron');
const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Stock = require('../models/Stock');
const Alert = require('../models/Alert');

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

      // Update SIP NAVs
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
            const nav = parseFloat(data.data[0].nav);
            if (nav && sip.totalUnits) {
              await SIP.findByIdAndUpdate(sip._id, { currentValue: nav * sip.totalUnits });
            }
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

module.exports = { startCronJobs };
