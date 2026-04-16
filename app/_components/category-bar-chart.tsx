import { Card } from "./card";
import {
  formatMetric,
  paletteForTier,
  tierForJudge,
  tierForRatio,
  type MetricFormat,
  type ThresholdTier,
} from "./evaluation-types";

export interface CategoryBarRow {
  readonly category: string;
  readonly value: number;
  readonly count: number;
}

/**
 * Native HTML/CSS horizontal bar chart for average-by-category views. No
 * dependency on any chart library — bar widths are CSS percentages.
 */
export function CategoryBarChart({
  title,
  rows,
  scale,
  format,
  tierFor,
}: {
  title: string;
  rows: readonly CategoryBarRow[];
  scale: "0-1" | "1-5";
  format: MetricFormat;
  tierFor: "ratio" | "judge";
}): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-medium tracking-tight text-[#1f2a23]">
          {title}
        </h3>
        <span className="text-[11px] text-[#8a968f]">
          scale {scale === "0-1" ? "0 – 1" : "1 – 5"}
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.length === 0 && (
          <li className="text-[12px] text-[#8a968f]">No categories yet.</li>
        )}
        {rows.map((row) => (
          <Bar
            key={row.category}
            row={row}
            scale={scale}
            format={format}
            tierFor={tierFor}
          />
        ))}
      </ul>
    </Card>
  );
}

// Private helper — kept in this file per agents.md "small private helper"
// allowance. Not exported.
function Bar({
  row,
  scale,
  format,
  tierFor,
}: {
  row: CategoryBarRow;
  scale: "0-1" | "1-5";
  format: MetricFormat;
  tierFor: "ratio" | "judge";
}): React.JSX.Element {
  const domainMax = scale === "0-1" ? 1 : 5;
  const domainMin = scale === "0-1" ? 0 : 1;
  const clamped = Math.max(domainMin, Math.min(domainMax, row.value));
  const pctRaw = (clamped - domainMin) / (domainMax - domainMin);
  // Ensure a visible sliver for very low non-zero scores and keep zero zero.
  const widthPct = row.value <= domainMin ? 0 : Math.max(pctRaw * 100, 2);
  const tier: ThresholdTier =
    tierFor === "ratio" ? tierForRatio(row.value) : tierForJudge(row.value);
  const palette = paletteForTier(tier);

  return (
    <li>
      <div className="flex items-center justify-between text-[11px] text-[#6b7a70]">
        <span className="truncate pr-3">
          {row.category}
          <span className="ml-2 text-[#a0a9a4]">n={row.count}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#eef1ee]">
          <div
            className={`h-full ${palette.bar}`}
            style={{ width: `${widthPct}%` }}
          />
        </div>
        <span
          className={`w-16 shrink-0 text-right text-[12px] tabular-nums ${palette.value}`}
        >
          {formatMetric(row.value, format)}
        </span>
      </div>
    </li>
  );
}
