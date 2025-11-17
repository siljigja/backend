const express = require('express');
const { authenticate } = require('../middlewares/authJwt');
const { asyncHandler } = require('../utils/asyncHandler');
const { startScan, getScanStatus, listScans } = require('../controllers/scanController');

const router = express.Router();

router.post('/projects/:projectId/scan', authenticate, asyncHandler(startScan));
router.get('/projects/:projectId/scans', authenticate, asyncHandler(listScans));
router.get('/scans/:scanId', authenticate, asyncHandler(getScanStatus));

module.exports = router;

