'use strict';
const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const { UserModel } = require('../models');

exports.showLogin = (req, res) => {
  const token = req.cookies?.jwt;
  if (token) {
    try { jwt.verify(token, process.env.JWT_SECRET); return res.redirect('/admin'); } catch {}
  }
  res.render('auth/login', { error: null, title: 'Login' });
};

exports.doLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('auth/login', { error: 'Preencha e-mail e senha.', title: 'Login' });
  }
  try {
    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user || !user.is_active) {
      return res.render('auth/login', { error: 'Credenciais inválidas.', title: 'Login' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/login', { error: 'Credenciais inválidas.', title: 'Login' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    await UserModel.updateLastLogin(user.id);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   8 * 60 * 60 * 1000,
    });
    return res.redirect('/admin');
  } catch (err) {
    console.error('[auth.doLogin]', err);
    return res.render('auth/login', { error: 'Erro interno. Tente novamente.', title: 'Login' });
  }
};

exports.doLogout = (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/auth/login');
};
