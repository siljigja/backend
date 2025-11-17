const { pool } = require('./index');

const saveRefreshToken = async ({ token, userId, expiresAt }) => {
  await pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = excluded.user_id, expires_at = excluded.expires_at`,
    [token, userId, expiresAt]
  );
};

const findRefreshToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token = $1 LIMIT 1`,
    [token]
  );
  return rows[0] || null;
};

const deleteRefreshToken = async (token) => {
  await pool.query(
    `DELETE FROM refresh_tokens WHERE token = $1`,
    [token]
  );
};

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken
};

