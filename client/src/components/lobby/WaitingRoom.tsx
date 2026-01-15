import { Game } from '@high-lander/shared';

interface WaitingRoomProps {
  game: Game;
  currentPlayerId: string;
  onStart: () => void;
  onLeave: () => void;
  hasLocation: boolean;
}

export function WaitingRoom({
  game,
  currentPlayerId,
  onStart,
  onLeave,
  hasLocation,
}: WaitingRoomProps) {
  const isHost = game.hostPlayerId === currentPlayerId;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Waiting Room</h2>
        <div style={styles.code}>
          <span style={styles.codeLabel}>Game Code</span>
          <span style={styles.codeValue}>{game.code}</span>
        </div>
      </div>

      <div style={styles.players}>
        <h3 style={styles.playersTitle}>
          Players ({game.players.length}/{game.config.maxPlayers})
        </h3>
        <ul style={styles.playerList}>
          {game.players.map(player => (
            <li key={player.id} style={styles.playerItem}>
              <span style={styles.playerName}>
                {player.username}
                {player.id === game.hostPlayerId && ' (Host)'}
                {player.id === currentPlayerId && ' (You)'}
              </span>
              <span
                style={{
                  ...styles.playerStatus,
                  background: player.id === game.hostPlayerId ? '#3b82f6' : '#94a3b8',
                }}
              >
                {player.id === game.hostPlayerId ? 'Host' : 'Joined'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.config}>
        <h4>Game Settings</h4>
        <p>Goal distance: {game.config.goalRadiusMin}-{game.config.goalRadiusMax}m</p>
      </div>

      {!hasLocation && (
        <div style={styles.warning}>
          Please enable location access to play
        </div>
      )}

      <div style={styles.actions}>
        {isHost && (
          <button
            style={{
              ...styles.startButton,
              opacity: hasLocation ? 1 : 0.5,
            }}
            onClick={onStart}
            disabled={!hasLocation}
          >
            Start Game
          </button>
        )}

        <button style={styles.leaveButton} onClick={onLeave}>
          Leave Game
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  code: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#3b82f6',
  },
  players: {
    marginBottom: 24,
  },
  playersTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  playerList: {
    listStyle: 'none',
    padding: 0,
  },
  playerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    fontWeight: 500,
  },
  playerStatus: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  config: {
    background: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  warning: {
    background: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  startButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  leaveButton: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    cursor: 'pointer',
  },
};
