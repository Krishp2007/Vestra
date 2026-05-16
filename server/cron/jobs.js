const cron = require('node-cron');
const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Alert = require('../models/Alert');

// Run daily at 8 AM — check SIP due dates and FD maturity
const startCronJobs = () => {
  // Check SIP due dates every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running SIP due date check...');
    try {
      const today = new Date();
      const dayOfMonth = today.getDate();

      // Find active SIPs where today is the SIP date
      const dueSips = await SIP.find({
        status: 'active',
        sipDate: dayOfMonth
      }).populate('memberId', 'name');

      for (const sip of dueSips) {
        // Check if alert already exists for this month
        const existingAlert = await Alert.findOne({
          'relatedEntity.id': sip._id,
          type: 'sip_due',
          triggerDate: {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1),
            $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
          }
        });

        if (!existingAlert) {
          await Alert.create({
            familyId: sip.familyId,
            memberId: sip.memberId?._id,
            type: 'sip_due',
            title: `SIP Due: ${sip.fundName}`,
            message: `₹${sip.amountPerMonth.toLocaleString('en-IN')} SIP payment is due today for ${sip.memberId?.name || 'Unknown'}`,
            severity: 'warning',
            triggerDate: today,
            relatedEntity: { id: sip._id, type: 'sip' }
          });
        }
      }

      console.log(`✅ Generated alerts for ${dueSips.length} SIPs`);
    } catch (error) {
      console.error('SIP cron error:', error);
    }
  });

  // Check FD maturity dates every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running FD maturity check...');
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Find FDs maturing within 30 days
      const maturingFds = await FD.find({
        status: 'active',
        maturityDate: {
          $gte: today,
          $lte: thirtyDaysFromNow
        }
      }).populate('memberId', 'name');

      for (const fd of maturingFds) {
        const daysLeft = Math.ceil((new Date(fd.maturityDate) - today) / (1000 * 60 * 60 * 24));

        // Only alert at specific intervals: 30, 15, 7, 3, 1, 0 days
        if ([30, 15, 7, 3, 1, 0].includes(daysLeft)) {
          const existingAlert = await Alert.findOne({
            'relatedEntity.id': fd._id,
            type: 'fd_maturity',
            triggerDate: {
              $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
              $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
          });

          if (!existingAlert) {
            const severity = daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'info';
            await Alert.create({
              familyId: fd.familyId,
              memberId: fd.memberId?._id,
              type: 'fd_maturity',
              title: daysLeft === 0
                ? `FD Matured: ${fd.bankName}`
                : `FD Maturing in ${daysLeft} days: ${fd.bankName}`,
              message: `₹${fd.principalAmount.toLocaleString('en-IN')} FD at ${fd.interestRate}% in ${fd.bankName} for ${fd.memberId?.name || 'Unknown'}`,
              severity,
              triggerDate: today,
              relatedEntity: { id: fd._id, type: 'fd' }
            });
          }
        }
      }

      // Auto-update matured FDs
      await FD.updateMany(
        { status: 'active', maturityDate: { $lte: today } },
        { status: 'matured' }
      );

      console.log(`✅ FD maturity check complete`);
    } catch (error) {
      console.error('FD cron error:', error);
    }
  });

  console.log('🕐 Cron jobs scheduled (SIP due dates + FD maturity checks)');
};

module.exports = { startCronJobs };
