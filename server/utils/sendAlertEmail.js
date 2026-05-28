const User = require('../models/User');
const { sendEmail, renderEmail } = require('./sendEmail');
const logger = require('./logger');

/**
 * Shared helper: send a templated email to the user who owns a given familyId.
 * Used by all background cron jobs (stocks, SIP, FD, insights).
 */
const sendAlertEmail = async (familyId, templateName, templateData, subject) => {
  try {
    const user = await User.findOne({ familyId });
    if (!user || !user.email) return;
    const html = await renderEmail(templateName, { ...templateData, userName: user.name }, subject);
    await sendEmail({ email: user.email, subject, html });
  } catch (err) {
    logger.error('EmailHelper', `Failed to send ${templateName} alert: ${err.message}`);
  }
};

module.exports = { sendAlertEmail };
