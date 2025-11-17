const fs = require('node:fs');
const { findReportById, listReportsByProject } = require('../models/report');
const { listFeedbackForReport } = require('../models/feedback');
const { findProjectById } = require('../models/project');
const { resolveReportPath } = require('../config/storage');
const { asyncHandler } = require('../utils/asyncHandler');

const getReport = asyncHandler(async (req, res) => {
  const report = await findReportById(req.params.reportId);
  if (!report || report.userId !== req.user.id) {
    return res.status(404).json({ message: '리포트를 찾을 수 없습니다.' });
  }
  const feedback = await listFeedbackForReport(report.id);
  return res.status(200).json({ report, feedback });
});

const listReports = asyncHandler(async (req, res) => {
  const project = await findProjectById(req.params.projectId);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
  }
  const reports = await listReportsByProject(project.id);
  return res.status(200).json({ reports });
});

const downloadJson = asyncHandler(async (req, res) => {
  const report = await findReportById(req.params.reportId);
  if (!report || report.userId !== req.user.id) {
    return res.status(404).json({ message: '리포트를 찾을 수 없습니다.' });
  }
  const filePath = resolveReportPath(`${report.id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '리포트 파일을 찾을 수 없습니다.' });
  }
  return res.download(filePath, `${report.id}.json`);
});

const submitFeedback = asyncHandler(async (req, res) => {
  return res.status(501).json({
    message: '현재는 오탐 피드백 수집 기능을 지원하지 않습니다.'
  });
});

module.exports = {
  getReport,
  listReports,
  downloadJson,
  submitFeedback
};
