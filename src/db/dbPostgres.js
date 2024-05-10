const pg = require('pg');
const winston = require('winston');
const copyTo = require('pg-copy-streams').to;
const fs = require('fs');
/**
 * This module handles all interactions with the target database.
 */
module.exports = (() => {
  // The current pool of connections.
  // This will not be instantiated until the init function is called.
  let pool;

  /**
   * Initializes the connection pool for the target database.
   * See https://github.com/brianc/node-postgres
   *
   * @param config - A configuration object to be passed to pg.Pool.
   */
  const init = (config) => {
    pool = new pg.Pool(config);
  };

  /**
   * Export the data from a SQL query to a file on the local machine.
   *
   * @param selectQuery - The SQL query to run.
   * @param exportPath - The filepath to export the file to.
   * @param callback - A callback to be called when the function is complete.
   * @param callback.err - If failure, the error.
   * @param callback.res.rows - If success, the number of rows that were exported.
   */
  const exportData = (selectQuery, exportPath, callback) => {
    const exportQuery = `
      COPY (${selectQuery})
      TO STDOUT
      FORCE QUOTE *
      DELIMITER ','
      CSV NULL AS '\\N'
      ESCAPE '\\';
    `;

    winston.debug('Postgres Export', exportQuery);

    return pool.connect((err, client, done) => {
      if (err) {
        return callback(err);
      }
      let lineCount = 0;

      const fileStream = fs.createWriteStream(exportPath);

      fileStream.on('open', () => {
        const stream = client.query(copyTo(exportQuery));

        stream.pipe(fileStream);

        // Count the newlines so we can return a lineCount
        stream.on('data', (buffer) => {
          let idx = -1;
          lineCount -= 1; // Because the loop will run once for idx=-1
          do {
            idx = buffer.indexOf(10, idx + 1);
            lineCount += 1;
          } while (idx !== -1);
        });

        stream.on('error', (streamErr) => {
          done();
          return callback(streamErr);
        });

        fileStream.on('error', (fileStreamErr) => {
          done();
          return callback(fileStreamErr);
        });
      });

      fileStream.on('close', () => {
        done();
        return callback(null, { rows: lineCount });
      });
    });
  };

  const query = ({ q, p = [] }, callback) => {
    winston.debug('Postgres Query', q);
    pool.query(q, p, (err, res) => {
      if (err) {
        return callback(err);
      }
      return callback(null, res);
    });
  };

  const cleanup = (callback) => {
    winston.verbose('db.cleanup()');
    if (pool) {
      pool.end(callback);
    } else {
      callback(null);
    }
  };

  return {
    cleanup,
    init,
    exportData,
    query,
  };
})();
