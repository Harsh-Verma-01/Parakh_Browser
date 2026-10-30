const biometricHandler = require('./src/handlers/biometricHandler');
const telemetryHandler = require('./src/handlers/telemetryHandler');

const routes = {
    '/api/enrollCandidate': biometricHandler.enrollCandidate,
    '/api/processProctoringFrame': telemetryHandler.processProctoringFrame,
};

module.exports = async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    const handler = routes[pathname];

    if (!handler) {
        return res.status(404).json({
            success: false,
            message: 'API route not found'
        });
    }

    return handler(req, res);
};