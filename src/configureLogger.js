const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const printf = require('printf');
const winston = require('winston');
require('winston-log-and-exit');

// TODO Document and Clean

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

module.exports = ((config) => {
  const {
    level,
    filename,
    maxsize,
    maxFiles,
    tailable,
    zippedArchive,
  } = config;

  const createFormatter = (colorEnabled) => {
    const ctx = new chalk.constructor({ enabled: colorEnabled });

    const formatter = (options) => {
      const time = moment().format('YYYY-MM-DD HH:mm:ss');
      let lvl = options.level.toUpperCase();

      // Note that we need to manually color the log (rather than just setting colorize) because
      // we are specifying a custom formatter function.
      if (lvl === 'ERROR') {
        lvl = ctx.red(lvl);
      } else if (lvl === 'WARN') {
        lvl = ctx.yellow(lvl);
      } else if (lvl === 'INFO') {
        lvl = ctx.green(lvl);
      } else if (lvl === 'VERBOSE') {
        lvl = ctx.cyan(lvl);
      } else if (lvl === 'DEBUG') {
        lvl = ctx.gray(lvl);
      } else if (lvl === 'SILLY') {
        lvl = ctx.white(lvl);
      }

      const message = options.message ? options.message : '';

      // TODO Clean this shit up
      const obj = (options.meta && Object.keys(options.meta).length) ? options.meta : null;
      let elapsedSec = '';
      if (obj && (obj.elapsedSec || obj.elapsedSec === 0)) {
        elapsedSec = printf('%7.3f sec', obj.elapsedSec);
        delete obj.elapsedSec;
      }

      const meta = options.meta && Object.keys(options.meta).length ? ` ${JSON.stringify(options.meta)}` : '';
      // Note the extra space required because of the color characters.
      return printf('%s %-17s %-27s %-11s %s', time, lvl, message, elapsedSec, meta);
    };
    return formatter;
  };

  const createFileTransport = (colorEnabled) => {
    // TODO - what about recursive directories? // WHAT IF IT FAILS!!!!!!!

    // Create the log directory if it does not already exist
    // Because Winston is too lazy to do it. Thanks Winston.
    if (!fs.existsSync(path.dirname(filename))) {
      fs.mkdirSync(path.dirname(filename));
    }

    return new winston.transports.File({
      formatter: createFormatter(colorEnabled),
      filename,
      maxsize,
      maxFiles,
      tailable,
      zippedArchive,
      json: false,
    });
  };

  const createConsoleTransport = colorEnabled => new (winston.transports.Console)({
    colorize: true,
    formatter: createFormatter(colorEnabled),
  });

  const consoleTransport = createConsoleTransport(true);
  const fileTransport = createFileTransport(false);
  
  winston.configure({
    level,

    transports: [
      consoleTransport,
      fileTransport,
    ],
  });

  winston.log = expandErrors(winston);
});
