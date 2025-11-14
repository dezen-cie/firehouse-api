// src/routes/files.js
const { Router } = require('express');
const ctrl = require('../controllers/files');
const r = Router();

r.get('/inbox', ctrl.inbox);
r.get('/export', ctrl.exportZip);

r.get('/', ctrl.list);
r.get('/:id/url', ctrl.url);   
r.get('/:id/view', ctrl.view);
r.get('/:id/download', ctrl.download);
r.delete('/:id', ctrl.destroy);

module.exports = r;
