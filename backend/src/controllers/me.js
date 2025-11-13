const { User } = require('../../models');
const multer = require('multer');
const path = require('path');
const { save, remove } = require('../services/storage');

const upload = multer({
  dest: path.join(process.cwd(), 'uploads', 'tmp'),
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_BYTES || '5242880', 10),
  },
});

/**
 * Middleware d'upload pour l'avatar utilisateur.
 */
exports.uploadAvatarMiddleware = upload.single('avatar');

/**
 * Retourne le profil complet de l'utilisateur connecté.
 */
exports.get = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  return res.json(user);
};

/**
 * Met à jour les informations de profil de l'utilisateur connecté.
 * L'email ne peut pas être modifié via cette route.
 */
exports.update = async (req, res) => {
  const payload = { ...req.body };

  if (payload.email) {
    delete payload.email;
  }

  const user = await User.findByPk(req.user.id);
  await user.update(payload);

  return res.json(user);
};

/**
 * Met à jour l'avatar de l'utilisateur connecté.
 * L'ancien fichier local est supprimé si nécessaire.
 */
exports.avatar = async (req, res) => {
  const user = await User.findByPk(req.user.id);

  if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
    try {
      await remove(user.avatarUrl.replace('/uploads/', ''));
    } catch (e) {
      // on ignore les erreurs de suppression d'un ancien fichier
    }
  }

  const stored = await save(req.file, 'avatars');
  const newPath = `/uploads/${stored.storageKey}`;

  await user.update({ avatarUrl: newPath });

  return res.json({ avatarUrl: newPath });
};
