/**
 * Parakh_Browser Assessment & Proctoring System
 * Centralized Configuration Management
 */

module.exports = {
  app: {
    name: 'Parakh_Browser',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  },
  aws: {
    region: process.env.AWS_REGION || process.env.REGION || 'us-east-1',
    collectionId: process.env.COLLECTION_ID || 'parakh-candidate-biometrics',
    facesTableName: process.env.FACES_TABLENAME || 'ParakhCandidateFaces',
    evidenceBucket: process.env.EVIDENCE_BUCKET || 'parakh-proctoring-evidence',
    minConfidence: parseFloat(process.env.MIN_CONFIDENCE) || 80.0,
  },
  proctoring: {
    objectsOfInterest: (
      process.env.OBJECTS_OF_INTEREST_LABELS ||
      'Cell Phone,Mobile Phone,Phone,Electronics,Headphones,Book'
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    headPose: {
      yawThresholdDeg: parseFloat(process.env.YAW_THRESHOLD) || 12.0,
      pitchThresholdDeg: parseFloat(process.env.PITCH_THRESHOLD) || 12.0,
    },
    snapshotRetentionDays: 30,
  },
  database: {
    backendUrl: process.env.DATABASE_BACKEND_URL || process.env.FIREBASE_DATABASE_URL || '',
    apiKey: process.env.DATABASE_API_KEY || process.env.firebaseApiKey || '',
  },
};
