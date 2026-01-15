import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/server.ts',
        'src/__tests__/**',
      ],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@high-lander/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
