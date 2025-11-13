process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
})

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../models');

const isDev = process.env.NODE_ENV !== 'production';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : undefined,
    crossOriginEmbedderPolicy: isDev ? false : undefined,
  })
);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
  })
);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: true,
});

/**
 * Parse une chaîne de cookies "brute" en objet clé/valeur.
 */
function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.split('=');
    if (!k) return acc;
    acc[k.trim()] = decodeURIComponent((v.join('=') || '').trim());
    return acc;
  }, {});
}

/**
 * Injection de l'instance Socket.io dans chaque requête Express.
 */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/**
 * Enregistre les routes de l'API.
 */
app.use('/api', require('./routes'));

/**
 * Middleware Socket.io d'authentification via JWT.
 * - Récupère le token dans auth.token, Authorization ou les cookies.
 * - Attache l'utilisateur décodé sur socket.user.
 */
io.use((socket, next) => {
  try {
    let raw = socket.handshake?.auth?.token;

    if (!raw) {
      raw = socket.handshake?.headers?.authorization;
    }

    if (!raw) {
      const cookies = parseCookies(socket.handshake?.headers?.cookie || '');
      raw = cookies.accessToken || null;
    }

    if (!raw) {
      return next(new Error('no token'));
    }

    let token = String(raw).trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return next(new Error('no token'));
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = user;

    return next();
  } catch (e) {
    return next(e);
  }
});

/**
 * Gestion de la connexion Socket.io :
 * - Join des rooms user:{id} et admins pour les administrateurs.
 * - Join des rooms de conversation à la demande du client.
 */
io.on('connection', (socket) => {
  const u = socket.user;

  if (u) {
    if (u.role === 'admin' || u.role === 'super_admin') {
      socket.join('admins');
    }
    socket.join(`user:${u.id}`);
  }

  socket.on('conversation:join', (id) => {
    socket.join(`conversation:${id}`);
  });
});

const PORT = process.env.PORT || 4000;

/**
 * Démarre le serveur HTTP et vérifie la connexion à la base de données.
 * En cas d'échec d'authentification DB, le processus est arrêté.
 */
server.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
  } catch (e) {
    // En prod, on stoppe le process si la DB n'est pas accessible
    process.exit(1);
  }
});
