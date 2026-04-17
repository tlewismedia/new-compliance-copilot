import { Card } from "./card";

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
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}): React.JSX.Element {
  const disabled = loading || query.trim().length === 0;
  return (
    <Card className="p-6" data-testid="question-card">
      <div className="flex items-center justify-between">
        <label
          htmlFor="question-input"
          className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]"
        >
          Question
        </label>
        <span className="text-[11px] text-[#8a968f]">Press ⌘↵ to submit</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative flex-1">
          <textarea
            id="question-input"
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            rows={1}
            placeholder="e.g. What are baseline requirements for cyber incident detection?"
            className="block h-10 w-full resize-none rounded-xl border border-[#2d4a35]/10 bg-white px-4 py-0 align-middle text-[15px] leading-10 text-[#1f2a23] placeholder-[#a0a9a4] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_1px_0_0_rgba(45,74,53,0.04)] focus:border-[#6ea580] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          aria-label={loading ? "Thinking" : "Ask"}
          className="group relative h-10 shrink-0 overflow-hidden rounded-xl bg-[#2d4a35] px-5 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.35)] transition-all hover:bg-[#1f3526] hover:shadow-[0_4px_14px_-2px_rgba(45,74,53,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#2d4a35]"
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
    </Card>
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
