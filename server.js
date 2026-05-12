// =============================================================
// server.js — Entry point (apenas faz o listen)
// =============================================================
'use strict';
const app = require('./app');
const { pool } = require('./src/config/database');
require('./listener');
const PORT = process.env.PORT || 3000;

async function start() {
  // Testar conexão com o banco antes de subir
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT NOW() AS now');
    client.release();
    console.log(`✅ PostgreSQL conectado · ${rows[0].now}`);
  } catch (err) {
    console.error('❌ Falha na conexão com PostgreSQL:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 BRIWAX rodando em http://localhost:${PORT}`);
    console.log(`   Dashboard: http://localhost:${PORT}/admin`);
    console.log(`   Ambiente:  ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido. Encerrando...');
  await pool.end();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
