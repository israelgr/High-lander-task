import { vi } from 'vitest';
import { EventEmitter } from 'events';

export interface MockSocket {
  id: string;
  data: Record<string, unknown>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  on: EventEmitter['on'];
  listeners: EventEmitter['listeners'];
}

export function createMockSocket(id = 'test-socket-id'): MockSocket {
  const emitter = new EventEmitter();
  const toReturnValue = {
    emit: vi.fn(),
  };

  const socket: MockSocket = {
    id,
    data: {},
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    to: vi.fn().mockReturnValue(toReturnValue),
    emit: vi.fn(),
    disconnect: vi.fn(),
    on: emitter.on.bind(emitter),
    listeners: emitter.listeners.bind(emitter),
  };

  return socket;
}

export interface MockIO {
  to: ReturnType<typeof vi.fn>;
  on: EventEmitter['on'];
}

export function createMockIO(): MockIO {
  const emitter = new EventEmitter();
  const toReturnValue = {
    emit: vi.fn(),
  };

  const io: MockIO = {
    to: vi.fn().mockReturnValue(toReturnValue),
    on: emitter.on.bind(emitter),
  };

  return io;
}

// Helper for testing async socket handlers
export async function triggerSocketHandler<T>(
  socket: MockSocket,
  event: string,
  data: T
): Promise<void> {
  const listeners = socket.listeners(event);
  for (const listener of listeners) {
    await (listener as (data: T) => Promise<void>)(data);
  }
}
