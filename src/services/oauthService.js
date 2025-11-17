const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

let googleClient;

const getGoogleClient = () => {
  if (!googleClient) {
    googleClient = new OAuth2Client(config.oauth.googleClientId);
  }
  return googleClient;
};

const verifyGoogleIdToken = async (idToken) => {
  if (!config.oauth.googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
  }
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.oauth.googleClientId
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('구글 토큰에서 사용자 정보를 가져오지 못했습니다.');
  }
  return {
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    picture: payload.picture
  };
};

const exchangeGithubCode = async (code) => {
  if (!config.oauth.githubClientId || !config.oauth.githubClientSecret) {
    throw new Error('GitHub OAuth 환경 변수가 설정되지 않았습니다.');
  }

  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: config.oauth.githubClientId,
      client_secret: config.oauth.githubClientSecret,
      code
    },
    {
      headers: { Accept: 'application/json' },
      timeout: 10000
    }
  );

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) {
    logger.error('GitHub OAuth 토큰 발급 실패', { response: tokenResponse.data });
    throw new Error('GitHub 액세스 토큰 발급에 실패했습니다.');
  }

  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    timeout: 10000
  });

  const emailResponse = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    timeout: 10000
  });

  const emails = Array.isArray(emailResponse.data) ? emailResponse.data : [];
  const primaryEmail =
    userResponse.data.email ||
    emails.find((item) => item.primary && item.verified)?.email ||
    emails.find((item) => item.verified)?.email;

  if (!primaryEmail) {
    throw new Error('GitHub 계정에서 검증된 이메일을 찾을 수 없습니다.');
  }

  return {
    email: primaryEmail,
    name: userResponse.data.name || userResponse.data.login,
    avatarUrl: userResponse.data.avatar_url,
    login: userResponse.data.login
  };
};

module.exports = {
  verifyGoogleIdToken,
  exchangeGithubCode
};

