/* eslint-disable no-console */

const winston = require('winston');
const exporter = require('./exporter');
const initializer = require('./initializer');
const config = require('./config');
const configureLogger = require('./configureLogger');

function exit(code) {
  const appLogger = winston.loggers.get('app');
  appLogger.log('info', `Exit Code ${code}`, code);
  appLogger.on('finish', () => process.exit());
  appLogger.end();
}

/**
 * Run the application by loading the configuration and then running the exporter.
 *
 * This function is responsible for exitting the process. Return Codes:
 * 0: Successful Export
 * 1: Configuration Failure
 * 2: Exporter Failure
 */
function runExporter() {
  // Load the configuration values.
  config.load((errConfig, configValues) => {
    if (errConfig) {
      // Cannot log to the logger file as the configuration is required to setup the logger.
      console.error('Unable to load configuration', errConfig); //eslint-disable-line
      process.exit(1);
    }

    configureLogger(configValues.logger);

    // Run the application.
    exporter.run(configValues, (errApp) => {
      // If an error occured in the application then exit with an error value.
      if (errApp) {
        return exit(2);
      }
      // Otherwise exit successfully.
      return exit(0);
    });
  });
}

function runInitializer() {
  console.log('Running Initializer');
  initializer.run((err) => {
    if (err) {
      console.log();
      console.error('Initialization Error', err);
      exit(3);
    }
    console.log();
    console.log('Initialization Successful');
    exit(0);
  });
}

function run() {
  if (config.isInit()) {
    runInitializer();
  } else {
    runExporter();
  }
}

module.exports = {
  run,
};
