const _ = require('lodash');
const fs = require('fs');
const moment = require('moment-timezone');
const path = require('path');
const printf = require('printf');
const winston = require('winston');

// TODO Document and Clean
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss z';

// Extend a winston by making it expand errors when passed in as the
// second argument (the first argument is the log level).
function expandErrors(currLogger) {
  const originalLogFunc = currLogger.log;
  // const newLogger = Object.assign({}, currLogger);
  function log() {
    const args = Array.prototype.slice.call(arguments, 0);
    // TODO This will only work if the 3rd argument (the first is the level) is an Error.
    if (args.length >= 3 && args[2] instanceof Error) {
      const allPropNames = Object.getOwnPropertyNames(args[2]);
      const expanded = {};

      _.each(allPropNames, (p) => {
        if (p !== 'stack') {
          expanded[p] = args[2][p];
        }
      });
      // Dont include the stack
      // const logPropNames = allPropNames.filter(p => p !== 'stack');
      // const expanded =
      // const errJson = JSON.stringify(args[2], logPropNames);
      // args[2] = errJson;
      args[2] = expanded;
    }
    return originalLogFunc.apply(this, args);
  }
  return log;
}

module.exports = (config) => {
  const { level, filename, maxsize, maxFiles, tailable, zippedArchive } =
    config;

  const createFormatter = () =>
    winston.format.combine(
      winston.format.metadata(),
      winston.format.timestamp({
        format: () => moment.tz('America/Vancouver').format(TIMESTAMP_FORMAT),
      }),
      winston.format.printf((info) =>
        printf(
          '%s  %-6s %-30s %s',
          info.timestamp,
          info.level,
          info.message,
          info.metadata && Object.keys(info.metadata).length
            ? JSON.stringify(info.metadata)
            : ''
        )
      )
    );

  const createFileTransport = () => {
    // TODO - what about recursive directories? // WHAT IF IT FAILS!!!!!!!

    // Create the log directory if it does not already exist
    // Because Winston is too lazy to do it. Thanks Winston.
    if (!fs.existsSync(path.dirname(filename))) {
      fs.mkdirSync(path.dirname(filename));
    }

    return new winston.transports.File({
      format: createFormatter(),
      filename,
      maxsize,
      maxFiles,
      tailable,
      zippedArchive,
      json: false,
    });
  };

  const createConsoleTransport = () =>
    new winston.transports.Console({
      colorize: true,
      format: createFormatter(),
    });

  const fileTransport = createFileTransport();
  const consoleTransport = createConsoleTransport();

  winston.configure({
    level,
    transports: [consoleTransport, fileTransport],
  });

  winston.log = expandErrors(winston);
};
