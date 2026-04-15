# Eval Pilot Plan

## Purpose

Prove the evaluation loop works end-to-end on the Kestrel v2 corpus with the minimum possible surface area. Everything in [`eval-plan.md`](./eval-plan.md) — cross-doc coverage, version hygiene, LLM-as-judge faithfulness, CI gating, archetype slicing, baseline regression thresholds — is deferred. Land this first, iterate from a working loop rather than a designed-up-front harness.

Success = a developer can run `pnpm eval` locally, see a score, change the prompt or retrieval config, rerun, and see the score move.

---

## Minimum viable scope

**One metric.** `pinpoint_precision@5` — for each benchmark item, what fraction of `expected_chunk_ids` appears in the top-5 retrieved chunk IDs. Deterministic. No LLM judge. No extra API cost beyond the normal graph run.

**One benchmark file.** `eval/benchmarks/pilot.yaml` — 10 hand-labeled items. Enough to move the needle but small enough to hand-label in an afternoon.

**One output.** A markdown table printed to stdout and written to `eval/results/<date>-<sha>.md`. No JSON schema, no baseline file, no CI wiring yet.

---

## Benchmark item shape

Strict subset of the full schema:

```yaml
- query: "What does FINRA Rule 5310.09 require for best-execution review?"
  expected_chunk_ids:
    - "FINRA-Rule-5310::.09::p0"
  notes: "Pinpoint lookup — tests citation-aware chunker output"
```

That's it. No `should_refuse`, no `expected_authorities`, no archetypes. Add fields back one at a time as specific questions arise.

---

## Seed set (10 items)

Pulled from the existing Kestrel v2 corpus. Mix of pinpoint regulatory and internal-doc lookups — enough to exercise both chunk-ID formats:

1. FINRA 5310.09 — best-execution quarterly review (pinpoint)
2. 17 CFR 240.15c3-5 — market access controls (pinpoint)
3. 17 CFR 240.15l-1 — Reg BI care obligation (pinpoint)
4. Reg SHO 204 — close-out requirement (pinpoint)
5. Advisers Act Rule 206(4)-1 — Marketing Rule testimonials (pinpoint)
6. Kestrel WSP — equities supervision responsibility (doc-level)
7. Kestrel best-execution policy — quarterly review cadence (doc-level)
8. Kestrel FINRA exam letter 2025 — the two findings (doc-level)
9. Kestrel AML program — SAR filing trigger (doc-level)
10. FINRA AWC enforcement — what was the violation (doc-level)

Authoring rule: write the query first, then grep the corpus to pick the chunk you'd expect back. If you can't find one in under a minute, the corpus is missing something — note it, skip the item.

---

## Files

```
eval/
├── benchmarks/pilot.yaml
├── runner.ts                  # load yaml → run graph → score → print table
└── results/                   # gitignored for now
```

Three files. No `metrics/` directory, no `report.ts`, no `baseline.json`. The runner does everything inline — split it up once a second metric justifies the abstraction.

---

## Runner behavior

```
pnpm eval
  → load eval/benchmarks/pilot.yaml
  → for each item: invoke the compiled graph, capture retrievals from GraphState
  → compute pinpoint_precision@5 per item and overall mean
  → print markdown table: query | expected | got-top-5 | hit?
  → write same to eval/results/<date>-<sha>.md
```

Exits 0 regardless of score. No regression gating in the pilot.

---

## Explicitly deferred

Everything below stays out of the pilot. Each is its own follow-up once the pilot loop is boring:

- LLM-as-judge faithfulness (E3 in full plan)
- Refusal accuracy (needs adversarial items)
- Cross-doc coverage, version hygiene (v2-specific metrics)
- `doc_precision@5` as a separate number
- Baseline file + regression threshold
- CI wiring / PR comment bot
- Archetype slicing in the report
- Scaling past 10 items toward the 50-item DoD
- Zod schema validation of the YAML — a try/catch on YAML parse is enough for 10 items

---

## Definition of done

- `pnpm eval` runs green locally against `PINECONE_INDEX=kestrel-v2`
- Prints a markdown table with 10 rows and an overall `pinpoint_precision@5` score
- One small follow-up PR (e.g. a retrieval `topK` change) visibly moves the score — proves the loop actually measures something

Once that holds, graduate to `eval-plan.md`.
