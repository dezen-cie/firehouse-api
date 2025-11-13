// src/routes/files.js
const { Router } = require('express');
const ctrl = require('../controllers/files');
const r = Router();

// Liste reçus (page admin)
r.get('/inbox', ctrl.inbox);

// Export ZIP (désactivé proprement)
r.get('/export', ctrl.exportZip);

// Liste complète
r.get('/', ctrl.list);

// Aperçu inline
r.get('/:id/view', ctrl.view);

// Download
r.get('/:id/download', ctrl.download);

// Suppression
r.delete('/:id', ctrl.destroy);

module.exports = r;
