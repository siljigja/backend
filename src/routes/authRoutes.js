const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  signup,
  login,
  refresh,
  logout,
  loginWithGoogle,
  loginWithGithub
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.post('/oauth/google', asyncHandler(loginWithGoogle));
router.post('/oauth/github', asyncHandler(loginWithGithub));

module.exports = router;
