import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Game, PlayerInGame, Coordinates, GameConfig, RouteResponse } from '@high-lander/shared';
import { useSocket } from '../hooks/useSocket';
import { getRoute, refreshAuthTokens, registerUser, loginUser, AuthError } from '../services/api';

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
  authenticate: (username: string) => Promise<void>;
  createGame: (config?: Partial<GameConfig>) => void;
  joinGame: (code: string) => void;
  rejoinGame: (code: string) => void;
  leaveGame: () => void;
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

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

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
      socket.off('connect');
      socket.off('connect_error');
      socket.off('connection:authenticated');
      socket.off('game:created');
      socket.off('game:joined');
      socket.off('game:started');
      socket.off('game:player_joined');
      socket.off('game:player_left');
      socket.off('players:positions');
      socket.off('game:winner');
      socket.off('game:finished');
      socket.off('error');
    };
  }, [socket, state.game?.players]);

  const authenticate = useCallback(async (username: string) => {
    // Generate a consistent email from username for simplicity
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@highlander.local`;
    
    // Check if we have existing tokens and try to refresh them first
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        const { tokens } = await refreshAuthTokens(storedRefreshToken);
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        // Try to get user info to verify the token works
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_PLAYER', playerId: data.user.playerId, username });
          
          // Update socket auth and connect
          if (socket) {
            socket.auth = { token: tokens.accessToken };
            if (!socket.connected) {
              socket.connect();
            }
          }
          return;
        }
      } catch (error) {
        // Token refresh failed, continue with normal authentication
        console.log('Token refresh failed, authenticating normally');
      }
    }

    // Get or generate password for this username
    const passwordKey = `password_${username}`;
    let password = localStorage.getItem(passwordKey);
    
    if (!password) {
      // Generate a password for new users and store it
      password = crypto.randomUUID() + crypto.randomUUID();
      localStorage.setItem(passwordKey, password);
    }

    try {
      // Try to register first (for new users)
      const data = await registerUser(email, password, username);
      
      // Store tokens
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      
      dispatch({ type: 'SET_PLAYER', playerId: data.user.playerId, username });
      
      // Update socket auth and connect
      if (socket) {
        socket.auth = { token: data.tokens.accessToken };
        if (!socket.connected) {
          socket.connect();
        }
      }
    } catch (error: unknown) {
      // If registration fails with 409 (user exists), try login
      if (error instanceof AuthError && error.statusCode === 409) {
        try {
          const data = await loginUser(email, password);
          
          // Store tokens
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
          
          dispatch({ type: 'SET_PLAYER', playerId: data.user.playerId, username });
          
          // Update socket auth and connect
          if (socket) {
            socket.auth = { token: data.tokens.accessToken };
            if (!socket.connected) {
              socket.connect();
            }
          }
        } catch (loginError) {
          // If login fails, the stored password might be wrong (shouldn't happen normally)
          // Clear it and throw the error
          localStorage.removeItem(passwordKey);
          throw new Error(loginError instanceof Error ? loginError.message : 'Login failed');
        }
      } else {
        throw error;
      }
    }
  }, [socket]);

  const createGame = useCallback((config?: Partial<GameConfig>) => {
    if (!socket?.connected) {
      console.error('Cannot create game: Socket not connected');
      return;
    }
    console.log('Creating game with config:', config);
    socket.emit('game:create', { config });
  }, [socket]);

  const joinGame = useCallback((code: string) => {
    // Try regular join first, server will handle if game is active
    socket?.emit('game:join', { gameCode: code.toUpperCase() });
  }, [socket]);

  const rejoinGame = useCallback((code: string) => {
    // Rejoin an active game the player is already in
    socket?.emit('game:rejoin', { gameCode: code.toUpperCase() });
  }, [socket]);

  const leaveGame = useCallback(() => {
    socket?.emit('game:leave');
    dispatch({ type: 'CLEAR_GAME' });
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
    rejoinGame,
    leaveGame,
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
