// src/services/storage.js
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const DRIVER = process.env.STORAGE_DRIVER || 'local';
const ROOT = path.join(process.cwd(), 'uploads');

// -- utilitaires extensions / dossiers --

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function extFromMime(mime) {
  if (!mime) return '.jpg';
  const m = mime.toLowerCase();
  if (m.includes('jpeg')) return '.jpg';
  if (m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.jpg';
}

function normalizeExt(origName, mime) {
  let ext = (path.extname(origName || '') || '').toLowerCase();
  if (!ext) ext = extFromMime(mime);
  if (ext === '.heic' || ext === '.heif') ext = '.jpg';
  if (!ext.startsWith('.')) ext = '.' + ext;
  return ext;
}

// -- LOCAL --

async function saveLocal(file, folder) {
  ensureDir(path.join(ROOT, folder));
  const ext = normalizeExt(file.originalname, file.mimetype);
  const name = uuid() + ext;
  const dest = path.join(ROOT, folder, name);

  await fs.promises.rename(file.path, dest);
  return { storageKey: `${folder}/${name}` };
}

async function removeLocal(key) {
  const dest = path.join(ROOT, key);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
}

// -- SUPABASE --

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'firehouse';

  if (!url || !key) {
    console.error(
      'Supabase non configuré : SUPABASE_URL ou SUPABASE_KEY manquants. ' +
      'STORAGE_DRIVER =', DRIVER
    );
    return null;
  }

  const client = createClient(url, key);
  return { client, bucket };
}

async function saveSupabase(file, folder) {
  const ctx = supabase();
  if (!ctx) {
    throw new Error('Supabase non configuré (saveSupabase)');
  }
  const { client, bucket } = ctx;

  const ext = normalizeExt(file.originalname, file.mimetype);
  const name = `${folder}/${uuid()}${ext}`;
  const buf = fs.readFileSync(file.path);

  const { error } = await client.storage.from(bucket).upload(name, buf, {
    upsert: false,
    contentType: file.mimetype || 'image/jpeg',
  });
  if (error) throw error;

  return { storageKey: name };
}

async function removeSupabase(key) {
  const ctx = supabase();
  if (!ctx) return;
  const { client, bucket } = ctx;
  await client.storage.from(bucket).remove([key]);
}

// -- API publique --

async function save(file, folder = 'files') {
  return DRIVER === 'supabase'
    ? saveSupabase(file, folder)
    : saveLocal(file, folder);
}

async function remove(key) {
  return DRIVER === 'supabase'
    ? removeSupabase(key)
    : removeLocal(key);
}

// URL publique pour affichage avatar / fichiers
function publicUrl(key) {
  if (!key) return null;

  if (DRIVER === 'supabase') {
    const ctx = supabase();
    if (!ctx) {
      // fallback dégradé, mais au moins ça ne crash pas
      return `/uploads/${key}`;
    }
    const { client, bucket } = ctx;
    const { data } = client.storage.from(bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  // mode local
  return `/uploads/${key}`;
}

module.exports = { save, remove, publicUrl };
