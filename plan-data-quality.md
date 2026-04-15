# Plan — Data Quality & Corpus v2

How to make the copilot's inputs feel like a real compliance desk — so the outputs do too.

See [`project-goals.md`](./project-goals.md) for the five jobs and the "done" bar this plan is scored against.

---

## The thesis

**Today's corpus optimises for *source-variety*. A real compliance desk lives inside *scenario-coherence*.**

The current `corpus/` has five files, one per regulator bucket — great for proving the ingestion pipeline can handle heterogeneous sources, lousy for demonstrating a real workflow. A compliance analyst at an actual financial institution does not spend a morning moving between SEC marketing rules and FFIEC cybersecurity guidance. They live inside **one institution's regulatory surface**, and their highest-value questions are always **internal-vs-external comparisons** — "does our policy match the rule?"

The copilot cannot demonstrate its most important capability (Job 2 — cross-reference analysis) because the corpus has exactly one internal document and four external documents, none of which reference each other or apply to the same institution type.

The fix is not "more documents." It is: **pick one institution, simulate its world, and invest in data quality that unlocks the jobs the goals document promises.**

---

## What the current corpus gets right (keep)

- **Front-matter schema.** `title / source / citation_id / jurisdiction / doc_type / effective_date / source_url / retrieved_at` is a good minimum. Extend it; don't replace it.
- **Public-domain + synthetic-internal licensing story.** Clean and defensible.
- **Stable-ID strategy.** `${citation_id}::chunk_${N}` chunk IDs — re-ingest is idempotent. Preserve this.
- **Flat Pinecone record shape.** Imposed by the integrated-embedding index. Live with it; hydrate into typed metadata in `pipeline/nodes/retrieve.ts`.

---

## What the current corpus gets wrong (fix)

| Problem | Consequence | Fix |
|---|---|---|
| Five regulators, no shared institution | Cross-reference queries have nothing to cross-reference. Job 2 unreachable. | Commit to one institution archetype. |
| One internal document | Can't demo the "does our policy comply?" workflow, which is ~80% of real compliance work. | 8–10 internal docs, scoped to the archetype. |
| Excerpts capped at 10 KB | Each doc is a stub — no sub-section structure, no cross-refs, no defined-term glossary. Chunk IDs are coarse. | Raise cap to ~60 KB for regs, ~40 KB for internal. Include multi-section excerpts. |
| No cross-reference graph | Multi-hop retrieval (post-MVP Job 2) will have to rediscover linkages at query time. | Extract cross-refs at ingest, store as edge list. |
| No defined-term extraction | The model has to guess what "finance charge" or "covered person" means every time. | Pull Definitions sections into a separate "glossary" namespace. |
| No effective-date semantics | Job 5 (regulatory change monitoring) has no data to monitor. | Add `version_status` (current/proposed/sunset) and `effective_date`/`sunset_date` per section. |
| No gold eval set | "Evaluation discipline" (a top-5 goal) is currently vibes-checked. | Curate 50–100 gold Q→chunk mappings as a versioned artifact. |

---

## The institution

Pick one. I propose: **Acme Bank, N.A.** (continuing the existing synthetic name).

**Profile:**
- OCC-chartered national bank, ~$8 B in assets, HQ in Raleigh, NC.
- 45 branches across NC/SC/GA.
- Product mix: residential mortgage origination & servicing, small-business lending, consumer deposit products, limited credit card portfolio.
- ~900 employees, ~60 in compliance / risk / audit.
- Recent supervisory history: passed last OCC exam with two MRAs (Matters Requiring Attention) — one on third-party risk, one on HMDA data integrity.

**Why this archetype:**
- **Broad regulatory surface.** Consumer lending invokes most of the CFPB Regs (Z, B, X, E, C, P), plus OCC safety-and-soundness, FFIEC cyber, BSA/AML, and fair lending. Rich cross-reference opportunities without venturing into markets/capital/securities law.
- **Realistic internal-doc surface.** A bank this size has a recognisable policy library (underwriting, vendor management, BSA program, complaint handling, information security, fair lending self-testing). None of it is esoteric.
- **Portfolio legibility.** Community-bank compliance is a scenario an interviewer from *any* financial-services background can engage with. Broker-dealer or fintech examples require more domain prelude.

**Alternatives considered** (rejected for v2, potentially good expansions later):
- *Broker-dealer / RIA* — narrower external surface, harder to produce realistic internal docs without domain expertise.
- *Neobank / fintech* — novel and topical (CFPB 1033, BaaS enforcement) but the regulatory landscape is shifting weekly; demo would age poorly.
- *Credit union* — essentially isomorphic to community bank, just NCUA instead of OCC. No added signal.

---

## Proposed corpus v2

### External — regulatory & supervisory (public-domain)

Target ~12–15 external documents. Group by topic, not regulator, to make scenario-coherence visible.

| Topic | Documents |
|---|---|
| **Consumer lending — closed-end credit** | 12 CFR 1026.18 (keep), 1026.19 (TRID / mortgage disclosures), 1026.37 (Loan Estimate), 1026.38 (Closing Disclosure), 1026.43 (ATR/QM) |
| **Fair lending** | 12 CFR 1002.9 (ECOA adverse action), 12 CFR 1003 (HMDA Reg C), Interagency Fair Lending Examination Procedures |
| **Deposit / payments** | 12 CFR 1005.11 (Reg E error resolution) |
| **AML/BSA** | 31 CFR 1020.210 (BSA program requirements), FFIEC BSA/AML Examination Manual § CDD/EDD/SAR |
| **Third-party risk** | OCC Bulletin 2013-29 (keep), OCC Bulletin 2023-17 (2023 interagency refresh — supersedes 2013-29 for OCC-supervised banks) |
| **Cybersecurity** | FFIEC CAT Domain 5 (keep), Computer-Security Incident Notification Rule (12 CFR Part 53, 36-hour rule) |
| **Privacy** | 12 CFR 1016 (Reg P), Interagency Guidelines for Safeguarding Customer Information (GLBA § 501(b)) |
| **Enforcement artefacts** | 2–3 redacted CFPB consent orders and OCC MRA examples from public enforcement databases |
| **Proposed / upcoming** | CFPB 1071 (small business data collection, phased 2024–2026), CFPB 1033 (personal financial data rights) — flagged `version_status: "proposed"` |

**Drop from v1:** SEC Marketing Rule 206(4)-1 — doesn't apply to Acme Bank's charter and breaks scenario coherence. Keep the file in an archive branch for future RIA-archetype work.

**Size note:** these are excerpts, not full rule texts. Budget 20–60 KB per doc covering the sections most likely to produce query hits. Full `§1026.18` verbatim with all interpretations is unnecessary and would bloat the index.

### Internal — synthetic but realistic

All fictional, written in the voice of a mid-size community-bank compliance function. Target 8–10 documents, each 10–40 KB.

| Doc | Purpose | Maps to external |
|---|---|---|
| `acme-consumer-lending-policy.md` | Underwriting, ATR/QM compliance, adverse action procedures, fair lending self-testing | 1026.43, 1002.9, HMDA |
| `acme-third-party-risk-policy.md` | Vendor tiering, due diligence, ongoing monitoring, board reporting | OCC 2013-29, OCC 2023-17 |
| `acme-bsa-aml-program.md` | CDD, EDD triggers, SAR filing workflow, 314(a) response | 31 CFR 1020, FFIEC BSA Manual |
| `acme-information-security-program.md` | Incident response, 36-hour notification workflow, risk assessment methodology | 12 CFR Part 53, GLBA § 501(b), FFIEC CAT |
| `acme-complaint-handling-procedure.md` (keep, expand) | Intake, escalation, CFPB portal monitoring, root-cause | UDAAP, Reg E § 1005.11 |
| `acme-fair-lending-program.md` | HMDA data integrity, disparity testing, CRA prep | 12 CFR 1003, Interagency FL Procedures |
| `acme-privacy-notice.md` | GLBA initial/annual notice, opt-out mechanics | 12 CFR 1016 |
| `acme-mortgage-servicing-procedures.md` | Error resolution, escrow, loss mitigation | Reg X § 1024.30 |
| `acme-model-risk-management.md` | Model inventory, validation, AI/ML governance | SR 11-7 (bring in as an external) |
| `acme-record-retention-schedule.md` | Per-reg retention periods, destruction workflow | cross-cuts most regs |

### Operational artefacts (the unlock for Jobs 3 & 4)

These are what make examination prep and plain-language interpretation feel real. Low effort, high demo value.

| Artefact | What it enables |
|---|---|
| `acme-occ-exam-letter-2025.md` | Mock OCC examination letter with two MRAs (third-party risk, HMDA data integrity). Unlocks Job 3 (examination prep). |
| `acme-compliance-committee-minutes-q1-2026.md` | Quarterly board-committee minutes citing open findings. Unlocks trend-tracking questions. |
| `acme-rcsa-consumer-lending.md` | Risk & Control Self-Assessment matrix. Unlocks "which controls address §1026.43?" queries. |
| `acme-training-attestations-2025.md` | HMDA / UDAAP / BSA training completion records. Unlocks "are we current on HMDA training?" |

---

## Data quality — beyond breadth

More docs alone won't move the needle if the chunks are dumb and the metadata is thin. Five investments, each tied to a specific job or "done" criterion.

### 1. Citation-aware chunking

Regulations are hierarchically addressable: `§1026.18(f)(1)(i)` is a specific, authoritative pinpoint. Today's chunker splits at H1/H2/H3 and packs by token budget — it will happily fuse `§1026.18(f)` and `§1026.18(g)` into one chunk, destroying pinpoint addressability.

**Fix:** a regulation-aware chunker that respects paragraph markers `(a)`, `(a)(1)`, `(a)(1)(i)` as first-class split boundaries. Chunk IDs become `12 CFR 1026.18(f)(1)(i)::p1` instead of `12 CFR 1026.18::chunk_0`. This makes `[^N]` citations in the generated answer resolve to **the actual paragraph of the rule**, not a token window.

**Unlocks:** auditability ("done" criterion #4). An auditor clicking a citation lands on the paragraph of the regulation it came from, not a fuzzy neighbourhood.

### 2. Metadata richness

Extend front-matter per chunk (not just per document):

| Field | Example | Why |
|---|---|---|
| `paragraph_path` | `"(f)(1)(i)"` | Pinpoint citation. |
| `topic_tags` | `["atr-qm", "mortgage", "disclosures"]` | Faceted retrieval later. |
| `applies_to` | `{ charter: ["OCC", "FDIC"], asset_min: 0 }` | Future filter: "what applies to Acme?" |
| `version_status` | `"current"` / `"proposed"` / `"sunset"` | Job 5 foundation. |
| `supersedes` | `"OCC-Bulletin-2013-29"` | Lets OCC 2023-17 explicitly mark the old bulletin. |
| `cross_refs` | `["12 CFR 1026.19", "12 CFR 1026.37"]` | Edge list for multi-hop. |

### 3. Cross-reference graph

Extract `§\d+\.\d+(\([a-z0-9]+\))*` patterns at ingest time, build an adjacency list, and store it as a side-car file (`corpus/cross-refs.json`) keyed by chunk ID. `pipeline/` stays unaware of it until Job 2 lands; when it does, multi-hop retrieval has a graph to walk.

**Unlocks:** Job 2 (cross-reference analysis). Today's linear `retrieve → generate` cannot answer "what does §1026.18 depend on?" because nothing in the index knows.

### 4. Defined-term glossary

Every reg has a `§ 1026.2 Definitions` section. Pull those into a separate Pinecone namespace (`definitions`) so the retriever can join definitions on first mention of a defined term. Alternatively, inline them into the prompt when a matching term appears in top-K.

**Unlocks:** plain-language interpretation (Job 4) without hand-wavy paraphrase.

### 5. Gold evaluation set

Curate a versioned `eval/gold.jsonl` with 50–100 entries:

```jsonl
{"id": "gold-001", "question": "What adverse action notice language does §1002.9 require?", "expected_citations": ["12 CFR 1002.9(a)(2)::p1"], "expected_answer_contains": ["statement of specific reasons", "30 days"], "should_refuse": false}
{"id": "gold-042", "question": "How much does Acme charge for wire transfers?", "expected_citations": [], "should_refuse": true}
```

Covers: single-hop lookup (Job 1), cross-reference (Job 2), refusal-on-insufficient-retrieval (top-5 "done" criterion #1), adversarial near-misses.

**Unlocks:** evaluation discipline ("done" criterion #5). Every corpus or pipeline change runs against this file; regressions are visible.

---

## Phasing

Eight issues. Serialise A→B (corpus-before-chunker), parallelise C/D/E (independent).

| Issue | Scope | Blocks | Acceptance |
|---|---|---|---|
| **A — Archetype commit** | Agree on Acme Bank profile, retire SEC doc to archive branch, update `corpus/README.md`. | B, C | `corpus/README.md` describes the archetype in ≤30 lines; SEC doc moved. |
| **B — External corpus expansion** | Add the ~12 external docs from the table above. Each ≤60 KB. Front-matter extended with `topic_tags`, `version_status`, `supersedes`. | G | `pnpm ingest` produces ≥150 chunks; no doc fails front-matter validation. |
| **C — Internal corpus expansion** | Write the 8–10 `acme-*` internal docs. Each 10–40 KB. | G | All internal docs cite at least one external `citation_id` in their text. |
| **D — Operational artefacts** | Exam letter, committee minutes, RCSA, training records. | G | At least one doc references an open MRA that names a specific regulation. |
| **E — Chunker v2 (citation-aware)** | Teach `ingest/chunk.ts` to split at `(a)`, `(a)(1)`, `(a)(1)(i)` markers and encode paragraph path in chunk ID. | G | Unit tests: given a reg with paragraphs, chunker produces one chunk per terminal paragraph; IDs match expected. |
| **F — Cross-ref extractor** | At ingest time, extract `§ ...` patterns and emit `corpus/cross-refs.json`. | — | Round-trip test: `§ 1026.19` references in `1026.18` show up as edges from `1026.18` chunks. |
| **G — Re-ingest & round-trip smoke** | Run `pnpm ingest` end-to-end against new corpus. Manually spot-check five queries in the UI. | H | Query "what ATR/QM factors apply to Acme's jumbo mortgages?" retrieves both `1026.43` and `acme-consumer-lending-policy.md`. |
| **H — Gold eval set v1** | `eval/gold.jsonl` with ≥50 entries; a `pnpm eval` script that scores citation recall and refusal accuracy. | — | Baseline metrics captured; `pnpm eval` runs in <60s; README documents methodology. |

---

## Non-goals for this plan

- **No full verbatim regulation text.** Excerpts only. The chunker's job is not to reproduce the CFR.
- **No scraper / fetcher infrastructure.** Sources are copied in manually with `retrieved_at` dates. A monitoring pipeline is Job 5, not Corpus v2.
- **No authentication, no tenancy, no per-user corpus views.** Acme is the whole world for now.
- **No LLM-as-judge eval grading.** Gold set uses deterministic citation-overlap and substring checks for v1. Human spot-checks after that. LLM-judged semantic similarity is a later overlay.
- **No ontology / taxonomy engineering.** `topic_tags` is a flat list of strings hand-written in front-matter. A formal taxonomy with synonyms and hierarchies can wait until retrieval quality indicates it would help.

---

## Risks

- **Writing 10 internal policy docs is a content task, not an engineering task.** Realistic time cost. Options: (a) commission a first draft from an LLM and edit for realism, (b) stub each doc at 3–5 KB and expand iteratively, (c) start with the 3 internal docs that map directly to the OCC exam letter's MRAs, letting Job 3 drive content priority. Recommend (c).
- **Cross-ref extractor produces false positives.** Regex-based linking will match `§ 1.2` inside unrelated prose. Mitigation: confidence threshold, manual review of the generated `cross-refs.json` on first run.
- **Citation-aware chunker conflicts with the current flat-record schema.** New chunk IDs (`12 CFR 1026.18(f)(1)(i)::p1`) are longer and contain parentheses — verify Pinecone record-ID constraints before committing. If blocked, fall back to hashing the paragraph path.
- **Eval set calcification.** A too-specific gold set locks the corpus's shape. Mitigation: version it (`eval/gold-v1.jsonl`), allow multiple versions to coexist, regenerate when the corpus shape shifts materially.
- **Synthetic realism.** Internal docs that read as obviously AI-generated undercut the portfolio narrative. Recommend reading them aloud in the voice of a specific compliance officer — and passing them past someone with banking experience before the portfolio is live.

---

## Open questions for you

1. **Archetype lock-in?** Committing to community bank rules out meaningful expansion into broker-dealer / RIA / fintech without a second corpus. Comfortable with that, or do you want a multi-archetype strategy from the start? (My vote: lock in, expand later.)
2. **Where does real regulatory text come from?** Hand-copied from eCFR? Fetched from a static snapshot? I can draft an ingestion checklist either way, but the legal/licensing posture is cleaner with hand-copied excerpts + explicit `retrieved_at`.
3. **Eval set authorship.** Who writes the 50–100 gold questions? If it's you, I can provide a template and draft 20 based on the corpus. If it's me-via-LLM, I need your sign-off that "Claude wrote the questions" is acceptable for the portfolio narrative.
4. **Ordering.** The phasing above assumes corpus-first, chunker-second. Alternative: chunker v2 first (empty corpus, synthetic test inputs), then fill content. Slower path to a demoable state but cleaner engineering. My vote: corpus first — demo value compounds faster.
