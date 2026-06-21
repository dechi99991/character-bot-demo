interface WindowEntry {
  timestamps: number[];
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

// Injectable store for testing
const _store = new Map<string, WindowEntry>();

export function checkRateLimit(ip: string, store = _store): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    return { ok: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  entry.timestamps.push(now);
  store.set(ip, entry);
  return { ok: true };
}

export function clearStore(store = _store): void {
  store.clear();
}
