const router = require('express').Router();
const ctrl = require('../controllers/users');
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
module.exports = router;
