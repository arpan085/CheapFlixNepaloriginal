const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'security.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatLog = (level, event, metadata) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level}] ${event} ${JSON.stringify(metadata)}\n`;
};

const writeLog = (content) => {
  fs.appendFile(LOG_FILE, content, (err) => {
    if (err) {
      // Fallback: console.error should not break app flow
      console.error('Security logger write error:', err);
    }
  });
};

const logSecurityEvent = (event, metadata = {}) => {
  const level = 'SECURITY';
  const logEntry = formatLog(level, event, metadata);
  writeLog(logEntry);
};

module.exports = { logSecurityEvent };