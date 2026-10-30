/**
 * Parakh_Browser - Candidate Response Handler
 */

const assessmentHandler = require('./src/handlers/assessmentHandler');

module.exports = {
  updateAnswer: assessmentHandler.updateAnswer,
  getSavedAnswers: assessmentHandler.getSavedAnswers,
};
