/**
 * Parakh_Browser - Session Lifecycle Lambda Handler
 */

const {
  handleStartSession,
  handleEndSession,
  handleCheckIntegrity,
} = require('../controllers/session.controller');

exports.startSession = async (event) => {
  return await handleStartSession(event);
};

exports.endSession = async (event) => {
  return await handleEndSession(event);
};

exports.checkSessionState = async (event) => {
  return await handleCheckIntegrity(event);
};

// Aliased exports for backward compatibility
exports.startExamHandler = exports.startSession;
exports.endExamHandler = exports.endSession;
exports.checkIsDisqualified = exports.checkSessionState;
