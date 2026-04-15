# Corpus — Kestrel Securities (v2)

## Scenario

The corpus is organized around **Kestrel Securities**, a fictional
institution chosen to give the Copilot a coherent regulatory surface. A
RAG assistant is only as good as its ground truth, and a grab-bag corpus
produces grab-bag answers.

**Kestrel Securities, LLC** — self-clearing FINRA-member broker-dealer,
SEC registrant. ~180,000 retail accounts, ~400 employees, ~$2.5B customer
assets. Equities, listed options, light fixed-income. Retail NMS flow
routes to two wholesale market makers under PFOF arrangements. Self-
clearing posture puts Kestrel directly under the SEC net-capital,
customer-protection, and books-and-records rules.

**Kestrel Advisors, LLC** — dually-registered SEC investment adviser,
wholly-owned subsidiary, ~$500M AUM across model-portfolio wealth
management; uses Kestrel Securities for client brokerage execution.

**Supervisory posture.** Two open 2026 exam findings: FINRA on the depth
and documentation of the broker-dealer's Rule 5310 regular-and-rigorous
review (with attention to the PFOF relationships); SEC on the adviser's
Rule 206(4)-2 surprise-exam timing irregularity. These animate the
`Compliance notes for Kestrel` sections scattered through the docset.

## Front-matter v2 schema

```yaml
---
title: string
authority: "SEC" | "FINRA" | "MSRB" | "FinCEN" | "Kestrel"
source: string
citation_id: string
jurisdiction: "US-Federal" | "SRO" | "Internal"
doc_type: "regulation" | "rule" | "guidance" | "enforcement" | "internal" | "operational"
effective_date: string           # YYYY-MM-DD or "n/a"
sunset_date: string              # YYYY-MM-DD or "n/a"
version_status: "current" | "proposed" | "superseded"
supersedes: string               # citation_id of older doc, or "n/a"
source_url: string
retrieved_at: string             # YYYY-MM-DD
topic_tags: [string]             # kebab-case, 3–6 per doc
---
```

Validation runs at ingest; missing fields produce `status: "skipped"`.

## Document inventory — external regulatory documents

| File | Authority | Citation ID | Doc type | Version | Supersedes |
|---|---|---|---|---|---|
| `reg-bi-form-crs.md` | SEC | 17 CFR 240.15l-1 | regulation | current | n/a |
| `finra-5310-best-execution.md` | FINRA | FINRA-Rule-5310 | rule | current | n/a |
| `sec-rule-605-606-order-routing.md` | SEC | 17 CFR 242.605-606 | regulation | current | n/a |
| `proposed-reg-best-execution.md` | SEC | SEC-Release-34-96496 | regulation | **proposed** | n/a |
| `reg-sho.md` | SEC | 17 CFR 242.200-204 | regulation | current | n/a |
| `finra-3110-3130-supervision.md` | FINRA | FINRA-Rule-3110-3130 | rule | current | n/a |
| `sec-net-capital-customer-protection.md` | SEC | 17 CFR 240.15c3-1, 240.15c3-3 | regulation | current | n/a |
| `sec-books-records-market-access.md` | SEC | 17 CFR 240.17a-3, 240.17a-4, 240.15c3-5 | regulation | current | n/a |
| `advisers-act-antifraud-code-of-ethics.md` | SEC | 15 USC 80b-6 / 17 CFR 275.204A-1 | regulation | current | n/a |
| `advisers-act-marketing-custody.md` | SEC | 17 CFR 275.206(4)-1 and 275.206(4)-2 | regulation | current | **17 CFR 275.206(4)-3** |
| `bsa-aml-broker-dealer.md` | FinCEN | 31 CFR Part 1023 | regulation | current | n/a |
| `enforcement-finra-awc-best-ex.md` | FINRA | FINRA-AWC-2023056789201 | enforcement | current | n/a |

## Document inventory — internal Kestrel documents

Every internal document has `authority: "Kestrel"`, `jurisdiction: "Internal"`,
and a `source_url` under the `internal://kestrel/...` scheme. Policies use
`doc_type: "internal"`; dated artefacts (exam letters, committee minutes,
certifications, surveillance summaries) use `doc_type: "operational"`.

| File | Citation ID | Doc type | Effective |
|---|---|---|---|
| `kestrel-wsp-equities.md` | Kestrel-WSP-Equities | internal | 2025-07-01 |
| `kestrel-code-of-ethics.md` | Kestrel-Code-of-Ethics | internal | 2025-04-01 |
| `kestrel-best-execution-policy.md` | Kestrel-Best-Execution-Policy | internal | 2025-09-15 |
| `kestrel-reg-bi-disclosure-procedures.md` | Kestrel-Reg-BI-Disclosure-Procedures | internal | 2025-01-15 |
| `kestrel-market-access-controls.md` | Kestrel-Market-Access-Controls | internal | 2025-02-01 |
| `kestrel-reg-sho-locate-policy.md` | Kestrel-Reg-SHO-Locate-Policy | internal | 2024-09-01 |
| `kestrel-information-barriers.md` | Kestrel-Information-Barriers | internal | 2025-03-10 |
| `kestrel-aml-program.md` | Kestrel-AML-Program | internal | 2025-10-01 |
| `kestrel-marketing-rule-review.md` | Kestrel-Marketing-Rule-Review | internal | 2025-06-15 |
| `kestrel-error-correction-policy.md` | Kestrel-Error-Correction-Policy | internal | 2024-11-01 |
| `kestrel-finra-exam-letter-2025.md` | Kestrel-FINRA-Exam-Letter-2025 | operational | 2025-03-28 |
| `kestrel-best-ex-committee-minutes-q1-2026.md` | Kestrel-Best-Ex-Committee-Minutes-Q1-2026 | operational | 2026-03-05 |
| `kestrel-wsp-annual-cert-2025.md` | Kestrel-WSP-Annual-Cert-2025 | operational | 2026-02-20 |
| `kestrel-trade-surveillance-alert-summary.md` | Kestrel-Trade-Surveillance-Alert-Summary | operational | 2026-01-22 |

Every internal doc names at least one external `citation_id` in its body
(e.g. `` `17 CFR 240.15l-1` ``, `` `FINRA-Rule-5310` ``) to support the
cross-reference extractor landing in Issue D.

## Coverage

- `version_status: "proposed"` → `proposed-reg-best-execution.md`.
- Non-`"n/a"` `supersedes` → `advisers-act-marketing-custody.md` supersedes
  the rescinded cash-solicitation rule 17 CFR 275.206(4)-3.
- `doc_type: "enforcement"` → `enforcement-finra-awc-best-ex.md`.

## Licensing

Federal regulatory text (17 CFR, 31 CFR, 15 U.S.C.) is a U.S. Government
work and not subject to copyright under 17 U.S.C. § 105. SRO rules from
the FINRA Manual are publicly disseminated; excerpts here are used for
non-commercial regulatory research and every document carries a
`source_url` resolving to the canonical page and a `retrieved_at` date.

The `enforcement-finra-awc-best-ex.md` document is a hypothetical
reconstruction representative of the AWCs published in FINRA's
Disciplinary Actions database and is labeled as such inside the file.

All `kestrel-*.md` documents are original synthetic content written for
this project and do not reproduce any real institution's policies,
procedures, or internal artefacts.

## Adding a new document

1. Pick a canonical public source (`.gov` or `.finra.org`).
2. Prepend the front-matter v2 block above with every required field.
3. Use a filename that encodes the topic (e.g.
   `sec-rule-611-order-protection.md`).
4. Add a row to the inventory table.
5. Verify front-matter parses cleanly with `gray-matter`.
6. Keep documents under ~60 KB.

Previous (v1) documents are retained for reference under
`corpus/archive/v1/` and are not ingested.
