const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { resolveUploadPath, resolveReportPath } = require('../config/storage');

const sanitizeName = (value) => value.replace(/[^A-Za-z0-9._-]/g, '_');

const saveUploadBuffer = async ({ buffer, originalName, mimeType, projectId }) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('업로드 파일이 비어 있습니다.');
  }

  const ext = path.extname(originalName || '');
  const safeName = sanitizeName(path.basename(originalName || 'upload'));
  const filename = `${Date.now()}-${randomUUID()}-${safeName}`;
  const storagePath = resolveUploadPath(filename);
  await fs.promises.writeFile(storagePath, buffer);

  return {
    id: randomUUID(),
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    storagePath,
    projectId,
    uploadedAt: new Date()
  };
};

const saveReportJson = async (reportId, data) => {
  const filename = `${reportId}.json`;
  const storagePath = resolveReportPath(filename);
  await fs.promises.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf8');
  return { filename, storagePath };
};

module.exports = {
  saveUploadBuffer,
  saveReportJson
};
