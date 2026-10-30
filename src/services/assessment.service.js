/**
 * Parakh_Browser - Assessment & Response Delivery Service
 */

const dbService = require('./database.service');
const logger = require('../utils/logger');

class AssessmentService {
  /**
   * Fetch assessment questions for a specific set
   */
  async getQuestions(questionSetId) {
    logger.info('Retrieving assessment questions', { questionSetId });
    const questions = await dbService.getQuestions(questionSetId);
    return questions || [];
  }

  /**
   * Save candidate response to a question
   */
  async recordAnswer(candidateId, questionSetId, questionId, selectedAnswer) {
    logger.debug('Recording candidate answer', {
      candidateId,
      questionSetId,
      questionId,
    });

    await dbService.saveCandidateAnswer(
      candidateId,
      questionSetId,
      questionId,
      selectedAnswer
    );

    return { status: 'recorded' };
  }

  /**
   * Retrieve all saved responses for a session
   */
  async getCandidateAnswers(candidateId, questionSetId) {
    logger.info('Retrieving saved answers', { candidateId, questionSetId });
    const savedAnswers = await dbService.getSavedAnswers(candidateId, questionSetId);
    return savedAnswers || {};
  }
}

module.exports = new AssessmentService();
