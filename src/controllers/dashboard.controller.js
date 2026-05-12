'use strict';
const bcrypt = require('bcrypt');
const Product = require('../models/Product.model');
const { UserModel, CategoryModel, AuditLogModel } = require('../models');

// ── DASHBOARD PRINCIPAL ────────────────────────────────────────────
exports.index = async (req, res, next) => {
  try {
    const [totalProducts, categories, recentLogs] = await Promise.all([
      Product.countAll(),
      CategoryModel.findAll(),
      AuditLogModel.recent(8),
    ]);
    res.render('admin/dashboard', {
      pageTitle: 'Dashboard', currentPage: 'dashboard',
      breadcrumb: '// VISÃO GERAL',
      user: req.user, flash: null,
      totalProducts, categories, recentLogs,
    });
  } catch (err) { next(err); }
};

// ── LISTAR USUÁRIOS ────────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const users = await UserModel.findAll();
    res.render('admin/users', {
      pageTitle: 'Usuários', currentPage: 'users',
      breadcrumb: '// CONFIG / USUÁRIOS',
      user: req.user,
      flash: req.query.success
        ? { type: 'success', message: 'Usuário criado com sucesso.' }
        : req.query.error
          ? { type: 'error', message: 'Erro ao criar usuário. E-mail já cadastrado?' }
          : null,
      users,
    });
  } catch (err) { next(err); }
};

// ── CRIAR USUÁRIO ──────────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.redirect('/admin/usuarios?error=campos');
  }
  try {
    const rounds      = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);
    await UserModel.create({
      name:  name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role:  ['admin', 'editor'].includes(role) ? role : 'editor',
    });
    await AuditLogModel.log({
      userId: req.user.id, action: 'user.create',
      entityType: 'user', entityId: email,
      newValue: { name, role },
      ipAddress: req.ip,
    });
    res.redirect('/admin/usuarios?success=1');
  } catch (err) {
    console.error('[dashboard.createUser]', err);
    res.redirect('/admin/usuarios?error=1');
  }
};
