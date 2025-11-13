const router = require('express').Router();
const ctrl = require('../controllers/me');
router.get('/', ctrl.get);
router.patch('/', ctrl.update);
router.put('/avatar', ctrl.uploadAvatarMiddleware, ctrl.avatar);
module.exports = router;
