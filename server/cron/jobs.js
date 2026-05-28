const { startStocksJob } = require('./stocksJob');
const { startSipJob, recalculateSipLedger } = require('./sipJob');
const { startFdJob } = require('./fdJob');
const { startInsightsJob } = require('./insightsJob');

/**
 * Initializes and starts all background cron automation tasks in isolated threads.
 * Keeps system responsive by decoupling different schedules into clean, modular jobs.
 */
const startCronJobs = () => {
  try {
    startStocksJob();
    startSipJob();
    startFdJob();
    startInsightsJob();
    console.log('🕐 Full Automation Suite Started (Stocks 30s | SIP Daily | FD Daily | Insights 15-Day)');
  } catch (err) {
    console.error('Failed to initialize the automation suite:', err);
  }
};

module.exports = { startCronJobs, recalculateSipLedger };
