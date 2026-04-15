# Eval Harness — Plan

## Why this exists

RAG systems fail silently. The model produces fluent, confident-sounding prose whether or not the retrieved chunks are relevant, whether or not the citation points to the right regulation, whether or not the question should have been refused. Unit tests catch none of this — they tell you the code runs, not that the answers are right.

For a **compliance** copilot the asymmetry is sharper. A wrong citation isn't "a bug we'll fix in the next sprint" — it's a compliance officer telling their exam team the wrong CFR section. The cost of a silent regression is much higher than in a typical CRUD app, and the failure mode (plausible-sounding wrong answer) is exactly the one humans are worst at catching in review.

### Real-life scenarios the harness unlocks

1. **"Does swapping `text-embedding-3-small` for `-3-large` actually help?"** — today, no way to answer without eyeballing 20 queries. With the harness: run the suite on both, compare precision@5.
2. **"I tightened the refusal prompt — did it reduce hallucination or just make the system refuse everything?"** — two metrics move in opposite directions; you need both to judge.
3. **"A user reports a wrong answer."** — add it as a benchmark case. The regression is locked down forever, not patched-and-forgotten.
4. **"We ingested 500 more docs — is retrieval better or did we just add noise?"** — measurable, not debatable.
5. **Portfolio signal** — "here is my benchmark, here is the score on main, here is how each PR moved it" is the single strongest thing you can show a reviewer. Most RAG demos can't produce it.

This is also the precondition for everything else in the roadmap. A classifier-routed graph (adaptive routing) is only worth adding if you can prove it helps — otherwise it's complexity with no evidence. Same for confidence scoring and hybrid retrieval. **Eval before optimization, always.**

---

## What we measure

Three axes, one per relevant project goal:

| Metric | Measures | Method |
|---|---|---|
| **Retrieval precision@k** | Goal 1, 5 — right chunks surfaced | Deterministic: expected chunk IDs ∈ top-k |
| **Answer faithfulness** | Goal 1 — no fabrication, citations grounded | LLM-as-judge with rubric + citation-substring sanity check |
| **Refusal accuracy** | Goal 3 — refuses when it should, answers when it can | Boolean match against `should_refuse` label |

Each benchmark item is a tuple: `{ query, expected_chunk_ids[], expected_answer_contains[], should_refuse }`.

---

## Architecture

```
eval/
├── benchmarks/
│   └── job1-lookup.yaml          # curated query set, hand-labeled
├── metrics/
│   ├── retrieval-precision.ts    # deterministic
│   ├── faithfulness.ts           # LLM-as-judge
│   └── refusal-accuracy.ts       # deterministic
├── runner.ts                      # invokes graph, computes metrics, writes result
├── report.ts                      # markdown + JSON summary
├── baseline.json                  # committed: last-known-good scores
└── results/
    └── 2026-04-14-<sha>.json     # per-run artifacts
```

CLI: `pnpm eval` (one-shot), `pnpm eval --compare-baseline` (regression gate).

Every run records git SHA, model IDs, prompt hash, timestamp. Result is reproducible from the SHA alone.

---

## Milestones (ticket-sized)

Each is a releasable PR. Stop-and-merge between each; don't land the classifier before the harness is live.

### E1 — Benchmark schema + seed set
- YAML schema for benchmark items (validated with Zod)
- Hand-label ~10 queries across the existing corpus (FFIEC / CFPB / OCC / SEC / Internal) covering: exact-lookup, should-refuse, ambiguous, multi-doc
- Unit test: schema validates, chunk IDs resolve against the real corpus

### E2 — Runner + retrieval precision
- `pnpm eval` invokes the compiled graph for each benchmark item, captures `retrievals` from `GraphState`
- Compute precision@5, recall@5, mean reciprocal rank
- Writes `eval/results/<date>-<sha>.json`
- This alone is already useful — deterministic, no extra LLM cost

### E3 — Faithfulness metric (LLM-as-judge)
- Rubric: for each `[^N]` citation in the answer, does the cited chunk actually support the claim? (yes / partial / no)
- Uses a separate judge model (stronger than generator to avoid self-grading bias)
- Also: substring sanity check that `expected_answer_contains` phrases appear
- Cache judge responses by `(answer_hash, chunk_hash)` — benchmarks are expensive otherwise

### E4 — Refusal accuracy + baseline snapshot
- Deterministic boolean metric against `should_refuse`
- Commit `eval/baseline.json` — the scores on main as of this PR
- `pnpm eval --compare-baseline` exits non-zero if any metric regresses beyond threshold (e.g. −5% absolute)

### E5 — CI wiring + markdown report
- GitHub Action: on PR, run eval, post summary comment (scores + deltas vs baseline)
- `eval/report.ts` renders the JSON into a readable markdown table
- README gets an "Evaluation methodology" section pointing here

---

## Deliberately out of scope for v1

- **Automated benchmark generation.** Hand-labeling is the point — a benchmark the LLM wrote can only measure what the LLM already knows.
- **Latency / cost as eval metrics.** Track separately; don't let them dominate the quality signal early.
- **Answer similarity via embedding distance.** Too noisy for a small benchmark. Revisit if/when the set grows past ~100 items.
- **Multi-turn / conversation eval.** Job 1 is single-turn lookup. Defer with Jobs 2–5.

---

## Definition of done

- `pnpm eval` runs green on main and produces a timestamped JSON + markdown report
- `eval/baseline.json` committed; CI fails any PR that regresses it beyond threshold
- README has an "Evaluation methodology" section that a reviewer can read in 3 minutes and understand what's measured, how, and why
- At least one PR in the history visibly shows a metric moving (even a trivial prompt tweak) — proves the loop works end-to-end
