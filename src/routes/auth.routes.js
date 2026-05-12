// =============================================================
// src/routes/auth.routes.js
// =============================================================
'use strict';
const router   = require('express').Router();
const authCtrl = require('../controllers/auth.controller');

router.get('/login',   authCtrl.showLogin);
router.post('/login',  authCtrl.doLogin);
router.post('/logout', authCtrl.doLogout);

module.exports = router;
