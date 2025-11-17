const { Pool } = require('pg');
const { logger } = require('../utils/logger');
const { config } = require('./env');

const {
  connectionString,
  host,
  port,
  database,
  user,
  password,
  ssl,
  poolMax,
  idleTimeoutMillis
} = config.pg;

const pool = new Pool({
  connectionString: connectionString || undefined,
  host: connectionString ? undefined : host,
  port: connectionString ? undefined : port,
  database: connectionString ? undefined : database,
  user: connectionString ? undefined : user,
  password: connectionString ? undefined : password,
  ssl: connectionString ? undefined : (ssl ? { rejectUnauthorized: false } : false),
  max: poolMax,
  idleTimeoutMillis
});

pool.on('error', (err) => {
  logger.error('PostgreSQL 연결 풀 오류', { error: err.message });
});

const connectDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL 연결 확인 완료');
  } finally {
    client.release();
  }
};

module.exports = { pool, connectDb };
