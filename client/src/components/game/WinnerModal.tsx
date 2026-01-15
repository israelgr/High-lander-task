interface WinnerModalProps {
  isOpen: boolean;
  winnerName: string;
  finishTime: number;
  isCurrentUser: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function WinnerModal({
  isOpen,
  winnerName,
  finishTime,
  isCurrentUser,
  onClose,
  onPlayAgain,
}: WinnerModalProps) {
  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.trophy}>
          {isCurrentUser ? '🏆' : '🎉'}
        </div>

        <h2 style={styles.title}>
          {isCurrentUser ? 'You Won!' : `${winnerName} Wins!`}
        </h2>

        <p style={styles.subtitle}>
          {isCurrentUser
            ? 'Congratulations! You reached the goal first!'
            : `${winnerName} reached the goal first!`}
        </p>

        <div style={styles.stat}>
          <span style={styles.statLabel}>Finish Time</span>
          <span style={styles.statValue}>{formatTime(finishTime)}</span>
        </div>

        <div style={styles.buttons}>
          <button style={styles.primaryButton} onClick={onPlayAgain}>
            Play Again
          </button>
          <button style={styles.secondaryButton} onClick={onClose}>
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: 'white',
    borderRadius: 16,
    padding: 32,
    maxWidth: 400,
    width: '90%',
    textAlign: 'center',
  },
  trophy: {
    fontSize: 64,
    marginBottom: 16,
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
    marginBottom: 24,
  },
  stat: {
    background: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  statLabel: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    cursor: 'pointer',
  },
};
