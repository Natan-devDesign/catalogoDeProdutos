// =============================================================
// src/routes/public.routes.js
// =============================================================
'use strict';
const router      = require('express').Router();
const homeCtrl    = require('../controllers/home.controller');
const catalogCtrl = require('../controllers/catalog.controller');

router.get('/',                       homeCtrl.showHome);
router.get('/catalogo/:categorySlug', catalogCtrl.showCatalog);
router.get('/produto/:slug',          catalogCtrl.showProduct);
router.get('/api/catalog/search',     catalogCtrl.apiSearch);

module.exports = router;
