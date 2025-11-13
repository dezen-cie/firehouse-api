// backend/src/services/storage.js
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const DRIVER = process.env.STORAGE_DRIVER || 'local';
const ROOT = path.join(process.cwd(), 'uploads');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

// map mimetype -> extension sûre (pour images sans extension ou exotiques)
function extFromMime(mime) {
  if (!mime) return '.jpg';
  const m = mime.toLowerCase();
  if (m.includes('jpeg')) return '.jpg';
  if (m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  // HEIC/HEIF et autres → on force .jpg (express.static servira image/jpeg)
  return '.jpg';
}

// nettoie/normalise l’extension (force un point, lowercase, remplace .heic en .jpg)
function normalizeExt(origName, mime) {
  let ext = (path.extname(origName || '') || '').toLowerCase();
  if (!ext) ext = extFromMime(mime);
  if (ext === '.heic' || ext === '.heif') ext = '.jpg';
  if (!ext.startsWith('.')) ext = '.' + ext;
  return ext;
}

async function saveLocal(file, folder){
  ensureDir(path.join(ROOT, folder));
  const ext = normalizeExt(file.originalname, file.mimetype);
  const name = uuid() + ext;
  const dest = path.join(ROOT, folder, name);

  // déplace (au lieu de copier) pour éviter les fichiers tmp qui trainent
  await fs.promises.rename(file.path, dest);

  // on retourne une storageKey POSIX (slashs) pour être sûr côté URL
  return { storageKey: `${folder}/${name}` };
}

async function removeLocal(key){
  const dest = path.join(ROOT, key);
  if(fs.existsSync(dest)) fs.unlinkSync(dest);
}

function supabase(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'firehouse';
  const client = createClient(url, key);
  return { client, bucket };
}

async function saveSupabase(file, folder){
  const { client, bucket } = supabase();
  const ext = normalizeExt(file.originalname, file.mimetype);
  const name = `${folder}/${uuid()}${ext}`;
  const buf = fs.readFileSync(file.path);
  const { error } = await client.storage.from(bucket).upload(name, buf, {
    upsert: false,
    contentType: file.mimetype || 'image/jpeg'
  });
  if(error) throw error;
  return { storageKey: name };
}

async function removeSupabase(key){
  const { client, bucket } = supabase();
  await client.storage.from(bucket).remove([key]);
}

async function save(file, folder='files'){
  return DRIVER === 'supabase' ? saveSupabase(file, folder) : saveLocal(file, folder);
}

async function remove(key){
  return DRIVER === 'supabase' ? removeSupabase(key) : removeLocal(key);
}

module.exports = { save, remove };
