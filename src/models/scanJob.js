const { pool, generateId } = require('./index');

const mapScanJobRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    inputType: row.input_type,
    options: row.options || {},
    payloadSummary: row.payload_summary || {},
    status: row.status,
    reportId: row.report_id,
    submittedAt: row.submitted_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
    updatedAt: row.updated_at
  };
};

const createScanJob = async ({ projectId, userId, inputType, options, payloadSummary }) => {
  const id = generateId('scan');
  const now = new Date();
  const { rows } = await pool.query(
    `INSERT INTO scan_jobs
      (id, project_id, user_id, input_type, options, payload_summary, status, submitted_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7, $7)
     RETURNING *`,
    [id, projectId, userId, inputType, options || {}, payloadSummary || {}, now]
  );
  return mapScanJobRow(rows[0]);
};

const camelToSnake = (value) =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const updateScanJob = async (id, patch) => {
  const entries = Object.entries(patch || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findScanJobById(id);
  }

  const sets = [];
  const values = [];
  let index = 1;

  for (const [key, value] of entries) {
    const column = camelToSnake(key);
    sets.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE scan_jobs SET ${sets.join(', ')} WHERE id = $${index} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return mapScanJobRow(rows[0]);
};

const findScanJobById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM scan_jobs WHERE id = $1 LIMIT 1`,
    [id]
  );
  return mapScanJobRow(rows[0]);
};

const listScansByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT * FROM scan_jobs WHERE project_id = $1 ORDER BY submitted_at DESC`,
    [projectId]
  );
  return rows.map(mapScanJobRow);
};

module.exports = {
  createScanJob,
  updateScanJob,
  findScanJobById,
  listScansByProject
};
