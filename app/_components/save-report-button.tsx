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
      className="group relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-[#0e6d6b] px-5 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(14,109,107,0.35)] transition-all hover:bg-[#0a5754] hover:shadow-[0_4px_14px_-2px_rgba(14,109,107,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#0e6d6b]"
    >
      {label}
    </button>
  );
}
