import { LOGO_FONT } from "./shared";

export function QuestionCard({
  query,
  setQuery,
  onSubmit,
  onKeyDown,
  loading,
  textareaRef,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLInputElement | null>;
}): React.JSX.Element {
  const disabled = loading || query.trim().length === 0;
  return (
    <div data-testid="question-card">
      <div className="flex items-center justify-between">
        <label
          htmlFor="question-input"
          className="text-[20px] tracking-tight text-[#1f2a23]"
          style={LOGO_FONT}
        >
          Question
        </label>
        <span className="text-[11px] text-[#8a968f]">Press ⌘↵ to submit</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            id="question-input"
            type="text"
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            placeholder="e.g. What are baseline requirements for cyber incident detection?"
            className="block h-10 w-full rounded-xl border border-[#2d4a35]/10 bg-white px-4 py-0 align-middle text-[15px] leading-10 text-[#1f2a23] placeholder-[#a0a9a4] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_1px_0_0_rgba(45,74,53,0.04)] focus:border-[#6ea580] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          aria-label={loading ? "Thinking" : "Ask"}
          className="group relative h-10 shrink-0 overflow-hidden rounded-xl bg-[#0e6d6b] px-5 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(14,109,107,0.35)] transition-all hover:bg-[#0a5754] hover:shadow-[0_4px_14px_-2px_rgba(14,109,107,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#0e6d6b]"
        >
          <span className="relative flex items-center gap-2">
            {loading ? (
              <>
                <Spinner />
                Thinking…
              </>
            ) : (
              <>
                Ask
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M2.5 6.5H10.5M10.5 6.5L7 3M10.5 6.5L7 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </span>
        </button>
      </div>
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
