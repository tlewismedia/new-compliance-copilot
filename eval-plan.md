# Eval Harness — Plan

> **Status:** This is M4 Issue E. Depends on Issues A–D landing first (Kestrel corpus v2, citation-aware chunker, cross-ref extractor). The benchmark item format, chunk-ID shape, and metadata-aware metrics below all assume the v2 schema from [`corpus-improvement-plan.md`](./corpus-improvement-plan.md).

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
| **Retrieval precision@k** | Goal 1, 5 — right chunks surfaced | Deterministic: expected chunk IDs ∈ top-k. Pinpoint-aware: `FINRA-Rule-5310::.09::p0` must match exactly; doc-level match (any `FINRA-Rule-5310::*`) scored separately as `doc_precision@k`. |
| **Answer faithfulness** | Goal 1 — no fabrication, citations grounded | LLM-as-judge with rubric + citation-substring sanity check. Judge verifies the cited **paragraph_path**, not just the document. |
| **Refusal accuracy** | Goal 3 — refuses when it should, answers when it can | Boolean match against `should_refuse` label |
| **Cross-doc coverage** *(new)* | v2-specific — cross-authority and internal↔external questions cite both sides | For items with `expected_authorities: ["FINRA", "Kestrel"]`, both must appear in retrieved chunks' `authority` field |
| **Version hygiene** *(new)* | v2-specific — proposed rules aren't passed off as current; superseded rules aren't cited as authoritative | Items flagged `require_current_only: true` fail if any retrieved chunk has `version_status` ∈ {`proposed`, `superseded`} ranked in top-3 |

Each benchmark item is a tuple:

```yaml
query: "Does our best-execution policy meet FINRA 5310.09?"
expected_chunk_ids:                   # pinpoint-level where possible
  - "FINRA-Rule-5310::.09::p0"
  - "Kestrel-Best-Execution-Policy::chunk_2"
expected_answer_contains: ["quarterly review", "regular and rigorous"]
expected_authorities: ["FINRA", "Kestrel"]   # optional; drives cross-doc metric
expected_topic_tags: ["best-execution"]      # optional; sanity check
require_current_only: true                    # optional; drives version-hygiene metric
should_refuse: false
archetype: "cross-doc-internal-external"     # for slicing the report
```

---

## Architecture

```
eval/
├── benchmarks/
│   ├── kestrel-lookup.yaml        # exact-lookup / pinpoint queries
│   ├── kestrel-cross-doc.yaml     # internal policy ↔ external reg
│   ├── kestrel-refusal.yaml       # out-of-scope, adversarial
│   └── kestrel-version.yaml       # proposed / superseded handling
├── metrics/
│   ├── retrieval-precision.ts    # pinpoint + doc-level, deterministic
│   ├── faithfulness.ts           # LLM-as-judge, pinpoint-aware
│   ├── refusal-accuracy.ts       # deterministic
│   ├── cross-doc-coverage.ts     # authority-set match
│   └── version-hygiene.ts        # no proposed/superseded in top-3 when flagged
├── runner.ts                      # invokes graph, computes metrics, writes result
├── report.ts                      # markdown + JSON summary, sliced by archetype
├── baseline.json                  # committed: last-known-good scores (index=kestrel-v2)
└── results/
    └── 2026-04-14-<sha>.json     # per-run artifacts; includes index name + corpus commit SHA
```

CLI: `pnpm eval` (one-shot), `pnpm eval --compare-baseline` (regression gate).

Every run records git SHA, model IDs, prompt hash, timestamp, **Pinecone index name** (`kestrel-v2`), and **corpus commit SHA** (so re-running against a rebuilt index is detectable). Result is reproducible from the SHA alone.

---

## Milestones (ticket-sized)

Each is a releasable PR. Stop-and-merge between each; don't land the classifier before the harness is live.

### E1 — Benchmark schema + seed set (≥50 items)
- YAML schema for benchmark items (validated with Zod). Fields: `query`, `expected_chunk_ids[]`, `expected_answer_contains[]`, `expected_authorities[]?`, `expected_topic_tags[]?`, `require_current_only?`, `should_refuse`, `archetype`.
- Hand-label **≥50 queries** (corpus plan DoD) across the Kestrel v2 corpus. Archetype distribution:

  | Archetype | ~Count | Example |
  |---|---|---|
  | `exact-lookup` (pinpoint) | 10 | "What does FINRA 5310.09 require?" → `FINRA-Rule-5310::.09::p0` |
  | `cross-doc-internal-external` | 10 | "Does our best-ex policy meet FINRA 5310.09?" → cites Kestrel policy + FINRA rule |
  | `cross-authority` | 6 | "How do 15c3-5 and FINRA 3110 together govern market access supervision?" |
  | `should-refuse` | 8 | Out-of-scope (tax, non-US reg), adversarial, PII requests |
  | `version-hygiene` | 4 | "What is the current best-execution rule?" — must NOT retrieve proposed Reg Best Ex above current 5310 |
  | `enforcement-grounded` | 4 | "What was the violation in the FINRA best-ex AWC?" |
  | `operational-artefact` | 4 | "What did the 2025 FINRA exam letter flag?" → `kestrel-finra-exam-letter-2025` |
  | `RIA-specific` | 4 | Advisers Act §206, Marketing Rule, Custody, Code of Ethics |
- Leverage `corpus/cross-refs.json` (Issue D output) to seed `cross-doc-*` items — any edge there is a candidate multi-citation benchmark.
- Unit test: schema validates; every `expected_chunk_ids[]` entry resolves to a real chunk after ingest; pinpoint IDs parse as `${citation_id}::${paragraph_path}::p${N}`.

### E2 — Runner + retrieval precision (pinpoint-aware)
- `pnpm eval` invokes the compiled graph for each benchmark item, captures `retrievals` from `GraphState` (now with `authority`, `paragraphPath`, `versionStatus`, `topicTags` per Issue C).
- Compute **two** precision numbers: `pinpoint_precision@5` (exact chunk-ID match) and `doc_precision@5` (any chunk from the expected `citation_id`). Also recall@5, MRR.
- Writes `eval/results/<date>-<sha>.json` with per-archetype breakdown.
- Deterministic, no extra LLM cost.

### E3 — Faithfulness metric (LLM-as-judge, pinpoint-aware)
- Rubric: for each `[^N]` citation in the answer, does the cited chunk — at its specific `paragraph_path` — actually support the claim? (yes / partial / no). Citing the right doc but the wrong paragraph is **partial**, not yes.
- Uses a separate judge model (stronger than generator to avoid self-grading bias).
- Substring sanity check that `expected_answer_contains` phrases appear.
- Cross-doc items: judge also checks that when `expected_authorities` lists multiple, answer genuinely synthesises both (not just name-drops one).
- Cache judge responses by `(answer_hash, chunk_hash)` — benchmarks are expensive otherwise.

### E4 — Refusal + cross-doc + version hygiene, baseline snapshot
- Deterministic `should_refuse` boolean.
- `cross_doc_coverage`: for items with `expected_authorities`, fraction where the retrieved top-5 covers all listed authorities.
- `version_hygiene`: items with `require_current_only: true` fail if any top-3 chunk has `version_status` ∈ {`proposed`, `superseded`}.
- Commit `eval/baseline.json` — the scores on main as of this PR, captured against `PINECONE_INDEX=kestrel-v2`.
- `pnpm eval --compare-baseline` exits non-zero if any metric regresses beyond threshold (e.g. −5% absolute).

### E5 — CI wiring + markdown report
- GitHub Action: on PR, run eval, post summary comment (scores + deltas vs baseline, sliced by archetype).
- `eval/report.ts` renders JSON → markdown with per-archetype table + failing-item drill-down.
- README gets an "Evaluation methodology" section pointing here.
- Dashboard bonus: if `corpus-commit-sha` changes between runs, flag that the baseline should be re-captured (corpus drift isn't a regression).

---

## Deliberately out of scope for v1

- **Automated benchmark generation.** Hand-labeling is the point — a benchmark the LLM wrote can only measure what the LLM already knows.
- **Latency / cost as eval metrics.** Track separately; don't let them dominate the quality signal early.
- **Answer similarity via embedding distance.** Too noisy for a small benchmark. Revisit if/when the set grows past ~100 items.
- **Multi-turn / conversation eval.** Job 1 is single-turn lookup. Defer with Jobs 2–5.
- **Graph-traversal / multi-hop retrieval eval.** `corpus/cross-refs.json` exists after Issue D but no runtime consumes it yet; no point benchmarking a feature that isn't built. Seed the cross-doc archetype from it, but the metric only looks at retrieved chunks, not traversal quality.

---

## Definition of done

- `pnpm eval` runs green on main against `PINECONE_INDEX=kestrel-v2` and produces a timestamped JSON + markdown report
- Benchmark set has **≥50 items** spanning the archetypes in E1, with pinpoint `expected_chunk_ids` wherever a pinpoint exists
- `eval/baseline.json` committed; CI fails any PR that regresses any metric beyond threshold
- At least one cross-doc item demonstrably retrieves both an external reg and a `kestrel-*` policy in top-5, and the answer cites both
- At least one `require_current_only` item demonstrably ranks current rules above the `proposed-reg-best-execution` doc
- README has an "Evaluation methodology" section that a reviewer can read in 3 minutes and understand what's measured, how, and why
- At least one PR in the history visibly shows a metric moving (even a trivial prompt tweak) — proves the loop works end-to-end
