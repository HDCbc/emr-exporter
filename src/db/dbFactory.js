const mysql = require('./dbMysql');
const postgres = require('./dbPostgres');

/**
 * This function retrieves the appropriate database wrapper module based on the database dialect.
 *
 * @param config - The configuration to initialize the database wrapper with.
 * @param config.dialect - The dialect indicating which database module to use. (postgres, mysql)
 * @param callback - The callback to call once this function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the database module.
 */
const init = (config, callback) => {
  let db;
  switch (config.dialect) {
    case 'mysql':
      db = mysql;
      break;
    case 'postgres':
      db = postgres;
      break;
    default:
      return callback(`Unsupported database dialect (${config.dialect})`);
  }

  // Initialize the database (eg pools).
  db.init(config);

  return callback(null, db);
};

module.exports = {
  init,
};
