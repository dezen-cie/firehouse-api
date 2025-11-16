// src/controllers/me.js
const { User } = require('../../models');
const multer = require('multer');
const path = require('path');
const { save, remove, publicUrl } = require('../services/storage');

const upload = multer({
  dest: path.join(process.cwd(), 'uploads', 'tmp'),
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_BYTES || '5242880', 10),
  },
});

// middleware pour route avatar
exports.uploadAvatarMiddleware = upload.single('avatar');

// GET /api/me
exports.get = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  res.json(user);
};

// PATCH /api/me
exports.update = async (req, res) => {
  const payload = { ...req.body };
  if (payload.email) delete payload.email;

  const user = await User.findByPk(req.user.id);
  await user.update(payload);
  res.json(user);
};

// PUT /api/me/avatar
exports.avatar = async (req, res) => {
  const user = await User.findByPk(req.user.id);

  // on nettoie l'ancien avatar seulement si c'était un fichier local
  if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
    try {
      const key = user.avatarUrl.replace('/uploads/', '');
      await remove(key);
    } catch (e) {
      // silencieux
    }
  }

  const stored = await save(req.file, 'avatars');
  const url = publicUrl(stored.storageKey);

  await user.update({ avatarUrl: url });

  res.json({ avatarUrl: url });
};
