// =============================================================
// src/config/database.js
// =============================================================
'use strict';
const { Pool } = require('pg');


let poolConfig;

if (process.env.DATABASE_URL) {
  // Modo Railway/Render/Heroku com URL única
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  };
} else {
  poolConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'briwax',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

const pool = new Pool({
  ...poolConfig,
  max:                    10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};


// =============================================================
// src/controllers/barrel.js  (exporta todos os controllers)
// Importe em routes com: require('../controllers')
// =============================================================
// module.exports = {
//   authController:      require('./auth.controller'),
//   dashboardController: require('./dashboard.controller'),
//   productController:   require('./product.controller'),
//   homeController:      require('./home.controller'),
//   catalogController:   require('./catalog.controller'),
//   marketingController: require('./marketing.controller'),
// };


// =============================================================
// src/models/barrel.js  (exporta todos os models)
// =============================================================
// OBS: este arquivo já está em src/models/index.js
// Basta que Product.model.js exporte normalmente:
//   module.exports = ProductModel;
// e os demais via src/models/index.js


// =============================================================
// .gitignore
// =============================================================
/*
  Cole no arquivo .gitignore na raiz do projeto:

node_modules/
.env
public/uploads/products/*
!public/uploads/products/.gitkeep
*.log
dist/
.DS_Store
*/


// =============================================================
// SCRIPT UTILITÁRIO: Gerar hash de senha
// Uso: node scripts/hash-password.js MinhaS3nha!
// =============================================================
// Crie o arquivo scripts/hash-password.js com o conteúdo abaixo:
/*
const bcrypt = require('bcrypt');
const password = process.argv[2];
if (!password) { console.error('Uso: node scripts/hash-password.js <senha>'); process.exit(1); }
bcrypt.hash(password, 12).then(hash => {
  console.log('\n✅ Hash gerado:');
  console.log(hash);
  console.log('\nCole no seed.sql ou faça UPDATE diretamente:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@briwax.com.br';`);
  process.exit(0);
});
*/
