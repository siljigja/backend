const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { saveRefreshToken, findRefreshToken, deleteRefreshToken } = require('../models/refreshToken');

const ACCESS_EXPIRES_IN = '2h';
const REFRESH_EXPIRES_IN = '30d';

const issueAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName
    },
    config.jwtSecret,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

const issueRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    config.refreshSecret,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

const revokeRefreshToken = async (token) => {
  if (!token) return;
  await deleteRefreshToken(token);
};

const verifyRefreshToken = async (token) => {
  try {
    const payload = jwt.verify(token, config.refreshSecret);
    const entry = await findRefreshToken(token);
    if (!entry || entry.user_id !== payload.sub) {
      return null;
    }
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      await deleteRefreshToken(token);
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};

const signTokens = async (user) => {
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);
  const refreshPayload = jwt.decode(refreshToken);
  const expiresAt = refreshPayload ? new Date(refreshPayload.exp * 1000) : new Date(Date.now());
  await saveRefreshToken({ token: refreshToken, userId: user.id, expiresAt });
  return { accessToken, refreshToken };
};

module.exports = {
  signTokens,
  verifyRefreshToken,
  revokeRefreshToken
};
