const dotenv = require('dotenv');
const Joi = require('joi');
const nconf = require('nconf');
const path = require('path');
const fs = require('fs');

const password = require('./password');
const secret = require('./secret');

/**
 * Retrieve the configuration values. Priority of the configuration values is:
 *
 * 1. Overrides specified in function
 * 2. Command line arguments
 * 3. Env variables (including .env file in project root)
 *
 * Note that the .env file will not override system level environmental variables.
 */
function get() {
  // Load any environment variables from .env in the project root directory.
  dotenv.config();

  // The following override have the highest priority.
  nconf.overrides({
    compressFormat: 'zip',
    dateFormat: 'YYYY_MM_DD_HH_mm_ss',
    workingDirMode: '0770',
  });

  // The command line arguments have a high priority.
  nconf.argv();

  // The environmental variables have a medium priority.
  nconf.env({ separator: '_' });

  // The following defaults have the lowest priority.
  nconf.defaults({
    parallelExtracts: 10,
    connectionAttempts: 10,
    connectionInterval: 1000,
    logger: {
      level: 'info',
      filename: './logs/exporter.log',
      maxsize: 1048576, // 1 MB
      maxFiles: 10,
      zippedArchive: true,
      tailable: true,
      timezone: 'America/Vancouver',
    },
    source: {
      host: 'localhost',
    },
    target: {
      port: 22,
      username: 'exporter',
      path: '/hdc/crypt/uploads',
    },
  });


  // Create the configuration object.
  // Note that we convert the underscore format to a more javascript friendly camel case format.
  const config = {
    workingDir: nconf.get('workingDir'),
    parallelExtracts: nconf.get('parallelExtracts'),
    connectionAttempts: nconf.get('connectionAttempts'),
    connectionInterval: nconf.get('connectionInterval'),
    mapping: nconf.get('mapping'),
    source: nconf.get('source'),
    target: nconf.get('target'),
    compressFormat: nconf.get('compressFormat'),
    workingDirMode: nconf.get('workingDirMode'),
    dateFormat: nconf.get('dateFormat'),
    logger: nconf.get('logger'),
  };

  return config;
}

/**
 * Validate the configuration values.
 *
 * Note that extra variables will cause an error. This is possible with the nested properties
 * such as database.malicious.
 *
 * @param config - The configuration values to validate.
 * @param callback - The callback to call when the function is complete.
 * @param callback.err - If error, the error will be populated here. Note that we only populate
 * the message to prevent sensitive data from being logged.
 * @param callback.res - If success, the validate (and possibly transformed) configuration values.
 */
function validate(config, callback) {
  const schema = Joi.object().keys({
    workingDir: Joi.string(),
    parallelExtracts: Joi.number().integer().min(1),
    connectionAttempts: Joi.number().integer().min(1),
    connectionInterval: Joi.number().integer().min(1),
    mapping: Joi.string(),
    source: Joi.object().keys({
      dialect: Joi.string(),
      host: Joi.string(),
      port: Joi.number().integer().min(1),
      database: Joi.string(),
      user: Joi.string(),
      password: Joi.string(),
    }),
    target: Joi.object().keys({
      host: Joi.string(),
      port: Joi.number(),
      username: Joi.string(),
      privatekey: Joi.string(),
      path: Joi.string(),
    }),
    logger: Joi.object().keys({
      level: Joi.string().regex(/^(error|warn|info|verbose|debug|silly)$/),
      filename: Joi.string(),
      timezone: Joi.string(),
      maxsize: Joi.number().integer().min(1),
      maxFiles: Joi.number().integer().min(1),
      zippedArchive: Joi.boolean(),
      tailable: Joi.boolean(),
    }),
    compressFormat: Joi.string().regex(/^(tar|zip)$/),
    workingDirMode: Joi.string().regex(/^(0|1|2|3|4|5|6|7){4}$/),
    dateFormat: Joi.string(),
  });

  const validateOptions = {
    presence: 'required', // All fields required by default
  };
  // Return result.
  const result = Joi.validate(config, schema, validateOptions, callback);

  return result;
}

/**
 * This function is used to load configuration values from various sources into an object.
 * See get function for details on the precedence of configuration values.
 * @param callback - The callback to call when this function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the configuration object.
 */
function load(callback) {
  const cfg = get();

  validate(cfg, (err, res) => {
    if (err) {
      // Note that we do not callback the entire error here which would include the object
      // being parsed. This is not great because later the object could be logged and included
      // the cleartext password/passphrases.
      return callback(err.message);
    }

    let cleartextPassword;

    // If the value does not start with the word 'ENC:' then the value is in the cleartext, so
    // we need to encrypt it.
    if (!res.source.password.startsWith('ENC:')) {
      const encrypted = password.encrypt(res.source.password, secret);

      // Read the .env file content
      const envPath = path.join(process.cwd(), '.env');
      const env = fs.readFileSync(envPath, { encoding: 'utf8' });

      // Replace the database password with the encrypted value.
      // const newEnv = env.replace(res.source.password, `ENC:${encrypted}`);
      const newEnv = env.replace(/(source_password(?:\s*)=(?:\s*))(.*)/g, `$1ENC:${encrypted}`);

      // Write the new .env file content
      fs.writeFileSync(envPath, newEnv, { encoding: 'utf8' });

      cleartextPassword = res.source.password;
    } else {
      const toDecrypt = res.source.password.split(':')[1];
      cleartextPassword = password.decrypt(toDecrypt, secret);
    }

    res.source.password = cleartextPassword;

    return callback(null, res);
  });
}

function isInit() {
  nconf.argv();

  return nconf.get('init');
}

module.exports = {
  load,
  isInit,
};
