const crypto = require('crypto');

function encrypt(cleartext, password) {
  const cipher = crypto.createCipher('aes256', password);
  let encrypted = cipher.update(cleartext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

function decrypt(encrypted, password) {
  const decipher = crypto.createDecipher('aes256', password);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
};
