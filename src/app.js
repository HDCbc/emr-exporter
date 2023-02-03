const exporter = require('./exporter');
const initializer = require('./initializer');
const config = require('./config');
const configureLogger = require('./configureLogger');

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

    const logger = require('winston');

    // Run the application.
    exporter.run(configValues, (errApp) => {
      var exitCode;
      // If an error occured in the application then exit with an error value.
      if (errApp) {
        logger.error('Application Error', errApp); //eslint-disable-line
        exitCode = 2;
      // Otherwise exit successfully.
      } else {
        exitCode = 0;
      }

      logger.info('Application Exiting', { exitCode })
      process.exitCode = exitCode;

      // Force the application to exit after giving it a few seconds to flush logs etc.
      setTimeout(function () {
        process.exit(exitCode);
      }, 5000);
    });
  });
}

function runInitializer() {
  console.log('Running Initializer'); //eslint-disable-line
  initializer.run((err) => {
    if (err) {
      console.log(); //eslint-disable-line
      console.error('Initialization Error', err); //eslint-disable-line
      process.exit(3);
    }
    console.log(); //eslint-disable-line
    console.log('Initialization Successful'); //eslint-disable-line
    process.exit(0);
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
