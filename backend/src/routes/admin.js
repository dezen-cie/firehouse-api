const router = require('express').Router();
const ctrl = require('../controllers/status');
router.get('/team', ctrl.teamView);
module.exports = router;
