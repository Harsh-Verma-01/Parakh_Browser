/**
 * Parakh_Browser - AWS Services Client Initializer
 */

const AWS = require('aws-sdk');
const config = require('./env');

const rekognition = new AWS.Rekognition({ region: config.aws.region });
const dynamodb = new AWS.DynamoDB({ region: config.aws.region });
const documentClient = new AWS.DynamoDB.DocumentClient({ region: config.aws.region });
const s3 = new AWS.S3({ region: config.aws.region });

module.exports = {
  AWS,
  rekognition,
  dynamodb,
  documentClient,
  s3,
};
