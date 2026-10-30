/**
 * Parakh_Browser - Candidate Exam Session Manager
 */

const dbService = require('./database.service');
const logger = require('../utils/logger');

class SessionService {
  /**
   * Start or resume exam session for candidate
   */
  async initializeSession(candidateId, examId) {
    logger.info('Initializing candidate session', { candidateId, examId });

    let existingSession = await dbService.getCandidateSession(candidateId, examId);
    let sessionStartedAt = Date.now();

    let sessionPayload;
    if (existingSession) {
      sessionStartedAt = existingSession.startedAt || sessionStartedAt;
      sessionPayload = {
        ...existingSession,
        loginCount: (existingSession.loginCount || 1) + 1,
        lastActiveAt: Date.now(),
        examState: 1, // 1: In Progress
      };
    } else {
      sessionPayload = {
        candidateId,
        examId,
        examState: 1,
        isDisqualified: false,
        startedAt: sessionStartedAt,
        loginCount: 1,
        lastActiveAt: sessionStartedAt,
        violationsCount: 0,
      };
    }

    await dbService.updateCandidateSession(candidateId, examId, sessionPayload);

    return {
      startedAt: sessionStartedAt,
      loginCount: sessionPayload.loginCount,
    };
  }

  /**
   * Conclude candidate exam session
   */
  async terminateSession(candidateId, examId) {
    logger.info('Terminating candidate session', { candidateId, examId });

    let existingSession = (await dbService.getCandidateSession(candidateId, examId)) || {};
    const updated = {
      ...existingSession,
      endedAt: Date.now(),
      examState: 0, // 0: Completed / Closed
    };

    await dbService.updateCandidateSession(candidateId, examId, updated);
    return { status: 'completed' };
  }

  /**
   * Check disqualification and session status
   */
  async evaluateSessionIntegrity(candidateId, examId, timeRemaining) {
    const session = await dbService.getCandidateSession(candidateId, examId);

    if (session) {
      if (timeRemaining !== undefined) {
        session.timeRemaining = timeRemaining;
        session.lastHeartbeatAt = Date.now();
        await dbService.updateCandidateSession(candidateId, examId, session);
      }
      return {
        isDisqualified: Boolean(session.isDisqualified),
        examState: session.examState,
      };
    }

    return {
      isDisqualified: false,
      examState: 0,
    };
  }
}

module.exports = new SessionService();
