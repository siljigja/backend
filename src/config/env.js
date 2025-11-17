const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  logger.warn('.env 파일을 찾지 못했습니다. 기본 환경 변수만 사용합니다.');
}

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret',
  chatgptApiKey: process.env.CHATGPT_API_KEY || 'demo-chatgpt-key',
  chatgptModel: process.env.CHATGPT_MODEL || 'gpt-5-mini',
  chatgptBaseUrl: process.env.CHATGPT_API_BASE_URL || 'https://api.openai.com/v1/chat/completions',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'storage', 'uploads'),
  reportDir: process.env.REPORT_DIR || path.resolve(process.cwd(), 'storage', 'reports'),
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || ''
  },
  pg: {
    connectionString: process.env.PG_CONNECTION_STRING || null,
    host: process.env.PG_HOST || 'exam-route',
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE || 'exam-db',
    user: process.env.PG_USER || 'exam-user',
    password: process.env.PG_PASSWORD || 'exam-password',
    ssl: process.env.PG_SSL === 'true',
    poolMax: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30000)
  }
};

module.exports = { config };
