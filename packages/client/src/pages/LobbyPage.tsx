import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { CreateGameForm, JoinGameForm, WaitingRoom } from '../components/lobby';

type Tab = 'create' | 'join';

export function LobbyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const navigate = useNavigate();

  const {
    game,
    playerId,
    username,
    createGame,
    joinGame,
    leaveGame,
    setReady,
    startGame,
    updateLocation,
  } = useGame();

  const { position, error: geoError } = useGeolocation();

  useEffect(() => {
    if (!username) {
      navigate('/');
    }
  }, [username, navigate]);

  useEffect(() => {
    if (position) {
      updateLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: position.timestamp,
      });
    }
  }, [position, updateLocation]);

  useEffect(() => {
    if (game?.status === 'active') {
      navigate('/game');
    }
  }, [game?.status, navigate]);

  if (!username) {
    return null;
  }

  if (game) {
    return (
      <div style={styles.container}>
        <WaitingRoom
          game={game}
          currentPlayerId={playerId!}
          onReady={setReady}
          onStart={startGame}
          onLeave={() => {
            leaveGame();
          }}
          hasLocation={!!position}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome, {username}!</h1>
          <p style={styles.subtitle}>Create a new game or join an existing one</p>
        </div>

        {geoError && (
          <div style={styles.warning}>
            {geoError}
          </div>
        )}

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'create' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('create')}
          >
            Create Game
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'join' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('join')}
          >
            Join Game
          </button>
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'create' ? (
            <CreateGameForm onSubmit={createGame} disabled={!position} />
          ) : (
            <JoinGameForm onSubmit={joinGame} disabled={!position} />
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 24,
  },
  content: {
    maxWidth: 500,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  warning: {
    background: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#64748b',
  },
  tabActive: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: 'white',
  },
  tabContent: {
    background: 'white',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};
