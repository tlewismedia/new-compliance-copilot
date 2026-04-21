import { Card } from "./card";
import { RunEvaluationButton } from "./run-evaluation-button";
import { LOGO_FONT } from "./shared";

/**
 * Generic /evaluations section wrapper: title, description, run-button, and
 * a slot for the pre-run hint or the rendered results. Matches the two-card
 * stacked layout from the Gradio prototype but styled with the app theme
 * (muted greens/creams, Card, LOGO_FONT title).
 *
 * When `runDisabled` is set (e.g. while viewing a saved report), the run
 * button is rendered in a disabled state with a tooltip and the click
 * handler is never invoked.
 */
export function EvaluationSection({
  title,
  description,
  running,
  progress,
  hasResults,
  error,
  onRun,
  runDisabled = false,
  runDisabledReason,
  children,
}: {
  title: string;
  description: string;
  running: boolean;
  progress: { index: number; total: number } | null;
  hasResults: boolean;
  error: string | null;
  onRun: () => void;
  runDisabled?: boolean;
  runDisabledReason?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              className="text-[20px] tracking-tight text-[#1f2a23]"
              style={LOGO_FONT}
            >
              {title}
            </h2>
            <p className="mt-1 max-w-[52ch] text-[13px] text-[#6b7a70]">
              {description}
            </p>
          </div>
          <RunEvaluationButton
            onClick={onRun}
            running={running}
            progress={progress}
            disabled={runDisabled}
            disabledReason={runDisabledReason}
          />
        </div>
        {error && (
          <div className="mt-4 rounded-xl border border-[#c5a0a5]/40 bg-[#efdfe2]/40 px-4 py-2.5 text-[12px] text-[#8b3a2f]">
            {error}
          </div>
        )}
      </Card>

      {hasResults ? (
        <div className="space-y-4">{children}</div>
      ) : (
        <Card className="p-6">
          <p className="text-[13px] text-[#8a968f]">
            Click &ldquo;Run evaluation&rdquo; to start.
          </p>
        </Card>
      )}
    </section>
  );
}
