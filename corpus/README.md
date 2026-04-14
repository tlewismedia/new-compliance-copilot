# Sample Corpus

Seed markdown excerpts used by the ingestion pipeline (`ingest/` + `scripts/ingest.ts`,
landing in Part 2 / M1). Each file is a short excerpt — **2–10 KB** — with YAML
front-matter carrying provenance metadata so the chunker and the downstream
retriever can preserve citations end-to-end.

No chunking, embedding, or Pinecone logic lives here — that's Issue B. This
directory is purely content.

## Front-matter schema

Every `.md` file in this directory begins with a YAML front-matter block using
exactly these fields:

```yaml
---
title: <string>                # Human-readable title of the excerpt.
source: <string>               # Publisher bucket: "FFIEC", "CFPB", "OCC", "SEC", or "Internal".
citation_id: <string>          # Stable citation identifier, e.g. "12 CFR 1026.18".
jurisdiction: <string>         # "US-Federal" or "Internal".
doc_type: regulation | guidance | internal
effective_date: <YYYY-MM-DD>   # Use "n/a" only if the document is undated internal material.
source_url: <string>           # Canonical public URL (.gov) for regulatory docs; internal:// scheme for synthetic internal policy.
retrieved_at: <YYYY-MM-DD>     # Date the excerpt was copied into this repo.
---
```

Validation is performed at ingest time via `gray-matter` (added as a dependency
in Issue B).

## Documents

| File                                 | Source   | Citation ID                     | Doc type   | Effective date | Retrieved   |
| ------------------------------------ | -------- | ------------------------------- | ---------- | -------------- | ----------- |
| `ffiec-cat-domain-5.md`              | FFIEC    | FFIEC-CAT-Domain-5              | guidance   | 2017-05-31     | 2026-04-14  |
| `cfpb-reg-z-1026-18.md`              | CFPB     | 12 CFR 1026.18                  | regulation | 2011-12-30     | 2026-04-14  |
| `occ-bulletin-2013-29.md`            | OCC      | OCC-Bulletin-2013-29            | guidance   | 2013-10-30     | 2026-04-14  |
| `sec-marketing-rule-206-4-1.md`      | SEC      | SEC-IA-Marketing-Rule-206(4)-1  | regulation | 2021-05-04     | 2026-04-14  |
| `acme-bank-complaint-handling.md`    | Internal | ACME-POL-CCH-004                | internal   | 2024-01-15     | 2026-04-14  |

Source buckets covered: **FFIEC**, **CFPB / Regulation Z**, **OCC**, **SEC**,
**Internal (synthetic)** — one document per bucket, satisfying the source-variety
requirement from `plan-part-2.md` § Issue A.

## Source URLs

- FFIEC CAT: https://www.ffiec.gov/pdf/cybersecurity/FFIEC_CAT_May_2017.pdf
- CFPB Reg Z § 1026.18: https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-C/section-1026.18
- OCC Bulletin 2013-29: https://www.occ.gov/news-issuances/bulletins/2013/bulletin-2013-29.html
- SEC Marketing Rule 17 CFR 275.206(4)-1: https://www.ecfr.gov/current/title-17/chapter-II/part-275/section-275.206(4)-1
- Acme Bank Complaint Handling Procedure: `internal://acme-bank/policies/complaint-handling` (synthetic)

## Licensing

Public-domain US federal guidance / synthetic internal sample — no
redistribution concerns.

The four regulatory excerpts are drawn from works of the United States
Government published on official `.gov` sources and are not subject to
copyright under 17 U.S.C. § 105. The internal policy (`acme-bank-*`) is
fictional content written for this project and does not reproduce any real
institution's material.

## Adding new documents

1. Copy a short (2–10 KB) excerpt from a public federal source, or write
   synthetic internal content.
2. Prepend the front-matter block above with every field populated.
3. Use a filename that encodes source and citation, e.g.
   `cfpb-reg-e-1005-11.md`.
4. Update the table in this README.
5. Verify byte size with `wc -c corpus/your-file.md` — it must be under 10240
   bytes.
6. Verify front-matter parses cleanly with `gray-matter`.
