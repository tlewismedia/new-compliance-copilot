import { Card } from "./card";
import {
  formatMetric,
  paletteForTier,
  type MetricFormat,
  type ThresholdTier,
} from "./evaluation-types";
import { MetricTooltip } from "./metric-tooltip";

/**
 * Large metric card used in the /evaluations dashboard. Each card shows a
 * small label, a big numeric value (formatted per the metric type) and a
 * soft coloured left strip reflecting the green/amber/red threshold tier.
 *
 * When an `explanation` is supplied, a small `?` affordance is rendered next
 * to the label that reveals a plain-language explanation on hover or focus.
 */
export function MetricCard({
  label,
  value,
  tier,
  format,
  hint,
  explanation,
}: {
  label: string;
  value: number;
  tier: ThresholdTier;
  format: MetricFormat;
  hint?: string;
  explanation?: string;
}): React.JSX.Element {
  const palette = paletteForTier(tier);
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className={`absolute left-0 top-0 h-full w-1.5 ${palette.strip}`}
      />
      <div className="pl-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          <span>{label}</span>
          {explanation && (
            <MetricTooltip label={label} explanation={explanation} />
          )}
        </div>
        <div className={`mt-2 text-[32px] font-light leading-none ${palette.value}`}>
          {formatMetric(value, format)}
        </div>
        {hint && (
          <div className="mt-2 text-[11px] text-[#8a968f]">{hint}</div>
        )}
      </div>
    </Card>
  );
}
