import { vi, beforeEach, afterEach } from 'vitest';

// Mock ioredis globally
vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    hget: vi.fn().mockResolvedValue(null),
    hset: vi.fn().mockResolvedValue(1),
    hdel: vi.fn().mockResolvedValue(1),
    geoadd: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  }));
  return { default: RedisMock };
});

// Store original fetch
const originalFetch = globalThis.fetch;

// Mock global fetch for OSRM API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

afterEach(() => {
  // Cleanup after each test
});

export { mockFetch };
