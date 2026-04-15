# Trace View — Plan

## Why this exists

RAG demos show answers. A compliance copilot has to show *how it got there*. Goal 4 (`project-goals.md:14`) — "every answer carries a trace: which path was chosen, which documents were consulted, which confidence tier was assigned" — is not a developer nicety. It is the compliance-specific differentiator.

The trace view is the UI surface for that goal. It also doubles as the developer's forensic tool when the eval harness flags a regression: the same view that shows a compliance officer *why they should trust an answer* is the view an engineer opens to diagnose why one went wrong.

One UI, two jobs. That's why it earns investment.

## The question it answers

> **How did we get to this answer?**

Every element in the view must help answer that. If it doesn't, it doesn't belong here.

Three increasingly-deep versions of the same question, one per zone:

| Zone | Question it answers | Audience |
|---|---|---|
| Answer panel | *What* did the system conclude, and how confident is it? | Compliance officer |
| Sources panel | *What grounded the conclusion?* Which chunks, from which authority, at what score? | Compliance officer + reviewer |
| Trace drawer | *How did the pipeline actually run?* Every candidate, every knob, every model call. | Engineer debugging eval failures |

## Layout

```
┌───────────────────────────────────┬──────────────────────────┐
│  Query                            │  Sources (N)             │
│                                   │  ┌────────────────────┐ │
│  ┌──────────────────────────────┐ │  │ [1] <authority>    │ │
│  │ Confidence: <tier>           │ │  │ <citation_id>      │ │
│  │ Answer with inline [^N]      │ │  │ score 0.xx         │ │
│  │ citations as clickable chips │ │  │ version · date     │ │
│  └──────────────────────────────┘ │  │ ▸ expand chunk     │ │
│                                   │  └────────────────────┘ │
│  Trace ▸ (collapsed)              │  …                       │
└───────────────────────────────────┴──────────────────────────┘
```

## Zone 1 — Answer panel

- Confidence badge at top: **HIGH / MEDIUM / LOW**. Derived tier, not a raw number. Low shows a one-line reason ("top result scored 0.41 — below threshold").
- Answer prose with inline `[^N]` rendered as clickable chips, not footnote marks.
- Refusal state is visually distinct from low-confidence: "I didn't find sources that address this" + closest near-misses.
- Broken-citation state: if the answer cites `[^3]` but only two sources exist, render a red warning on the chip. Catches generator hallucinations cheaply.

## Zone 2 — Sources panel

Each card, top to bottom:

| Element | Example | Notes |
|---|---|---|
| Citation chip | `[1]` | Matches the chip in the answer. |
| Authority badge | `FINRA` / `SEC` / `Kestrel` | Color-coded. Internal vs external visually distinct. |
| Citation ID | `FINRA-Rule-5310::.09::p0` | Pinpoint from Issue C chunker — surface it. |
| Retrieval score | `0.89` | Raw similarity. Honesty over polish. |
| Version status pill | `current` (silent) / `proposed` / `superseded` | Non-current is a warning. |
| Effective date | `2024-11-01` | Regulatory docs only. |
| Expand | ▸ | Reveals full chunk text with cited span highlighted. |

## Zone 3 — Trace drawer

Collapsed by default. Expands into a timeline that **mirrors the LangGraph execution** — one block per node, in order. This teaches the architecture while you debug, and extends cleanly as Jobs 2–5 add nodes.

```
▾ Trace · run 7f3a2b · 2026-04-15 14:22:01 · 1.4s total
  ┌─ Query ──────────────────────────────────────────┐
  │ <as received>                                     │
  │ normalized: <if any>                              │
  └───────────────────────────────────────────────────┘
  ┌─ retrieve · 312ms ────────────────────────────────┐
  │ index: kestrel-v2 · model: text-embedding-3-small │
  │ k: 5 · threshold: 0.35                            │
  │                                                   │
  │ Candidates (N returned, M above threshold):       │
  │ ● 0.89  FINRA-Rule-5310::.09::p0        [cited 1] │
  │ ● 0.82  Kestrel-Best-Execution::p3      [cited 2] │
  │ ● 0.71  FINRA-Rule-5310::(a)::p1                  │
  │ ○ 0.31  Reg-NMS-605::(b)::p0          (below cut) │
  └───────────────────────────────────────────────────┘
  ┌─ generate · 1.08s ────────────────────────────────┐
  │ model: gpt-4o · temperature: 0.1                  │
  │ prompt: grounded-v3 (hash a91c…)                  │
  │ tokens: 2,104 in / 287 out                        │
  │ confidence tier: HIGH (top 0.89, gap to #2 = 0.07)│
  │ citations resolved: [^1]→#1, [^2]→#2              │
  └───────────────────────────────────────────────────┘

  [copy run JSON]  [re-run query]  [open in benchmark]
```

Block-by-block content:

- **Query block.** As received + any normalization. Trivial but non-negotiable.
- **Retrieve block.** Knobs (index, embedding model, k, threshold) + *all* candidates with scores. Cited ones tagged; below-threshold ones dimmed. **This block is the single most valuable part of the trace** — it lets you distinguish a retrieval failure from a grounding failure.
- **Generate block.** Model, temperature, prompt version + hash, token counts, confidence derivation (not just the tier — the inputs), citation resolution map.

## Interactions

| Action | Behavior |
|---|---|
| Click `[^N]` in answer | Scroll to + outline source card N. |
| Hover `[^N]` | Tooltip with first ~120 chars of the cited chunk. |
| Click a source card | Expand chunk text; highlight cited span. |
| Click a candidate in trace | Jumps to that chunk (even non-cited ones). |
| Copy run JSON | Full serialized trace on clipboard. |
| Re-run query | Re-invokes pipeline with same params. |
| Open in benchmark | Links to matching benchmark item, or offers to add this as a new one. |

The "open in benchmark" action is the bridge between the trace view and the eval harness: a wrong answer becomes a regression test in two clicks.

## Compliance-specific treatments

- `version_status: "proposed"` → yellow pill, tooltip "Not yet in force."
- `doc_type: "enforcement"` → distinct icon; these are precedent, not rules.
- All sources internal, question clearly about an external reg → subtle "internal-only answer" banner. Compliance officers need to know when no regulator is backing a claim.
- Answer cites an external reg but no retrieved chunk from that authority → red outline on the citation.

## Failure states worth designing

1. **Zero retrievals above threshold** → explicit refusal card, not an empty answer.
2. **Answer cites `[^N]` where N exceeds source count** → broken-citation warning on the chip. The generator hallucinated a footnote.
3. **All-internal answer to an external-reg question** → banner.
4. **Retrieved chunk never appears in the answer** → dim it in the sources panel (still shown — that's the point of the trace).

## Visual conventions

- Monospace for identifiers: chunk IDs, hashes, model names, scores. These are things users copy.
- Dim for below-threshold / non-cited candidates. Present but quiet.
- Left-rail timing on trace blocks catches latency regressions without a separate metrics page.
- Color restricted to authority badges + red outlines for broken states. No decorative color.

## Architecture — what changes, where

| Surface | Change |
|---|---|
| `shared/types.ts` | Extend `GraphState` with `confidenceTier`, `confidenceInputs`, `promptHash`, `modelId`, `timings`, `runId`. All derivable — no new pipeline logic beyond computing them. |
| `pipeline/nodes/retrieve.ts` | Already returns candidates; ensure non-cited + below-threshold ones are preserved in state (not filtered). |
| `pipeline/nodes/generate.ts` | Emit `confidenceTier` + inputs + prompt hash into state. |
| `app/api/query/route.ts` | Return the full `GraphState`, not a trimmed view. |
| `app/page.tsx` | Three-zone layout. Collapsed trace drawer. |
| `app/components/` | New: `AnswerPanel`, `SourcesPanel`, `SourceCard`, `TraceDrawer`, `ConfidenceBadge`, `AuthorityBadge`. |

The trace view is a *rendering* concern. The pipeline already produces (or nearly produces) every piece of data it needs. No new pipeline complexity.

## Milestones (ticket-sized)

Each a releasable PR. Stop-and-merge between.

### T1 — Confidence tier + honest source scores
- Derive `confidenceTier` (HIGH/MEDIUM/LOW) from top-k score + gap to #2. Commit thresholds in `pipeline/state.ts`.
- Render tier badge on answer, score on each source card.
- Refusal state distinct from low-confidence.
- Unit test: tier derivation is deterministic from inputs.

### T2 — Citation ↔ source interactivity
- Clickable `[^N]` chips that scroll to + outline the matching source card.
- Hover tooltip showing cited chunk preview.
- Broken-citation detection: answer cites `[^N]` that exceeds source count → red chip.
- Playwright test: click chip, correct card is highlighted; hallucinated chip renders red.

### T3 — Source card enrichment
- Expand/collapse chunk text inside the card.
- Authority badge (SEC / FINRA / MSRB / Kestrel).
- Version-status pill for non-`current` docs.
- Effective date for regulatory docs.
- Cited-span highlighting inside the expanded chunk (best-effort substring match; skip if not found).

### T4 — Trace drawer (MVP)
- Collapsed by default; persists expanded/collapsed state in `localStorage`.
- Query block, retrieve block (all candidates incl. below-threshold), generate block (model, prompt hash, tokens, confidence inputs, citation map).
- Per-block timing on left rail.
- "Copy run JSON" action.
- Unit test: trace renders from a fixture `GraphState` without hitting the pipeline.

### T5 — Benchmark bridge (depends on eval E1)
- If the current query matches a benchmark item (by normalized-query hash), show "open in benchmark" with a link.
- If not, show "add to benchmark" — copies the trace JSON in a format the benchmark YAML accepts.
- Out of scope until `eval/benchmarks/` exists.

## Deliberately out of scope for v1

- Raw embedding vectors in the trace. Useless to humans, enormous.
- Full prompt text by default. Hash it; offer a "view prompt" expander only.
- Charts of score-over-time. Committed `baseline.json` + git log is the chart.
- LangSmith-style span trees. Overkill for a two-node graph. Revisit when the graph branches.
- Re-run-with-modified-params UI. "Re-run query" is same-params only. Parameter tuning belongs in `pnpm eval`.
- Dedicated `/trace/<runId>` route. Share-links come later, if ever.

## Definition of done

- A user typing a question sees: an answer with a confidence tier, sources with authority/score/version, and a collapsible trace that mirrors graph execution.
- Clicking any `[^N]` chip surfaces the grounding chunk in under 200ms.
- Given a wrong answer, a developer can locate the failure mode (retrieval / grounding / citation) from the trace drawer alone, without opening a terminal.
- The answer trace for a query matches the `GraphState` captured by the eval harness for the same query — same data, two renderers.
- Playwright E2E covers the golden path (ask question → render answer + sources + trace) and the broken-citation failure state.
- `app/ARCHITECTURE.md` documents the three-zone layout and the component tree.

## Success criterion (one sentence)

Looking at any answer in the UI, any reader — compliance officer, reviewer, or engineer — can answer *how did we get to this answer?* at the depth they need, without reading code.
