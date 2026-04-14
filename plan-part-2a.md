# Part 2a — Pinecone wiring and connection smoke test

A narrow prelude to Part 2. Goal: prove the repo can authenticate to Pinecone, target a correctly-shaped index (integrated-embedding, `llama-text-embed-v2`), and round-trip a single record through hosted embed + semantic search — **without** touching the corpus, chunker, or ingest CLI.

When Part 2a is done, Part 2b (the real ingestion pipeline — everything that was Issue A + Issue B in [`plan-part-2.md`](./plan-part-2.md)) can start with zero infra ambiguity.

See [`plan.md` § M1](./plan.md) for the milestone this feeds into and [`plan-part-2.md`](./plan-part-2.md) for the full Part 2 scope that 2a slices out of.

---

## Goal

`pnpm pinecone:check` exits 0 on a clean machine when `.env.local` has a valid `PINECONE_API_KEY` and the target index exists with integrated embedding. It:

1. Loads `PINECONE_API_KEY` and `PINECONE_INDEX` from env, fails fast with a clear message if either is missing.
2. Calls `describeIndex` and asserts the index is **integrated** (has `embed.model` set) and has a known `fieldMap.text`.
3. Upserts one throwaway record into a dedicated `__smoke` namespace via `upsertRecords` (hosted embedding — no OpenAI dependency at this stage).
4. Queries that namespace via `searchRecords` with a substring of the seeded text.
5. Asserts the top hit is the seeded record, then deletes the `__smoke` namespace so the check is idempotent.
6. Prints a one-line JSON summary (index name, model, cloud/region, dimension, duration).

Part 2a is done when that script is green on a fresh clone and the index definitely exists in the shape Part 2b needs.

---

## Dependencies

- ✅ Part 1 merged.
- 🔜 Index decision resolved (see next section).
- 🔜 `PINECONE_API_KEY` in `.env.local`.

No OpenAI key required for Part 2a — integrated embeddings mean Pinecone does the embedding server-side.

---

## Index decision — what we can and cannot do to the existing `compliance-copilot`

Pinecone indexes are immutable with respect to their embedding configuration: the vector dimension, distance metric, and whether an integrated inference model is bound to the index are all fixed at creation time. There is no "upgrade existing index to integrated" API call, in the console or the SDK. If the existing `compliance-copilot` was created as a dense-vector-only index (no `embed` block), we cannot convert it in place.

So the first step of Part 2a is to find out which kind it is:

```
# From a machine with PINECONE_API_KEY in env
curl -H "Api-Key: $PINECONE_API_KEY" https://api.pinecone.io/indexes/compliance-copilot
```

Look at the response:

- **Integrated already** — the JSON contains an `embed` object with a `model` (e.g. `"llama-text-embed-v2"`) and a `fieldMap`. **Done.** Use this index as-is. Skip to "Connection smoke test" below.
- **External / dense-only** — no `embed` block, just `dimension`, `metric`, `spec`. We need a new integrated index. Two paths:
  - **Path 1 — keep the name `compliance-copilot` (recommended).** Delete the existing empty index in the [Pinecone console](https://app.pinecone.io/) → Indexes → `compliance-copilot` → Delete. Then let this repo recreate it (see below). This only makes sense because the index has no data in it yet; we would not do this once ingestion had run.
  - **Path 2 — new name.** Create a second index, e.g. `compliance-copilot-integrated`, and point `PINECONE_INDEX` at it. Leaves the existing index untouched (can be cleaned up later via the console). Safer if there's any doubt about what's in the old index; slightly uglier naming.

Either path is a one-time action; the smoke-test script itself does not delete or overwrite the user's index.

**Why we are not trying a delete via code:** the Pinecone MCP available in this session exposes index creation but not deletion. The Pinecone TypeScript SDK does expose `deleteIndex`, but deleting an index is not the kind of action this repo should take without an explicit human step — Part 2a will not include a `deleteIndex` call. The console is the correct surface for the one-time cleanup.

### Index creation parameters (for Path 1 or Path 2)

- **name:** `compliance-copilot` (Path 1) or `compliance-copilot-integrated` (Path 2).
- **cloud / region:** `aws` / `us-east-1` — Pinecone free-tier default, matches the MCP default, no reason to deviate.
- **embed.model:** `llama-text-embed-v2`. Rationale: strong on longer passages and structured text (regulatory docs are both), dense, good retrieval quality out of the box. Alternatives considered:
  - `multilingual-e5-large` — optimised for short queries against 1–2 paragraph passages. Fine but weaker on structured docs.
  - `pinecone-sparse-english-v0` — sparse; useful for hybrid later, not as a primary.
    We can re-index into a different model later if eval tells us to; the chunker and upsert code don't care which integrated model is bound.
- **embed.fieldMap.text:** `chunk_text`. Explicit name, avoids the ambiguity of a generic `text` field. Records will have `chunk_text` as the embedded field and carry provenance as flat scalar siblings (no nested `metadata` field, no object-valued fields — per the Pinecone MCP rules already encoded in this project).

The index can be created either via:

- This session's Pinecone MCP `create-index-for-model` (preferred — one call, returns deterministic config we can assert against), or
- The Pinecone console UI (fallback if MCP is unreachable; screenshots of the exact settings go in `README.md`).

---

## Work breakdown

One GitHub issue. Small enough to do in a single PR.

### Issue — Pinecone connection smoke test

**In scope**

- Install `@pinecone-database/pinecone`, `tsx` (dev), `dotenv` (dev, so the script loads `.env.local` without Next.js runtime).
- `scripts/pinecone-check.ts` — the smoke-test script described under **Goal** above. Structured JSON output on both success and failure. Exit code 0 on green, non-zero on any assertion failure.
- `package.json` script: `"pinecone:check": "tsx scripts/pinecone-check.ts"`.
- `.env.local` (not committed) populated by the user with `PINECONE_API_KEY` and `PINECONE_INDEX`.
- `.env.example` already has the right keys — no change there.
- `README.md` update:
  - One-time Pinecone setup (which path we took, what the resulting index shape is).
  - How to run `pnpm pinecone:check` and what a green run looks like.
  - Troubleshooting: missing key, wrong index name, non-integrated index error.
- If the index needs to be created (Path 1 or Path 2), create it in this PR via the MCP and note the resulting config in the README.

**Non-goals**

- No chunker, no corpus, no ingest CLI — all Part 2b.
- No `shared/types.ts` changes — the script uses Pinecone SDK types locally; `Chunk` and friends land in Part 2b when we actually know the on-disk schema.
- No Vitest wiring — this is a standalone script, not a test suite. Vitest arrives in Part 2b alongside the round-trip integration test.
- No OpenAI dependency.
- No deletion logic for indexes. The script cleans up its own `__smoke` namespace but never touches the index itself.

**Acceptance criteria**

1. On a fresh clone with a valid `.env.local`, `pnpm install && pnpm pinecone:check` exits 0 and prints a one-line JSON summary.
2. With `PINECONE_API_KEY` unset, the script exits non-zero before making any network call, with a message naming the missing variable.
3. With `PINECONE_INDEX` pointing at a non-existent or non-integrated index, the script exits non-zero with a message explaining exactly what's wrong and a pointer to this doc.
4. Running the script twice in a row both succeed — the `__smoke` namespace is cleaned up at the end of each run.
5. `pnpm typecheck` and `pnpm lint` exit 0.
6. No secrets land in git: `.env.local` is gitignored, `.env.example` has empty values.

---

## Dispatch order

1. **Run the describe check** (`curl` or MCP `describe-index`) and pick Path 0 / 1 / 2:
   - **Path 0 — existing index is already integrated.** Proceed.
   - **Path 1 — delete + recreate as `compliance-copilot`.** User deletes via console, then Implementer recreates via MCP in the PR.
   - **Path 2 — new name `compliance-copilot-integrated`.** Implementer creates via MCP in the PR; user updates `.env.local`.
2. **Open the Issue** with the chosen path baked into the spec.
3. **Implementer** writes the script + README update on `claude/setup-pinecone-connection-AQ5Is`.
4. **Reviewer** verifies against the acceptance criteria.
5. **Smoke test**: human runs `pnpm pinecone:check` locally on a real key. Green → merge.
6. Part 2b (the original `plan-part-2.md` minus this slice) starts.

---

## Definition of done for Part 2a

- [ ] Index decision recorded in `README.md` (which path, which model, which region).
- [ ] `compliance-copilot` (or the chosen name) exists and is integrated-embedding with `llama-text-embed-v2` and `fieldMap.text = "chunk_text"`.
- [ ] `scripts/pinecone-check.ts` runs green on a fresh `.env.local`.
- [ ] Script fails fast and actionably on missing env, wrong index name, and non-integrated index.
- [ ] `pnpm typecheck` and `pnpm lint` exit 0.
- [ ] `PINECONE_INDEX` value documented in `README.md` setup.
- [ ] PR merged to `main`.

Once Part 2a is done, Part 2b has no open infra questions left — the chunker and ingest CLI write against a known-good index.

---

## Risks and mitigations

- **MCP unreachable at the moment of describe-index.** Mitigation: the `curl` fallback in the decision step above doesn't depend on the MCP. The smoke-test script uses the Pinecone SDK directly, not the MCP, so the repo is not coupled to MCP availability at runtime.
- **User deletes the wrong index.** Mitigation: Path 1 (delete-and-recreate) is gated on the user confirming the existing index has zero vectors (`describe-index-stats`). Path 2 (new name) is the zero-risk alternative and is fine to default to if there's any doubt.
- **Integrated model choice regrets.** Mitigation: cheap to re-index later — Part 2b's ingest CLI is idempotent by design, so switching models is "create new index, update env, re-run ingest." No code change.
- **Naming drift between `.env.local` and reality.** Mitigation: the smoke-test script prints the resolved index name in its success summary; the README shows a sample green output so drift is obvious.
