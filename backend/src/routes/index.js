const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/me', auth(true), require('./me'));
router.use('/users', auth(true), requireRole('admin','super_admin'), require('./users'));
router.use('/status', auth(true), require('./status'));
router.use('/reports', auth(true), requireRole('admin','super_admin'), require('./reports'));
router.use('/conversations', auth(true), require('./conversations'));
router.use('/files', auth(true), requireRole('admin','super_admin'), require('./files'));
router.use('/admin', auth(true), requireRole('admin','super_admin'), require('./admin'));

module.exports = router;
