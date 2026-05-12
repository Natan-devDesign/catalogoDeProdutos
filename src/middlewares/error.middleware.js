// =============================================================
// src/middlewares/error.middleware.js
// =============================================================
'use strict';

module.exports = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[${status}] ${req.method} ${req.url} —`, err.message);

  if (req.accepts('html')) {
    if (status === 404) {
      return res.status(404).render('public/404', {
        title: 'Página não encontrada',
        marketingHead: '', marketingBody: '',
      });
    }
    return res.status(status).send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@600&display=swap" rel="stylesheet"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Rajdhani',sans-serif;background:#071470;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;padding:2rem;text-align:center}h1{font-family:'Bebas Neue',sans-serif;font-size:6rem;letter-spacing:.1em}p{opacity:.5;font-size:.9rem;letter-spacing:.1em}a{color:#60a5fa;text-decoration:none;font-weight:700;font-size:.8rem;letter-spacing:.12em}</style>
</head><body>
<h1>${status}</h1>
<p>${status === 500 ? 'ERRO INTERNO DO SERVIDOR' : (err.message || 'ALGO DEU ERRADO')}</p>
<a href="javascript:history.back()">← VOLTAR</a>
</body></html>`);
  }

  res.status(status).json({
    error: status === 500 ? 'Erro interno do servidor.' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
