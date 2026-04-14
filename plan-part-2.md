# Part 2 — M1: Ingestion Pipeline

Takes the repo from "scaffolded shell" to "curated corpus is queryable in Pinecone."

See [`plan.md` § M1](./plan.md) and [`project-goals.md`](./project-goals.md) for framing.

---

## Goal

`pnpm ingest` reads markdown from `corpus/`, chunks with provenance, and upserts to the existing Pinecone index `compliance-copilot`. Part 2 is done when a round-trip query against real Pinecone returns the expected chunk.

---

## Assumptions

- Part 1 merged (Next.js + TS strict + folder layout + `shared/types.ts` stubs).
- Pinecone index `compliance-copilot` exists and is reachable. Integrated-embedding index (records API, flat schema, text field declared by the index's `fieldMap`, no nested `metadata` field, no object field values).
- `PINECONE_API_KEY` and `PINECONE_INDEX` are set in `.env.local`.

No OpenAI embedding key needed — Pinecone hosts the embedding model.

---

## Work breakdown

Two issues. A runs now; B waits on A.

### Issue A — Sample corpus

Seed `corpus/` with 4–5 markdown excerpts so Issue B has something real to chunk.

**Scope**

- 4–5 `.md` files, 2–10 KB each, public-domain or synthetic.
- YAML front-matter, identical schema on every doc:
  ```yaml
  ---
  title: <string>
  source: <string>           # "FFIEC", "CFPB", "OCC", "SEC", "Internal"
  citation_id: <string>      # e.g. "12 CFR 1026.18"
  jurisdiction: <string>     # "US-Federal", "Internal"
  doc_type: regulation | guidance | internal
  effective_date: <YYYY-MM-DD>   # "n/a" for undated internal
  source_url: <string>
  retrieved_at: <YYYY-MM-DD>
  ---
  ```
- One doc per bucket: FFIEC, CFPB/Reg-Z-or-E, OCC/SEC, Internal (synthetic).
- `corpus/README.md`: schema, sources, licensing note.

**Acceptance**

1. 4–5 files, every front-matter parses with `gray-matter`.
2. Coverage across all four source buckets.
3. No file >10 KB, no proprietary content.
4. `corpus/README.md` documents schema + sources.

---

### Issue B — Ingestion pipeline

Turns `corpus/*.md` into Pinecone records.

**Scope**

- `ingest/chunk.ts` — markdown-aware chunker. Split on headers first, pack to ~500 tokens with ~50-token overlap, keep header path on each chunk, don't split mid-citation or mid-sentence.
- `ingest/upsert.ts` — wrapper over Pinecone `upsertRecords`. Batches for request-size limits. Flat records matching the index `fieldMap` — text in the text field, provenance as scalar siblings. No nested `metadata`, no object values.
- `scripts/ingest.ts` — CLI: load → parse front-matter → chunk → upsert. Structured JSON logs (one line per doc + summary). Idempotent via stable IDs (`citation_id + chunk_index`).
- Fail fast if `PINECONE_API_KEY` or `PINECONE_INDEX` missing.
- Startup check: `describeIndex` succeeds and returns an integrated index with the expected `fieldMap`; otherwise error with a pointer to this doc.
- Deps: `@pinecone-database/pinecone`, `gray-matter`, `tsx` (dev).
- `shared/types.ts`: add `Chunk` (id, text, headingPath, provenance), flesh out `Retrieval`/`Citation`. No duplicate types anywhere.
- Tests:
  - `tests/unit/chunk.test.ts` — header preserved, size bounds, overlap, citation integrity.
  - `tests/integration/ingest-roundtrip.test.ts` — ingest a fixture, query a known substring, assert top hit. Skipped without creds.
- `package.json`: `ingest`, `test`, `test:unit`, `test:integration` scripts.

**Non-goals**

- No retrieval UI, no `/api/query`, no LangGraph (Part 3).
- No hybrid search, no rerank, no eval harness.
- No index creation or deletion — if `compliance-copilot` is missing, the script errors with setup instructions.

**Acceptance**

1. `pnpm ingest` succeeds end-to-end and prints a JSON summary (docs, chunks, duration).
2. Re-running is a no-op — same IDs, same content.
3. `pnpm test:unit` passes; chunker invariants covered.
4. `pnpm test:integration` passes against real Pinecone; skips cleanly without creds.
5. `pnpm typecheck` and `pnpm lint` exit 0.
6. `shared/types.ts` is the only type source.
7. Missing env or wrong index shape fails fast with an actionable message.

---

## Dispatch order

1. Open Issue A. Human approves.
2. Implement + review Issue A. PR. Merge.
3. Open Issue B. Human approves.
4. Implement + review Issue B. PR. Merge.
5. Smoke test: run `pnpm ingest` against real Pinecone, confirm the round-trip test passes.

Serial because B's round-trip test needs real corpus on disk.

---

## Definition of done

- [ ] `pnpm ingest` round-trips against real `compliance-copilot` on a fresh `.env.local`.
- [ ] Round-trip and chunker tests pass.
- [ ] `shared/types.ts` updated, no duplicates.
- [ ] README updated: `pnpm ingest` usage, re-ingest, corpus location.
- [ ] `plan.md` M1 checklist marked complete.
- [ ] No TS or ESLint errors. Both PRs merged to `main`.

Part 3 (M2 — LangGraph `retrieve → generate` behind `/api/query`) is unblocked once this is done.

---

## Risks

- **Chunking regression** — locked down by unit tests; the real answer is the post-MVP eval harness.
- **Index-freshness lag in round-trip test** — bounded retry window; skippable without creds so CI doesn't flake.
- **Public-source licensing** — public-domain federal guidance + synthetic internal only; `corpus/README.md` documents each source.
