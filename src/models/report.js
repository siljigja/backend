const { pool, generateId } = require('./index');
const { getVulnerabilitiesByReport } = require('./vulnerability');

const buildSummary = (issues = []) => {
  const total = issues.length;
  const high = issues.filter((item) => item.severity === 'High' || item.severity === 'Critical').length;
  return {
    totalIssues: total,
    highSeverity: high,
    recommendation:
      high > 0
        ? 'High 등급 취약점을 우선적으로 수정하세요.'
        : '발견된 취약점이 적습니다. 기본 보안 점검을 계속 유지하세요.'
  };
};

const mapReportRow = (row, issues = []) => {
  if (!row) return null;
  return {
    id: row.id,
    scanId: row.scan_id,
    projectId: row.project_id,
    userId: row.user_id,
    issues,
    summary: row.summary || buildSummary(issues),
    generatedAt: row.generated_at
  };
};

const createReport = async ({ scanId, projectId, userId, issues }) => {
  const id = generateId('rpt');
  const now = new Date();
  const summary = buildSummary(issues);

  const { rows } = await pool.query(
    `INSERT INTO reports (id, scan_id, project_id, user_id, summary, generated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, scanId, projectId, userId, summary, now]
  );

  return mapReportRow(rows[0], issues);
};

const findReportById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM reports WHERE id = $1 LIMIT 1`,
    [id]
  );
  const report = rows[0];
  if (!report) return null;
  const issues = await getVulnerabilitiesByReport(id);
  return mapReportRow(report, issues);
};

const findReportByScanId = async (scanId) => {
  const { rows } = await pool.query(
    `SELECT * FROM reports WHERE scan_id = $1 LIMIT 1`,
    [scanId]
  );
  const report = rows[0];
  if (!report) return null;
  const issues = await getVulnerabilitiesByReport(report.id);
  return mapReportRow(report, issues);
};

const listReportsByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT * FROM reports WHERE project_id = $1 ORDER BY generated_at DESC`,
    [projectId]
  );
  return rows.map((row) => mapReportRow(row, []));
};

module.exports = {
  createReport,
  findReportById,
  findReportByScanId,
  listReportsByProject
};
