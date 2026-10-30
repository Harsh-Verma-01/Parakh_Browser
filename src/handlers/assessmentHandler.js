/**
 * Parakh_Browser - Assessment & Answers Lambda Handler
 */

const {
  handleGetQuestions,
  handleSaveAnswer,
  handleGetSavedAnswers,
} = require('../controllers/assessment.controller');

exports.getQuestions = async (event) => {
  return await handleGetQuestions(event);
};

exports.updateAnswer = async (event) => {
  return await handleSaveAnswer(event);
};

exports.getSavedAnswers = async (event) => {
  return await handleGetSavedAnswers(event);
};
