const mysql = require('mysql');
const winston = require('winston');

module.exports = (() => {
  let pool;
  let logger;

  const init = (config) => {
    logger = winston.loggers.get('app');
    logger.verbose('db.init()');
    pool = mysql.createPool(config);
  };

  const cleanup = (callback) => {
    logger.verbose('db.cleanup()');
    if (pool) {
      pool.end(callback);
    } else {
      callback(null);
    }
  };

  const query = ({ q }, callback) => {
    logger.debug('db.query()', { q });
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

    logger.debug('db_mysql.exportData()', exportQuery);

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
