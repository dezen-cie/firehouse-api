const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { File, User } = require('../../models');
const { createClient } = require('@supabase/supabase-js');

const DRIVER = process.env.STORAGE_DRIVER || 'local';
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Initialise un client Supabase pour le stockage de fichiers.
 */
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'firehouse';
  const client = createClient(url, key);
  return { client, bucket };
}

/**
 * Retourne la liste des fichiers accessibles pour l'utilisateur courant.
 * - Admin : voit tous les fichiers.
 * - Utilisateur : ne voit que ses propres fichiers.
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

  return res.json(data);
};

/**
 * Retourne les fichiers à afficher dans la "boîte de réception" de fichiers.
 * - Admin : voit tous les fichiers.
 * - Utilisateur : ne voit que ses propres fichiers.
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
    url: DRIVER === 'local' ? `/uploads/${r.storageKey}` : null,
  }));

  return res.json(data);
};

/**
 * Sert un fichier en aperçu inline (PDF, image, etc.).
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

    if (error) {
      throw error;
    }

    return res.redirect(data.signedUrl);
  } catch (e) {
    return res.status(500).json({ error: 'Aperçu impossible' });
  }
};

/**
 * Déclenche le téléchargement d'un fichier par son identifiant.
 */
exports.download = async (req, res) => {
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

    return res.download(abs, row.originalName || path.basename(abs));
  }

  try {
    const { client, bucket } = supabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(row.storageKey, 60);

    if (error) {
      throw error;
    }

    return res.redirect(data.signedUrl);
  } catch (e) {
    return res.status(500).json({ error: 'Téléchargement impossible' });
  }
};

/**
 * Supprime un fichier (stockage et enregistrement en base).
 */
exports.destroy = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);

  if (!row) {
    return res.status(404).json({ error: 'Fichier introuvable' });
  }

  if (DRIVER === 'local') {
    const abs = path.join(UPLOAD_ROOT, row.storageKey);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
  } else {
    try {
      const { client, bucket } = supabase();
      await client.storage.from(bucket).remove([row.storageKey]);
    } catch (e) {
      // En prod on ne remonte pas l'erreur de suppression externe si le record DB est supprimé
    }
  }

  await row.destroy();

  return res.json({ ok: true });
};

/**
 * Exporte tous les fichiers présents sur le stockage local dans une archive ZIP.
 */
exports.exportZip = async (req, res) => {
  if (DRIVER !== 'local') {
    return res
      .status(501)
      .json({ error: 'Export ZIP indisponible avec Supabase' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="firehouse-files.zip"'
  );

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', () => res.status(500).end());
  archive.pipe(res);

  const rows = await File.findAll();

  for (const r of rows) {
    const abs = path.join(UPLOAD_ROOT, r.storageKey);
    if (fs.existsSync(abs)) {
      archive.file(abs, {
        name: r.originalName || path.basename(abs),
      });
    }
  }

  archive.finalize();
};
