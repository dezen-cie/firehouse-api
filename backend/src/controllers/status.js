const { StatusHistory, File, User } = require('../../models');
const multer = require('multer');
const path = require('path');
const { z } = require('zod');
const { Op } = require('sequelize');
const { save } = require('../services/storage');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function normalizeAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/uploads/')) {
    return `${BASE_URL}${avatarUrl}`;
  }
  return avatarUrl;
}

/**
 * Middleware d'upload de fichier associé au statut.
 */
exports.uploadMiddleware = upload.single('file');

/**
 * Crée un nouvel enregistrement de statut (optionnel) et/ou un fichier associé.
 * - status : optionnel, crée une entrée StatusHistory si présent.
 * - fichier : peut être envoyé seul, sans mise à jour de statut.
 */
exports.create = async (req, res) => {
  const schema = z.object({
    status: z.enum(['AVAILABLE', 'INTERVENTION', 'UNAVAILABLE', 'ABSENT']).optional(),
    comment: z.string().max(300).optional().nullable(),
    returnAt: z.string().optional().nullable(),
  });

  const { status, comment, returnAt } = schema.parse(req.body);

  let fileId = null;
  let fileMeta = null;

  if (req.file) {
    const stored = await save(req.file, 'files');

    const file = await File.create({
      userId: req.user.id,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      storageKey: stored.storageKey,
    });

    fileId = file.id;
    fileMeta = {
      id: file.id,
      url: `/uploads/${stored.storageKey}`,
      originalName: file.originalName,
      mime: file.mime,
      size: file.size,
    };

    req.io?.to('admins').emit('files:new', {
      userId: req.user.id,
      fileId: file.id,
    });
    req.io?.to('admins').emit('badge:update', {});
  }

  let statusRecord = null;

  if (status) {
    statusRecord = await StatusHistory.create({
      userId: req.user.id,
      status,
      comment: comment || null,
      returnAt: returnAt ? new Date(returnAt) : null,
      fileId,
    });

    req.io?.to('admins').emit('status:new', {
      userId: req.user.id,
      status,
      comment,
      returnAt,
    });
  }

  return res.status(201).json({
    ok: true,
    statusHistory: statusRecord,
    file: fileMeta,
  });
};

/**
 * Retourne la liste des changements de statut de la journée en cours.
 */
exports.today = async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const list = await StatusHistory.findAll({
    where: {
      createdAt: { [Op.gte]: start },
    },
    order: [['createdAt', 'DESC']],
  });

  return res.json(list);
};

/**
 * Retourne la vue d'équipe : dernier statut connu par utilisateur,
 * trié par ordre de priorité de statut.
 */
exports.teamView = async (req, res) => {
  const users = await User.findAll({
    where: {
      role: ['user', 'admin'],
      visibleInList: true,
    },
  });

  const ids = users.map((u) => u.id);

  const allStatuses = await StatusHistory.findAll({
    where: { userId: ids },
    order: [['createdAt', 'DESC']],
  });

  const latest = {};
  for (const s of allStatuses) {
    if (!latest[s.userId]) {
      latest[s.userId] = s;
    }
  }

  const data = users.map((u) => {
    const s = latest[u.id];
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      grade: u.grade,
      avatarUrl: normalizeAvatar(u.avatarUrl),
      status: s ? s.status : 'ABSENT',
    };
  });

  const order = ['AVAILABLE', 'INTERVENTION', 'UNAVAILABLE', 'ABSENT'];

  data.sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );

  return res.json(data);
};

/**
 * Retourne le dernier statut connu de l'utilisateur connecté.
 */
exports.current = async (req, res) => {
  const last = await StatusHistory.findOne({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  if (!last) {
    return res.json({
      status: null,
      comment: null,
      returnAt: null,
    });
  }

  return res.json({
    status: last.status,
    comment: last.comment,
    returnAt: last.returnAt,
  });
};
