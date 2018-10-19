const _ = require('lodash');
const archiver = require('archiver');
const async = require('async');
const dbFactory = require('./db/dbFactory');
const fs = require('fs');
const logger = require('winston');
const mkdirp = require('mkdirp');
const moment = require('moment');
const path = require('path');
const progress = require('progress-stream');
const rimraf = require('rimraf');
const ssh2 = require('ssh2');

/**
 * Change the permissions (mode) of a file or directory.
 *
 * @param filepath - The path of the file or directory.
 * @param mode - The mode in string format (eg '770')
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 */
function changePermissions(filepath, mode, callback) {
  const start = Date.now();
  const octalMode = parseInt(mode, 8);
  logger.info('Change Permission Started', { filepath, mode, octalMode });

  fs.chmod(filepath, octalMode, (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Change Permission Failure', err);
      return callback(err);
    }
    logger.info('Change Permission Success', { elapsedSec });
    return callback(null);
  });
}

/**
 * Compress all of the files in a directory into a single file.
 *
 * @param inputDir - The path to the input directory.
 * @param outputPath - The path to the zip files to create.
 * @param format - The format to compress into (zip/tar).
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res.sizeBytes - If success, the number of compressed bytes.
 */
function compressDirectory(inputDir, outputPath, format, callback) {
  const start = Date.now();
  logger.info('Compress Started', { format, inputDir, outputPath });

  // Create the archiver and output.
  const archive = archiver.create(format, {});
  const archiveOutput = fs.createWriteStream(outputPath);
  archive.pipe(archiveOutput);

  // Listen for all archive data to be written.
  // Once the compression is complete, call the callback.
  archiveOutput.on('close', (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Compress Failure', err);
      return callback(err);
    }
    const sizeBytes = archive.pointer();
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

    logger.info('Compress Success', { elapsedSec, sizeBytes, sizeMB });
    return callback(null, { sizeBytes });
  });

  // Start archiving the directory.
  archive.directory(inputDir, '');

  // Flag that we are done adding directories/files.
  // Note that the close event may be called immediately, so it must be registered beforehand.
  archive.finalize();
}

/**
 * Create a directory.
 *
 * @param dir - The path to the directory to create.
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 */
function createDirectory(dir, callback) {
  const start = Date.now();
  logger.info('Create Directory Started', { dir });

  mkdirp(dir, (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Create Directory Failure', err);
      return callback(err);
    }
    logger.info('Create Directory Success', { elapsedSec });
    return callback(null);
  });
}

/**
 * Delete a directory (and all content).
 * Note you should probably be careful to not pass the wrong path (eg /) into this function.
 *
 * @param dir - The path to the directory to delete.
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 */
function deleteDirectory(dir, callback) {
  const start = Date.now();
  logger.info('Delete Directory Started', { dir });

  return rimraf(dir, (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Delete Directory Failure', err);
      return callback(err);
    }
    logger.info('Delete Directory Success', { elapsedSec });
    return callback(null);
  });
}

/**
 * Delete a single file.
 *
 * @param filepath - The path to the file to delete.
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 */
function deleteFile(filepath, callback) {
  const start = Date.now();
  logger.info('Delete File Started', { filepath });

  return fs.unlink(filepath, (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Delete File Failure', err);
      return callback(err);
    }
    logger.info('Delete File Success', { elapsedSec });
    return callback(null);
  });
}

/**
 * Exports the data out of the source database by running the array of export functions in parallel.
 *
 * @param tasks - The array of functions to run to perform the export.
 * @param parallelLimit - The number of tasks to run in parallel.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 */
function exportData(tasks, parallelLimit, callback) {
  const start = Date.now();
  logger.info('Export Data Started', { parallelLimit, tasks: tasks.length });

  async.parallelLimit(tasks, parallelLimit, (err, res) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Export Data Failure', err);
      return callback(err);
    }

    // Retrieve the sum of rows/size/time for all of the tasks that were run.
    const resArray = _.toArray(res);
    const rows = _.sumBy(resArray, t => (t.rows ? t.rows : 0));
    const serialMs = _.sumBy(resArray, t => (t.ms ? t.ms : 0));
    const serialSec = serialMs / 1000;
    const sizeBytes = _.sumBy(resArray, t => (t.bytes ? t.bytes : 0));
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

    logger.info('Export Data Success', {
      rows,
      elapsedSec,
      serialSec,
      sizeMB,
    });
    return callback(null);
  });
}

/**
 * Writes a file to the filesystem.
 *
 * @param filepath - The path of the file.
 * @param content - The content to write into the file..
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - Always null.
 */
function writeFile(filepath, content, callback) {
  const start = Date.now();

  logger.info('Write File Started', { filepath });

  fs.writeFile(filepath, content, (err) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Write File Failure', err);
      return callback(err);
    }
    logger.info('Write File Success', { elapsedSec });
    return callback(null);
  });
}

/**
 * Run a SQL query that exports the results to a CSV.
 *
 * @param db - The database object to run the query against.
 * @param filepath - The filepath to export the query to.
 * @param sql - The SQL query to run. This should not include the portion of sql to export/copy to.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, an object containing summary information.
 * @param callback.res.ms - The time in ms to perform the export.
 * @param callback.res.rows - The number of row exported.
 * @param callback.res.bytes - The number of bytes exported.
 */
const exportQueryToCSV = (db, filepath, sql, callback) => {
  const start = Date.now();
  logger.debug('Export Query Started', { filepath, sql });

  db.exportData(sql, filepath, (err, res) => {
    const elapsedMs = (Date.now() - start);
    const elapsedSec = elapsedMs / 1000;
    if (err) {
      logger.error('Export Query Failure', err);
      return callback(err);
    }

    // TODO - This is not ideal. Should really be using the async version.
    const sizeBytes = fs.statSync(filepath).size;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(3);
    const basename = path.basename(filepath);

    logger.verbose('Export Query Success', {
      basename,
      elapsedSec,
      rowCount: res.rows,
      sizeMB,
    });
    return callback(null, { rows: res.rows, ms: elapsedMs, bytes: sizeBytes });
  });
};

/**
 * Initialize the database connection.
 *
 * @param config.dialect - The dialect of the database (postgres, mysql).
 * @param config.host - The hostname of the database server.
 * @param config.database - The name of the database.
 * @param config.user - The user to use to connect to the database.
 * @param config.password - The password associated with the user.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the database object.
 */
function initConnection(config, callback) {
  const start = Date.now();

  // Mask the password before logging
  const logConfig = Object.assign({}, config, { password: 'XXX' });
  logger.info('Init Connection Started', logConfig);

  dbFactory.init(config, (err, db) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Init Connection Failure', err);
      return callback(err);
    }
    logger.info('Init Connection Success', { elapsedSec });
    return callback(null, db);
  });
}

/**
 * Load the content of the mapping file by name. Mapping files are located in the
 * /project/mapping directory.
 *
 * For example to load the file /project/mapping/mois.json you would pass in "mois" as the name.
 *
 * @param mappingName - The name of the mapping to load.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the string content of the mapping file.
 */
function loadMappingFile(mappingName, callback) {
  const start = Date.now();

  // The mapping files are json files that should be located in /project/mapping.
  // This directory should be included as in pkg.assets within package.json so they can be read
  // once the source code is packaged into an executable.
  const mappingPath = path.join(__dirname, '../mappings', `${mappingName}.json`);

  logger.info('Load Mapping Started', { mappingName, mappingPath });

  fs.readFile(mappingPath, (err, res) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Load Mapping Failure', err);
      return callback(err);
    }
    logger.info('Load Mapping Success', { elapsedSec });
    return callback(null, res.toString());
  });
}

/**
 * Parse json content into a javascript object.
 * Note this is still a synchronous function but provides a callback style.
 *
 * @param content - The string content to parse.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the parsed javascript object.
 */
function parseJSON(content, callback) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return callback(e);
  }

  return callback(null, parsed);
}

/**
 * Populate a list of tasks (functions that can be called by async) based on the mapping.
 *
 * @param mapping - The mapping object to load the tasks from.
 * @param db - The database object to eventually run the query against.
 * @param exportDir - The export directory to eventually export the query results to.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error. No tasks is considered an error.
 * @param callback.res - If success, an array of functions, one per mapping entry.
 */
function populateTasks(mapping, db, exportDir, callback) {
  const start = Date.now();
  logger.info('Populating Tasks Started');

  const tasks = _.map(mapping, (val, index) => {
    const filepath = path.join(exportDir, `${val.target}.${index}.csv`);
    logger.debug('Task Created', { target: val.target, filepath });

    return async.apply(exportQueryToCSV, db, filepath, val.query);
  });

  const elapsedSec = (Date.now() - start) / 1000;

  if (tasks.length === 0) {
    const err = new Error('No tasks found');
    logger.error('Populating Tasks Failure', err);
    return callback(err);
  }
  logger.info('Populating Tasks Success', { elapsedSec, tasks: tasks.length });
  return callback(null, tasks);
}

/**
 * Reads a single file.
 *
 * @param filepath - The path to the file to read.
 * @param callback - A callback to call one the function is complete.
 * @param callback.err - If failed, the error.
 * @param callback.res - If success, the string content of the file.
 */
function readFile(filepath, callback) {
  const start = Date.now();
  logger.info('Read File Started', { filepath });

  return fs.readFile(filepath, (err, res) => {
    const elapsedSec = (Date.now() - start) / 1000;
    if (err) {
      logger.error('Read File Failure', err);
      return callback(err);
    }
    logger.info('Read File Success', { elapsedSec });
    return callback(null, res.toString());
  });
}

/**
 * Transfer a local file to a remote server using scp.
 *
 * @param filepath - The path to the file to transfer.
 * @param sizeBytes - The number of bytes in the file (used for progress notes).
 * @param target - The connection information for the remote server.
 * @param target.host - The hostname of the remote server.
 * @param target.username - The username that exists on the remote server.
 * @param remotePath - The path to send the file to on the remote server.
 * @param privateKey - The string content of the private key.
 * @param callback - A callback to call once the function is complete.
 * @param callback.err - If failed, the error.
 */
function transferFile(filepath, sizeBytes, target, remotePath, privateKey, callback) {
  // Note that originally we were using the scp2 library, which was much more succint; however
  // it does not handle errors appropriately. Eg with a bad passphrase it throws and error instead
  // of a callback, and when an error callback is thrown, it calls them double. All in all the scp2
  // library does not seem to be very well maintained.
  const start = Date.now();
  logger.info('Transfer File Started', {
    input: filepath,
    output: remotePath,
    host: target.host,
    port: target.port,
    username: target.username,
  });

  const connOptions = {
    host: target.host,
    port: target.port,
    username: target.username,
    privateKey,
  };

  // Create a progress stream to report progress on transferring the file.
  const progressStream = progress({ time: 5000, length: sizeBytes });
  progressStream.on('progress', (p) => {
    logger.verbose('Transfer Progress', {
      percentage: p.percentage.toFixed(2),
      transferredMB: (p.transferred / 1024 / 1024).toFixed(2),
      speedMBPerSec: (p.speed / 1024 / 1024).toFixed(2),
    });
  });

  const conn = new ssh2.Client();

  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        logger.error('Transfer File Failure (sftp)', err);
        return callback(err);
      }

      const readStream = fs.createReadStream(filepath);
      const writeStream = sftp.createWriteStream(remotePath);

      writeStream.on('close', () => {
        logger.info('Transfer File Closed');
      });

      writeStream.on('error', (errWs) => {
        logger.error('Transfer File Failure (writeStream)', errWs);
        return callback(errWs);
      });

      writeStream.on('end', () => {
        logger.verbose('Transfer File End');
        conn.close();
      });

      writeStream.on('finish', () => {
        const elapsedSec = (Date.now() - start) / 1000;
        const transferredMB = (sizeBytes / 1024 / 1024).toFixed(2);
        const speedMBPerSec = (transferredMB / elapsedSec).toFixed(2);
        logger.info('Transfer File Success', { elapsedSec, transferredMB, speedMBPerSec });
        return callback(null);
      });

      // Initiate transfer of file
      return readStream.pipe(progressStream).pipe(writeStream);
    });
  });

  conn.on('error', (err) => {
    logger.error('Transfer File Failure', err);
    return callback(err);
  });

  conn.connect(connOptions);
}

/**
 * Wait for a connection to the database. Keep retrying to connect to the database until:
 * 1. Successful connection to the database can be a established and a sample query can be run.
 * 2. Connection to the database failed with error other than ECONNREFUSED.
 * 3. Ran out of attempts to connect.
 *
 * This function is useful for using the adapter within a Docker container where it may take
 * some time for the database to initialize.
 *
 * @param db - The database object to wait for.
 * @param times - The number of attempts to make before giving up.
 * @param interval - The time to wait between retries, in milliseconds.
 * @param callback.err - If #2/3 then this will contain an error. Otherwise null.
 */
function waitForConnection(db, times, interval, callback) {
  const start = Date.now();
  logger.info('Wait for Connection Started', { times, interval });

  // This function runs a simple query against the database.
  const testConnection = cb => db.query({ q: 'select 1' }, cb);

  // The current attempt (zero-based). This is used for logging only, the actual logic of retries
  // is handled by the async.retry function.
  let i = 0;

  async.retry({
    times,
    interval,
    errorFilter: (err) => {
      i += 1;

      // Keep retrying if the error contains the error contains ECONNREFUSED.
      // Any other error (such as invalid credentials) will callback and error.
      const keepTrying = _.includes(err.error, 'ECONNREFUSED');
      logger.info(`Connection Refused ${i}/${times}. Keep trying: ${keepTrying}`);
      logger.debug(err.error);
      return keepTrying;
    },
  }, testConnection, (err, res) => {
    const elapsedSec = (Date.now() - start) / 1000;

    if (err) {
      logger.error('Wait for Connection Failure', err);
      return callback(err);
    }

    logger.info('Wait for Connection Success', { elapsedSec });
    return callback(null, res);
  });
}

/**
 * Run the application.
 *
 */
function run(options, callback) {
  const start = Date.now();
  
  logger.info(_.repeat('=', 160));
  logger.info('Run Started');

  // It is assumed that the options have been verified in the config module.
  const {
    compressFormat,
    connectionAttempts,
    connectionInterval,
    dateFormat,
    mapping,
    prepareFile,
    parallelExtracts,
    source,
    target,
    workingDir,
    workingDirMode,
  } = options;

  const timeString = moment().format(dateFormat);
  const tempExportDir = path.join(path.dirname(process.execPath), workingDir, timeString);
  const exportFile = path.join(path.dirname(process.execPath), workingDir, `${timeString}.${compressFormat}`);
  // Note that we hardcode the path to posix (eg linux remote endpoint)
  const remoteFile = path.posix.join(target.path, path.basename(exportFile));

  // Mask the password before logging.
  const logOptions = Object.assign({}, options, {
    source: Object.assign({}, options.source, { password: 'XXX' }),
    tempExportDir,
    exportFile,
    remoteFile,
  });
  logger.verbose('Configuration');
  _.forEach(_.keys(logOptions), (key) => {
    logger.verbose(`-${key}`, { value: logOptions[key] });
  });

  return async.auto({
    // Initialize the database configuration
    database: async.apply(initConnection, source),
    // Wait for a database connection.
    wait: ['database', (res, cb) => {
      waitForConnection(res.database, connectionAttempts, connectionInterval, cb);
    }],
    // Create the temporary export directory.
    exportDir: ['wait', (res, cb) => {
      createDirectory(tempExportDir, cb);
    }],
    // Chmod the temporary export directory.
    exportDirMode: ['exportDir', (res, cb) => {
      changePermissions(tempExportDir, workingDirMode, cb);
    }],
    // Load the mapping file content.
    mapping: ['exportDirMode', (res, cb) => {
      loadMappingFile(mapping, cb);
    }],
    // Parse the mapping file into a javascript object.
    json: ['mapping', (res, cb) => {
      parseJSON(res.mapping, cb);
    }],
    // Populate tasks from the mapping file.
    tasks: ['json', (res, cb) => {
      populateTasks(res.json, res.database, tempExportDir, cb);
    }],
    // Run the tasks (eg export to csv).
    export: ['tasks', (res, cb) => {
      exportData(res.tasks, parallelExtracts, cb);
    }],
    // Also export the mapping file.
    exportMapping: ['export', (res, cb) => {
      writeFile(path.join(tempExportDir, 'mapping.json'), mapping, cb);
    }],
    // Compress the csv directory to a zip file.
    compress: ['exportMapping', (res, cb) => {
      compressDirectory(tempExportDir, exportFile, compressFormat, cb);
    }],
    // Read the private key file.
    privatekey: ['compress', (res, cb) => {
      readFile(target.privatekey, cb);
    }],
    // Transfer the compressed file to the remote server.
    transfer: ['privatekey', (res, cb) => {
      transferFile(exportFile, res.compress.sizeBytes, target, remoteFile, res.privatekey, cb);
    }],
  }, (errRun, res) => {
    // The deletion of the files and directories need to happen no matter what.

    // Delete the export directory containing the csv files.
    deleteDirectory(tempExportDir, (errDir) => {
      // Delete the compressed file.
      deleteFile(exportFile, (errFile) => {
        const elapsedSec = (Date.now() - start) / 1000;

        const err = (errRun || errDir || errFile);
        if (err) {
          logger.error('Run Failure', err);
          return callback(err);
        }
        logger.info('Run Success', { elapsedSec });
        return callback(null, res);
      });
    });
  });
}

module.exports = {
  run,
};
