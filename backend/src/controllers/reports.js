const { StatusHistory, User } = require('../../models');
const { Op } = require('sequelize');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TZ = 'Europe/Paris';

/**
 * Rapport quotidien :
 * - items : liste brute des changements de statut de la journée
 * - buckets : par heure (0–23), on compte au plus UNE fois chaque utilisateur,
 *             avec SON DERNIER statut dans cette heure-là (pas de propagation)
 * - counts : pour chaque user, son DERNIER statut de la journée, agrégé
 */
exports.daily = async (req, res) => {
  const dateStr = req.query.date;

  const base = dateStr
    ? dayjs.tz(dateStr, APP_TZ)
    : dayjs().tz(APP_TZ);

  const start = base.startOf('day');
  const end = base.endOf('day');

  const items = await StatusHistory.findAll({
    where: {
      createdAt: { [Op.between]: [start.toDate(), end.toDate()] },
    },
    include: [
      {
        model: User,
        attributes: ['firstName', 'lastName', 'grade'],
      },
    ],
    order: [['createdAt', 'DESC']], // pour counts
  });

  // Buckets 0–23 initialisés
  const buckets = {};
  for (let h = 0; h < 24; h += 1) {
    buckets[h] = {
      AVAILABLE: 0,
      INTERVENTION: 0,
      UNAVAILABLE: 0,
      ABSENT: 0,
    };
  }

  // ----------------------------
  // 1) Buckets par heure (sans propagation)
  // ----------------------------

  // on veut les events dans l'ordre chronologique
  const itemsAsc = items.slice().sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  // userId -> [{ hour, status }]
  const byUser = new Map();

  for (const it of itemsAsc) {
    const hour = dayjs(it.createdAt).tz(APP_TZ).hour(); // 0–23

    let list = byUser.get(it.userId);
    if (!list) {
      list = [];
      byUser.set(it.userId, list);
    }
    list.push({ hour, status: it.status });
  }

  // Pour chaque utilisateur, on ne compte qu'UNE fois par heure :
  // son DERNIER statut dans cette heure-là.
  for (const [, events] of byUser.entries()) {
    const byHour = {}; // hour -> status

    for (const ev of events) {
      // comme events est dans l'ordre, le dernier écrase
      byHour[ev.hour] = ev.status;
    }

    for (const [hStr, st] of Object.entries(byHour)) {
      const h = Number(hStr);
      if (buckets[h] && buckets[h][st] !== undefined) {
        buckets[h][st] += 1;
      }
    }
  }

  // ----------------------------
  // 2) counts = dernier statut connu par user sur la journée
  // ----------------------------

  const latestByUser = new Map();
  for (const it of items) {
    if (!latestByUser.has(it.userId)) {
      latestByUser.set(it.userId, it); // items trié DESC
    }
  }

  const counts = {
    AVAILABLE: 0,
    INTERVENTION: 0,
    UNAVAILABLE: 0,
    ABSENT: 0,
  };

  for (const it of latestByUser.values()) {
    if (counts[it.status] !== undefined) {
      counts[it.status] += 1;
    }
  }

  return res.json({ items, buckets, counts });
};
