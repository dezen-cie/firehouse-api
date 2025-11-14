const { StatusHistory, User } = require('../../models');
const { Op } = require('sequelize');

/**
 * Retourne les statistiques de statut sur une journée donnée :
 * - items : liste détaillée des changements de statut
 * - buckets : histogramme par heure et par statut
 * - counts : dernier statut connu par utilisateur, agrégé par type de statut
 */
exports.daily = async (req, res) => {
  const dateStr = req.query.date;
  const d = dateStr ? new Date(dateStr) : new Date();

  const start = new Date(d);
  start.setHours(0, 0, 0, 0);

  const end = new Date(d);
  end.setHours(23, 59, 59, 999);

  const items = await StatusHistory.findAll({
    where: {
      createdAt: { [Op.between]: [start, end] },
    },
    include: [
      {
        model: User,
        attributes: ['firstName', 'lastName', 'grade'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  
const buckets = {};
for (let h = 0; h < 24; h++) {
  buckets[h] = {
    AVAILABLE: 0,
    INTERVENTION: 0,
    UNAVAILABLE: 0,
    ABSENT: 0,
  };
}


const perHour = {}; 

for (const it of items) {
  const hour = new Date(it.createdAt).getHours();
  if (!perHour[hour]) perHour[hour] = {};
  const u = it.userId;

  
  if (!perHour[hour][u] ||
      new Date(it.createdAt) > new Date(perHour[hour][u].createdAt)) {
    perHour[hour][u] = it;
  }
}


for (const hour in perHour) {
  for (const u in perHour[hour]) {
    const st = perHour[hour][u].status;
    buckets[hour][st] += 1;
  }
}

  const latestByUser = new Map();
  for (const it of items) {
    if (!latestByUser.has(it.userId)) {
      latestByUser.set(it.userId, it);
    }
  }

  const counts = {
    AVAILABLE: 0,
    INTERVENTION: 0,
    UNAVAILABLE: 0,
    ABSENT: 0,
  };

  for (const it of latestByUser.values()) {
    counts[it.status] += 1;
  }

  return res.json({ items, buckets, counts });
};
