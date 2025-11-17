const fs = require('node:fs');
const path = require('node:path');
const { config } = require('./env');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const initStorage = () => {
  ensureDir(config.uploadDir);
  ensureDir(config.reportDir);
};

const resolveUploadPath = (filename) => path.resolve(config.uploadDir, filename);
const resolveReportPath = (filename) => path.resolve(config.reportDir, filename);

module.exports = {
  initStorage,
  resolveUploadPath,
  resolveReportPath
};

