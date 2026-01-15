import { vi } from 'vitest';

export interface MockRedisStore {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  geo: Map<string, Map<string, { lng: number; lat: number }>>;
}

export function createMockRedis() {
  const store: MockRedisStore = {
    strings: new Map(),
    hashes: new Map(),
    geo: new Map(),
  };

  const mockRedis = {
    get: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(store.strings.get(key) || null);
    }),

    set: vi.fn().mockImplementation((key: string, value: string) => {
      store.strings.set(key, value);
      return Promise.resolve('OK');
    }),

    setex: vi.fn().mockImplementation((key: string, _ttl: number, value: string) => {
      store.strings.set(key, value);
      return Promise.resolve('OK');
    }),

    del: vi.fn().mockImplementation((key: string) => {
      store.strings.delete(key);
      store.hashes.delete(key);
      return Promise.resolve(1);
    }),

    hget: vi.fn().mockImplementation((key: string, field: string) => {
      const hash = store.hashes.get(key);
      return Promise.resolve(hash?.get(field) || null);
    }),

    hset: vi.fn().mockImplementation((key: string, ...args: unknown[]) => {
      let hash = store.hashes.get(key);
      if (!hash) {
        hash = new Map();
        store.hashes.set(key, hash);
      }

      if (typeof args[0] === 'object') {
        const obj = args[0] as Record<string, string>;
        Object.entries(obj).forEach(([k, v]) => hash!.set(k, String(v)));
      } else {
        hash.set(String(args[0]), String(args[1]));
      }
      return Promise.resolve(1);
    }),

    hdel: vi.fn().mockImplementation((key: string, field: string) => {
      const hash = store.hashes.get(key);
      if (hash) {
        hash.delete(field);
      }
      return Promise.resolve(1);
    }),

    geoadd: vi.fn().mockImplementation((key: string, lng: number, lat: number, member: string) => {
      let geoSet = store.geo.get(key);
      if (!geoSet) {
        geoSet = new Map();
        store.geo.set(key, geoSet);
      }
      geoSet.set(member, { lng, lat });
      return Promise.resolve(1);
    }),

    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };

  return { mockRedis, store };
}

export function resetMockRedis(store: MockRedisStore): void {
  store.strings.clear();
  store.hashes.clear();
  store.geo.clear();
}
