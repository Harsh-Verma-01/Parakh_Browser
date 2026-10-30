/**
 * Parakh_Browser - Telemetry & Vision Lambda Handler
 */

const { handleFrameAnalysis } = require('../controllers/telemetry.controller');

exports.processProctoringFrame = async (event) => {
  return await handleFrameAnalysis(event);
};

// Aliased exports for legacy compatibility
exports.processHandler = exports.processProctoringFrame;
exports.handler = exports.processProctoringFrame;
