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

