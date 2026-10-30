/**
 * Parakh_Browser - Question Bank & Assessment Entrypoint
 */

const assessmentHandler = require('./src/handlers/assessmentHandler');

module.exports = {
  getQuestions: assessmentHandler.getQuestions,
  getQuestionSets: assessmentHandler.getQuestions,
};
