# Part 3 — M4: Corpus v2 (Kestrel Securities)

Improve srouce document corpus to target a single coherent securities-trading institution.

Implements the strategy in [`plan-data-quality-securities.md`](./plan-data-quality-securities.md).

---

## Goal

After this part, the repo has:

1. A coherent Kestrel Securities corpus (external regs + internal policies + operational artefacts).
2. A citation-aware chunker that produces pinpoint-addressable chunks across SEC / FINRA / MSRB citation styles.
3. A cross-reference edge list built at ingest time.
4. A ≥50-entry gold evaluation set ( will later use with eval harness ).

A user can ask "Does our best-execution policy meet FINRA 5310.09?" and get an answer citing both `FINRA-Rule-5310.09::p1` **and** `kestrel-best-execution-policy.md::(quarterly-review)::p1`.

---

## Decisions locked in

These were the open questions from the strategy doc. Committed so the issues below don't re-litigate:

| Decision | Value |
|---|---|
| Institution archetype | **Kestrel Securities, LLC** (BD) + **Kestrel Advisors, LLC** (RIA). Dually registered. |
| Clearing model | **Self-clearing.** Unlocks 15c3-1 / 15c3-3 corpus material. |
| RIA inclusion | **Included.** Unlocks Advisers Act + Marketing Rule + Custody Rule cross-regulator queries. |
| Other archetypes | **Deferred.** Banking plan archived; not pursued in this part. |
| Source of reg text | Hand-copied excerpts from canonical `.gov` / `.finra.org` pages, with `retrieved_at` date per doc. No scraper. |



---

## The front-matter v2 schema (shared contract)

Every issue downstream depends on this. Changes here require updating all five.

```yaml
---
title: string
authority: "SEC" | "FINRA" | "MSRB" | "FinCEN" | "Kestrel"
source: string                        # human label, e.g. "SEC" / "FINRA" / "Kestrel-Compliance"
citation_id: string                   # stable, e.g. "17 CFR 240.15l-1" or "FINRA-Rule-5310" or "Kestrel-WSP-Equities"
jurisdiction: "US-Federal" | "SRO" | "Internal"
doc_type: "regulation" | "rule" | "guidance" | "enforcement" | "internal" | "operational"
effective_date: string                # YYYY-MM-DD or "n/a"
sunset_date: string                   # YYYY-MM-DD or "n/a"
version_status: "current" | "proposed" | "superseded"
supersedes: string                    # citation_id of doc this replaces, or "n/a"
source_url: string
retrieved_at: string                  # YYYY-MM-DD
topic_tags: string[]                  # e.g. ["best-execution", "order-handling"]
---
```

**Chunk-level fields** (computed by the chunker; not in front-matter):

| Field | Example | Notes |
|---|---|---|
| `paragraph_path` | `"(a)(2)(ii)"` / `".01"` / `""` | Empty for non-regulatory docs. |
| `chunk_index` | `0, 1, 2…` | Global index within doc. |
| `heading_path` | `"Supplementary Material > .01 Definitions"` | From markdown headers. |

**Pinecone record schema** (flat, extends the current `upsert.ts` record):

Add: `authority`, `version_status`, `paragraph_path`, `topic_tags` (as `string[]` — Pinecone supports it). Drop nothing.

---

## Work breakdown — 5 issues

### Issue A — Archetype commit + external corpus

**Scope**

- Move existing 5 docs to `corpus/archive/v1/` (git-tracked; keep for reference).
- Rewrite `corpus/README.md`:
  - One-page "Kestrel scenario overview" (~40 lines) for portfolio legibility.
  - Updated front-matter schema (copy from this doc).
  - Document inventory table (populated in A, extended in B).
- Add 10–12 external docs, each 20–60 KB, covering:
  - Reg BI + Form CRS (2 docs)
  - Best execution: FINRA 5310, Reg NMS Rule 605/606, proposed Reg Best Execution (3 docs)
  - Reg SHO 200–204 (1 doc)
  - Supervision: FINRA 3110 + 3130 (1 combined doc)
  - Capital / customer protection / books & records: 15c3-1, 15c3-3, 17a-3/17a-4, 15c3-5 (2–3 docs)
  - RIA: Advisers Act §206, Rule 206(4)-1 (Marketing), Rule 206(4)-2 (Custody), Rule 204A-1 (Code of Ethics) (2 docs)
  - AML: 31 CFR 1023 (1 doc)
  - Enforcement: 2 FINRA AWCs or SEC orders (`doc_type: enforcement`)
- Update `corpus/ARCHITECTURE.md` to reflect the new schema.
- Extend `shared/types.ts` — add fields to `ChunkMetadata` (`authority`, `versionStatus`, `paragraphPath`, `topicTags`).

**Non-goals**

- No chunker changes (Issue C).
- No internal docs yet (Issue B).
- No re-ingest against Pinecone yet — `pnpm ingest` against `compliance-copilot` would corrupt the live index. Issue A is content-only; ingestion integration lands with Issue C.

**Acceptance**

1. 10–12 external `.md` files in `corpus/`, all front-matter parses with `gray-matter`.
2. Every file has `authority`, `version_status`, `supersedes`, `topic_tags` populated.
3. At least one file has `version_status: "proposed"` (the proposed Reg Best Execution).
4. At least one file has a non-`"n/a"` `supersedes` value.
5. `corpus/README.md` documents the Kestrel scenario in ≤50 lines.
6. `pnpm typecheck` passes with extended `ChunkMetadata`.
7. Documents must be coherant and plausible

---

### Issue B — Internal + operational corpus

Runs in parallel with Issue C.

**Scope**

- Delete `corpus/acme-bank-complaint-handling.md` (after archiving in A).
- Add 10 `kestrel-*` internal policies, each 10–40 KB:
  - `kestrel-wsp-equities.md`
  - `kestrel-code-of-ethics.md`
  - `kestrel-best-execution-policy.md`
  - `kestrel-reg-bi-disclosure-procedures.md`
  - `kestrel-market-access-controls.md`
  - `kestrel-reg-sho-locate-policy.md`
  - `kestrel-information-barriers.md`
  - `kestrel-aml-program.md`
  - `kestrel-marketing-rule-review.md`
  - `kestrel-error-correction-policy.md`
- Add 4 operational artefacts:
  - `kestrel-finra-exam-letter-2025.md` (two mock findings: best-ex documentation, email supervision sampling)
  - `kestrel-best-ex-committee-minutes-q1-2026.md`
  - `kestrel-wsp-annual-cert-2025.md`
  - `kestrel-trade-surveillance-alert-summary.md`
- Front-matter on all internal docs uses `authority: "Kestrel"`, `jurisdiction: "Internal"`, `source_url: "internal://kestrel/..."`.
- **Each internal doc must name ≥1 external `citation_id` in its body text** (e.g. "Consistent with FINRA Rule 5310…"). This is what lets Issue D's cross-ref extractor find edges.

**Non-goals**

- No code changes.
- No tuning the chunker for these docs.

**Acceptance**

1. 14 new `.md` files (10 policies + 4 artefacts) under `corpus/`.
2. Grep across internal docs finds references to ≥8 distinct external `citation_id` values.
3. `kestrel-finra-exam-letter-2025.md` cites the two specific regs corresponding to its two findings.
4. No file exceeds 40 KB.

---

### Issue C — Citation-aware chunker

Runs in parallel with Issue B. The ingestion integration step also includes the first real `pnpm ingest` against `kestrel-v2`.

**Scope**

- Rewrite `ingest/chunk.ts` `splitSentences` / `parseSections` logic to recognise three citation authorities:

  | Authority | Split markers (regex) | Paragraph-path format |
  |---|---|---|
  | SEC (CFR) | `^\s*\(([a-z])\)\s` then `\((\d+)\)` then `\(([ivxlc]+)\)` | `"(a)(2)(ii)"` |
  | FINRA | `^\s*\.(\d{2})\s` for Supplementary Material items | `".01"` |
  | MSRB | `^\s*\(([a-z])\)\s` then `\(([ivxlc]+)\)` | `"(c)(i)"` |

- Chunker emits one chunk per **terminal** paragraph (deepest `(i)` / `(ii)` / `.01` level that contains prose). Larger paragraphs without sub-markers remain as single chunks.
- Chunk ID format:
  - Regulatory: `${citation_id}::${paragraph_path}::p${N}` — e.g. `FINRA-Rule-5310::.09::p0`, `17-CFR-240.15l-1::(a)(2)(ii)::p0`
  - Non-regulatory (internal, operational): unchanged, `${citation_id}::chunk_${N}`
- Dispatch: chunker inspects front-matter `authority` to pick the paragraph-split style. `"Kestrel"` → fallback to current H1/H2/H3 + token-packing logic.
- Update `ingest/upsert.ts` to map the new `paragraphPath`, `authority`, `versionStatus`, `topicTags` fields into the Pinecone record.
- Update `pipeline/nodes/retrieve.ts` to hydrate the new fields back into `ChunkMetadata`.
- Update `ingest/ARCHITECTURE.md` schema table.
- Tests:
  - `tests/unit/chunk.test.ts` — one fixture per authority. Assert chunk IDs and `paragraph_path` values.
  - `tests/unit/chunk-fallback.test.ts` — internal-doc fixture uses old behaviour, IDs are `::chunk_N`.
  - Extend `tests/integration/ingest-roundtrip.test.ts` to point at `kestrel-v2` and assert a known pinpoint.
- Run `pnpm ingest` against `kestrel-v2` end-to-end; confirm chunk count ~350–500 and no ingest errors.

**Non-goals**

- No cross-ref extraction yet (Issue D).
- No eval harness yet (Issue E).
- Don't delete the `compliance-copilot` index — keep as rollback.

**Acceptance**

1. Given fixture excerpts of `17 CFR 240.15l-1(a)(2)(ii)` and `FINRA Rule 5310.09`, the chunker produces chunks with IDs `17-CFR-240.15l-1::(a)(2)(ii)::p0` and `FINRA-Rule-5310::.09::p0` respectively.
2. Internal-doc fixture produces `Kestrel-WSP-Equities::chunk_0`-style IDs (unchanged).
3. `pnpm ingest` against `kestrel-v2` completes without errors. JSON summary printed.
4. `pnpm test:integration` passes: retrieving by pinpoint returns the expected chunk.
5. `pipeline/nodes/retrieve.ts` hydrates all new fields (assert in unit test with fake Pinecone hit).

---

### Issue D — Cross-reference extractor

Runs after Issue C. Blocks E.

**Scope**

- New file `ingest/cross-refs.ts`:

  ```ts
  export interface CrossRef {
    readonly fromChunkId: string;
    readonly toCitationId: string;
    readonly matchedText: string;
  }
  export function extractCrossRefs(chunks: Chunk[]): CrossRef[];
  ```

- Regex set:
  - SEC: `\b\d+\s*CFR\s*\d+(?:\.\d+)*(?:\s*\(\s*[a-z0-9]+\s*\))*\b`
  - FINRA: `\bFINRA\s+Rule\s+\d{4}(?:\.\d{2})?\b`
  - MSRB: `\bMSRB\s+Rule\s+[A-Z]-\d+(?:\([a-z]\))?\b`
  - FINRA Notices: `\bRegulatory\s+Notice\s+\d{2}-\d+\b`
- Normalise matches to `citation_id` form. Matches that don't resolve to a known doc are dropped (logged with a warning count in the JSON summary).
- Extend `scripts/ingest.ts`: after upsert, write `corpus/cross-refs.json` containing `CrossRef[]`.
- `corpus/cross-refs.json` is committed to git — it's a pipeline-consumable artefact, not generated output.
- Tests:
  - `tests/unit/cross-refs.test.ts` — fixture text with 3 citation styles; assert all three extracted and normalised.
  - Assert noise cases: `§ 1.2` in unrelated prose not matched; version numbers like `3.1.4` not matched.

**Non-goals**

- No graph traversal. The edge list is produced and stored; `pipeline/` doesn't consume it yet.
- No multi-hop retrieval — that's a post-M4 consumer.

**Acceptance**

1. `pnpm ingest` writes `corpus/cross-refs.json` with ≥100 edges from the Kestrel corpus.
2. At least one edge links `Kestrel-Best-Execution-Policy` → `FINRA-Rule-5310`.
3. At least one edge spans authorities: e.g. `Kestrel-WSP-Equities` → `17-CFR-240.15c3-5`.
4. Unit tests cover all three citation styles and the noise cases.

---

### Issue E — Gold eval set + harness

Runs after D. Last to merge.

**Scope**

- `eval/gold.jsonl` — ≥50 entries, this schema:

  ```json
  {
    "id": "best-ex-001",
    "question": "What does FINRA 5310.09 require for best-execution reviews?",
    "expected_citations": ["FINRA-Rule-5310::.09::p0"],
    "expected_contains": ["regular", "rigorous"],
    "should_refuse": false,
    "category": "single-hop" | "cross-ref" | "refusal" | "near-miss"
  }
  ```

- Mix:
  - ~20 single-hop (lookup within one doc)
  - ~15 cross-ref (requires both a reg and a Kestrel internal policy)
  - ~10 refusal (question is outside corpus)
  - ~5 near-miss (wording similar to a different reg section that shouldn't match)
- `eval/run.ts` — script that:
  1. Reads `gold.jsonl`.
  2. For each entry, POSTs to `/api/query` (or calls `graph.invoke` directly — preferred, no server needed).
  3. Scores:
     - Citation recall: `|expected ∩ actual_chunk_ids| / |expected|`
     - Substring hit: all `expected_contains` present in `answer`
     - Refusal match: when `should_refuse=true`, answer contains the literal refusal string
  4. Outputs a summary table + per-entry detail JSON.
- `package.json`: add `"eval": "tsx eval/run.ts"` and `"eval:sample": "tsx eval/run.ts --sample 10"`.
- `README.md`: new "Evaluation" section with baseline metrics from the first run.
- Optional: `eval/run.ts --save-baseline` writes current scores to `eval/baseline.json`; future runs compare deltas.

**Non-goals**

- No LLM-as-judge semantic grading — deterministic checks only in v1.
- No UI — CLI output is sufficient.
- No CI integration — manual invocation for now.

**Acceptance**

1. `eval/gold.jsonl` has ≥50 entries across the four categories.
2. `pnpm eval` runs end-to-end in <60s.
3. Baseline metrics captured in `README.md` ("Evaluation" section): citation recall, substring hit rate, refusal accuracy.
4. Running `pnpm eval` twice produces identical scores (deterministic modulo LLM nondeterminism — tolerate ±5%).

---

## Dispatch order

```
         ┌──────────────┐
         │  A (external)│
         └──────┬───────┘
                │
        ┌───────┴────────┐
        ▼                ▼
   ┌─────────┐     ┌──────────┐
   │ B (int.)│     │ C (chunk)│
   └─────────┘     └────┬─────┘
                        ▼
                  ┌───────────┐
                  │ D (xrefs) │
                  └─────┬─────┘
                        ▼
                  ┌───────────┐
                  │ E (eval)  │
                  └───────────┘
```

1. **Issue A** — human approves → implementer → reviewer → PR → merge.
2. **Issues B and C** in parallel (different files, no overlap).
3. **Issue D** — after C merges (depends on new chunk ID format).
4. **Issue E** — after D merges (depends on full corpus + real chunk IDs).

Each issue follows the standard flow from [`agents.md`](./agents.md): orchestrator opens the issue with the scope above, implementer works on a worktree branch, reviewer verifies against acceptance criteria, human merges.

---

## Definition of done (M4)

- [ ] All 5 issues merged to `main`.
- [ ] `pnpm ingest` against `kestrel-v2` completes without errors and produces `corpus/cross-refs.json`.
- [ ] `pnpm eval` produces a baseline table; baseline recorded in `README.md`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` all green.
- [ ] `app/`, `ingest/`, `pipeline/`, `corpus/` `ARCHITECTURE.md` files reflect the new schema.
- [ ] A spot-check query in the UI against the new corpus returns a cited answer referencing a Kestrel internal policy and an external reg in the same answer.
- [ ] `.env.local` switched to `PINECONE_INDEX=kestrel-v2`. Old index kept but no longer in the critical path.

---

## Risks

- **Content authorship time dominates.** B alone is writing ~300 KB of realistic broker-dealer prose. Mitigation: start with the 3 internal docs that map directly to the mock exam findings (WSP, best-ex policy, email supervision — implied by the finding), let the remaining 7 follow as needed.
- **Pinecone record-ID format.** New chunk IDs (`17-CFR-240.15l-1::(a)(2)(ii)::p0`) contain parentheses. Verify Pinecone accepts them before merging C. If blocked, hash the paragraph_path into a hex suffix.
- **Cross-ref false positives.** Version numbers (`v3.1.4`), monetary amounts (`$1,026.18`), and date forms (`2023.17`) can trip the regex. Unit tests cover the common pitfalls; a manual review of the first `cross-refs.json` catches the rest.
- **Eval set calcification.** A gold set that's too specific locks the corpus. Mitigation: version the file (`eval/gold-v1.jsonl`), allow multiple to coexist, flag any entry referencing `paragraph_path` as "will need update if chunker changes."
- **Index cutover.** Switching `PINECONE_INDEX` mid-work could break in-flight PRs depending on the old index. Mitigation: don't flip `.env.local` until the final merge; keep both indices alive during the M4 window.
