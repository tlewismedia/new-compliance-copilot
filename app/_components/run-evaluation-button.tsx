/**
 * "Run evaluation" button used on the /evaluations dashboard. Shows a
 * disabled loading state and a small progress indicator ("Evaluating test
 * N/M…") while items stream back from the server.
 */
export function RunEvaluationButton({
  onClick,
  running,
  progress,
  idleLabel = "Run evaluation",
}: {
  onClick: () => void;
  running: boolean;
  progress: { index: number; total: number } | null;
  idleLabel?: string;
}): React.JSX.Element {
  const busy = running;
  const progressText =
    progress && progress.total > 0
      ? `Evaluating test ${progress.index}/${progress.total}…`
      : "Starting…";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        aria-label={busy ? progressText : idleLabel}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#2d4a35] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.35)] transition-all hover:bg-[#1f3526] hover:shadow-[0_4px_14px_-2px_rgba(45,74,53,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#2d4a35]"
      >
        {busy ? <Spinner /> : null}
        <span>{busy ? "Evaluating…" : idleLabel}</span>
      </button>
      {busy && (
        <span
          className="text-[12px] text-[#6b7a70]"
          aria-live="polite"
          role="status"
        >
          {progressText}
        </span>
      )}
    </div>
  );
}

function Spinner(): React.JSX.Element {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
