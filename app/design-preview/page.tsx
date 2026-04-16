import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});
const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Compliance Copilot — Design Preview",
};

// ── sample data ────────────────────────────────────────────────────────────

type Authority = "FINRA" | "SEC" | "MSRB" | "FinCEN" | "Kestrel";

const ANSWER: Array<{ text: string; cites?: number[] }> = [
  {
    text: "Firms must maintain reasonably designed policies and procedures to detect cyber incidents that could compromise the confidentiality, integrity, or availability of firm systems and customer data",
    cites: [1],
  },
  {
    text: ". FINRA guidance emphasizes continuous monitoring of network traffic, privileged-account activity, and endpoint telemetry as the baseline detective controls expected of a broker-dealer's supervisory system",
    cites: [2, 3],
  },
  {
    text: ". At a minimum, firms should define detection criteria anchored to their risk assessment and establish escalation paths that route confirmed incidents to the designated supervisory principal within a documented timeframe",
    cites: [4],
  },
  { text: "." },
];

const SOURCES: Array<{ n: number; authority: Authority; id: string }> = [
  { n: 1, authority: "FINRA", id: "Rule 3110(a)(7)" },
  { n: 2, authority: "SEC", id: "17 CFR § 248.30" },
  { n: 3, authority: "FINRA", id: "NTM 21-03" },
  { n: 4, authority: "Kestrel", id: "WSP · Cyber IR" },
];

const CITATIONS: Array<{
  n: number;
  authority: Authority;
  id: string;
  score: number;
  version: "current" | "proposed" | "superseded";
  date: string;
  excerpt: string;
  link: string;
}> = [
  {
    n: 1,
    authority: "FINRA",
    id: "FINRA-Rule-3110(a)(7)",
    score: 0.89,
    version: "current",
    date: "2024-11-01",
    excerpt:
      "Each member shall establish and maintain a system to supervise the activities of each associated person that is reasonably designed to achieve compliance with applicable securities laws, including the detection of activity that may indicate a compromise of firm or customer information.",
    link: "https://finra.org/rules/3110",
  },
  {
    n: 2,
    authority: "SEC",
    id: "17 CFR § 248.30",
    score: 0.82,
    version: "current",
    date: "2023-05-01",
    excerpt:
      "Every broker, dealer, and investment company must develop, implement, and maintain written policies and procedures reasonably designed to address administrative, technical, and physical safeguards for the protection of customer records and information.",
    link: "https://sec.gov/rules/248-30",
  },
  {
    n: 3,
    authority: "FINRA",
    id: "Regulatory Notice 21-03",
    score: 0.77,
    version: "current",
    date: "2021-01-25",
    excerpt:
      "Continuous monitoring capabilities — including network behavior baselining, privileged-account telemetry, and endpoint detection — are increasingly expected components of a sound cybersecurity program at a broker-dealer.",
    link: "https://finra.org/rules/ntm-21-03",
  },
  {
    n: 4,
    authority: "Kestrel",
    id: "Kestrel-WSP::incident-response",
    score: 0.71,
    version: "current",
    date: "2025-09-12",
    excerpt:
      "Confirmed incidents shall be escalated to the Chief Compliance Officer within four business hours of confirmation, with a written summary delivered to the supervisory principal within one business day.",
    link: "/docs/internal/wsp/cyber-incident-response",
  },
];

const TRACE = {
  run: "7f3a2b",
  dateTime: "2026-04-15 · 14:22:01",
  duration: "1.42s",
  query: {
    raw: "What are the baseline requirements for cyber incident detection under FINRA rules?",
    normalized: "baseline requirements cyber incident detection finra",
  },
  retrieve: {
    duration: "312 ms",
    index: "compliance-copilot",
    model: "text-embedding-3-small",
    k: 5,
    threshold: 0.35,
    candidates: [
      { score: 0.89, id: "FINRA-Rule-3110::(a)(7)::p0", cited: 1 },
      { score: 0.82, id: "17-CFR-248.30::(a)::p0", cited: 2 },
      { score: 0.77, id: "FINRA-NTM-21-03::§II::p1", cited: 3 },
      { score: 0.71, id: "Kestrel-WSP-Cyber::incident-response", cited: 4 },
      { score: 0.31, id: "Reg-NMS-605::(b)(1)::p0", cited: null as number | null },
    ],
  },
  generate: {
    duration: "972 ms",
    model: "claude-opus-4-6",
    temperature: 0.2,
    promptTokens: 2148,
    completionTokens: 312,
    confidence: "HIGH",
    citationsResolved: "4 / 4",
  },
};

const AUTHORITY_STYLES: Record<
  Authority,
  { strip: string; chip: string; label: string }
> = {
  FINRA: {
    strip: "bg-[#9cc9a9]",
    chip: "bg-[#dfeee3] text-[#2d4a35]",
    label: "FINRA",
  },
  SEC: {
    strip: "bg-[#94a3b0]",
    chip: "bg-[#e4e9ee] text-[#394956]",
    label: "SEC",
  },
  MSRB: {
    strip: "bg-[#b3a98b]",
    chip: "bg-[#ede8dc] text-[#4a4433]",
    label: "MSRB",
  },
  FinCEN: {
    strip: "bg-[#c5a0a5]",
    chip: "bg-[#efdfe2] text-[#54383d]",
    label: "FinCEN",
  },
  Kestrel: {
    strip: "bg-[#fab89a]",
    chip: "bg-[#fde4d4] text-[#8b4a2f]",
    label: "Kestrel",
  },
};

const SERIF = { fontFamily: "var(--font-serif)" };

const CARD =
  "rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-[#2d4a35]/[0.08] shadow-[0_2px_8px_-2px_rgba(45,74,53,0.06),0_12px_32px_-8px_rgba(45,74,53,0.08)]";

// ── page ───────────────────────────────────────────────────────────────────

export default function DesignPreview(): React.JSX.Element {
  return (
    <div
      className={`${geist.variable} ${serif.variable} relative min-h-screen overflow-x-hidden text-[#2a2f2c]`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <BackgroundLayers />
      <Header />
      <main className="relative mx-auto max-w-[1360px] px-8 pb-24 pt-4">
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 space-y-6 lg:col-span-8">
            <QuestionCard />
            <AnswerCard />
            <TraceSection />
          </section>
          <aside className="col-span-12 lg:col-span-4">
            <CitationsPanel />
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── background ─────────────────────────────────────────────────────────────

function BackgroundLayers(): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #f6faf5 0%, #eef7f0 40%, #e8f3ea 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 900px 520px at 92% -8%, rgba(253,228,212,0.9) 0%, rgba(253,228,212,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 400px at -5% 110%, rgba(156,201,169,0.4) 0%, rgba(156,201,169,0) 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2d4a35 1px, transparent 1px), linear-gradient(to bottom, #2d4a35 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </>
  );
}

// ── header ─────────────────────────────────────────────────────────────────

function Header(): React.JSX.Element {
  return (
    <header className="relative mx-auto flex max-w-[1360px] items-center justify-between px-8 pt-8">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.12)] ring-1 ring-[#9cc9a9]/30">
          <LeafMark />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[19px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Compliance Copilot
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6b7a70]">
            Grounded · Cited · Auditable
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#9cc9a9] opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#6ea580]" />
          </span>
          Index: compliance-copilot · 18k chunks
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[11px] font-medium text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          TL
        </div>
      </div>
    </header>
  );
}

function LeafMark(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3 14.5C3 9 7 4 13.5 3.5C14 8 11 13.5 6 14.5C5 14.7 4 14.7 3 14.5Z"
        fill="#9cc9a9"
      />
      <path
        d="M3 14.5L11 6.5"
        stroke="#2d4a35"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── question ───────────────────────────────────────────────────────────────

function QuestionCard(): React.JSX.Element {
  return (
    <div className={`${CARD} p-6`}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Question
        </label>
        <span className="text-[11px] text-[#8a968f]">Press ⌘↵ to submit</span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="relative flex-1">
          <div className="min-h-[56px] w-full rounded-xl border border-[#2d4a35]/10 bg-white px-4 py-3 text-[15px] leading-relaxed text-[#1f2a23] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_1px_0_0_rgba(45,74,53,0.04)]">
            What are the baseline requirements for cyber incident detection under FINRA rules?
            <span className="ml-[2px] inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse bg-[#6ea580]" />
          </div>
        </div>
        <button
          type="button"
          className="group relative overflow-hidden rounded-xl bg-[#2d4a35] px-5 py-3 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.35)] transition-all hover:bg-[#1f3526] hover:shadow-[0_4px_14px_-2px_rgba(45,74,53,0.45)]"
        >
          <span className="relative flex items-center gap-2">
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
          </span>
        </button>
      </div>
    </div>
  );
}

// ── answer ─────────────────────────────────────────────────────────────────

function AnswerCard(): React.JSX.Element {
  return (
    <div className={`${CARD} relative overflow-hidden p-7`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(253,228,212,0.7) 0%, rgba(253,228,212,0) 70%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <label className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Answer
        </label>
        <ConfidenceBadge />
      </div>

      <p className="mt-4 text-[15.5px] leading-[1.75] text-[#26302a]">
        {ANSWER.map((part, i) => (
          <span key={i}>
            {part.text}
            {part.cites?.map((n) => <CitationChip key={n} n={n} />)}
          </span>
        ))}
      </p>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
            Sources
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-[#9cc9a9]/40 to-transparent" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const a = AUTHORITY_STYLES[s.authority];
            return (
              <span
                key={s.n}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${a.chip}`}
              >
                <span className="font-mono text-[10px] opacity-70">[{s.n}]</span>
                <span className="font-semibold">{a.label}</span>
                <span className="opacity-75">{s.id}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#fde4d4]/70 px-3.5 py-2 ring-1 ring-[#fab89a]/40">
      <div className="flex flex-col items-end leading-none">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#8b4a2f]">
          Confidence
        </span>
        <span
          className="mt-1 text-[18px] leading-none tracking-tight text-[#6b2d0e]"
          style={SERIF}
        >
          High
        </span>
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-[#fab89a]/50">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 7L6 9.5L10.5 4.5"
            stroke="#8b4a2f"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function CitationChip({ n }: { n: number }): React.JSX.Element {
  return (
    <span className="mx-[2px] inline-flex h-5 min-w-[22px] -translate-y-[1px] items-center justify-center rounded-full bg-[#dfeee3] px-1.5 font-mono text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 transition-all hover:bg-[#c4e0cd] hover:ring-[#9cc9a9]">
      {n}
    </span>
  );
}

// ── trace ──────────────────────────────────────────────────────────────────

function TraceSection(): React.JSX.Element {
  return (
    <div className="pt-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Trace
          </span>
          <div className="flex items-center gap-4 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#2d4a35]/[0.08] backdrop-blur-md">
            <TraceMeta label="Run" value={`#${TRACE.run}`} mono />
            <span className="h-2.5 w-px bg-[#2d4a35]/15" />
            <TraceMeta label="When" value={TRACE.dateTime} />
            <span className="h-2.5 w-px bg-[#2d4a35]/15" />
            <TraceMeta label="Duration" value={TRACE.duration} mono />
          </div>
        </div>
        <button className="text-[10px] uppercase tracking-[0.2em] text-[#6b7a70] transition-colors hover:text-[#2d4a35]">
          Collapse ▴
        </button>
      </div>

      <div className="space-y-0">
        <TraceNode label="Query" accent="sage" duration={null}>
          <QueryNodeContent />
        </TraceNode>
        <TraceConnector />
        <TraceNode label="Retrieve" accent="sage" duration={TRACE.retrieve.duration}>
          <RetrieveNodeContent />
        </TraceNode>
        <TraceConnector />
        <TraceNode label="Generate" accent="peach" duration={TRACE.generate.duration}>
          <GenerateNodeContent />
        </TraceNode>
      </div>
    </div>
  );
}

function TraceMeta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
        {label}
      </span>
      <span className={mono ? "font-mono text-[11px]" : "text-[11px]"}>
        {value}
      </span>
    </span>
  );
}

function TraceNode({
  label,
  duration,
  accent,
  children,
}: {
  label: string;
  duration: string | null;
  accent: "sage" | "peach";
  children: React.ReactNode;
}): React.JSX.Element {
  const dot = accent === "sage" ? "bg-[#9cc9a9]" : "bg-[#fab89a]";
  const dotRing = accent === "sage" ? "ring-[#9cc9a9]/30" : "ring-[#fab89a]/40";
  const text = accent === "sage" ? "text-[#2d4a35]" : "text-[#8b4a2f]";
  return (
    <div className={`${CARD} relative p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white ring-1 ${dotRing}`}
          >
            <div className={`h-2 w-2 rounded-full ${dot}`} />
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${text}`}
          >
            {label}
          </span>
        </div>
        {duration && (
          <span className="font-mono text-[11px] text-[#6b7a70]">{duration}</span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TraceConnector(): React.JSX.Element {
  return (
    <div className="flex py-1 pl-[33px]">
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-3 w-px bg-[#9cc9a9]/60" />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1V8.5M5 8.5L1.5 5M5 8.5L8.5 5"
            stroke="#6ea580"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <div className="h-3 w-px bg-[#9cc9a9]/60" />
      </div>
    </div>
  );
}

function QueryNodeContent(): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Querytext
        </div>
        <div className="mt-1.5 text-[13.5px] leading-relaxed text-[#26302a]">
          {TRACE.query.raw}
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Normalized
        </div>
        <div className="mt-1.5 font-mono text-[12.5px] text-[#435048]">
          {TRACE.query.normalized}
        </div>
      </div>
    </div>
  );
}

function RetrieveNodeContent(): React.JSX.Element {
  const above = TRACE.retrieve.candidates.filter(
    (c) => c.score >= TRACE.retrieve.threshold,
  ).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <MetaCell label="Index" value={TRACE.retrieve.index} mono />
        <MetaCell label="Model" value={TRACE.retrieve.model} mono />
        <MetaCell label="k" value={String(TRACE.retrieve.k)} mono />
        <MetaCell
          label="Threshold"
          value={TRACE.retrieve.threshold.toFixed(2)}
          mono
        />
      </div>
      <div>
        <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Candidates · {TRACE.retrieve.candidates.length} returned · {above}{" "}
          above threshold
        </div>
        <div className="overflow-hidden rounded-xl bg-gradient-to-b from-[#f6faf5]/70 to-white ring-1 ring-[#2d4a35]/[0.06]">
          <div className="grid grid-cols-[88px_1fr_72px] gap-3 border-b border-[#2d4a35]/[0.06] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#8a968f]">
            <span>Score</span>
            <span>ID</span>
            <span className="text-right">Cit</span>
          </div>
          <div className="divide-y divide-[#2d4a35]/[0.05]">
            {TRACE.retrieve.candidates.map((c) => {
              const isAbove = c.score >= TRACE.retrieve.threshold;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[88px_1fr_72px] items-center gap-3 px-4 py-2.5 text-[12.5px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAbove ? "bg-[#6ea580]" : "bg-[#cfd4d1]"
                      }`}
                    />
                    <span
                      className={`font-mono ${
                        isAbove ? "text-[#2d4a35]" : "text-[#8a968f]"
                      }`}
                    >
                      {c.score.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`truncate font-mono text-[11.5px] ${
                      isAbove ? "text-[#435048]" : "text-[#8a968f]"
                    }`}
                  >
                    {c.id}
                  </span>
                  <span className="text-right">
                    {c.cited ? (
                      <span className="inline-flex items-center rounded-full bg-[#dfeee3] px-2 py-0.5 font-mono text-[10px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40">
                        [{c.cited}]
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#a0a9a4]">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateNodeContent(): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
      <MetaCell label="Model" value={TRACE.generate.model} mono />
      <MetaCell
        label="Temperature"
        value={TRACE.generate.temperature.toFixed(2)}
        mono
      />
      <MetaCell
        label="Confidence"
        value={TRACE.generate.confidence}
        highlight="peach"
      />
      <MetaCell
        label="Prompt tokens"
        value={TRACE.generate.promptTokens.toLocaleString()}
        mono
      />
      <MetaCell
        label="Completion tokens"
        value={TRACE.generate.completionTokens.toLocaleString()}
        mono
      />
      <MetaCell
        label="Citations resolved"
        value={TRACE.generate.citationsResolved}
        highlight="sage"
      />
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "sage" | "peach";
}): React.JSX.Element {
  const base = mono ? "font-mono text-[12px]" : "text-[13px] font-medium";
  const pill =
    highlight === "peach"
      ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fde4d4]/70 px-2.5 py-0.5 text-[11px] text-[#8b4a2f] ring-1 ring-[#fab89a]/40"
      : highlight === "sage"
      ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-[#dfeee3] px-2.5 py-0.5 text-[11px] font-mono text-[#2d4a35] ring-1 ring-[#9cc9a9]/40"
      : "";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
        {label}
      </span>
      <span className={highlight ? pill : `${base} text-[#2d4a35]`}>
        {highlight === "peach" && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#e89472]" />
        )}
        {highlight === "sage" && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#6ea580]" />
        )}
        {value}
      </span>
    </div>
  );
}

// ── citations panel ────────────────────────────────────────────────────────

function CitationsPanel(): React.JSX.Element {
  return (
    <div className="sticky top-8 space-y-4">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Citations
          </span>
          <span className="text-[12px] text-[#6b7a70]">
            ({CITATIONS.length})
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a968f]">
          Grounded
        </span>
      </div>
      <div className="space-y-3">
        {CITATIONS.map((c) => (
          <CitationCard key={c.n} citation={c} />
        ))}
      </div>
    </div>
  );
}

function CitationCard({
  citation,
}: {
  citation: (typeof CITATIONS)[number];
}): React.JSX.Element {
  const a = AUTHORITY_STYLES[citation.authority];
  return (
    <article className={`${CARD} group relative overflow-hidden p-5`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${a.strip}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-full bg-[#2d4a35] px-2 font-mono text-[11px] font-medium text-white">
              {citation.n}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${a.chip}`}
            >
              {a.label}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] ring-1 ring-[#2d4a35]/10">
            <span className="h-1 w-1 rounded-full bg-[#6ea580]" />
            {citation.score.toFixed(2)}
          </span>
        </div>
        <div className="mt-2.5 font-mono text-[11.5px] text-[#435048]">
          {citation.id}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#8a968f]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-[#9cc9a9]" />
            <span className="capitalize">{citation.version}</span>
          </span>
          <span>·</span>
          <span>Effective {citation.date}</span>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#3a4540]">
          &ldquo;{citation.excerpt}&rdquo;
        </p>
        <a
          href={citation.link}
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2d4a35] transition-colors hover:text-[#6ea580]"
        >
          Open source
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 7L7 3M7 3H4M7 3V6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}
