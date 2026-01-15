import { Coordinates, Goal, GameConfig } from '@high-lander/shared';
import { generateRandomPointInRadius } from '../utils/distance.js';
import { validatePointIsRoutable } from './routingService.js';

const MAX_GENERATION_ATTEMPTS = 10;

export async function generateGoal(
  playerPosition: Coordinates,
  gameConfig: GameConfig
): Promise<Goal> {
  let attempts = 0;
  let goalPosition: Coordinates | null = null;

  while (attempts < MAX_GENERATION_ATTEMPTS) {
    const candidate = generateRandomPointInRadius(
      playerPosition,
      gameConfig.goalRadiusMin,
      gameConfig.goalRadiusMax
    );

    const isRoutable = await validatePointIsRoutable(candidate);

    if (isRoutable) {
      goalPosition = candidate;
      break;
    }

    attempts++;
  }

  if (!goalPosition) {
    goalPosition = generateRandomPointInRadius(
      playerPosition,
      gameConfig.goalRadiusMin,
      gameConfig.goalRadiusMax
    );
  }

  return {
    position: goalPosition,
    generatedAt: Date.now(),
    generatedFromPosition: playerPosition,
  };
}
