/**
 * Tiny state-machine helpers for the `Save report` → `Report Saved` flow on
 * `/evaluations`.
 *
 * The confirmation flag (`justSaved`) must flip true after a successful POST
 * to `/api/evaluations/reports` and flip false the moment the user starts
 * any new evaluation run, so the confirmation is tied to the exact payload
 * that was persisted. These pure helpers make that transition unit-testable
 * without spinning up a React renderer.
 */

/**
 * Returns the next `justSaved` value when a new retrieval or answer run
 * begins. Starting a new run invalidates any prior save confirmation, since
 * the resulting summary will differ from whatever was persisted.
 */
export function justSavedOnRunStart(): boolean {
  return false;
}

/**
 * Returns the next `justSaved` value after a save attempt completes.
 * `ok === true` → POST succeeded, show "Report Saved".
 * `ok === false` → POST failed, leave the button enabled for a retry.
 */
export function justSavedOnSaveComplete(ok: boolean): boolean {
  return ok;
}
