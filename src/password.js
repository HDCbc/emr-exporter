const readlineSync = require('readline-sync');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RANDOM_HIDDEN_STRING = 'THIS IS KIND OF RANDOM?';

function encrypt(cleartext) {
  const cipher = crypto.createCipher('aes192', RANDOM_HIDDEN_STRING);
  let encrypted = cipher.update(cleartext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipher('aes192', RANDOM_HIDDEN_STRING);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function run(callback) {
  // Read the cleartext password
  const cleartext = readlineSync.question('Enter Postgres Password: ', {
    hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
  });

  // Encrypt the cleartext value
  const encrypted = encrypt(cleartext);

  // Read the .env file content
  const envPath = path.join(process.cwd(), '.env');
  const env = fs.readFileSync(envPath, { encoding: 'utf8' });

  // Replace the database password with the encrypted value.
  const newEnv = env.replace(/(source_password(?:\s*)=(?:\s*))(.*)/g, `$1${encrypted}`)

  // Write the new .env file content
  fs.writeFileSync(envPath, newEnv, { encoding: 'utf8' });
}

module.exports = {
  run,
};
