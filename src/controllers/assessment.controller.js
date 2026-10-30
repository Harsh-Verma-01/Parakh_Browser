/**
 * Parakh_Browser - Assessment Controller
 */

const assessmentService = require('../services/assessment.service');
const { formatSuccess, formatError } = require('../utils/response');
const logger = require('../utils/logger');

async function handleGetQuestions(event) {
  try {
    const queryParams = event.queryStringParameters || {};
    const questionSetId = queryParams.qSetID || queryParams.examId;

    if (!questionSetId) {
      return formatError(400, 'qSetID parameter is required.');
    }

    const questions = await assessmentService.getQuestions(questionSetId);
    return formatSuccess(200, { questions });
  } catch (err) {
    logger.error('Get questions error', { error: err.message });
    return formatError(500, 'Failed to retrieve assessment questions.', err);
  }
}

async function handleSaveAnswer(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const candidateId = body.username || body.candidateId;
    const questionSetId = body.qSetID || body.examId;
    const questionId = body.qID || body.questionId;
    const selectedAnswer = body.selectedAnswer;

    if (!candidateId || !questionSetId || !questionId) {
      return formatError(400, 'Missing required fields for saving answer.');
    }

    await assessmentService.recordAnswer(
      candidateId,
      questionSetId,
      questionId,
      selectedAnswer
    );

    return formatSuccess(200, { status: 'recorded' });
  } catch (err) {
    logger.error('Save answer error', { error: err.message });
    return formatError(500, 'Failed to save answer.', err);
  }
}

async function handleGetSavedAnswers(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const candidateId = body.username || body.candidateId;
    const questionSetId = body.qSetID || body.examId;

    if (!candidateId || !questionSetId) {
      return formatError(400, 'Missing candidate or question set identifier.');
    }

    const savedAnswers = await assessmentService.getCandidateAnswers(
      candidateId,
      questionSetId
    );

    return formatSuccess(200, { savedAnswers });
  } catch (err) {
    logger.error('Get saved answers error', { error: err.message });
    return formatError(500, 'Failed to fetch saved answers.', err);
  }
}

module.exports = {
  handleGetQuestions,
  handleSaveAnswer,
  handleGetSavedAnswers,
};
