/**
 * Parakh_Browser - Local Development & Standalone Server
 * Exposes all Serverless Handlers as HTTP REST Endpoints
 */

const http = require('http');
const biometricHandler = require('./src/handlers/biometricHandler');
const telemetryHandler = require('./src/handlers/telemetryHandler');
const sessionHandler = require('./src/handlers/sessionHandler');
const assessmentHandler = require('./src/handlers/assessmentHandler');
const { defaultHeaders } = require('./src/utils/response');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 8000;

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = reqUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const queryParams = Object.fromEntries(reqUrl.searchParams.entries());

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, defaultHeaders);
    res.end();
    return;
  }

  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await parseJsonBody(req) : {};
  const event = {
    httpMethod: method,
    path: pathname,
    queryStringParameters: queryParams,
    body: JSON.stringify(body),
    headers: req.headers,
  };

  try {
    let result = null;

    // Health Check
    if (pathname === '/health' && method === 'GET') {
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({
          status: 'healthy',
          system: 'Parakh_Browser',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        }),
      };
    }
    // Biometrics Enrollment
    else if ((pathname === '/faces/index' || pathname === '/api/biometrics/enroll') && method === 'POST') {
      result = await biometricHandler.enrollCandidate(event);
    }
    // Telemetry & Vision Processing
    else if ((pathname === '/process' || pathname === '/api/telemetry/frame') && method === 'POST') {
      result = await telemetryHandler.processProctoringFrame(event);
    }
    // Session Lifecycle
    else if ((pathname === '/exam/start' || pathname === '/api/session/start') && method === 'POST') {
      result = await sessionHandler.startSession(event);
    } else if ((pathname === '/exam/end' || pathname === '/api/session/end') && method === 'POST') {
      result = await sessionHandler.endSession(event);
    } else if ((pathname === '/exam/status' || pathname === '/api/session/status') && method === 'POST') {
      result = await sessionHandler.checkSessionState(event);
    }
    // Assessment & Questions
    else if ((pathname === '/questions' || pathname === '/api/questions') && method === 'GET') {
      result = await assessmentHandler.getQuestions(event);
    } else if ((pathname === '/answers' || pathname === '/api/answers') && method === 'POST') {
      result = await assessmentHandler.updateAnswer(event);
    } else if ((pathname === '/answers/saved' || pathname === '/api/answers/saved') && method === 'POST') {
      result = await assessmentHandler.getSavedAnswers(event);
    } else {
      result = {
        statusCode: 404,
        headers: defaultHeaders,
        body: JSON.stringify({
          error: 'Endpoint Not Found',
          path: pathname,
          system: 'Parakh_Browser',
        }),
      };
    }

    res.writeHead(result.statusCode || 200, result.headers || defaultHeaders);
    res.end(result.body || '');
  } catch (err) {
    logger.error('Unhandled server exception', { error: err.message, stack: err.stack });
    res.writeHead(500, defaultHeaders);
    res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Parakh_Browser Server active at http://127.0.0.1:${PORT}`);
  console.log(`\n========================================================`);
  console.log(`🛡️  Parakh_Browser Server Online`);
  console.log(`📍 Endpoint: http://127.0.0.1:${PORT}`);
  console.log(`💡 Health Check: http://127.0.0.1:${PORT}/health`);
  console.log(`========================================================\n`);
});

module.exports = server;
