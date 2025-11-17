const { pool, generateId } = require('./index');

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    consentFlags: row.consent_flags || { dataRetention: false, shareForModel: false },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const createUser = async ({ email, passwordHash, displayName, consentFlags }) => {
  const id = generateId('usr');
  const now = new Date();
  const consent = consentFlags || { dataRetention: false, shareForModel: false };

  const { rows } = await pool.query(
    `INSERT INTO users (id, email, password_hash, display_name, consent_flags, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
     RETURNING *`,
    [id, email, passwordHash || null, displayName, JSON.stringify(consent), now]
  );

  return mapUser(rows[0]);
};

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return mapUser(rows[0]);
};

const findUserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return mapUser(rows[0]);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};
