/**
 * Unit tests for the `/evaluations` save-button state machine — the pure
 * helpers that control when the button flips between "Save report" and
 * "Report Saved" (issue #98).
 *
 * The behaviour under test:
 *   - starting a new retrieval or answer run must reset `justSaved` to
 *     false so the button returns to "Save report" once a fresh summary
 *     arrives (AC2),
 *   - a successful POST to `/api/evaluations/reports` must set `justSaved`
 *     to true so the button shows "Report Saved" and disables itself (AC1),
 *   - a failed POST must leave `justSaved` false so the user can retry.
 */

import { describe, it, expect } from "vitest";
import {
  justSavedOnRunStart,
  justSavedOnSaveComplete,
} from "../../app/_components/save-report-state";

describe("justSavedOnRunStart", () => {
  it("resets the saved confirmation when a new run begins", () => {
    // Regardless of the previous flag, a new retrieval or answer run
    // invalidates the save confirmation.
    expect(justSavedOnRunStart()).toBe(false);
  });
});

describe("justSavedOnSaveComplete", () => {
  it("sets the saved confirmation to true after a successful POST", () => {
    expect(justSavedOnSaveComplete(true)).toBe(true);
  });

  it("leaves the saved confirmation false after a failed POST", () => {
    expect(justSavedOnSaveComplete(false)).toBe(false);
  });
});

describe("save-button state machine", () => {
  it("models the full user flow: save → new run → save again", () => {
    // Starting point: user has run evaluations, button is enabled, not saved.
    let justSaved = false;

    // User clicks Save, POST succeeds.
    justSaved = justSavedOnSaveComplete(true);
    expect(justSaved).toBe(true); // button now shows "Report Saved", disabled

    // User kicks off a new retrieval run.
    justSaved = justSavedOnRunStart();
    expect(justSaved).toBe(false); // button returns to "Save report"

    // Run finishes, user clicks Save again, POST succeeds.
    justSaved = justSavedOnSaveComplete(true);
    expect(justSaved).toBe(true);

    // User kicks off an answer run this time — same reset.
    justSaved = justSavedOnRunStart();
    expect(justSaved).toBe(false);
  });

  it("does not lock the button after a failed save", () => {
    let justSaved = false;
    justSaved = justSavedOnSaveComplete(false); // network error / 500
    expect(justSaved).toBe(false);
  });
});
