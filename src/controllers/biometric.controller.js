/**
 * Parakh_Browser - Biometric Controller
 */

const visionService = require('../services/vision.service');
const { formatSuccess, formatError } = require('../utils/response');
const logger = require('../utils/logger');

async function handleEnrollment(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { image, fullName, candidateId } = body;

    if (!image || !fullName) {
      return formatError(400, 'Image and fullName parameters are required.');
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Buffer.from(cleanBase64, 'base64');

    const enrollmentResult = await visionService.indexCandidateBiometrics(
      imageBytes,
      fullName
    );

    return formatSuccess(200, {
      success: true,
      ExternalImageId: enrollmentResult.externalImageId,
      candidateId: candidateId || enrollmentResult.externalImageId,
      message: 'Candidate biometrics enrolled successfully in Parakh_Browser collection.',
    });
  } catch (err) {
    logger.error('Candidate enrollment controller error', { error: err.message });
    return formatError(500, 'Candidate enrollment failed.', err);
  }
}

module.exports = {
  handleEnrollment,
};
