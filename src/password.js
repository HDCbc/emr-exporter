const crypto = require('crypto');

function encryptiv(text) {
  const iv = Buffer.from(crypto.randomBytes(16));
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let crypted = cipher.update(text, inputEncoding, outputEncoding);
  crypted += cipher.final(outputEncoding);
  return `${iv.toString('hex')}:${crypted.toString()}`;
}

function decryptiv(text) {
  const textParts = text.split(':');

  // extract the IV from the first half of the value
  const IV = Buffer.from(textParts.shift(), outputEncoding);

  // extract the encrypted text without the IV
  const encryptedText = Buffer.from(textParts.join(':'), outputEncoding);

  // decipher the string
  const decipher = crypto.createDecipheriv(algorithm, key, IV);
  let decrypted = decipher.update(encryptedText, outputEncoding, inputEncoding);
  decrypted += decipher.final(inputEncoding);
  return decrypted.toString();
}

function decrypt(encrypted, password) {
  const decipher = crypto.createDecipher('aes256', password);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


function encrypt(cleartext, password) {

}

module.exports = {
  encrypt,
  decrypt,
};




const algorithm = 'aes-256-ctr';
const key = process.env.KEY || 'b2df428b9929d3ace7c598bbf4e496b2';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';
