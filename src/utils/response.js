/**
 * Parakh_Browser - Standardized API Response Builder
 */

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
  'Content-Type': 'application/json',
};

function formatSuccess(statusCode = 200, payload = {}) {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(payload),
    isBase64Encoded: false,
  };
}

function formatError(statusCode = 500, message = 'Internal Server Error', error = null) {
  const errorBody = {
    success: false,
    error: {
      message,
      details: error ? error.message || error : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(errorBody),
    isBase64Encoded: false,
  };
}

module.exports = {
  formatSuccess,
  formatError,
  defaultHeaders,
};
