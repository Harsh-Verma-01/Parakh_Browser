/**
 * Parakh_Browser - Telemetry & Vision Controller
 */

const visionService = require('../services/vision.service');
const { formatSuccess, formatError } = require('../utils/response');
const logger = require('../utils/logger');

async function handleFrameAnalysis(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { image, username, candidateId, questionSetID, examId } = body;

    const activeUser = username || candidateId;
    const activeExam = questionSetID || examId;

    if (!image) {
      return formatError(400, 'Frame image payload is required.');
    }

    const analysis = await visionService.analyzeFrame(
      image,
      activeUser,
      activeExam
    );

    // Format output with backward-compatible telemetry structure for frontend clients
    const formattedTelemetry = [
      {
        TestName: 'Objects of Interest',
        Success: analysis.telemetry[0].success,
        Details: analysis.telemetry[0].details,
      },
      {
        TestName: 'Person Detection',
        Success: analysis.telemetry[1].success,
        Details: analysis.telemetry[1].details,
      },
      {
        TestName: 'Person Recognition',
        Success: analysis.telemetry[2].success,
        Details: analysis.telemetry[2].details,
      },
      {
        TestName: 'Face Detection',
        Success: analysis.telemetry[3].success,
        Details: analysis.telemetry[3].count,
        MoreDetails: analysis.telemetry[3].details,
      },
    ];

    return formatSuccess(200, formattedTelemetry);
  } catch (err) {
    logger.error('Telemetry frame analysis controller error', { error: err.message });
    return formatError(500, 'Telemetry frame analysis failed.', err);
  }
}

module.exports = {
  handleFrameAnalysis,
};
