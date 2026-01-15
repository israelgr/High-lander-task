import { useEffect, useState, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket, GameSocket } from '../services/socket';

interface UseSocketReturn {
  socket: GameSocket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) {
      setConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    connectSocket(token || undefined);
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  return { socket, connected, connect, disconnect };
}
