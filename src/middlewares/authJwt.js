const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { findUserById } = require('../models/user');

const parseTokenFromHeader = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme && scheme.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }
  return null;
};

const authenticate = async (req, res, next) => {
  const token = parseTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

const optionalAuth = async (req, _res, next) => {
  const token = parseTokenFromHeader(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(payload.sub);
    if (user) {
      req.user = user;
    }
  } catch (error) {
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};

