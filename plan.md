# Plan — MVP and Beyond

## North star

An adaptive RAG compliance copilot — grounded answers, cited sources. See `project-goals.md` for the full scope.

The MVP is **Job 1 only** (rapid regulatory lookup) done cleanly and end-to-end. The architecture is designed so that Jobs 2–5 slot in without rewrites.

---

## MVP architecture

### One-line summary

A two-node LangGraph `StateGraph` (`retrieve → generate`) behind a Next.js route, fronted by a single-page query/answer UI.

### Diagram

```
┌─────────────────────────────────────────────────────┐
│  Dashboard (Next.js)                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ QueryInput → POST /api/query                │   │
│  │ AnswerPanel ← answer + inline [^N] citations│   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  /api/query  (Next.js route handler)                │
│    graph.invoke({ query }) → GraphState             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  pipeline/  (LangGraph StateGraph)                  │
│                                                     │
│     START                                           │
│       │                                             │
│       ▼                                             │
│   [retrieve]  ── vector search against Pinecone     │
│       │                                             │
│       ▼                                             │
│   [generate]  ── LLM call, grounded prompt    │
│       │                                             │
│       ▼                                             │
│      END                                            │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
           Pinecone + OpenAI
```

### Folders

```
/
├── app/                    # Next.js app router
│   ├── page.tsx            # single-page query UI
│   ├── api/query/route.ts  # POST endpoint
│   └── layout.tsx
├── pipeline/
│   ├── nodes/
│   │   ├── retrieve.ts     # vector search → partial GraphState
│   │   └── generate.ts     # OpenAI call → partial GraphState
│   ├── state.ts            # GraphState annotation + reducers
│   └── graph.ts            # StateGraph wiring: retrieve → generate
├── ingest/
│   ├── chunk.ts            # markdown-aware chunking
│   ├── embed.ts            # embedding generation
│   └── upsert.ts           # Pinecone upsert
├── shared/
│   └── types.ts            # ONE source of truth for all types
├── corpus/                 # sample regulatory + internal docs (markdown)
├── scripts/
│   └── ingest.ts           # CLI: ./ingest.ts
├── tests/
│   ├── unit/
│   └── integration/
└── eval/                   # deferred to post-MVP
```

**Rule:** no type redefinition anywhere. Everything imports from `shared/types.ts`.

---

## Tech stack

Keep what worked from the prior project. Drop what didn't earn its keep.

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Consistency front-to-back. |
| Frontend | Next.js Latest (app router) + React Latest | Server components keep the UI thin. |
| Styling | Tailwind CSS | Low-ceremony, no bespoke design system for MVP. |
| Orchestration | LangGraph (`@langchain/langgraph`) with `StateGraph` | Commit to it from day one. Two-node graph for MVP; adding multi-hop / CRAG / HITL later is slotting nodes and edges into an existing graph, not a rewrite. |
| LLM | OpenAI | none |
| Embeddings | OpenAI `text-embedding-3-small` | Cheap, 1536-dim, good enough. |
| Vector store | Pinecone (serverless, free tier) | Known-good. Revisit if cost/latency warrants. |
| Tests | Vitest + Playwright | fast and UX centric |
| Observability | Console + structured JSON logs for MVP; LangSmith later | Don't pay for infra we don't use yet. |
| Lint/format | ESLint + Prettier | Standard. |
| Package manager | pnpm | Faster installs, workspace-ready. |

### LangGraph — how we use it in the MVP

 From the first commit, the pipeline is a real `StateGraph`



Why commit to LangGraph even for two nodes:


1. Adding a third node (classifier, self-eval, multi-hop) is a one-line `addNode` + `addConditionalEdges`, not a refactor.
2. LangSmith integration (post-MVP) is automatic for `StateGraph` executions — no bespoke instrumentation.
3. Checkpointing and HITL interrupts (needed after MVP) assume a compiled graph; retrofitting later is harder than starting there.



### Deliberately **not** in the MVP stack

- **BM25 / hybrid retrieval.** Vector-only for MVP. Add BM25 when the eval harness shows precision@5 is the bottleneck.
- **`natural`, `ml-distance`.** Only used for heuristics we won't ship in the MVP.
- **`recharts`.** No charts in the MVP UI.
- **Conditional edges / multiple paths.** The MVP graph is strictly linear (`retrieve → generate`). Conditional routing arrives with the classifier in the post-MVP roadmap.



---

## MVP milestones

Each milestone is a releasable increment. Don't start the next one until the previous is done.

### M1 — Ingestion pipeline
- Load sample corpus (markdown with YAML front-matter).
- Markdown-aware chunking (preserve headers, don't split citations).
- Embed with `text-embedding-3-small`.
- Upsert to Pinecone with provenance metadata.
- CLI: `pnpm ingest`.
- Test: round-trip a known chunk through ingest → query → retrieve.

### M2 — RAG pipeline (LangGraph `StateGraph`)
- `GraphState` annotation in `pipeline/state.ts` with an array reducer for `retrievals`.
- `retrieve` node: vector search against Pinecone → `{ retrievals }`.
- `generate` node: OpenAI call with grounded system prompt (inline `[^N]` citations, refuse to fabricate) → `{ answer }`.
- Compiled graph in `pipeline/graph.ts`: `START → retrieve → generate → END`.
- `/api/query` route calls `graph.invoke({ query })` and returns the final state.
- Test: unit tests per node with a fake vector store and a stubbed LLM; one integration test against real Pinecone + OpenAI (skippable without creds).

### M3 — Minimal UI
- Single page: query input, submit button, answer panel, sources panel.
- Loading state, error state. No mock data.
- Keyboard shortcut: Enter submits.
- Test: one Playwright E2E that asks a real question and renders a real answer.

---

## Definition of done (MVP)

- [ ] `pnpm install && pnpm ingest && pnpm dev` works on a fresh clone with only API keys configured.
- [ ] A user can type a compliance question and receive a cited answer in <10s.
- [ ] No TypeScript errors, no ESLint errors.
- [ ] README documents setup, architecture, and the evaluation methodology.
