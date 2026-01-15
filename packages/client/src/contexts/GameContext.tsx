import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Game, PlayerInGame, Coordinates, GameConfig, RouteResponse } from '@high-lander/shared';
import { useSocket } from '../hooks/useSocket';
import { getRoute } from '../services/api';

interface GameState {
  playerId: string | null;
  username: string | null;
  game: Game | null;
  otherPlayers: Map<string, { position: Coordinates; distanceToGoal: number }>;
  route: RouteResponse | null;
  isAuthenticated: boolean;
  winner: { id: string; name: string; time: number } | null;
}

type GameAction =
  | { type: 'SET_PLAYER'; playerId: string; username: string }
  | { type: 'SET_AUTHENTICATED' }
  | { type: 'SET_GAME'; game: Game }
  | { type: 'UPDATE_GAME'; game: Partial<Game> }
  | { type: 'CLEAR_GAME' }
  | { type: 'UPDATE_PLAYERS'; players: Array<{ playerId: string; position: Coordinates; distanceToGoal: number }> }
  | { type: 'SET_ROUTE'; route: RouteResponse }
  | { type: 'SET_WINNER'; winner: { id: string; name: string; time: number } }
  | { type: 'RESET' };

const initialState: GameState = {
  playerId: null,
  username: null,
  game: null,
  otherPlayers: new Map(),
  route: null,
  isAuthenticated: false,
  winner: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerId: action.playerId, username: action.username };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: true };
    case 'SET_GAME':
      return { ...state, game: action.game, winner: null };
    case 'UPDATE_GAME':
      return state.game ? { ...state, game: { ...state.game, ...action.game } } : state;
    case 'CLEAR_GAME':
      return { ...state, game: null, otherPlayers: new Map(), route: null, winner: null };
    case 'UPDATE_PLAYERS': {
      const newPlayers = new Map<string, { position: Coordinates; distanceToGoal: number }>();
      action.players.forEach(p => {
        if (p.playerId !== state.playerId) {
          newPlayers.set(p.playerId, { position: p.position, distanceToGoal: p.distanceToGoal });
        }
      });
      return { ...state, otherPlayers: newPlayers };
    }
    case 'SET_ROUTE':
      return { ...state, route: action.route };
    case 'SET_WINNER':
      return { ...state, winner: action.winner };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface GameContextValue extends GameState {
  authenticate: (username: string) => void;
  createGame: (config?: Partial<GameConfig>) => void;
  joinGame: (code: string) => void;
  leaveGame: () => void;
  setReady: () => void;
  startGame: () => void;
  updateLocation: (position: Coordinates & { accuracy?: number; timestamp: number }) => void;
  reachGoal: (position: Coordinates & { timestamp: number }) => void;
  fetchRoute: (start: Coordinates, end: Coordinates) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, connect, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('connection:authenticated', ({ playerId }) => {
      dispatch({ type: 'SET_AUTHENTICATED' });
      console.log('Authenticated as', playerId);
    });

    socket.on('game:created', ({ game }) => {
      dispatch({ type: 'SET_GAME', game });
    });

    socket.on('game:joined', ({ game }) => {
      dispatch({ type: 'SET_GAME', game });
    });

    socket.on('game:started', ({ game }) => {
      dispatch({ type: 'SET_GAME', game });
    });

    socket.on('game:player_joined', ({ player }) => {
      dispatch({
        type: 'UPDATE_GAME',
        game: {
          players: [...(state.game?.players || []), player],
        },
      });
    });

    socket.on('game:player_left', ({ playerId }) => {
      dispatch({
        type: 'UPDATE_GAME',
        game: {
          players: state.game?.players.filter(p => p.id !== playerId) || [],
        },
      });
    });

    socket.on('game:player_ready', ({ playerId }) => {
      dispatch({
        type: 'UPDATE_GAME',
        game: {
          players: state.game?.players.map(p =>
            p.id === playerId ? { ...p, status: 'ready' as const } : p
          ) || [],
        },
      });
    });

    socket.on('players:positions', players => {
      dispatch({ type: 'UPDATE_PLAYERS', players });
    });

    socket.on('game:winner', ({ winnerId, winnerName, finishTime }) => {
      dispatch({ type: 'SET_WINNER', winner: { id: winnerId, name: winnerName, time: finishTime } });
    });

    socket.on('game:finished', () => {
      dispatch({ type: 'UPDATE_GAME', game: { status: 'finished' } });
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    return () => {
      socket.off('connection:authenticated');
      socket.off('game:created');
      socket.off('game:joined');
      socket.off('game:started');
      socket.off('game:player_joined');
      socket.off('game:player_left');
      socket.off('game:player_ready');
      socket.off('players:positions');
      socket.off('game:winner');
      socket.off('game:finished');
      socket.off('error');
    };
  }, [socket, state.game?.players]);

  const authenticate = useCallback((username: string) => {
    connect();
    dispatch({ type: 'SET_PLAYER', playerId: '', username });

    const s = socket || getSocket();
    const onConnect = () => {
      s.emit('player:authenticate', { playerId: '', username });
    };

    if (s.connected) {
      onConnect();
    } else {
      s.once('connect', onConnect);
    }

    function getSocket() {
      const { getSocket } = require('../services/socket');
      return getSocket();
    }
  }, [connect, socket]);

  const createGame = useCallback((config?: Partial<GameConfig>) => {
    socket?.emit('game:create', { config });
  }, [socket]);

  const joinGame = useCallback((code: string) => {
    socket?.emit('game:join', { gameCode: code.toUpperCase() });
  }, [socket]);

  const leaveGame = useCallback(() => {
    socket?.emit('game:leave');
    dispatch({ type: 'CLEAR_GAME' });
  }, [socket]);

  const setReady = useCallback(() => {
    socket?.emit('game:ready');
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('game:start');
  }, [socket]);

  const updateLocation = useCallback((position: Coordinates & { accuracy?: number; timestamp: number }) => {
    socket?.emit('location:update', { position });
  }, [socket]);

  const reachGoal = useCallback((position: Coordinates & { timestamp: number }) => {
    socket?.emit('goal:reached', {
      position: {
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: position.timestamp,
      },
    });
  }, [socket]);

  const fetchRoute = useCallback(async (start: Coordinates, end: Coordinates) => {
    try {
      const route = await getRoute(start, end);
      dispatch({ type: 'SET_ROUTE', route });
    } catch (error) {
      console.error('Failed to fetch route:', error);
    }
  }, []);

  const value: GameContextValue = {
    ...state,
    authenticate,
    createGame,
    joinGame,
    leaveGame,
    setReady,
    startGame,
    updateLocation,
    reachGoal,
    fetchRoute,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
