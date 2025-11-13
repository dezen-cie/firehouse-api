const router = require('express').Router();
const ctrl = require('../controllers/reports');
router.get('/daily', ctrl.daily);
module.exports = router;
