const { config } = require('./env');
const { initStorage, resolveUploadPath, resolveReportPath } = require('./storage');

module.exports = {
  config,
  initStorage,
  resolveUploadPath,
  resolveReportPath
};

