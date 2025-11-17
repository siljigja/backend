const levels = ['debug', 'info', 'warn', 'error'];

const format = (level, message, meta) => {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (!meta) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch (_) {
    return `${base} ${meta}`;
  }
};

const logger = levels.reduce((acc, level) => {
  acc[level] = (message, meta) => {
    const text = format(level, message, meta);
    if (level === 'error') {
      console.error(text);
    } else if (level === 'warn') {
      console.warn(text);
    } else if (level === 'debug') {
      if (process.env.DEBUG === 'true') {
        console.debug(text);
      }
    } else {
      console.log(text);
    }
  };
  return acc;
}, {});

module.exports = { logger };

