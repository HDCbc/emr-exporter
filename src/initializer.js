const forge = require('node-forge');
const fs = require('fs');
const ip = require('ip');
const os = require('os');
const path = require('path');
const async = require('async');
const rl = require('readline-sync');
const password = require('./password');
const secret = require('./secret');

function makeDir(filepath, callback) {
  console.log();
  console.log(`Create Directory ${filepath}`);

  fs.mkdir(filepath, (err) => {
    if (err) {
      if (err.code === 'EEXIST') {
        console.log(` Directory ${filepath} already exists`);
        return callback(null);
      }
      console.error(' ERROR: Unable to create directory', filepath, err);
      return callback(err);
    }
    console.log(` Directory ${filepath} created`);
    return callback(null);
  });
}

function generateKey(bits, pubKeyPath, privKeyPath, callback) {
  console.log();
  console.log('Generate Public/Private Keys');

  if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
    console.log(` Keys ${pubKeyPath}, ${privKeyPath} already exist`);

    const pubKey = fs.readFileSync(pubKeyPath).toString();

    return callback(null, pubKey);
  }

  const parameters = {
    bits,
    workers: -1, // Auto-detect web workers to accelerate generation.
  };

  console.log(
    ` Generating ${bits} bit RSA Key Pair (this may take a few minutes)`,
  );
  return forge.pki.rsa.generateKeyPair(parameters, (err, keypair) => {
    if (err) {
      console.error('ERROR: Unable to generate keypair', err);
      return callback(err);
    }

    console.log(' Generated Key Pair');

    const pubKey = forge.ssh.publicKeyToOpenSSH(
      keypair.publicKey,
      `EMR-${os.hostname()}`,
    );
    const privKey = forge.pki.privateKeyToPem(keypair.privateKey);

    fs.writeFileSync(pubKeyPath, pubKey);
    console.log(` Saved Public Key (${pubKeyPath})`);
    fs.writeFileSync(privKeyPath, privKey);
    console.log(` Saved Private Key (${privKeyPath})`);

    return callback(null, pubKey);
  });
}

function createEnv(baseEnvPath, userConfig, callback) {
  console.log();
  console.log('Creating Configuration File');
  // Delete the existing configuration file if it exists.
  if (fs.existsSync('.env')) {
    fs.unlinkSync('.env');
    console.log(' Deleted existing file');
  }

  console.log(' Encrypting Password');
  let encryptedPassword = password.encrypt(userConfig.dbPass, secret);
  encryptedPassword = `ENC:${encryptedPassword}`;

  const innerPath = path.join(__dirname, baseEnvPath);
  let content = fs.readFileSync(innerPath).toString();

  content = content.replace(
    /(source_dialect(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.dbDialect}`,
  );
  content = content.replace(
    /(source_host(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.dbHost}`,
  );
  content = content.replace(
    /(source_port(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.dbPort}`,
  );
  content = content.replace(
    /(source_database(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.dbDatabase}`,
  );
  content = content.replace(
    /(source_user(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.dbUser}`,
  );
  content = content.replace(
    /(source_password(?:\s*)=(?:\s*))(.*)/g,
    `$1${encryptedPassword}`,
  );
  content = content.replace(
    /(target_host(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.endpointHost}`,
  );
  content = content.replace(
    /(target_port(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.endpointPort}`,
  );
  content = content.replace(
    /(target_username(?:\s*)=(?:\s*))(.*)/g,
    `$1${userConfig.endpointAccount}`,
  );

  const outputPath = path.join(process.cwd(), '.env');
  fs.writeFile(outputPath, content, callback);
  console.log(' File .env created');
}

function requireQuestion(text, options) {
  let answer;

  while (!answer) {
    answer = rl.question(text, options);
  }

  return answer;
}

function promptUserConfig(callback) {
  console.log(
    '#####################################################################',
  );
  console.log('# GATHERING CONNECTION INFO');
  console.log(
    '#####################################################################',
  );
  console.log('');
  console.log(
    'Specify the connection information that this application should',
  );
  console.log('use to connect to the EMR database.');
  console.log();

  // Mapping
  const mapping = requireQuestion('EMR (mois/oscar): ', {
    limit: ['mois', 'oscar'],
  });

  let dbDialect;
  let dbHost;
  let dbPort;
  let defEndpointAccount;

  if (mapping === 'mois') {
    dbDialect = 'postgres';
    dbHost = 'localhost';
    dbPort = '5432';
    defEndpointAccount = 'mois';
  } else if (mapping === 'oscar') {
    dbDialect = 'mysql';
    dbHost = 'localhost';
    dbPort = '3306';
    defEndpointAccount = 'exporter';
  }

  const dbDatabase = requireQuestion('EMR Database Name: ');
  const dbUser = requireQuestion('EMR Database Username: ');
  const dbPass = requireQuestion('EMR Database Password: ', {
    hideEchoBack: true,
  });
  const endpointHost = requireQuestion('Endpoint IP: ');
  const endpointPort = requireQuestion('Endpoint Port (22): ', {
    defaultInput: '22',
  });
  const endpointAccount = requireQuestion(
    `Endpoint Account (${defEndpointAccount}): `,
    { defaultInput: defEndpointAccount },
  );

  return callback(null, {
    dbDialect,
    dbHost,
    dbPort,
    dbDatabase,
    dbUser,
    dbPass,
    endpointHost,
    endpointPort,
    endpointAccount,
  });
}

function run(callback) {
  promptUserConfig((configErr, userConfig) => {
    if (configErr) {
      return callback(configErr);
    }

    console.log();
    console.log(
      '#####################################################################',
    );
    console.log('# CONFIGURING');
    console.log(
      '#####################################################################',
    );

    return async.auto(
      {
        sshDir: (cb) => makeDir('./ssh', cb),
        logDir: ['sshDir', (params, cb) => makeDir('./logs', cb)],
        workingDir: ['logDir', (params, cb) => makeDir('./working', cb)],
        pubKey: [
          'workingDir',
          (params, cb) =>
            generateKey(4096, './ssh/id_rsa.pub', './ssh/id_rsa', cb),
        ],
        env: [
          'pubKey',
          (params, cb) => createEnv('../examples/full.env', userConfig, cb),
        ],
      },
      (err, res) => {
        if (err) {
          console.error();
          console.error(
            '#####################################################################',
          );
          console.error('# ERROR');
          console.error(
            '#####################################################################',
          );
          console.error('Configuration could not be completed:');
          console.error(err);
          return callback(err);
        }

        console.log();
        console.log(
          '#####################################################################',
        );
        console.log('# FINALIZING');
        console.log(
          '#####################################################################',
        );
        console.log();
        console.log(
          'The following information is required by HDC to create a secure',
        );
        console.log(
          'connection between this application and the endpoint. This application',
        );
        console.log(
          'will not run successfully until HDC receives the below information.',
        );
        console.log();
        console.log('Email the below to systems@hdcbc.ca');
        console.log();
        console.log('Public Key:');
        console.log(res.pubKey);
        console.log();
        console.log('EMR Server IP:');
        console.log(ip.address());

        return callback(null);
      },
    );
  });
}

module.exports = {
  run,
};
