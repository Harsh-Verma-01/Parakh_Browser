/**
 * Parakh_Browser - Data Persistence Layer
 * Provides unified interface across DynamoDB and optional external REST/Realtime datastore.
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { dynamodb, documentClient } = require('../config/aws');
const config = require('../config/env');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.memoryStore = {
      faces: new Map(),
      sessions: new Map(),
      answers: new Map(),
      incidents: new Map(),
      questions: new Map([
        [
          'set-1',
          [
            {
              id: 'q1',
              title: 'Data Structures & Algorithms',
              question: 'What is the average time complexity of searching in a Balanced Binary Search Tree?',
              options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
              points: 2,
            },
            {
              id: 'q2',
              title: 'Operating Systems',
              question: 'Which of the following scheduling algorithms is non-preemptive?',
              options: ['Round Robin', 'Shortest Job First (Non-preemptive)', 'SRTF', 'Priority (Preemptive)'],
              points: 2,
            },
          ],
        ],
      ]),
    };
  }

  /**
   * Save candidate face index metadata
   */
  async saveFaceMetadata(externalImageId, fullName, metadata = {}) {
    this.memoryStore.faces.set(externalImageId, {
      collectionId: config.aws.collectionId,
      externalImageId,
      fullName,
      createdAt: new Date().toISOString(),
      ...metadata,
    });

    try {
      const params = {
        TableName: config.aws.facesTableName,
        Item: {
          CollectionId: { S: config.aws.collectionId },
          ExternalImageId: { S: externalImageId },
          FullName: { S: fullName },
          CreatedAt: { S: new Date().toISOString() },
        },
      };

      await dynamodb.putItem(params).promise();
      return true;
    } catch (err) {
      if (err.code === 'CredentialsError' || err.message.includes('Missing credentials')) {
        logger.warn('AWS credentials not configured locally, persisting to in-memory store', {
          externalImageId,
        });
        return true;
      }
      logger.error('Error saving face metadata to DynamoDB', { error: err.message });
      throw err;
    }
  }

  /**
   * Retrieve face details by external image ID
   */
  async getFaceMetadata(externalImageId) {
    if (this.memoryStore.faces.has(externalImageId)) {
      return this.memoryStore.faces.get(externalImageId);
    }

    try {
      const params = {
        TableName: config.aws.facesTableName,
        Key: {
          ExternalImageId: { S: externalImageId },
        },
      };

      const result = await dynamodb.getItem(params).promise();
      if (!result.Item) return null;

      return {
        collectionId: result.Item.CollectionId ? result.Item.CollectionId.S : null,
        externalImageId: result.Item.ExternalImageId ? result.Item.ExternalImageId.S : null,
        fullName: result.Item.FullName ? result.Item.FullName.S : 'Unknown Candidate',
      };
    } catch (err) {
      logger.debug('DynamoDB lookup failed, returning memory store fallback', { error: err.message });
      return this.memoryStore.faces.get(externalImageId) || null;
    }
  }

  /**
   * Log proctoring security incident or flagged frame
   */
  async recordSecurityIncident(candidateId, examId, payload) {
    const incidentId = uuidv4();
    const timestamp = new Date().toISOString();

    // If external REST/realtime store is configured
    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/incidents/${examId}/${candidateId}/${incidentId}.json${authParam}`;
        
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incidentId,
            timestamp,
            ...payload,
          }),
        });
        return { success: true, incidentId };
      } catch (err) {
        logger.warn('Failed recording incident to remote store, falling back to local log', { error: err.message });
      }
    }

    logger.info('Proctoring incident registered', {
      incidentId,
      candidateId,
      examId,
      reason: payload.reason,
    });

    return { success: true, incidentId };
  }

  /**
   * Fetch exam session state
   */
  async getCandidateSession(candidateId, examId) {
    const key = `${candidateId}:${examId}`;
    if (this.memoryStore.sessions.has(key)) {
      return this.memoryStore.sessions.get(key);
    }

    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/candidates/${candidateId}/${examId}.json${authParam}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            this.memoryStore.sessions.set(key, data);
            return data;
          }
        }
      } catch (err) {
        logger.warn('Failed fetching candidate session from remote store', { error: err.message });
      }
    }
    return null;
  }

  /**
   * Upsert exam session state
   */
  async updateCandidateSession(candidateId, examId, sessionData) {
    const key = `${candidateId}:${examId}`;
    this.memoryStore.sessions.set(key, sessionData);

    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/candidates/${candidateId}/${examId}.json${authParam}`;
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });
        return true;
      } catch (err) {
        logger.error('Failed updating session in remote store', { error: err.message });
      }
    }
    return true;
  }

  /**
   * Fetch question sets
   */
  async getQuestions(examId) {
    if (this.memoryStore.questions.has(examId)) {
      return this.memoryStore.questions.get(examId);
    }

    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/assessments/${examId}.json${authParam}`;
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        logger.error('Failed fetching questions', { error: err.message });
      }
    }
    // Return default sample question set if not found
    return this.memoryStore.questions.get('set-1') || [];
  }

  /**
   * Save candidate answer
   */
  async saveCandidateAnswer(candidateId, examId, questionId, selectedAnswer) {
    const sessionKey = `${candidateId}:${examId}`;
    if (!this.memoryStore.answers.has(sessionKey)) {
      this.memoryStore.answers.set(sessionKey, {});
    }
    const answers = this.memoryStore.answers.get(sessionKey);
    answers[questionId] = selectedAnswer;

    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/candidates/${candidateId}/${examId}/answers/${questionId}.json${authParam}`;
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedAnswer),
        });
        return true;
      } catch (err) {
        logger.error('Failed saving answer', { error: err.message });
      }
    }
    return true;
  }

  /**
   * Retrieve all saved candidate answers
   */
  async getSavedAnswers(candidateId, examId) {
    const sessionKey = `${candidateId}:${examId}`;
    if (this.memoryStore.answers.has(sessionKey)) {
      return this.memoryStore.answers.get(sessionKey);
    }

    if (config.database.backendUrl) {
      try {
        const authParam = config.database.apiKey ? `?auth=${config.database.apiKey}` : '';
        const url = `${config.database.backendUrl.replace(/\/$/, '')}/candidates/${candidateId}/${examId}/answers.json${authParam}`;
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        logger.error('Failed fetching saved answers', { error: err.message });
      }
    }
    return {};
  }
}

module.exports = new DatabaseService();
