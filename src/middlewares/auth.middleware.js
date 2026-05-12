// =============================================================
// src/middlewares/auth.middleware.js
// =============================================================
'use strict';
const jwt = require('jsonwebtoken');

exports.requireAuth = (req, res, next) => {
  const token =
    req.cookies?.jwt ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return req.accepts('html')
      ? res.redirect('/auth/login')
      : res.status(401).json({ error: 'Não autenticado.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('jwt');
    return req.accepts('html')
      ? res.redirect('/auth/login')
      : res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return req.accepts('html')
      ? res.status(403).render('admin/403', {
          pageTitle: 'Acesso Negado', currentPage: '',
          breadcrumb: '// 403', user: req.user, flash: null,
        })
      : res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};
