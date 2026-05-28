const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'cron.log');

// Ensure log directory exists synchronously once at boot time
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * High-performance, non-blocking asynchronous logger.
 * Dispatches file appending tasks directly to Node's internal background thread pool (libuv),
 * completely freeing up Node's main single-thread to handle Express API requests with zero lag!
 * 
 * @param {string} level - INFO, WARN, or ERROR
 * @param {string} jobName - e.g. StocksJob, SipJob
 * @param {string} message - Descriptive log message
 */
const writeLog = (level, jobName, message) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logRow = `[${timestamp}] [${level}] [${jobName}] ${message}\n`;
  
  // Instant console prints
  if (level === 'ERROR') {
    console.error(logRow.trim());
  } else {
    console.log(logRow.trim());
  }

  // Non-blocking background file write (uses background thread pool, zero lag on main thread)
  fs.appendFile(logFile, logRow, 'utf8', (err) => {
    if (err) {
      console.error('[Logger] Failed to write to cron.log:', err.message);
    }
  });
};

module.exports = {
  info: (jobName, message) => writeLog('INFO', jobName, message),
  warn: (jobName, message) => writeLog('WARN', jobName, message),
  error: (jobName, message) => writeLog('ERROR', jobName, message)
};
