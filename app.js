// =============================================================
// app.js — Express Application (sem o listen)
// =============================================================
'use strict';
require('dotenv').config();

const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

const app = express();

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com',
                   'https://connect.facebook.net', 'https://www.googletagmanager.com',
                   'https://www.google-analytics.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https://www.facebook.com', 'https://www.google-analytics.com'],
      connectSrc: ["'self'", 'https://www.facebook.com', 'https://analytics.google.com'],
    },
  },
}));

// Rate limiting para login (proteção contra brute-force)
app.use('/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      10,               // 10 tentativas por IP
  message:  'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders:   false,
}));

// Rate limiting geral para /admin
app.use('/admin', rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max:      120,
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Arquivos estáticos ────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

// ── Template engine (EJS) ─────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ── Variáveis locais globais para todas as views ──────────────
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  res.locals.env = process.env.NODE_ENV || 'development';
  next();
});

// ── Rotas ─────────────────────────────────────────────────────
app.use('/',      require('./src/routes/public.routes'));
app.use('/auth',  require('./src/routes/auth.routes'));
app.use('/admin', require('./src/routes/admin.routes'));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('public/404', {
    title: 'Página não encontrada',
    active: null, marketingHead: '', marketingBody: '',
  });
});

// ── Error handler ─────────────────────────────────────────────
app.use(require('./src/middlewares/error.middleware'));

const PORT = 3000; // Ou a porta que você preferir
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Acesse pelo celular usando o IP da sua rede na porta ${PORT}`);
});

module.exports = app;
