const http = require('node:http');
const app = require('./src/app');
const { config } = require('./src/config/env');
const { initDataStores } = require('./src/models');
const { logger } = require('./src/utils/logger');

const start = async () => {
  await initDataStores();

  const server = http.createServer(app);
  server.listen(config.port, () => {
    logger.info(`DefAPI 백엔드 서버가${config.port} 포트에서 실행 중입니다.`);
  });

  server.on('error', (error) => {
    logger.error('서버 오류', { error: error.message });
    process.exitCode = 1;
  });
};

start().catch((error) => {
  logger.error('서버 시작 실패', { error: error.message });
  process.exit(1);
});