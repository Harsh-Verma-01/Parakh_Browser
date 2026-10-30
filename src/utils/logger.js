/**
 * Parakh_Browser - Telemetry & Event Logger
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    system: 'Parakh_Browser',
    level,
    message,
    context,
  };
  console.log(JSON.stringify(entry));
}

module.exports = {
  info: (msg, ctx) => log(LOG_LEVELS.INFO, msg, ctx),
  warn: (msg, ctx) => log(LOG_LEVELS.WARN, msg, ctx),
  error: (msg, ctx) => log(LOG_LEVELS.ERROR, msg, ctx),
  debug: (msg, ctx) => log(LOG_LEVELS.DEBUG, msg, ctx),
};
