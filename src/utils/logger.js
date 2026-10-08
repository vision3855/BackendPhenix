/* Minimal structured logger. Swap for pino/winston in production. */
const levels = { info: 'INFO', warn: 'WARN', error: 'ERROR' };

function log(level, msg, meta) {
  const line = { ts: new Date().toISOString(), level: levels[level], msg, ...(meta || {}) };
  const output = JSON.stringify(line);
  if (level === 'error') console.error(output);
  else console.log(output);
}

export const logger = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
