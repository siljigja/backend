const { randomUUID } = require('node:crypto');
const { pool, connectDb } = require('../config/db');

const initDataStores = async () => {
  await connectDb();
};

const generateId = (prefix) => `${prefix}_${randomUUID()}`;

module.exports = {
  pool,
  initDataStores,
  generateId
};
