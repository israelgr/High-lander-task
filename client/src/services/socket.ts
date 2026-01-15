import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@high-lander/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    const token = localStorage.getItem('accessToken');
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: token ? { token } : undefined,
    });
  }
  return socket;
}

export function connectSocket(token?: string): GameSocket {
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
