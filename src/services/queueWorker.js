const EventEmitter = require('node:events');
const { analyzeInput } = require('./analyzerService');
const { updateScanJob } = require('../models/scanJob');
const { createReport, findReportByScanId } = require('../models/report');
const { saveVulnerabilities } = require('../models/vulnerability');
const { saveReportJson } = require('./storageService');
const { logger } = require('../utils/logger');

const emitter = new EventEmitter();
const queue = [];
let processing = false;

const processNext = async () => {
  if (processing) return;
  const item = queue.shift();
  if (!item) return;

  processing = true;
  const { job, payload } = item;

  try {
    await updateScanJob(job.id, { status: 'running', startedAt: new Date(), error: null });
    const analysis = await analyzeInput({
      project_id: job.projectId,
      input_type: payload.inputType,
      content: payload.content,
      file_path: payload.filePath || null
    });

    const report = await createReport({
      scanId: job.id,
      projectId: job.projectId,
      userId: job.userId,
      issues: analysis.issues
    });

    await saveVulnerabilities(report.id, report.issues);
    await saveReportJson(report.id, report);

    await updateScanJob(job.id, { status: 'completed', finishedAt: new Date(), reportId: report.id });
    emitter.emit('completed', { jobId: job.id, reportId: report.id });
  } catch (error) {
    logger.error('스캔 작업 실패', { jobId: job.id, error: error.message });
    await updateScanJob(job.id, { status: 'failed', finishedAt: new Date(), error: error.message });
    emitter.emit('failed', { jobId: job.id, error });
  } finally {
    processing = false;
    setImmediate(processNext);
  }
};

const enqueueScan = async (job, payload) => {
  const existingReport = await findReportByScanId(job.id);
  if (existingReport) {
    await updateScanJob(job.id, { status: 'completed', reportId: existingReport.id });
    return existingReport;
  }

  queue.push({ job, payload });
  processNext().catch((err) => logger.error('Queue processing error', { err: err.message }));
  return job;
};

const on = (...args) => emitter.on(...args);

module.exports = {
  enqueueScan,
  on
};
