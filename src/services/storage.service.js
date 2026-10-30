/**
 * Parakh_Browser - Evidence & Snapshot Storage Service
 */

const { v4: uuidv4 } = require('uuid');
const { s3 } = require('../config/aws');
const config = require('../config/env');
const logger = require('../utils/logger');

async function persistViolationSnapshot(base64Image, candidateId, examId) {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const fileId = uuidv4();
    const objectKey = `evidence/${examId || 'general'}/${candidateId || 'unknown'}/${fileId}.png`;

    const uploadParams = {
      Bucket: config.aws.evidenceBucket,
      Key: objectKey,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      Metadata: {
        candidateId: String(candidateId || 'unknown'),
        examId: String(examId || 'general'),
        timestamp: new Date().toISOString(),
      },
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    logger.info('Evidence snapshot stored successfully', { key: objectKey });
    return uploadResult.Location || `s3://${config.aws.evidenceBucket}/${objectKey}`;
  } catch (err) {
    logger.error('Failed to store violation snapshot in S3', { error: err.message });
    return null;
  }
}

module.exports = {
  persistViolationSnapshot,
};
