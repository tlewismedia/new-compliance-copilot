# Compliance Copilot

An adaptive RAG compliance copilot — grounded answers, cited sources.

See [`project-goals.md`](./project-goals.md) for scope and [`plan.md`](./plan.md) for the architecture.

This repository currently contains only the project scaffold. The retrieval and generation
pipelines, ingestion scripts, and corpus will land in later milestones (M1, M2, M3).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (22 recommended)
- [pnpm](https://pnpm.io/) 10+ (enable via `corepack enable && corepack prepare pnpm@latest --activate`)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example env file and fill in credentials when needed:

   ```bash
   cp .env.example .env.local
   ```

   Variables documented in [`.env.example`](./.env.example):
   - `OPENAI_API_KEY` — OpenAI key for embeddings and LLM calls.
   - `PINECONE_API_KEY` — Pinecone key for vector search.
   - `PINECONE_INDEX` — Pinecone index name.

   The placeholder page does not require any credentials.

## Development

Start the dev server at <http://localhost:3000>:

```bash
pnpm dev
```

Other useful commands:

```bash
pnpm typecheck   # tsc --noEmit under strict: true
pnpm lint        # next lint
pnpm build       # production build
pnpm format      # prettier --write .
```

## Folder layout

See [`plan.md` § Folders](./plan.md) for the full planned structure. The current skeleton is:

```
app/              Next.js app router (placeholder page + layout)
pipeline/         LangGraph pipeline stubs (M2)
ingest/           Ingestion scripts (M1)
shared/types.ts   Single source of truth for shared types
corpus/           Sample corpus (M1)
scripts/          CLI scripts
tests/            Unit and integration tests
```
