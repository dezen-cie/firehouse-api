// src/routes/files.js
const { Router } = require('express');
const ctrl = require('../controllers/files');

const r = Router();

// Inbox pour la page admin
r.get('/inbox', ctrl.inbox);

// Export ZIP (désactivé => 501)
r.get('/export', ctrl.exportZip);

// Liste générale (si tu l’utilises)
r.get('/', ctrl.list);

// Aperçu inline
r.get('/:id/view', ctrl.view);

// Téléchargement
r.get('/:id/download', ctrl.download);

// Suppression
r.delete('/:id', ctrl.destroy);

module.exports = r;
