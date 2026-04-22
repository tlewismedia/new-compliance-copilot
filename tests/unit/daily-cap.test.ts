/**
 * Unit tests for the daily request counter (`pipeline/daily-cap.ts`,
 * issue #138).
 *
 * Covers the five behaviours called out in the spec:
 *   - first call increments to 1 and is allowed,
 *   - the 500th call is allowed and flips `justHitCap` true,
 *   - the 501st (and 502nd) call is rejected with `justHitCap` false,
 *   - a UTC day rollover resets the counter and re-arms `justHitCap`,
 *   - `_resetForTests()` clears module-level state between cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  record,
  DAILY_LIMIT,
  _resetForTests,
} from "../../pipeline/daily-cap";

beforeEach(() => {
  _resetForTests();
});

describe("daily-cap.record", () => {
  it("starts at 0 and the first call returns count: 1, allowed", () => {
    const result = record();
    expect(result).toEqual({ allowed: true, count: 1, justHitCap: false });
  });

  it("flips justHitCap true exactly on the 500th call", () => {
    let result = { allowed: true, count: 0, justHitCap: false };
    for (let i = 0; i < DAILY_LIMIT; i++) {
      result = record();
    }
    expect(result).toEqual({
      allowed: true,
      count: DAILY_LIMIT,
      justHitCap: true,
    });
  });

  it("rejects the 501st call without incrementing or re-firing justHitCap", () => {
    for (let i = 0; i < DAILY_LIMIT; i++) {
      record();
    }
    const overCap = record();
    expect(overCap).toEqual({
      allowed: false,
      count: DAILY_LIMIT,
      justHitCap: false,
    });
  });

  it("does not flip justHitCap true again on subsequent over-cap calls", () => {
    for (let i = 0; i < DAILY_LIMIT; i++) {
      record();
    }
    const r501 = record();
    const r502 = record();
    expect(r501).toEqual({
      allowed: false,
      count: DAILY_LIMIT,
      justHitCap: false,
    });
    expect(r502).toEqual({
      allowed: false,
      count: DAILY_LIMIT,
      justHitCap: false,
    });
  });

  it("resets count and re-arms justHitCap on UTC day rollover", () => {
    // Two timestamps: same wall-clock time of day, but one UTC day apart.
    // Using 2026-01-01 vs 2026-01-02 keeps us safely away from any
    // local-timezone edge cases — the module compares UTC date strings.
    const day1 = new Date("2026-01-01T12:00:00.000Z");
    const day2 = new Date("2026-01-02T12:00:00.000Z");

    // Fill day 1 right up to the cap so capNotified is set.
    for (let i = 0; i < DAILY_LIMIT; i++) {
      const r = record(day1);
      if (i === DAILY_LIMIT - 1) {
        expect(r.justHitCap).toBe(true);
      }
    }
    // 501st on day 1 is rejected.
    expect(record(day1)).toEqual({
      allowed: false,
      count: DAILY_LIMIT,
      justHitCap: false,
    });

    // First call on day 2 resets the window: count returns to 1 and the
    // cap-hit flag is re-armed (so a new day-2 cap-hit will fire again).
    expect(record(day2)).toEqual({
      allowed: true,
      count: 1,
      justHitCap: false,
    });

    // Confirm the re-arming by driving day 2 up to the cap as well.
    let last = { allowed: true, count: 1, justHitCap: false };
    for (let i = 1; i < DAILY_LIMIT; i++) {
      last = record(day2);
    }
    expect(last).toEqual({
      allowed: true,
      count: DAILY_LIMIT,
      justHitCap: true,
    });
  });
});
