const { pool, generateId } = require('./index');

const mapArtifactRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  filename: row.filename,
  originalName: row.original_name,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  size: row.size !== null && row.size !== undefined ? Number(row.size) : null,
  uploadedAt: row.uploaded_at
});

const mapProjectRow = (row, artifacts = []) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    language: row.language,
    description: row.description,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    artifacts
  };
};

const createProject = async ({ userId, name, language, description, visibility = 'private' }) => {
  const id = generateId('prj');
  const now = new Date();
  const { rows } = await pool.query(
    `INSERT INTO projects (id, user_id, name, language, description, visibility, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [id, userId, name, language, description, visibility, now]
  );
  return mapProjectRow(rows[0], []);
};

const listProjectsByUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  if (rows.length === 0) return [];

  const projectIds = rows.map((row) => row.id);
  const { rows: artifactRows } = await pool.query(
    `SELECT * FROM project_artifacts WHERE project_id = ANY($1::text[]) ORDER BY uploaded_at DESC`,
    [projectIds]
  );
  const artifactsByProject = artifactRows.reduce((acc, row) => {
    if (!acc[row.project_id]) acc[row.project_id] = [];
    acc[row.project_id].push(mapArtifactRow(row));
    return acc;
  }, {});

  return rows.map((row) => mapProjectRow(row, artifactsByProject[row.id] || []));
};

const findProjectById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  const project = rows[0];
  if (!project) return null;

  const { rows: artifactRows } = await pool.query(
    `SELECT * FROM project_artifacts WHERE project_id = $1 ORDER BY uploaded_at DESC`,
    [id]
  );
  const artifacts = artifactRows.map(mapArtifactRow);
  return mapProjectRow(project, artifacts);
};

const appendArtifact = async (projectId, artifact) => {
  const id = generateId('artifact');
  const { rows } = await pool.query(
    `INSERT INTO project_artifacts (id, project_id, filename, original_name, storage_path, mime_type, size, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      projectId,
      artifact.filename,
      artifact.originalName,
      artifact.storagePath,
      artifact.mimeType,
      artifact.size,
      artifact.uploadedAt || new Date()
    ]
  );
  return mapArtifactRow(rows[0]);
};

module.exports = {
  createProject,
  listProjectsByUser,
  findProjectById,
  appendArtifact
};
