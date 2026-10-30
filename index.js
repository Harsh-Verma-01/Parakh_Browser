/**
 * Parakh_Browser - Core Serverless Entrypoint
 * Academic Integrity & Intelligent Proctoring Engine
 */

const biometricHandler = require('./src/handlers/biometricHandler');
const telemetryHandler = require('./src/handlers/telemetryHandler');

module.exports = {
  // Biometric enrollment
  indexHandler: biometricHandler.enrollCandidate,
  enrollCandidate: biometricHandler.enrollCandidate,

  // Real-time telemetry & frame proctoring
  processHandler: telemetryHandler.processProctoringFrame,
  handler: telemetryHandler.processProctoringFrame,
  processProctoringFrame: telemetryHandler.processProctoringFrame,
};
