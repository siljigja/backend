const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail, findUserById } = require('../models/user');
const { validateEmail, validatePassword } = require('../utils/validators');
const { signTokens, verifyRefreshToken, revokeRefreshToken } = require('../services/tokenService');
const { verifyGoogleIdToken, exchangeGithubCode } = require('../services/oauthService');

const normalizeConsent = (input) => {
  if (!input) return { dataRetention: false, shareForModel: false };
  return {
    dataRetention: Boolean(input.dataRetention),
    shareForModel: Boolean(input.shareForModel)
  };
};

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  consentFlags: user.consentFlags,
  createdAt: user.createdAt
});

const signup = async (req, res) => {
  const { email, password, displayName, consentFlags } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: '유효한 이메일이 필요합니다.' });
  }
  if (!password || !validatePassword(password)) {
    return res.status(400).json({ message: '비밀번호는 최소 8자 이상이어야 합니다.' });
  }
  if (!displayName) {
    return res.status(400).json({ message: '표시 이름이 필요합니다.' });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: '이미 등록된 이메일입니다.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({
    email,
    passwordHash,
    displayName,
    consentFlags: normalizeConsent(consentFlags)
  });

  const tokens = await signTokens(user);

  return res.status(201).json({
    user: sanitizeUser(user),
    tokens
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호가 필요합니다.' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const tokens = await signTokens(user);
  return res.status(200).json({
    user: sanitizeUser(user),
    tokens
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: '리프레시 토큰이 필요합니다.' });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return res.status(401).json({ message: '유효하지 않은 리프레시 토큰입니다.' });
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
  }

  const tokens = await signTokens(user);
  return res.status(200).json({ tokens });
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  return res.status(200).json({ message: '로그아웃되었습니다.' });
};

const loginWithGoogle = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: 'idToken이 필요합니다.' });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload.email) {
      return res.status(400).json({ message: '구글 계정 이메일을 확인할 수 없습니다.' });
    }

    let user = await findUserByEmail(payload.email);
    if (!user) {
      user = await createUser({
        email: payload.email,
        passwordHash: null,
        displayName: payload.name || payload.email.split('@')[0],
        consentFlags: normalizeConsent({})
      });
    }

    const tokens = await signTokens(user);
    return res.status(200).json({
      user: sanitizeUser(user),
      tokens
    });
  } catch (error) {
    return res.status(401).json({ message: '구글 토큰 인증에 실패했습니다.' });
  }
};

const loginWithGithub = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'code가 필요합니다.' });
  }

  try {
    const profile = await exchangeGithubCode(code);
    if (!profile.email) {
      return res.status(400).json({ message: 'GitHub 계정 이메일을 확인할 수 없습니다.' });
    }

    let user = await findUserByEmail(profile.email);
    if (!user) {
      user = await createUser({
        email: profile.email,
        passwordHash: null,
        displayName: profile.name || profile.login || profile.email.split('@')[0],
        consentFlags: normalizeConsent({})
      });
    }

    const tokens = await signTokens(user);
    return res.status(200).json({
      user: sanitizeUser(user),
      tokens
    });
  } catch (error) {
    return res.status(401).json({ message: 'GitHub OAuth 처리에 실패했습니다.' });
  }
};

module.exports = {
  signup,
  login,
  refresh,
  logout,
  loginWithGoogle,
  loginWithGithub
};
