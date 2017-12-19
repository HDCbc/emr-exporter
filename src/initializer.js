/* eslint-disable no-console */
const forge = require('node-forge');
const fs = require('fs');
const ip = require('ip');
const mkdirp = require('mkdirp');
const path = require('path');
const async = require('async');

function makeDir(filepath, callback) {
  fs.mkdir(filepath, (err) => {
    if (err) {
      if (err.code === 'EEXIST') {
        console.log(`Directory ${filepath} already exists`);
        return callback(null);
      }
      return callback(err);
    }
    console.log(`Directory ${filepath} created`);
    return callback(null);
  })
}

function generateKey(bits, pubKeyPath, privKeyPath, callback) {
  const parameters = {
    bits,
    workers: -1, // Auto-detect web workers to accelerate generation.
  };

  if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
    console.log('Keys already exist');
    return callback(null);
  }

  console.log('Generating Public/Private Keys');

  forge.pki.rsa.generateKeyPair(parameters, (err, keypair) => {
    if (err) {
      return callback(err);
    }

    const pubKey = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, 'emr server');
    const privKey = forge.pki.privateKeyToPem(keypair.privateKey);

    console.log('The following information must be sent to systems@hdcbc.ca');
    console.log('Public Key');
    console.log(pubKey);
    console.log();
    console.log('Server IP');
    console.log(ip.address());
    

    async.series([
      async.apply(fs.writeFile, pubKeyPath, pubKey),
      async.apply(fs.writeFile, privKeyPath, privKey),
    ], callback);
    // fs.writeFileSync(pubKeyPath, pubKey);
    // fs.writeFileSync(privKeyPath, privKey);
  });
}

function run(callback) {
  // console.log('readdir', fs.readdirSync('C:\\snapshot\\emr-exporter\\'));
  // console.log('readdir', fs.readdirSync('C:\\snapshot\\emr-exporter\\examples'));
  async.series([
    async.apply(makeDir, './ssh'),
    async.apply(makeDir, './logs'),
    async.apply(makeDir, './working'),
    async.apply(generateKey, 4096, './ssh/id_rsa.pub', './ssh/id_rsa'),
  ], callback);

  // if (!fs.existsSync('./ssh')) {
  //   mkdirp.sync('./ssh');
  //   console.log('Creating ./ssh');
  // } else {
  //   console.log('Skipping ./ssh');
  // }
  //
  // if (!fs.existsSync('./logs')) {
  //   mkdirp.sync('./logs');
  //   console.log('Creating ./logs');
  // } else {
  //   console.log('Skipping ./logs');
  // }
  //
  // if (!fs.existsSync('./working')) {
  //   mkdirp.sync('./working');
  //   console.log('Creating ./working');
  // } else {
  //   console.log('Skipping ./working');
  // }
  //
  // if (!fs.existsSync('.env')) {
  //   console.log('Copying .env');
  //   const innerPath = path.join(__dirname, '../examples/full.env');
  //   // console.log('innerPath', innerPath);
  //   const content = fs.readFileSync(innerPath).toString();
  //   fs.writeFileSync('.env', content);
  //   // console.log('inner content', fs.readFileSync(innerPath).toString());
  //   // fs.copyFileSync(innerPath, path.join(process.cwd(), '.env'));
  // } else {
  //   console.log('Skipping .env');
  // }
  //
  // if (!fs.existsSync('./ssh/id_rsa')) {
  //   console.log('Generating Keys');
  //   generateKey();
  // } else {
  //   console.log('Skipping Key Generation');
  // }
  //
  // callback(null);
}

module.exports = {
  run,
};
