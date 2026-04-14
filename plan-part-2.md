# Part 2 — M1: Ingestion Pipeline

The second chunk of MVP work. Takes the repo from "scaffolded shell" to "curated corpus is queryable in Pinecone."

See [`plan.md` § M1](./plan.md) for the high-level milestone and [`project-goals.md`](./project-goals.md) for the framing.

---

## Goal

`pnpm ingest` reads markdown docs from `corpus/`, produces chunks with provenance, and lands them in the Pinecone index `compliance-copilot` so that a vector search against the index returns the expected chunk.

Part 2 is done when the round-trip test passes against real Pinecone.

---

## Dependencies

- ✅ Part 1 merged (Next.js + TS strict + folder layout + `shared/types.ts` stubs).
- 🔜 Pinecone index `compliance-copilot` exists in the user's Pinecone project.
- 🔜 User has `PINECONE_API_KEY` in `.env.local` (and `OPENAI_API_KEY` if we pick Option A — see below).

---

## Open decision: embedding strategy

Before writing Issue B we need to choose between two architectures. Both hit the same goal; they differ in which service does the embedding.

|                   | **Option A — External embeddings**                      | **Option B — Integrated embeddings**                                           |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Who embeds?       | OpenAI `text-embedding-3-small` (1536-dim)              | Pinecone's hosted model, e.g. `llama-text-embed-v2`                            |
| Ingest call       | `openai.embeddings.create` → `pinecone.upsert(vectors)` | `pinecone.upsertRecords(text + metadata)`                                      |
| Query call        | Embed query with OpenAI → `pinecone.query(vector)`      | `pinecone.searchRecords(query text)`                                           |
| Code surface      | Two SDKs, two API keys                                  | One SDK, one API key                                                           |
| Auth surface      | `OPENAI_API_KEY` + `PINECONE_API_KEY`                   | `PINECONE_API_KEY` only                                                        |
| Index schema      | Raw vectors + metadata dict                             | Flat schema; text in the field named by `fieldMap`, no nested `metadata` field |
| Plan impact       | Matches `plan.md` as written                            | Amend `plan.md` embedding row                                                  |
| Portability       | Embedding model is provider-independent at rest         | Locked to the Pinecone-hosted model that indexed the text                      |
| Cost at MVP scale | ~$0 (free tier, tiny corpus)                            | ~$0 (serverless free tier)                                                     |
| Latency           | Two network hops at query time                          | One network hop                                                                |

**Recommendation:** Option B (integrated). The Pinecone MCP server's instructions in this project assume integrated-index semantics (`fieldMap`, no `metadata` field, no object field values). That strongly suggests the `compliance-copilot` index was created as integrated. Going with it matches the infra, drops one SDK, drops one API key, halves query latency, and for the MVP there's no meaningful downside — we can re-index into an external-vector setup later if we ever need model independence.

If the index turns out to be external (dimension 1536, no hosted model bound), we fall back to Option A without rewriting — it's the same two-step decomposed into embed-then-upsert.

**Action:** confirm with `curl -H "Api-Key: $PINECONE_API_KEY" https://api.pinecone.io/indexes/compliance-copilot` or by saying which option you set up. The spec for Issue B is held until this is resolved; Issue A can proceed in parallel.

---

## Work breakdown

Two GitHub issues. Issue A can start immediately; Issue B waits on the embedding decision.

### Issue A — Sample corpus (bug-style, parallel-safe)

Seed `corpus/` with public regulatory + internal-policy excerpts so Issue B has something real to chunk.

**In scope**

- 4–5 markdown documents under `corpus/`.
- Each document is a **public** excerpt (see sources below) trimmed to 2–10 KB — enough content to produce multiple chunks without being unwieldy.
- YAML front-matter on every doc, consistent schema:
  ```yaml
  ---
  title: <string> # human-readable title
  source: <string> # publisher (e.g. "FFIEC", "CFPB", "OCC", "SEC", "Internal")
  citation_id: <string> # stable ID, e.g. "12 CFR 1026.18" or "FFIEC-CAT-2017-IO"
  jurisdiction: <string> # "US-Federal", "Internal", etc.
  doc_type: regulation | guidance | internal
  effective_date: <YYYY-MM-DD> # best-effort; use "n/a" for undated internal docs
  source_url: <string> # public URL we excerpted from
  retrieved_at: <YYYY-MM-DD> # date we copied the excerpt
  ---
  ```
- Source variety: at least one FFIEC, one CFPB/Reg-Z-or-Reg-E, one OCC or SEC, and one `doc_type: internal` sample policy (synthetic — sets up Job 2 cross-reference work without doing it).
- `corpus/README.md` describing the front-matter schema, licensing note ("public-domain US federal guidance / synthetic internal sample — no redistribution concerns"), and the retrieval date for each doc.

**Non-goals**

- No chunking logic, no embedding, no Pinecone calls — that's Issue B.
- No full documents — excerpts only.
- No proprietary content.

**Acceptance criteria**

1. 4–5 `.md` files under `corpus/`, each with complete, consistent front-matter.
2. Every doc's front-matter parses with `gray-matter` (the implementer may verify with a one-off script — no committed parser yet).
3. `corpus/README.md` documents the schema and sources.
4. At least one doc per source bucket (FFIEC / CFPB-or-Reg / OCC-or-SEC / Internal).
5. No file exceeds 10 KB.

**Suggested sources (public, free-to-excerpt)**

- FFIEC Cybersecurity Assessment Tool — domain excerpt
- CFPB Regulation Z (Truth in Lending) — §1026.18 disclosures excerpt
- OCC Bulletin — e.g. a third-party risk-management bulletin summary
- SEC guidance — e.g. a short Marketing Rule Q&A excerpt
- Synthetic internal policy — e.g. "Acme Bank — Customer Complaint Handling Procedure"

---

### Issue B — Ingestion pipeline (serial, awaits Issue A + embedding decision)

Code that turns `corpus/*.md` into Pinecone records and a CLI to run it.

**In scope** _(written against Option B; see the Option A delta at the bottom of this section)_

- `ingest/chunk.ts` — markdown-aware chunker. Splits on header boundaries first, then packs sub-sections into chunks of ~500 tokens with ~50-token overlap. Keeps headers attached to their body (a chunk carries its heading path as a field). Does not split mid-citation or mid-sentence.
- `ingest/upsert.ts` — thin wrapper over Pinecone `upsertRecords`. Batches to respect request-size limits. Maps each chunk to a flat record matching the index's `fieldMap` — text in the text field, all other provenance as scalar siblings (no nested `metadata` field, no objects as field values, per the Pinecone MCP rules).
- `scripts/ingest.ts` — CLI orchestration: load `corpus/*.md` → parse front-matter → chunk → upsert. Structured JSON logs (one line per doc + one summary). Idempotent re-runs (stable record IDs keyed by `citation_id + chunk_index`).
- `package.json`: `"ingest": "tsx scripts/ingest.ts"`.
- Env validation in `scripts/ingest.ts`: fail fast with a clear message if `PINECONE_API_KEY` or `PINECONE_INDEX` is unset.
- Index assertion at startup: `describeIndex('compliance-copilot')` must succeed and return an integrated-embedding index with a known `fieldMap`. If not, error with a pointer to this doc.
- New deps: `@pinecone-database/pinecone`, `gray-matter`, `tsx` (dev). _(Option A adds `openai` and a `ingest/embed.ts`.)_
- `shared/types.ts` grows: `Chunk` (id, text, headingPath, sourceMetadata), and `Retrieval`/`Citation` gain real fields now that we know the on-disk schema. No duplicate type defs anywhere.
- **One Vitest integration test:** `tests/integration/ingest-roundtrip.test.ts`. Ingests a known fixture doc, waits for index freshness, queries Pinecone for a substring of the fixture, asserts the top hit is the expected chunk. Skipped when `PINECONE_API_KEY` is absent.
- `tests/unit/chunk.test.ts` — small unit tests for the chunker: header preservation, size bounds, overlap, doesn't split mid-citation.
- Vitest wired: `"test": "vitest run"`, `"test:unit": "vitest run tests/unit"`, `"test:integration": "vitest run tests/integration"`.

**Non-goals**

- No retrieval UI, no `/api/query`, no LangGraph — that's Part 3 (M2).
- No BM25/hybrid, no reranking, no eval harness.
- No index creation. If `compliance-copilot` doesn't exist, the script errors and the README tells the user how to create it.
- No deletion/update semantics beyond idempotent upsert.

**Acceptance criteria**

1. `pnpm ingest` on a fresh corpus run succeeds end-to-end, emitting a JSON summary (docs processed, chunks upserted, duration).
2. Re-running `pnpm ingest` is a no-op (same IDs, same content) — idempotent.
3. `pnpm test:unit` passes with meaningful coverage of the chunker's invariants (header preserved, size bounds, overlap, citation integrity).
4. `pnpm test:integration` passes against real Pinecone when creds are present; skips cleanly when absent.
5. `pnpm typecheck` and `pnpm lint` still exit 0.
6. `shared/types.ts` remains the single source of truth — no type redefinition.
7. Env validation fails fast on missing keys with an actionable message.
8. Index-shape assertion fails fast with a clear error if `compliance-copilot` isn't integrated (or is missing the expected `fieldMap`).

**Option A delta** _(if we go external-vector)_

- Add `openai` dep and `ingest/embed.ts` (batched `embeddings.create`, retry on 429/5xx).
- `scripts/ingest.ts` gains an embed step between chunk and upsert.
- Index assertion changes: expect `dimension=1536`, `metric=cosine`, no integrated model bound.
- Round-trip test embeds the query with OpenAI before calling `pinecone.query`.
- `.env.example` already lists `OPENAI_API_KEY` — no doc change needed.

Everything else is the same. The branching happens inside `scripts/ingest.ts`, `ingest/upsert.ts`, and the test — not across the whole design.

---

## Dispatch order

1. **Open Issue A (corpus).** Body is the spec. Human reads, approves.
2. **Run Implementer on Issue A** in a worktree. Reviewer checks. Human gates the review verdict and the PR.
3. **Resolve the embedding decision** (Option A vs B) in parallel — ideally before Issue A merges, but not blocking.
4. **Open Issue B (ingestion)** with the resolved architecture embedded in the body. Human approves.
5. **Run Implementer on Issue B.** Reviewer. Human gates. PR. Merge.
6. **Smoke test Part 2** — run `pnpm ingest` against real Pinecone, confirm the round-trip test passes, confirm a manual search returns sensible hits.

Issues A and B are serialised because B's round-trip test needs real corpus files on disk to assert against.

---

## Definition of done for Part 2

- [ ] `pnpm ingest` succeeds end-to-end against the real `compliance-copilot` index on a fresh `.env.local`.
- [ ] Round-trip integration test passes.
- [ ] Chunker unit tests pass.
- [ ] `shared/types.ts` updated with real `Chunk`/`Retrieval`/`Citation` shapes, no duplicates.
- [ ] `README.md` updated: one-time Pinecone index setup steps, `pnpm ingest` usage, how to re-ingest, where the corpus lives.
- [ ] `plan.md` M1 checklist marked complete (if the plan doc tracks that).
- [ ] No TypeScript or ESLint errors.
- [ ] Each of the two PRs merged to `main`.

Once Part 2 is done, Part 3 (M2 — the LangGraph `retrieve → generate` pipeline behind `/api/query`) is unblocked. That's a separate plan doc.

---

## Risks and mitigations

- **Pinecone index doesn't match what we coded against.** Mitigation: the startup assertion fails fast with a pointer to this doc. README documents the expected shape.
- **Chunking regresses retrieval quality** and we won't notice until Part 3. Mitigation: chunker unit tests lock in the invariants we care about (header preservation, size, citation integrity). The eval harness (post-MVP) is the real answer; for now tests + manual spot-checks are enough.
- **Public-source copyright question.** Mitigation: we use public-domain US federal guidance and synthetic internal docs only. `corpus/README.md` documents sources and retrieval dates. No proprietary content.
- **Round-trip test is flaky due to index-freshness lag.** Mitigation: the test polls/retries for a bounded window before failing, and is marked as an integration test that's skippable without creds so CI doesn't go red for the wrong reason.
