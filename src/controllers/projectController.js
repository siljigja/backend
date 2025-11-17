const { createProject, listProjectsByUser, findProjectById, appendArtifact } = require('../models/project');
const { validateProjectName } = require('../utils/validators');
const { saveUploadBuffer } = require('../services/storageService');
const { logger } = require('../utils/logger');

const create = async (req, res) => {
  const { name, language, description, visibility } = req.body;
  if (!name || !validateProjectName(name)) {
    return res.status(400).json({ message: '프로젝트 이름은 3~64자 사이여야 하며 특수 문자를 포함할 수 없습니다.' });
  }

  const project = await createProject({
    userId: req.user.id,
    name,
    language: language || 'unknown',
    description: description || '',
    visibility: visibility === 'public' ? 'public' : 'private'
  });

  return res.status(201).json({ project });
};

const list = async (req, res) => {
  const projects = await listProjectsByUser(req.user.id);
  return res.status(200).json({ projects });
};

const getProject = async (req, res) => {
  const project = await findProjectById(req.params.projectId);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
  }
  return res.status(200).json({ project });
};

const uploadArtifact = async (req, res) => {
  const project = await findProjectById(req.params.projectId);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: '업로드 파일이 필요합니다.' });
  }

  try {
    const saved = await saveUploadBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      projectId: project.id
    });

    const artifactRecord = await appendArtifact(project.id, {
      filename: saved.filename,
      originalName: saved.originalName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedAt: saved.uploadedAt
    });

    return res.status(201).json({
      message: '업로드 완료',
      artifact: artifactRecord
    });
  } catch (error) {
    logger.error('업로드 실패', { error: error.message });
    return res.status(500).json({ message: '업로드 처리 중 오류가 발생했습니다.' });
  }
};

module.exports = {
  create,
  list,
  getProject,
  uploadArtifact
};
