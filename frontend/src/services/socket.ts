import { io, Socket } from 'socket.io-client';
import { useBadges } from '../store/useBadges';
import { api } from './api';

let socket: Socket | null = null;

export function connectSocket() {
  if (socket) return socket;

  const token = localStorage.getItem('accessToken') || undefined;

  socket = io(import.meta.env.VITE_API_WS || 'http://localhost:4000', {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 4000,
    auth: { token },          
    transports: ['websocket', 'polling'],
  });

  const { setMessages, setFiles } = useBadges.getState();

  socket.on('files:new', () => setFiles((p: number) => p + 1));
  socket.on('message:new', () => setMessages((p: number) => p + 1));
  socket.on('badge:update', async () => {
    try {
      const r = await api.get('/conversations/unread/count');
      setMessages(r.data.count);
    } catch {}
  });

  return socket;
}

export function reconnectSocketAuth() {
  const token = localStorage.getItem('accessToken') || undefined;

  if (!socket) {
    return connectSocket();
  }

  // met à jour le token pour les reconnexions (refresh token, login/logout)
  (socket as any).auth = { ...(socket as any).auth, token };

  if (!socket.active) socket.connect();
  return socket;
}

export function getSocket() {
  return socket;
}
