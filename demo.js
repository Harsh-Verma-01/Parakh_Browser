/**
 * Parakh_Browser - Telemetry Demonstration & Sandbox Runner
 */

const telemetryHandler = require('./src/handlers/telemetryHandler');

module.exports = {
  handler: telemetryHandler.processProctoringFrame,
  demoHandler: telemetryHandler.processProctoringFrame,
};
