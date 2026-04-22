/**
 * Module-level daily request counter for `/api/query` (issue #138).
 *
 * Tracks how many requests have been served in the current UTC day and
 * exposes a single `record()` function that callers invoke once per
 * incoming request. The counter automatically resets at UTC midnight,
 * and the `justHitCap` flag fires exactly once per day (on the request
 * that brings the count up to `DAILY_LIMIT`) so the route handler can
 * trigger a single Pushover notification per day.
 *
 * State is intentionally module-level (in-process) — a single Next.js
 * server instance is sufficient for the current deployment. If we ever
 * scale horizontally we'll need to move this to a shared store.
 */
export type RecordResult = {
  allowed: boolean;
  count: number;
  justHitCap: boolean;
};

export const DAILY_LIMIT = 500;

type State = {
  windowStart: Date | null;
  count: number;
  capNotified: boolean;
};

const state: State = {
  windowStart: null,
  count: 0,
  capNotified: false,
};

function utcDateString(d: Date): string {
  // YYYY-MM-DD in UTC, used to detect day-boundary rollovers.
  return d.toISOString().slice(0, 10);
}

export function record(now: Date = new Date()): RecordResult {
  const today = utcDateString(now);
  if (
    state.windowStart === null ||
    utcDateString(state.windowStart) !== today
  ) {
    state.windowStart = now;
    state.count = 0;
    state.capNotified = false;
  }

  if (state.count >= DAILY_LIMIT) {
    return { allowed: false, count: state.count, justHitCap: false };
  }

  state.count += 1;
  if (state.count === DAILY_LIMIT && !state.capNotified) {
    state.capNotified = true;
    return { allowed: true, count: state.count, justHitCap: true };
  }
  return { allowed: true, count: state.count, justHitCap: false };
}

export function _resetForTests(): void {
  state.windowStart = null;
  state.count = 0;
  state.capNotified = false;
}
