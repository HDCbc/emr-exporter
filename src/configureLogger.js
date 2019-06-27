const _ = require('lodash');
const moment = require('moment-timezone');
const printf = require('printf');
const winston = require('winston');

const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss z';

// Extend a winston by making it expand errors when passed in as the
// third argument (the first argument is the log level).
function expandErrors(currLogger) {
  const originalLogFunc = currLogger.log;
  function log() {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments, 0);

    if (args.length >= 3 && args[2] instanceof Error) {
      const allPropNames = Object.getOwnPropertyNames(args[2]);
      const expanded = {};

      _.each(allPropNames, (p) => {
        if (p !== 'stack') {
          if (p === 'message') {
            expanded.msg = args[2][p];
          } else {
            expanded[p] = args[2][p];
          }
        }
      });
      args[2] = expanded;
    }
    return originalLogFunc.apply(this, args);
  }
  return log;
}

module.exports = ((config) => {
  const {
    level,
    filename,
    maxsize,
    maxFiles,
    tailable,
    zippedArchive,
    timezone,
  } = config;

  winston.loggers.add('app', {
    level,
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.metadata(),
          winston.format.timestamp({ format: () => moment.tz(timezone).format(TIMESTAMP_FORMAT) }),
          winston.format.printf(info => printf('%s %-18s %-30s %s', info.timestamp, info.level, info.message, info.metadata && Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : '')),
        ),
      }),
      new winston.transports.File({
        handleExceptions: true,
        filename,
        maxsize,
        maxFiles,
        tailable,
        zippedArchive,
        format: winston.format.combine(
          winston.format.metadata(),
          winston.format.timestamp({ format: () => moment.tz(timezone).format(TIMESTAMP_FORMAT) }),
          winston.format.printf(info => printf('%s  %-6s %-30s %s', info.timestamp, info.level, info.message, info.metadata && Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : '')),
        ),
      }),
    ],
  });

  const logger = winston.loggers.get('app');
  logger.on('error', e => console.log('Logger Error', e)); // eslint-disable-line no-console
  logger.log = expandErrors(logger);
});
