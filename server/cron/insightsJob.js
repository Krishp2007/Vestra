const cron = require('node-cron');
const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Stock = require('../models/Stock');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const logger = require('../utils/logger');
const { generateInsights } = require('../utils/portfolioInsights');
const { sendEmail, renderEmail } = require('../utils/sendEmail');

const startInsightsJob = () => {
  cron.schedule('0 9 */15 * *', async () => {
    logger.info('InsightsJob', 'Initiating automated 15-day portfolio wealth insights dispatch...');
    try {
      const users = await User.find();
      let sentCount = 0;

      for (const user of users) {
        const familyId = user.familyId;
        if (!familyId) continue;

        const [sips, fds, stocks, members] = await Promise.all([
          SIP.find({ familyId }),
          FD.find({ familyId }),
          Stock.find({ familyId }),
          FamilyMember.find({ familyId, isActive: true })
        ]);

        const insightsList = generateInsights({ sips, fds, stocks, members });

        if (insightsList.length > 0) {
          const html = await renderEmail('portfolioInsights', {
            userName: user.name,
            insights: insightsList
          }, 'Vestra Vault — Your 15-Day Wealth Insights Digest 💡');

          await sendEmail({
            email: user.email,
            subject: 'Vestra Vault — Your 15-Day Wealth Insights Digest 💡',
            html
          });
          logger.info('InsightsJob', `Automated 15-day insights email dispatched successfully to ${user.email}`);
          sentCount++;
        }
      }
      logger.info('InsightsJob', `Insights dispatch complete. Total digests sent: ${sentCount}.`);
    } catch (error) {
      logger.error('InsightsJob', `Automated insights dispatch failed: ${error.message}`);
    }
  });
};

module.exports = { startInsightsJob };
