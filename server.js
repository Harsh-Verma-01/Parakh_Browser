/**
 * Parakh_Browser - Local Development & Standalone Server
 * Exposes all Serverless Handlers as HTTP REST Endpoints & Serves Browser Web Portal
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const biometricHandler = require('./src/handlers/biometricHandler');
const telemetryHandler = require('./src/handlers/telemetryHandler');
const sessionHandler = require('./src/handlers/sessionHandler');
const assessmentHandler = require('./src/handlers/assessmentHandler');
const { defaultHeaders } = require('./src/utils/response');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

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

function serveStaticFile(res, relativePath) {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, defaultHeaders);
    res.end('Access Denied');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, defaultHeaders);
      res.end('File Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';
    res.writeHead(200, {
      ...defaultHeaders,
      'Content-Type': contentType,
    });
    res.end(content);
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

  // Static File Routes
  if (method === 'GET') {
    if (pathname === '/') {
      return serveStaticFile(res, 'index.html');
    }
    if (pathname === '/examiner') {
      return serveStaticFile(res, 'examiner.html');
    }
    if (pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
      return serveStaticFile(res, pathname.slice(1));
    }
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
          version: '2.0.0',
          portal: `http://127.0.0.1:${PORT}`,
          examiner: `http://127.0.0.1:${PORT}/examiner`,
          timestamp: new Date().toISOString(),
        }),
      };
    }
    // Authentication OTP
    else if (pathname === '/api/auth/otp/send' && method === 'POST') {
      const email = body.email || 'candidate@example.edu';
      const devOtp = require('./src/services/database.service').generateOtp(email);
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({ success: true, message: 'OTP sent to email', devOtp }),
      };
    } else if (pathname === '/api/auth/otp/verify' && method === 'POST') {
      const { email, code } = body;
      const isValid = require('./src/services/database.service').verifyOtp(email || '', code || '');
      result = {
        statusCode: isValid ? 200 : 401,
        headers: defaultHeaders,
        body: JSON.stringify({ success: isValid, message: isValid ? 'Authenticated' : 'Invalid code' }),
      };
    }
    // Research Browser & AI Search Interception
    else if (pathname === '/api/telemetry/research' && method === 'POST') {
      const db = require('./src/services/database.service');
      const item = db.recordResearchActivity(body.candidateId, body.examId, body);
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({ success: true, recorded: item }),
      };
    } else if (pathname === '/api/telemetry/research' && method === 'GET') {
      const db = require('./src/services/database.service');
      const logs = db.getResearchLogs(queryParams.candidateId);
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({ success: true, logs }),
      };
    }
    // Telemetry Events & Keystrokes
    else if (pathname === '/api/telemetry/events' && method === 'POST') {
      const db = require('./src/services/database.service');
      const rec = db.recordTelemetryEvent(body.candidateId, body.event || body);
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({ success: true, event: rec }),
      };
    }
    // Examiner Surveillance Feed
    else if (pathname === '/api/admin/feed' && method === 'GET') {
      const db = require('./src/services/database.service');
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify(db.getSurveillanceFeed()),
      };
    }
    // Low-Code / Airtable Question Import Simulation
    else if (pathname === '/api/questions/import/airtable' && method === 'POST') {
      result = {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify({
          success: true,
          source: 'Airtable Base (Assessments Table)',
          importedQuestions: 4,
          message: 'Questions synchronized from low-code backend successfully',
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
  console.log(`🛡️  Parakh_Browser Full-Stack System Online`);
  console.log(`📍 Candidate Assessment Portal : http://127.0.0.1:${PORT}`);
  console.log(`👁️  Examiner Audit Console     : http://127.0.0.1:${PORT}/examiner`);
  console.log(`💡 Health Check                : http://127.0.0.1:${PORT}/health`);
  console.log(`========================================================\n`);
});

module.exports = server;
