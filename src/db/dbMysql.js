const mysql = require('mysql');
const winston = require('winston');

// TODO Cleanup this file

module.exports = (() => {
  let pool;

  const init = (config, callback) => {
    winston.verbose('db.init()');
    pool = mysql.createPool(config);
    callback(null);
  };

  const cleanup = (callback) => {
    winston.verbose('db.cleanup()');
    if (pool) {
      pool.end(callback);
    } else {
      callback(null);
    }
  };

  const query = ({ q }, callback) => {
    winston.debug('db.query()', { q });
    pool.query(q, (err, res) => {
      if (err) {
        return callback({
          message: 'Unable to run source query',
          query: q,
          error: err,
        });
      }
      return callback(err, res);
    });
  };

  const exportData = (selectQuery, exportPath, callback) => {
    const escapedExportPath = exportPath.split('\\').join('\\\\');

    const exportQuery = `
      ${selectQuery}
      INTO OUTFILE "${escapedExportPath}"
      FIELDS TERMINATED BY ','
      ENCLOSED BY '"'
      LINES TERMINATED BY '\n'
    `;

    winston.debug('db_mysql.exportData()', exportQuery);

    pool.query(exportQuery, (err, res) => {
      if (err) {
        return callback({
          message: 'Unable to export',
          selectQuery,
          exportQuery,
          error: err,
        });
      }
      return callback(err, { rows: res.affectedRows });
    });
  };

  return {
    init,
    cleanup,
    query,
    exportData,
  };
})();
