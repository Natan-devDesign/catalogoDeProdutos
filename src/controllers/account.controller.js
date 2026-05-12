'use strict';
const bcrypt          = require('bcrypt');
const { UserModel, AuditLogModel } = require('../models');

// GET /admin/minha-conta — próprio usuário
exports.showAccount = async (req, res) => {
  res.render('admin/account', {
    pageTitle:   'Minha Conta',
    currentPage: 'account',
    breadcrumb:  '// CONFIG / MINHA CONTA',
    user:        req.user,
    flash:       _flash(req),
    targetUser:  null,
  });
};

// POST /admin/minha-conta — alterar própria senha
exports.changeOwnPassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  try {
    // Validações
    if (!current_password || !new_password || !confirm_password) {
      return res.redirect('/admin/minha-conta?error=campos');
    }
    if (new_password !== confirm_password) {
      return res.redirect('/admin/minha-conta?error=confirmacao');
    }
    if (new_password.length < 8) {
      return res.redirect('/admin/minha-conta?error=curta');
    }

    // Verificar senha atual
    const dbUser = await UserModel.findByEmail(req.user.email);
    if (!dbUser) return res.redirect('/auth/login');

    const valid = await bcrypt.compare(current_password, dbUser.password_hash);
    if (!valid) {
      return res.redirect('/admin/minha-conta?error=incorreta');
    }

    // Atualizar senha
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const hash   = await bcrypt.hash(new_password, rounds);
    await UserModel.updatePassword(dbUser.id, hash);

    await AuditLogModel.log({
      userId: req.user.id, action: 'user.password_change',
      entityType: 'user', entityId: req.user.id,
      ipAddress: req.ip,
    });

    res.redirect('/admin/minha-conta?success=senha');
  } catch (err) {
    console.error('[account.changeOwnPassword]', err);
    res.redirect('/admin/minha-conta?error=interno');
  }
};

// GET /admin/usuarios/:id/senha — admin altera senha de qualquer user
exports.showChangePassword = async (req, res, next) => {
  try {
    const targetUser = await UserModel.findById(req.params.id);
    if (!targetUser) return res.status(404).render('public/404', { title: '404' });

    res.render('admin/account', {
      pageTitle:   `Alterar Senha — ${targetUser.name}`,
      currentPage: 'users',
      breadcrumb:  `// USUARIOS / ${targetUser.name.toUpperCase()}`,
      user:        req.user,
      flash:       _flash(req),
      targetUser,              // quando definido, é o admin alterando outro usuário
    });
  } catch (err) { next(err); }
};

// POST /admin/usuarios/:id/senha — admin altera senha de outro usuário
exports.adminChangePassword = async (req, res, next) => {
  const { new_password, confirm_password } = req.body;
  const targetId = req.params.id;

  try {
    if (!new_password || !confirm_password) {
      return res.redirect(`/admin/usuarios/${targetId}/senha?error=campos`);
    }
    if (new_password !== confirm_password) {
      return res.redirect(`/admin/usuarios/${targetId}/senha?error=confirmacao`);
    }
    if (new_password.length < 8) {
      return res.redirect(`/admin/usuarios/${targetId}/senha?error=curta`);
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const hash   = await bcrypt.hash(new_password, rounds);
    await UserModel.updatePassword(targetId, hash);

    await AuditLogModel.log({
      userId: req.user.id, action: 'user.admin_password_change',
      entityType: 'user', entityId: targetId,
      ipAddress: req.ip,
    });

    res.redirect(`/admin/usuarios/${targetId}/senha?success=senha`);
  } catch (err) {
    console.error('[account.adminChangePassword]', err);
    res.redirect(`/admin/usuarios/${targetId}/senha?error=interno`);
  }
};

// ── Helpers ──────────────────────────────────────────────────
function _flash(req) {
  const { success, error } = req.query;
  const msgs = {
    'senha':        { type: 'success', message: 'Senha alterada com sucesso!' },
    'campos':       { type: 'error',   message: 'Preencha todos os campos obrigatorios.' },
    'confirmacao':  { type: 'error',   message: 'A nova senha e a confirmacao nao coincidem.' },
    'curta':        { type: 'error',   message: 'A nova senha deve ter no minimo 8 caracteres.' },
    'incorreta':    { type: 'error',   message: 'Senha atual incorreta.' },
    'interno':      { type: 'error',   message: 'Erro interno. Tente novamente.' },
  };
  if (success && msgs[success]) return msgs[success];
  if (error   && msgs[error])   return msgs[error];
  return null;
}
