// Uso: node scripts/hash-password.js MinhaS3nha!
const bcrypt = require('bcrypt');
const password = process.argv[2];
if (!password) { console.error('Uso: node scripts/hash-password.js <senha>'); process.exit(1); }
bcrypt.hash(password, 12).then(hash => {
  console.log('\n✅ Hash gerado:\n' + hash);
  console.log('\nSQL:\nUPDATE users SET password_hash = \'' + hash + '\' WHERE email = \'admin@briwax.com.br\';');
});
