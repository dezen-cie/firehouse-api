const router = require('express').Router();
const ctrl = require('../controllers/status');
router.post('/', ctrl.uploadMiddleware, ctrl.create);
router.get('/today', ctrl.today);
router.get('/current', ctrl.current);
module.exports = router;
