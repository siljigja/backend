const express = require('express');
const { authenticate } = require('../middlewares/authJwt');
const { singleArtifactUpload } = require('../middlewares/uploadLimiter');
const { asyncHandler } = require('../utils/asyncHandler');
const { create, list, getProject, uploadArtifact } = require('../controllers/projectController');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.get('/:projectId', asyncHandler(getProject));
router.post('/:projectId/upload', singleArtifactUpload, asyncHandler(uploadArtifact));

module.exports = router;

