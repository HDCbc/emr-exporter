const crypto = require('crypto');

const algorithm = 'AES-256-CBC';

/*
  Function encrypts a cleartext string in the format:
    ENC:IV:encryptedstring
      - 'ENC' indicates the string is encrypted and can be discarded
      - 'IV' is the random initialization vector required for decryption
      - 'encryptedstring' is the actual encrypted value
*/
function encrypt(cleartext, secret) {
  // Confirm that secret is 32 characters
  if (!secret.length === 32) {
    throw new Error(`Secret "${secret}" is not 32 characters`);
  }

  // Create random initialization vector.  Will be appended to encrypted string
  // for decryption usage
  const iv = crypto.randomBytes(16).toString('hex').slice(0, 16);
  const cipher = crypto.createCipheriv(algorithm, secret, iv);
  let encrypted = cipher.update(cleartext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}|${encrypted}`;
}

function decrypt(encrypted, secret) {
  const textParts = encrypted.split('|');
  const iv = textParts[0];
  const encryptedText = textParts[1];
  const decipher = crypto.createDecipheriv(algorithm, secret, iv);
  const decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  return (decrypted + decipher.final('utf8'));
}

module.exports = {
  encrypt,
  decrypt,
};
