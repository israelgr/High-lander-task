import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { GameMap, GameHUD, WinnerModal } from '../components/game';
import { Coordinates } from '@high-lander/shared';

function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371000;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function GamePage() {
  const navigate = useNavigate();
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [distanceToGoal, setDistanceToGoal] = useState<number | null>(null);

  const {
    game,
    playerId,
    otherPlayers,
    route,
    winner,
    updateLocation,
    fetchRoute,
    reachGoal,
    leaveGame,
  } = useGame();

  const { position } = useGeolocation({ watch: true });

  useEffect(() => {
    if (!game || game.status !== 'active') {
      navigate('/lobby');
    }
  }, [game, navigate]);

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
    if (position && game?.goal) {
      fetchRoute(
        { latitude: position.latitude, longitude: position.longitude },
        game.goal.position
      );

      const distance = calculateDistance(
        { latitude: position.latitude, longitude: position.longitude },
        game.goal.position
      );
      setDistanceToGoal(distance);

      if (distance <= game.config.proximityThreshold && !winner) {
        reachGoal({
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: Date.now(),
        });
      }
    }
  }, [position, game?.goal, game?.config.proximityThreshold, winner, fetchRoute, reachGoal]);

  useEffect(() => {
    if (winner) {
      setShowWinnerModal(true);
    }
  }, [winner]);

  const handlePlayAgain = useCallback(() => {
    leaveGame();
    navigate('/lobby');
  }, [leaveGame, navigate]);

  const handleBackToLobby = useCallback(() => {
    leaveGame();
    navigate('/lobby');
  }, [leaveGame, navigate]);

  if (!game || game.status !== 'active') {
    return null;
  }

  const playerPosition = position
    ? { latitude: position.latitude, longitude: position.longitude }
    : null;

  const routeCoordinates = route?.geometry?.coordinates || null;

  return (
    <div style={styles.container}>
      <GameMap
        playerPosition={playerPosition}
        goalPosition={game.goal?.position}
        route={routeCoordinates ? { coordinates: routeCoordinates } : null}
        otherPlayers={otherPlayers}
      />

      <GameHUD
        distanceToGoal={distanceToGoal}
        gameStartTime={game.startedAt || null}
        playerCount={game.players.filter(p => p.status === 'playing').length}
        isWinner={winner?.id === playerId}
        proximityThreshold={game.config.proximityThreshold}
      />

      {winner && (
        <WinnerModal
          isOpen={showWinnerModal}
          winnerName={winner.name}
          finishTime={winner.time}
          isCurrentUser={winner.id === playerId}
          onClose={handleBackToLobby}
          onPlayAgain={handlePlayAgain}
        />
      )}

      <button style={styles.exitButton} onClick={handleBackToLobby}>
        Exit Game
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    height: '100vh',
    width: '100vw',
  },
  exitButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 1000,
  },
};
