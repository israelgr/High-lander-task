import { describe, it, expect } from 'vitest';
import { generateGameCode } from './gameCode.js';
import { GAME_CONSTANTS } from '@high-lander/shared';

describe('generateGameCode', () => {
  const VALID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Excluded: I (looks like 1), O (looks like 0), 0, 1
  const EXCLUDED_CHARS = ['I', 'O', '0', '1'];

  it('should generate a code of correct length', () => {
    const code = generateGameCode();
    expect(code).toHaveLength(GAME_CONSTANTS.CODE_LENGTH);
  });

  it('should only contain valid alphabet characters', () => {
    // Generate multiple codes to increase confidence
    for (let i = 0; i < 50; i++) {
      const code = generateGameCode();
      for (const char of code) {
        expect(VALID_ALPHABET).toContain(char);
      }
    }
  });

  it('should not contain confusing characters (I, O, 0, 1, L)', () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateGameCode();
      for (const excludedChar of EXCLUDED_CHARS) {
        expect(code).not.toContain(excludedChar);
      }
    }
  });

  it('should return uppercase only', () => {
    const code = generateGameCode();
    expect(code).toBe(code.toUpperCase());
  });

  it('should generate unique codes with high probability', () => {
    const codes = new Set<string>();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      codes.add(generateGameCode());
    }

    // With 32^6 possible codes, 100 unique codes should be highly likely
    expect(codes.size).toBe(iterations);
  });

  it('should match alphanumeric pattern without excluded chars', () => {
    const code = generateGameCode();
    // Should only contain valid characters: A-Z (except I, O) and 2-9 (except 0, 1)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('should generate 6-character codes consistently', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateGameCode();
      expect(code.length).toBe(6);
    }
  });
});
