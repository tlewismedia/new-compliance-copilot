"use client";

/**
 * Save-report button used on `/evaluations`. Disabled unless at least one
 * of the current summaries is populated. Behaviour lives in the parent;
 * this file owns presentation and the disabled/saving/saved states only.
 *
 * When `saved` is true the button locks into a "Report Saved" confirmation
 * state: the label flips and the button is disabled so the user cannot
 * accidentally re-POST the same payload. The parent resets `saved` back to
 * false when a new evaluation run starts.
 */
export function SaveReportButton({
  onClick,
  disabled,
  saving,
  saved,
}: {
  onClick: () => void;
  disabled: boolean;
  saving: boolean;
  saved: boolean;
}): React.JSX.Element {
  const label = saved ? "Report Saved" : saving ? "Saving…" : "Save report";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving || saved}
      aria-busy={saving}
      aria-label="Save report"
      title={
        disabled && !saving && !saved
          ? "Run at least one evaluation to save a report"
          : undefined
      }
      className="inline-flex items-center gap-2 rounded-xl border border-[#2d4a35]/30 bg-white/80 px-4 py-1.5 text-[13px] font-medium text-[#2d4a35] shadow-sm transition-colors hover:bg-[#dfeee3]/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/80"
    >
      {label}
    </button>
  );
}
