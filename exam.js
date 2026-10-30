/**
 * Parakh_Browser - Exam Session Entrypoint
 */

const sessionHandler = require('./src/handlers/sessionHandler');

module.exports = {
  startExamHandler: sessionHandler.startSession,
  endExamHandler: sessionHandler.endSession,
  checkIsDisqualified: sessionHandler.checkSessionState,

  startSession: sessionHandler.startSession,
  endSession: sessionHandler.endSession,
  checkSessionState: sessionHandler.checkSessionState,
};
