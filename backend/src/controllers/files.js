// backend/src/controllers/files.js
const path = require('path');
const fs = require('fs');
const { File, User } = require('../../models');
const { createClient } = require('@supabase/supabase-js');

// --- stockage: local ou supabase ---
const DRIVER = process.env.STORAGE_DRIVER || 'local';
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// archiver optionnel (pour éviter de crasher si non dispo)
let archiver = null;
try {
  // eslint-disable-next-line global-require
  archiver = require('archiver');
} catch (e) {
  console.warn('archiver non disponible, export ZIP désactivé en runtime');
}

// --- helpers supabase ---
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'firehouse';
  const client = createClient(url, key);
  return { client, bucket };
}

/**
 * GET /api/files
 * - Admin/SuperAdmin : voit tout
 * - User : ne voit que ses fichiers
 */
exports.list = async (req, res) => {
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  const where = isAdmin ? {} : { userId: req.user.id };

  const rows = await File.findAll({
    where,
    include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
    order: [['createdAt', 'DESC']],
  });

  const data = rows.map((r) => ({
    id: r.id,
    originalName: r.originalName,
    url: `/uploads/${r.storageKey}`,
    mime: r.mime,
    size: r.size,
    createdAt: r.createdAt,
    user: r.User
      ? { id: r.User.id, firstName: r.User.firstName, lastName: r.User.lastName }
      : null,
  }));

  res.json(data);
};

/**
 * GET /api/files/inbox
 * - Utilisé par FilesInbox.tsx
 * - Admin/SuperAdmin : tout
 * - User simple : uniquement ses fichiers
 */
exports.inbox = async (req, res) => {
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  const where = isAdmin ? {} : { userId: req.user.id };

  const rows = await File.findAll({
    where,
    include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] }],
    order: [['createdAt', 'DESC']],
  });

  const data = rows.map((r) => ({
    id: r.id,
    originalName: r.originalName,
    mime: r.mime,
    size: r.size,
    createdAt: r.createdAt,
    user: r.User
      ? { id: r.User.id, firstName: r.User.firstName, lastName: r.User.lastName }
      : null,
  }));

  res.json(data);
};

/**
 * GET /api/files/:id/download
 * - Téléchargement (local ou supabase)
 */
exports.download = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Fichier introuvable' });

  if (DRIVER === 'local') {
    const abs = path.join(UPLOAD_ROOT, row.storageKey);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Fichier manquant' });
    return res.download(abs, row.originalName || path.basename(abs));
  }

  // supabase
  try {
    const { client, bucket } = supabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(row.storageKey, 60);
    if (error) throw error;
    return res.redirect(data.signedUrl);
  } catch (e) {
    console.error('download supabase error', e);
    return res.status(500).json({ error: 'Téléchargement impossible' });
  }
};

/**
 * DELETE /api/files/:id
 * - Supprime le fichier (local ou supabase) + enregistrement DB
 */
exports.destroy = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Fichier introuvable' });

  if (DRIVER === 'local') {
    const abs = path.join(UPLOAD_ROOT, row.storageKey);
    if (fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch (e) {
        console.error('unlink error', e);
      }
    }
  } else {
    try {
      const { client, bucket } = supabase();
      await client.storage.from(bucket).remove([row.storageKey]);
    } catch (e) {
      console.error('supabase remove error', e);
    }
  }

  await row.destroy();
  res.json({ ok: true });
};

/**
 * GET /api/files/export
 * - Export ZIP local uniquement
 */
exports.exportZip = async (req, res) => {
  if (DRIVER !== 'local' || !archiver) {
    return res
      .status(501)
      .json({ error: 'Export ZIP indisponible dans cette configuration' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="firehouse-files.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('zip error', err);
    try { res.status(500).end(); } catch {}
  });
  archive.pipe(res);

  const rows = await File.findAll();
  for (const r of rows) {
    const abs = path.join(UPLOAD_ROOT, r.storageKey);
    if (fs.existsSync(abs)) {
      archive.file(abs, { name: r.originalName || path.basename(abs) });
    }
  }
  archive.finalize();
};

/**
 * GET /api/files/:id/view
 * - Aperçu inline (PDF, image, etc.)
 */
exports.view = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);

  if (!row) {
    return res.status(404).json({ error: 'Fichier introuvable' });
  }

  if (DRIVER === 'local') {
    const abs = path.join(UPLOAD_ROOT, row.storageKey);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: 'Fichier manquant' });
    }

    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.originalName || path.basename(abs)}"`
    );

    return res.sendFile(abs);
  }

  try {
    const { client, bucket } = supabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(row.storageKey, 60);

    if (error) throw error;

    return res.redirect(data.signedUrl);
  } catch (e) {
    console.error('view supabase error', e);
    return res.status(500).json({ error: 'Aperçu impossible' });
  }
};
