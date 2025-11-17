const express = require('express');
const { authenticate } = require('../middlewares/authJwt');
const { asyncHandler } = require('../utils/asyncHandler');
const { getReport, listReports, downloadJson, submitFeedback } = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);

router.get('/projects/:projectId/reports', asyncHandler(listReports));
router.get('/reports/:reportId', asyncHandler(getReport));
router.get('/reports/:reportId/download', asyncHandler(downloadJson));
router.post('/reports/:reportId/feedback', asyncHandler(submitFeedback));

module.exports = router;

