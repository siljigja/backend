const { createScanJob, findScanJobById, listScansByProject } = require('../models/scanJob');
const { findProjectById } = require('../models/project');
const { enqueueScan } = require('../services/queueWorker');
const { asyncHandler } = require('../utils/asyncHandler');

const startScan = asyncHandler(async (req, res) => {
  const project = await findProjectById(req.params.projectId);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
  }

  const { inputType, content, filePath, options } = req.body;
  if (!content || !inputType) {
    return res.status(400).json({ message: 'inputType과 content가 필요합니다.' });
  }

  const job = await createScanJob({
    projectId: project.id,
    userId: req.user.id,
    inputType,
    options: options || {},
    payloadSummary: {
      hasContent: Boolean(content),
      filePath: filePath || null
    }
  });

  await enqueueScan(job, { inputType, content, filePath: filePath || null });

  return res.status(202).json({ scanId: job.id, status: job.status });
});

const getScanStatus = asyncHandler(async (req, res) => {
  const job = await findScanJobById(req.params.scanId);
  if (!job || job.userId !== req.user.id) {
    return res.status(404).json({ message: '스캔 작업을 찾을 수 없습니다.' });
  }
  return res.status(200).json({ scan: job });
});

const listScans = asyncHandler(async (req, res) => {
  const project = await findProjectById(req.params.projectId);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
  }
  const scans = await listScansByProject(project.id);
  return res.status(200).json({ scans });
});

module.exports = {
  startScan,
  getScanStatus,
  listScans
};

