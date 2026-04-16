/**
 * Unit test for app/_components/shared.ts `confidenceTier` — verifies the
 * relaxed thresholds appropriate for text-embedding-3-small cosine scores:
 *   HIGH   when top score >= 0.65
 *   MEDIUM when top score >= 0.45
 *   LOW    otherwise (and for an empty retrievals array)
 */

import { describe, it, expect } from "vitest";
import { confidenceTier } from "../../app/_components/shared";
import type { Retrieval } from "../../shared/types";

function r(score: number): Retrieval {
  return {
    chunkId: `chunk-${score}`,
    text: "sample",
    score,
  };
}

describe("confidenceTier", () => {
  it("returns LOW for an empty retrievals array", () => {
    expect(confidenceTier([])).toBe("LOW");
  });

  it("returns HIGH when the top score is exactly 0.65 (inclusive boundary)", () => {
    expect(confidenceTier([r(0.65)])).toBe("HIGH");
  });

  it("returns MEDIUM when the top score is exactly 0.45 (inclusive boundary)", () => {
    expect(confidenceTier([r(0.45)])).toBe("MEDIUM");
  });

  it("returns MEDIUM when the top score is 0.55", () => {
    expect(confidenceTier([r(0.55)])).toBe("MEDIUM");
  });

  it("returns LOW when the top score is 0.30", () => {
    expect(confidenceTier([r(0.3)])).toBe("LOW");
  });
});
