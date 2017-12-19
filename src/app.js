const exporter = require('./exporter');
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
function run() {
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
        process.exit(2);
      }
      // Otherwise exit successfully.
      process.exit(0);
    });
  });
}

module.exports = {
  run,
};
