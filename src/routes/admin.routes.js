// =============================================================
// src/routes/admin.routes.js
// =============================================================
'use strict';
const router      = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const upload      = require('../middlewares/upload.middleware');
const dashCtrl    = require('../controllers/dashboard.controller');
const productCtrl = require('../controllers/product.controller');
const homeCtrl    = require('../controllers/home.controller');
const mktCtrl     = require('../controllers/marketing.controller');
const accountCtrl = require('../controllers/account.controller');

// ── Todas as rotas /admin/* exigem autenticação ─────────────
router.use(requireAuth);

// Redirecionar /admin/login → /auth/login (já autenticado)
router.get('/login', (req, res) => res.redirect('/auth/login'));

// ── Dashboard ────────────────────────────────────────────────
router.get('/', dashCtrl.index);

// ── Produtos ─────────────────────────────────────────────────
router.get('/produtos',              productCtrl.list);
router.get('/produtos/novo',         productCtrl.createForm);
router.post('/produtos/novo',        upload.array('imagens', 10), productCtrl.create);
router.get('/produtos/:id/editar',   productCtrl.editForm);
router.post('/produtos/:id',         upload.array('imagens', 10), productCtrl.update);
router.post('/produtos/:id/excluir', productCtrl.remove);

// ── Editor da Home ───────────────────────────────────────────
router.get('/home-editor',                  homeCtrl.showEditor);
router.post('/home-editor/featured',        homeCtrl.updateFeatured);    // antes de :key
router.post('/home-editor/reorder',         homeCtrl.reorderSections);   // antes de :key
router.post('/home-editor/:key',            homeCtrl.updateSection);
router.get('/api/produtos-disponiveis',     homeCtrl.listAvailableProducts);

// ── Marketing (somente admin) ────────────────────────────────
router.get('/marketing',  requireAdmin, mktCtrl.showConfig);
router.post('/marketing', requireAdmin, mktCtrl.updateConfig);

// ── Usuários (somente admin) ─────────────────────────────────
router.get('/usuarios',  requireAdmin, dashCtrl.listUsers);
router.post('/usuarios', requireAdmin, dashCtrl.createUser);

// ── Minha Conta — qualquer usuario autenticado ──────────────
router.get('/minha-conta',          accountCtrl.showAccount);
router.post('/minha-conta',         accountCtrl.changeOwnPassword);

// ── Alterar senha de outro usuario — somente admin ───────────
router.get('/usuarios/:id/senha',   require('../middlewares/auth.middleware').requireAdmin, accountCtrl.showChangePassword);
router.post('/usuarios/:id/senha',  require('../middlewares/auth.middleware').requireAdmin, accountCtrl.adminChangePassword);

module.exports = router;
