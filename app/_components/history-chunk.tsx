import { Card } from "./card";
import { SERIF, confidenceTier } from "./shared";
import { AnswerCard } from "./answer-card";
import type { HistoryEntry } from "./history-store";

export function HistoryChunk({
  entry,
}: {
  entry: HistoryEntry;
}): React.JSX.Element {
  const tier = confidenceTier(entry.response.retrievals);
  const formattedDate = formatAskedAt(entry.askedAt);
  return (
    <article className="space-y-3">
      <Card className="p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          {formattedDate}
        </div>
        <p
          className="mt-3 text-[18px] leading-[1.5] text-[#1f2a23]"
          style={SERIF}
        >
          {entry.query}
        </p>
      </Card>
      <AnswerCard
        answer={entry.response.answer}
        citations={entry.response.citations}
        retrievals={entry.response.retrievals}
        tier={tier}
        onCitationClick={undefined}
      />
    </article>
  );
}

function formatAskedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
