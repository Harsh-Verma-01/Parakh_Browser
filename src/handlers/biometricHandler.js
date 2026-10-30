/**
 * Parakh_Browser - Biometric Lambda Handler
 */

const { handleEnrollment } = require('../controllers/biometric.controller');

exports.enrollCandidate = async (event) => {
  return await handleEnrollment(event);
};

// Aliased export for legacy compatibility
exports.indexHandler = exports.enrollCandidate;
