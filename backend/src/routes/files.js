// backend/src/routes/files.js
const { Router } = require('express');
const ctrl = require('../controllers/files');

const r = Router();

// Boîte de réception fichiers
r.get('/inbox', ctrl.inbox);

// Export ZIP (local uniquement, 501 sinon)
r.get('/export', ctrl.exportZip);

// Liste générale
r.get('/', ctrl.list);

// Aperçu inline
r.get('/:id/view', ctrl.view);

// Téléchargement
r.get('/:id/download', ctrl.download);

// Suppression
r.delete('/:id', ctrl.destroy);

module.exports = r;
