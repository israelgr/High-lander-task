import { customAlphabet } from 'nanoid';
import { GAME_CONSTANTS } from '@high-lander/shared';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = customAlphabet(alphabet, GAME_CONSTANTS.CODE_LENGTH);

export function generateGameCode(): string {
  return generateCode();
}
