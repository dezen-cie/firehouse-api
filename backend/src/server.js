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
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

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
    origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: true,
});

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.split('=');
    if (!k) return acc;
    acc[k.trim()] = decodeURIComponent((v.join('=') || '').trim());
    return acc;
  }, {});
}

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', require('./routes'));

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
    return next(e);
  }
});

io.on('connection', (socket) => {
  const u = socket.user;
  if (u) {
    if (u.role === 'admin' || u.role === 'super_admin') socket.join('admins');
    socket.join(`user:${u.id}`);
  }
  socket.on('conversation:join', (id) => socket.join(`conversation:${id}`));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log('API listening on', PORT, {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_ORIGIN,
  });
  try {
    await sequelize.authenticate();
    console.log('DB connected');
  } catch (e) {
    console.error('DB connection error:', e.message);
  }
});
