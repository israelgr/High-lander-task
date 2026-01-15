import { useState, useEffect } from 'react';
import { Coordinates } from '@high-lander/shared';

interface GameHUDProps {
  distanceToGoal: number | null;
  gameStartTime: number | null;
  playerCount: number;
  isWinner: boolean;
  proximityThreshold: number;
}

export function GameHUD({
  distanceToGoal,
  gameStartTime,
  playerCount,
  isWinner,
  proximityThreshold,
}: GameHUDProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!gameStartTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNearGoal = distanceToGoal !== null && distanceToGoal <= proximityThreshold;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.stat}>
          <span style={styles.label}>Distance</span>
          <span style={{
            ...styles.value,
            color: isNearGoal ? '#10b981' : '#1e293b',
          }}>
            {distanceToGoal !== null ? `${Math.round(distanceToGoal)}m` : '--'}
          </span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.stat}>
          <span style={styles.label}>Time</span>
          <span style={styles.value}>{formatTime(elapsed)}</span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.stat}>
          <span style={styles.label}>Players</span>
          <span style={styles.value}>{playerCount}</span>
        </div>
      </div>

      {isNearGoal && !isWinner && (
        <div style={styles.nearGoalAlert}>
          You are near the goal! Keep going!
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 12,
    zIndex: 1000,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    background: 'white',
    borderRadius: 8,
    padding: '8px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  nearGoalAlert: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#10b981',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: 'bold',
    animation: 'pulse 1s infinite',
  },
};
