import { SERIF, CONFIDENCE_COLORS, type ConfidenceTier } from "./shared";

const CONFIDENCE_TOOLTIP =
  "Based on the semantic similarity score of the best-matching source retrieved for your question. High = score ≥ 0.65, Medium = score ≥ 0.45, Low = score < 0.45.";

const TIER_LABEL: Record<ConfidenceTier, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function TierIcon({
  tier,
  stroke,
}: {
  tier: ConfidenceTier;
  stroke: string;
}): React.JSX.Element {
  if (tier === "HIGH") {
    // Checkmark.
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3.5 7L6 9.5L10.5 4.5"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tier === "MEDIUM") {
    // Info-style glyph: dot over a short vertical stroke.
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="4" r="0.9" fill={stroke} />
        <path
          d="M7 6.5V10"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // LOW — alert / exclamation glyph (reused from the previous sage branch).
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 3.5V7.5M7 10V10.2"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConfidenceBadge({
  tier,
}: {
  tier: ConfidenceTier;
}): React.JSX.Element {
  const color = CONFIDENCE_COLORS[tier];
  const label = TIER_LABEL[tier];

  return (
    <div className="group relative">
      <div
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-2 ring-1 ${color.bg} ${color.ring}`}
      >
        <div className="flex flex-col items-end leading-none">
          <span
            className={`text-[9px] uppercase tracking-[0.2em] ${color.text}`}
          >
            Confidence
          </span>
          <span
            className={`mt-1 text-[18px] leading-none tracking-tight ${color.text}`}
            style={SERIF}
          >
            {label}
          </span>
        </div>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ${color.iconBg}`}
        >
          <TierIcon tier={tier} stroke={color.iconStroke} />
        </div>
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-60 rounded-xl bg-[#1f2a23] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/90 opacity-0 shadow-[0_8px_24px_-4px_rgba(31,42,35,0.4)] transition-opacity duration-150 group-hover:opacity-100"
      >
        <span className="mb-1 block text-[9px] uppercase tracking-[0.18em] text-white/50">
          How confidence is determined
        </span>
        {CONFIDENCE_TOOLTIP}
        <span
          aria-hidden
          className="absolute right-4 top-0 -translate-y-full border-4 border-transparent border-b-[#1f2a23]"
        />
      </div>
    </div>
  );
}
