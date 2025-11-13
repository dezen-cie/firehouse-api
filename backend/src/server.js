// src/server.js
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

console.log('SERVER BOOT', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
});

// Sécurité basique
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : undefined,
    crossOriginEmbedderPolicy: isDev ? false : undefined,
  })
);

// CORS : en prod tu peux affiner, là on garde large
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Rate limit
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// Static
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// HTTP + Socket.io
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  connectionStateRecovery: true,
});

// Parsing cookies pour le handshake socket
function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.split('=');
    if (!k) return acc;
    acc[k.trim()] = decodeURIComponent((v.join('=') || '').trim());
    return acc;
  }, {});
}

// Inject io dans req pour les controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes API
app.use('/api', require('./routes'));

// Auth socket via JWT (cookie accessToken ou Authorization)
io.use((socket, next) => {
  try {
    let raw = socket.handshake?.auth?.token;
    if (!raw) raw = socket.handshake?.headers?.authorization;
    if (!raw) {
      const cookies = parseCookies(socket.handshake?.headers?.cookie || '');
      raw = cookies.accessToken || null;
    }
    if (!raw) return next(new Error('no token'));

    let token = String(raw).trim();
    if (token.toLowerCase().startsWith('bearer ')) token = token.slice(7).trim();
    if (!token) return next(new Error('no token'));

    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = user;
    return next();
  } catch (e) {
    console.error('Socket auth error:', e.message);
    return next(e);
  }
});

// Rooms socket
io.on('connection', (socket) => {
  const u = socket.user;
  if (!u) return;

  if (u.role === 'admin' || u.role === 'super_admin') socket.join('admins');
  socket.join(`user:${u.id}`);

  socket.on('conversation:join', (id) => {
    if (!id) return;
    socket.join(`conversation:${id}`);
  });
});

// Port : Render ignore ce que tu choisis et injecte le sien dans process.env.PORT
const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  console.log('API listening on port', PORT);

  try {
    await sequelize.authenticate();
    console.log('DB connected');
  } catch (e) {
    console.error('DB connection error:', e.message);
    // On NE fait PAS process.exit ici, on laisse quand même tourner le serveur
  }
});

// Juste loguer, ne pas tuer le process brutalement
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});
