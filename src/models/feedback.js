const { pool, generateId } = require('./index');

const mapFeedbackRow = (row) => ({
  id: row.id,
  reportId: row.report_id,
  issueId: row.issue_id,
  verdict: row.verdict,
  comment: row.comment,
  userId: row.user_id,
  createdAt: row.created_at
});

const createFeedback = async ({ reportId, issueId, verdict, comment, userId }) => {
  const id = generateId('fbk');
  const now = new Date();
  const { rows } = await pool.query(
    `INSERT INTO feedback (id, report_id, issue_id, verdict, comment, user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, reportId, issueId, verdict, comment || null, userId, now]
  );
  return mapFeedbackRow(rows[0]);
};

const listFeedbackForReport = async (reportId) => {
  const { rows } = await pool.query(
    `SELECT * FROM feedback WHERE report_id = $1 ORDER BY created_at DESC`,
    [reportId]
  );
  return rows.map(mapFeedbackRow);
};

module.exports = {
  createFeedback,
  listFeedbackForReport
};
