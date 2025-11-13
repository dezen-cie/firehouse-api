const { Conversation, Message, User } = require('../../models');
const { Op } = require('sequelize');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function normalizeAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/uploads/')) {
    return `${BASE_URL}${avatarUrl}`;
  }
  return avatarUrl;
}

/**
 * Retourne la liste des conversations de l'utilisateur courant.
 */
exports.list = async (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  const where = isAdmin ? {} : { userId: req.user.id };

  const convos = await Conversation.findAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
      { model: User, as: 'admin', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const data = convos.map(c => {
    const plain = c.toJSON();
    if (plain.user) {
      plain.user.avatarUrl = normalizeAvatar(plain.user.avatarUrl);
    }
    if (plain.admin) {
      plain.admin.avatarUrl = normalizeAvatar(plain.admin.avatarUrl);
    }
    return plain;
  });

  return res.json(data);
};


/**
 * Crée une nouvelle conversation si elle n'existe pas déjà.
 * - Admin : doit préciser un userId, une conversation par couple (user/admin).
 * - User : une seule conversation avec un admin, choisi automatiquement.
 */
exports.create = async (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

  if (isAdmin) {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }

    const existing = await Conversation.findOne({
      where: { userId, adminId: req.user.id },
    });
    if (existing) {
      return res.json(existing);
    }

    const convo = await Conversation.create({ userId, adminId: req.user.id });
    return res.status(201).json(convo);
  }

  if (req.user.role === 'user') {
    const existing = await Conversation.findOne({
      where: { userId: req.user.id },
    });
    if (existing) {
      return res.json(existing);
    }

    const admin = await User.findOne({
      where: { role: 'admin' },
      order: [['id', 'ASC']],
    });

    if (!admin) {
      return res.status(400).json({ error: 'Aucun administrateur disponible' });
    }

    const convo = await Conversation.create({
      userId: req.user.id,
      adminId: admin.id,
    });

    return res.status(201).json(convo);
  }

  return res.status(403).json({ error: 'Forbidden' });
};

/**
 * Récupère l'historique des messages d'une conversation donnée.
 */
exports.messages = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const msgs = await Message.findAll({
    where: { conversationId: id },
    order: [['createdAt', 'ASC']],
  });

  return res.json(msgs);
};

/**
 * Envoie un message dans une conversation et notifie les participants via Socket.io.
 */
exports.send = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const msg = await Message.create({
    conversationId: id,
    senderId: req.user.id,
    content: req.body.content,
  });

  await msg.reload();

  const payload = {
    conversationId: id,
    message: {
      id: msg.id,
      conversationId: id,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt,
      readAt: msg.readAt || null,
    },
  };

  // Diffusion du message dans la room de la conversation
  req.io?.to(`conversation:${id}`).emit('conversation:message', payload);

  const convo = await Conversation.findByPk(id);

  if (convo) {
    const recipients = [convo.userId, convo.adminId].filter(
      (v) => v && v !== req.user.id
    );

    for (const uid of recipients) {
      const sockets = await req.io.in(`user:${uid}`).fetchSockets();
      const inConversation = sockets.some((s) =>
        s.rooms.has(`conversation:${id}`)
      );

      // Si le destinataire n'est pas déjà dans la room de la conversation,
      // on envoie une notification générique + mise à jour des badges.
      if (!inConversation) {
        req.io.to(`user:${uid}`).emit('message:new', { conversationId: id });
        req.io.to(`user:${uid}`).emit('badge:update', {});
      }
    }
  } else {
    // Si la conversation n'existe plus, on met simplement à jour les badges globalement
    req.io?.emit('badge:update', {});
  }

  return res.status(201).json(payload.message);
};

/**
 * Marque un message comme lu et déclenche une mise à jour des badges côté clients.
 */
exports.read = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  await Message.update(
    { readAt: new Date() },
    { where: { id } }
  );

  req.io?.emit('badge:update', {});

  return res.json({ ok: true });
};

/**
 * Compte le nombre de messages non lus pour l'utilisateur courant sur ses conversations.
 */
exports.unreadCount = async (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  const whereKey = isAdmin ? { adminId: req.user.id } : { userId: req.user.id };

  const convos = await Conversation.findAll({
    where: whereKey,
    attributes: ['id'],
  });

  const ids = convos.map((c) => c.id);
  if (!ids.length) {
    return res.json({ count: 0 });
  }

  const count = await Message.count({
    where: {
      conversationId: { [Op.in]: ids },
      readAt: null,
      senderId: { [Op.ne]: req.user.id },
    },
  });

  return res.json({ count });
};

/**
 * Retourne une map { conversationId: true } pour les conversations où
 * l'utilisateur a au moins un message non lu.
 */
exports.unreadMap = async (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  const convoWhere = isAdmin ? { adminId: req.user.id } : { userId: req.user.id };

  const convos = await Conversation.findAll({
    where: convoWhere,
    attributes: ['id'],
  });

  const ids = convos.map((c) => c.id);
  if (!ids.length) {
    return res.json({ map: {} });
  }

  const rows = await Message.findAll({
    attributes: ['conversationId'],
    where: {
      conversationId: { [Op.in]: ids },
      readAt: null,
      senderId: { [Op.ne]: req.user.id },
    },
  });

  const map = {};
  for (const r of rows) {
    map[r.conversationId] = true;
  }

  return res.json({ map });
};
