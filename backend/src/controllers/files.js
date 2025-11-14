const path = require('path');
const fs = require('fs');
const { File, User } = require('../../models');
const { createClient } = require('@supabase/supabase-js');

const DRIVER = process.env.STORAGE_DRIVER || 'local';
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

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
    mime: r.mime,
    size: r.size,
    createdAt: r.createdAt,
    user: r.User ? {
      id: r.User.id,
      firstName: r.User.firstName,
      lastName: r.User.lastName
    } : null
    // pas besoin d'URL ici, on passe par /files/:id/url
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
 * GET /api/files/:id/url
 * Retourne une URL directement ouvrable dans un nouvel onglet
 * - local : BASE_URL/uploads/...
 * - supabase : URL signée
 */
exports.url = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await File.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Fichier introuvable' });

  // stockage local: on pointe vers /uploads/...
  if (DRIVER === 'local') {
    const url = `${BASE_URL}/uploads/${row.storageKey}`;
    return res.json({ url });
  }

  // supabase: URL signée
  try {
    const { client, bucket } = supabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(row.storageKey, 60);

    if (error) {
      console.error('SUPABASE SIGN ERROR', error);
      return res.status(500).json({ error: 'Impossible de générer l’URL' });
    }

    return res.json({ url: data.signedUrl });
  } catch (e) {
    console.error('SUPABASE URL ERROR', e);
    return res.status(500).json({ error: 'Impossible de générer l’URL' });
  }
};

/**
 * GET /api/files/:id/download
 * (Optionnel, tu peux maintenant passer uniquement par /url côté front,
 * mais je le laisse si tu en as besoin ailleurs.)
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
    console.error('DOWNLOAD ERROR', e);
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
    console.error('VIEW ERROR', e);
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
      console.error('SUPABASE REMOVE ERROR', e);
    }
  }

  await row.destroy();
  res.json({ ok: true });
};

/**
 * GET /api/files/export
 * toujours désactivé ici
 */
exports.exportZip = (req, res) => {
  return res.status(501).json({
    error: 'Export ZIP désactivé sur cet hébergement'
  });
};
