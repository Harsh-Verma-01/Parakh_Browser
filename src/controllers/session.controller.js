/**
 * Parakh_Browser - Session Controller
 */

const sessionService = require('../services/session.service');
const { formatSuccess, formatError } = require('../utils/response');
const logger = require('../utils/logger');

async function handleStartSession(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const candidateId = body.username || body.candidateId;
    const examId = body.questionSetID || body.examId;

    if (!candidateId || !examId) {
      return formatError(400, 'Candidate ID and Exam ID are required.');
    }

    const sessionInfo = await sessionService.initializeSession(candidateId, examId);
    return formatSuccess(200, {
      startedAt: sessionInfo.startedAt,
      loginCount: sessionInfo.loginCount,
      status: 'active',
    });
  } catch (err) {
    logger.error('Start session error', { error: err.message });
    return formatError(500, 'Failed to initialize exam session.', err);
  }
}

async function handleEndSession(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const candidateId = body.username || body.candidateId;
    const examId = body.questionSetID || body.examId;

    if (!candidateId || !examId) {
      return formatError(400, 'Candidate ID and Exam ID are required.');
    }

    const result = await sessionService.terminateSession(candidateId, examId);
    return formatSuccess(200, result);
  } catch (err) {
    logger.error('End session error', { error: err.message });
    return formatError(500, 'Failed to conclude exam session.', err);
  }
}

async function handleCheckIntegrity(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const candidateId = body.username || body.candidateId;
    const examId = body.questionSetID || body.examId;
    const timeRemaining = body.timeRemaining;

    if (!candidateId || !examId) {
      return formatError(400, 'Candidate ID and Exam ID are required.');
    }

    const state = await sessionService.evaluateSessionIntegrity(
      candidateId,
      examId,
      timeRemaining
    );

    return formatSuccess(200, {
      isDisqualified: state.isDisqualified,
      examState: state.examState,
    });
  } catch (err) {
    logger.error('Integrity check error', { error: err.message });
    return formatError(500, 'Failed to evaluate session integrity.', err);
  }
}

module.exports = {
  handleStartSession,
  handleEndSession,
  handleCheckIntegrity,
};
