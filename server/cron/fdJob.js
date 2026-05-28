const cron = require('node-cron');
const FD = require('../models/FD');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { sendAlertEmail } = require('../utils/sendAlertEmail');

const startFdJob = () => {
  cron.schedule('5 8 * * *', async () => {
    logger.info('FdJob', 'Checking daily Fixed Deposit maturity timelines...');
    try {
      const today = new Date();
      
      // Handle Auto-Renewal
      const maturedFds = await FD.find({
        status: 'active',
        maturityDate: { $lte: today }
      }).populate('memberId', 'name');

      let renewalCount = 0;
      let manualMaturityCount = 0;

      for (const fd of maturedFds) {
        if (fd.isAutoRenew) {
          const oldStart = new Date(fd.startDate);
          const oldMaturity = new Date(fd.maturityDate);
          const durationMs = oldMaturity.getTime() - oldStart.getTime();
          
          const newStart = oldMaturity;
          const newMaturity = new Date(newStart.getTime() + durationMs);
          const newPrincipal = fd.maturityAmount || fd.principalAmount;
          
          fd.startDate = newStart;
          fd.maturityDate = newMaturity;
          fd.principalAmount = newPrincipal;
          fd.maturityAmount = undefined; // Force recalculation in pre-save hook
          fd.status = 'active';
          
          await fd.save();
          renewalCount++;

          await Alert.create({
            familyId: fd.familyId, memberId: fd.memberId?._id,
            type: 'fd_maturity', title: `FD Auto-Renewed: ${fd.bankName}`,
            message: `FD of ₹${newPrincipal.toLocaleString('en-IN')} has been renewed until ${newMaturity.toLocaleDateString()}`,
            severity: 'success', relatedEntity: { id: fd._id, type: 'fd' }
          });

          sendAlertEmail(fd.familyId, 'fdAutoRenewed', {
            bankName: fd.bankName, newPrincipal: newPrincipal.toLocaleString('en-IN'),
            interestRate: fd.interestRate, newMaturityDate: newMaturity.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          }, `🏦 FD Auto-Renewed: ${fd.bankName} — Vestra Vault`);

          logger.info('FdJob', `FD Auto-Renewed: ${fd.bankName} for ${fd.memberId?.name} (New Principal: ₹${newPrincipal})`);
        } else {
          fd.status = 'matured';
          await fd.save();
          manualMaturityCount++;

          // Create platform Alert for manual maturity
          await Alert.create({
            familyId: fd.familyId, memberId: fd.memberId?._id,
            type: 'fd_maturity', title: `🏦 FD Matured: ${fd.bankName}`,
            message: `Your FD of ₹${fd.principalAmount.toLocaleString('en-IN')} in ${fd.bankName} has reached maturity!`,
            severity: 'success', relatedEntity: { id: fd._id, type: 'fd' }
          });

          // Dispatch manual maturity notification email
          sendAlertEmail(fd.familyId, 'fdMatured', {
            bankName: fd.bankName,
            principalAmount: fd.principalAmount.toLocaleString('en-IN'),
            maturityAmount: (fd.maturityAmount || fd.principalAmount).toLocaleString('en-IN'),
            interestRate: fd.interestRate,
            maturityDate: new Date(fd.maturityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            memberName: fd.memberId?.name || ''
          }, `🏦 FD Matured: ${fd.bankName} — Vestra Vault`);
          
          logger.info('FdJob', `FD marked as matured manually and user notified: ${fd.bankName} for ${fd.memberId?.name}`);
        }
      }

      // Pre-maturity Alerts (30 days window)
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const soonMaturing = await FD.find({
        status: 'active',
        maturityDate: { $gt: today, $lte: thirtyDaysFromNow }
      }).populate('memberId', 'name');

      let alertsSent = 0;
      for (const fd of soonMaturing) {
        const daysLeft = Math.ceil((new Date(fd.maturityDate) - today) / (1000 * 60 * 60 * 24));
        if ([30, 15, 7, 3, 1].includes(daysLeft)) {
          await Alert.create({
            familyId: fd.familyId, memberId: fd.memberId?._id,
            type: 'fd_maturity', title: `FD Maturing in ${daysLeft} days`,
            message: `₹${fd.principalAmount.toLocaleString('en-IN')} FD in ${fd.bankName} is maturing soon.`,
            severity: 'warning', relatedEntity: { id: fd._id, type: 'fd' }
          });
          
          sendAlertEmail(fd.familyId, 'fdMaturingSoon', {
            bankName: fd.bankName, daysLeft,
            principal: fd.principalAmount.toLocaleString('en-IN'), interestRate: fd.interestRate,
            maturityDate: new Date(fd.maturityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            maturityAmount: (fd.maturityAmount || fd.principalAmount).toLocaleString('en-IN'),
            memberName: fd.memberId?.name || '', isAutoRenew: fd.isAutoRenew
          }, `⏰ FD Maturing in ${daysLeft} Days — Vestra Vault`);
          
          logger.info('FdJob', `Fired pre-maturity alert for ${fd.bankName} (${daysLeft} days left)`);
          alertsSent++;
        }
      }
      
      logger.info('FdJob', `Fixed Deposit sweep completed. Renewals: ${renewalCount}, Manual maturities: ${manualMaturityCount}, Alerts sent: ${alertsSent}.`);
    } catch (error) {
      logger.error('FdJob', `Error during daily FD check: ${error.message}`);
    }
  });
};

module.exports = { startFdJob };
