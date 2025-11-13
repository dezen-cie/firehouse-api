// src/controllers/users.js
const { User } = require('../../models');
const bcrypt = require('bcrypt');
const { z } = require('zod');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function normalizeAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/uploads/')) {
    return `${BASE_URL}${avatarUrl}`;
  }
  return avatarUrl;
}

/**
 * Schéma de validation pour les mots de passe administrateur.
 */
const passwordSchema = z
  .string()
  .min(6)
  .regex(/[A-Z]/, '1 majuscule')
  .regex(/[a-z]/, '1 minuscule')
  .regex(/[0-9]/, '1 chiffre')
  .regex(/[^A-Za-z0-9]/, '1 caractère spécial');

/**
 * Liste les utilisateurs ayant un rôle "user" ou "admin".
 */
exports.list = async (req, res) => {
  const users = await User.findAll({
    where: { role: ['user', 'admin'] },
    order: [
      ['lastName', 'ASC'],
      ['firstName', 'ASC'],
    ],
  });

  const data = users.map(u => {
    const plain = u.toJSON();
    plain.avatarUrl = normalizeAvatar(plain.avatarUrl);
    return plain;
  });

  return res.json(data);
};

/**
 * Crée un nouvel utilisateur (user ou admin).
 * Seuls les admins et super-admins sont autorisés à créer un admin.
 */
exports.create = async (req, res) => {
  const schema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    grade: z.string().optional().nullable(),
    role: z.enum(['user', 'admin']),
    password: passwordSchema,
  });

  const data = schema.parse(req.body);
  data.email = data.email.toLowerCase().trim();

  const canCreateAdmin =
    req.user.role === 'admin' || req.user.role === 'super_admin';

  if (data.role === 'admin' && !canCreateAdmin) {
    return res.status(403).json({
      error: 'Droits insuffisants pour créer un administrateur',
    });
  }

  const existing = await User.findOne({
    where: { email: data.email },
  });

  if (existing) {
    return res.status(400).json({ error: 'Email déjà utilisé' });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    ...data,
    passwordHash,
    avatarUrl: '/illu-pompier.png',
  });

  const plain = user.toJSON();
  plain.avatarUrl = normalizeAvatar(plain.avatarUrl);

  return res.status(201).json(plain);
};

/**
 * Met à jour un utilisateur existant.
 * - Impossible de modifier un super-admin.
 * - Seuls admin/super-admin peuvent modifier un admin.
 * - L'email ne peut pas être modifié.
 */
exports.update = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({ error: 'Introuvable' });
  }

  if (user.role === 'super_admin') {
    return res.status(403).json({ error: 'Interdit' });
  }

  const canEditAdmin =
    req.user.role === 'admin' || req.user.role === 'super_admin';

  if (user.role === 'admin' && !canEditAdmin) {
    return res.status(403).json({ error: 'Droits insuffisants' });
  }

  const payload = { ...req.body };

  if (payload.role) {
    if (!['user', 'admin'].includes(payload.role)) {
      return res.status(403).json({ error: 'Rôle invalide' });
    }
  }

  if (payload.email) {
    delete payload.email;
  }

  if (payload.password) {
    payload.passwordHash = await bcrypt.hash(payload.password, 10);
    delete payload.password;
  }

  await user.update(payload);

  const plain = user.toJSON();
  plain.avatarUrl = normalizeAvatar(plain.avatarUrl);

  return res.json(plain);
};

/**
 * Supprime un utilisateur.
 * - Impossible de supprimer un super-admin.
 * - Seul le super-admin peut supprimer un admin.
 */
exports.remove = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({ error: 'Introuvable' });
  }

  if (user.role === 'super_admin') {
    return res.status(403).json({ error: 'Interdit' });
  }

  if (user.role === 'admin' && req.user.role !== 'super_admin') {
    return res
      .status(403)
      .json({ error: 'Seul le super-admin peut supprimer un admin' });
  }

  await user.destroy();

  return res.json({ ok: true });
};
