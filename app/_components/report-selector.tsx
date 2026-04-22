"use client";

import type { SavedReportMeta } from "./evaluation-types";

/**
 * Dropdown for selecting which saved report to view on `/evaluations`.
 *
 * Each entry of `reports` becomes an option labelled by a human-readable
 * form of its `savedAt` timestamp. When `reports` is empty, a single
 * disabled placeholder option keeps the control rendered.
 *
 * Selection is uncontrolled from the dropdown's perspective — the parent
 * owns the `value` and reacts to `onChange`. An empty `value` indicates no
 * saved report is currently selected (e.g. live run in progress); when in
 * that state with at least one saved report, the native select renders the
 * first option but the parent's view still reflects live state.
 */
export function ReportSelector({
  value,
  reports,
  onChange,
}: {
  /** A saved report id, or empty string when no saved report is selected. */
  value: string;
  reports: readonly SavedReportMeta[];
  onChange: (id: string) => void;
}): React.JSX.Element {
  const hasReports = reports.length > 0;
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#6b7a70]">
      <span className="uppercase tracking-[0.14em]">Report</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select report"
        className="rounded-lg border border-[#d9ddd9] bg-white/90 px-3 py-1.5 text-[13px] text-[#1f2a23] shadow-sm outline-none transition-shadow focus:ring-2 focus:ring-[#2d4a35]/30"
      >
        {!hasReports && (
          <option value="" disabled>
            No saved reports yet
          </option>
        )}
        {reports.map((r) => (
          <option key={r.id} value={r.id}>
            {formatTimestamp(r.savedAt)}
          </option>
        ))}
      </select>
    </label>
  );
}

// Private helper — small enough to stay inline per agents.md allowance.
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Short human-readable form. Example: "Apr 20, 2026, 6:23 PM".
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
