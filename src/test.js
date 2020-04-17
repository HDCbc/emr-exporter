const crypto = require('crypto');

/*
const cipher = crypto.createCipher('aes256', 'secret_string');
let encrypted = cipher.update('password', 'utf8', 'hex');
encrypted += cipher.final('hex');
console.log('Encrypted password: ', encrypted);

var iv = new Buffer(crypto.randomBytes(8))
ivstring = iv.toString('hex');

*/

var password = 'password';
const key = crypto.randomBytes(32);
var iv = new Buffer('');
const cipher2 = crypto.createCipheriv('AES-256-ECB',key, iv);
let encrypted2 = cipher2.update(password, 'utf8', 'base64');
encrypted2 += cipher2.final('base64');
console.log('Encrypted password: ', encrypted2);