// src/controllers/files.js
const path = require('path');
const fs = require('fs');
const { File, User } = require('../../models');
const { createClient } = require('@supabase/supabase-js');

const DRIVER = process.env.STORAGE_DRIVER || 'local';
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

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
  const isAdmin = ['admin','super_admin'].includes(req.user.role);
  const where = isAdmin ? {} : { userId: req.user.id };

  const rows = await File.findAll({
    where,
    include: [{ model: User, as: 'User', attributes: ['id','firstName','lastName'] }],
    order: [['createdAt','DESC']]
  });

  const data = rows.map(r => ({
    id: r.id,
    originalName: r.originalName,
    url: `/uploads/${r.storageKey}`,
    mime: r.mime,
    size: r.size,
    createdAt: r.createdAt,
    user: r.User ? {
      id: r.User.id,
      firstName: r.User.firstName,
      lastName: r.User.lastName
    } : null
  }));

  res.json(data);
};

/**
 * GET /api/files/inbox
 * - Utilisé par FilesInbox.tsx
 * - Admin/SuperAdmin : tout
 * - User simple : uniquement ses fichiers (optionnel)
 */
exports.inbox = async (req, res) => {
  const isAdmin = ['admin','super_admin'].includes(req.user.role);
  const where = isAdmin ? {} : { userId: req.user.id };

  const rows = await File.findAll({
    where,
    include: [{ model: User, as: 'User', attributes: ['id','firstName','lastName'] }],
    order: [['createdAt','DESC']]
  });

  const data = rows.map(r => ({
    id: r.id,
    originalName: r.originalName,
    mime: r.mime,
    size: r.size,
    createdAt: r.createdAt,
    user: r.User ? {
      id: r.User.id,
      firstName: r.User.firstName,
      lastName: r.User.lastName
    } : null
  }));

  res.json(data);
};

/**
 * GET /api/files/:id/download
 * Téléchargement classique (Content-Disposition: attachment)
 */
exports.download = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Fichier introuvable' });

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

    if (error) throw error;
    return res.redirect(data.signedUrl);
  } catch (e) {
    return res.status(500).json({ error: 'Téléchargement impossible' });
  }
};

/**
 * GET /api/files/:id/view
 * Aperçu inline (PDF, image, etc.)
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
 * DELETE /api/files/:id
 */
exports.destroy = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Fichier introuvable' });

  if (DRIVER === 'local') {
    const abs = path.join(UPLOAD_ROOT, row.storageKey);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } else {
    try {
      const { client, bucket } = supabase();
      await client.storage.from(bucket).remove([row.storageKey]);
    } catch (e) {
      // on ignore si la suppression distante fail, le record reste supprimé en DB
    }
  }

  await row.destroy();
  res.json({ ok: true });
};

/**
 * GET /api/files/export
 * 👉 pour l’instant désactivé en prod (archiver viré pour éviter les crashs)
 */
exports.exportZip = (req, res) => {
  return res.status(501).json({
    error: 'Export ZIP désactivé sur cet hébergement'
  });
};


/**
 * GET /api/files/:id/url
 * Retourne une URL "publique" (locale ou Supabase) pour visualiser/télécharger le fichier.
 * Cette route est protégée (auth + admin) mais l'URL retournée ne l'est pas.
 */
exports.publicUrl = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);

  if (!row) {
    return res.status(404).json({ error: 'Fichier introuvable' });
  }

  // stockage local : on renvoie simplement /uploads/...
  if (DRIVER === 'local') {
    return res.json({
      url: `/uploads/${row.storageKey}`,
      filename: row.originalName,
      mime: row.mime,
    });
  }

  // stockage Supabase : on génère une URL signée courte durée
  try {
    const { client, bucket } = supabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(row.storageKey, 60); // 60 secondes

    if (error) throw error;

    return res.json({
      url: data.signedUrl,
      filename: row.originalName,
      mime: row.mime,
    });
  } catch (e) {
    console.error('publicUrl error', e);
    return res.status(500).json({ error: 'Impossible de générer une URL de fichier' });
  }
};
