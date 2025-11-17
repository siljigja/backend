const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error('요청 처리 중 오류', {
    method: req.method,
    path: req.originalUrl,
    message: err.message
  });

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ message: '잘못된 JSON 요청입니다.' });
  }

  const status = err.status || 500;
  const message = err.message || '서버 오류가 발생했습니다.';
  return res.status(status).json({ message });
};

module.exports = { errorHandler };

