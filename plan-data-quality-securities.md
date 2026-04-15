# Plan — Data Quality & Corpus v2 (Securities Trading)

A tighter alternative to [`plan-data-quality.md`](./plan-data-quality.md), anchored in securities trading instead of community banking.

See [`project-goals.md`](./project-goals.md) for the five jobs and the "done" bar.

---

## The thesis (same as before, one paragraph)

Today's corpus is source-diverse but scenario-incoherent — five documents across five regulators, none of which apply to the same institution. That rules out Job 2 (cross-reference analysis), the highest-value capability in the goals doc. **Pick one institution, simulate its world, invest in the data-quality improvements that unlock specific jobs.** Everything below follows from that.

---

## The institution

**Kestrel Securities, LLC** — a mid-size self-clearing broker-dealer (FINRA member, SEC registered) with a dually-registered RIA subsidiary, **Kestrel Advisors, LLC**.

- ~$2.5 B customer assets (BD), ~$500 M AUM (RIA), ~400 employees.
- Product mix: equities, options, light fixed-income, model-portfolio RIA offering.
- Customer base: retail and mass-affluent individuals, a small institutional desk.
- Recent supervisory history: one open FINRA finding on best-execution review documentation; one open SEC finding on the RIA's custody-rule surprise-exam timing.

### Why securities trading (vs. community bank)

- **Narrative novelty.** The banking archetype is the obvious pick. Securities-trading compliance is less trodden in portfolio projects and harder to fake, which makes it read as more credible when done well.
- **Richer cross-reference surface.** Broker-dealer compliance sits at the intersection of SEC rules, FINRA rules, MSRB rules, and internal WSPs (Written Supervisory Procedures). Cross-references are dense and authority-spanning — exactly what Job 2 needs.
- **A forcing function for the chunker.** SEC and FINRA citation formats are heterogeneous (`17 CFR 240.15l-1`, `FINRA Rule 5310`, `Notice to Members 05-54`). A chunker that handles them cleanly is genuinely hard — and that difficulty is the portfolio signal.

### Why *not*

- Narrower interviewer audience. Banking compliance is legible to generalists; broker-dealer compliance assumes more context.
- Tooling risk: FINRA/MSRB citations need bespoke parsing that the banking domain doesn't.

---

## Proposed corpus v2 — securities edition

### External — regulatory & supervisory

| Topic | Documents |
|---|---|
| **Conduct & best interest** | Reg BI (17 CFR 240.15l-1), Form CRS (17 CFR 240.17a-14), FINRA 2111 (Suitability), FINRA 2210 (Communications) |
| **Best execution & order handling** | FINRA Rule 5310, Rule 605/606 (Reg NMS), SEC's proposed Reg Best Execution (flag as `version_status: proposed`) |
| **Market conduct & short selling** | Reg SHO (17 CFR 242.200–204), Rule 10b-5, Rule 10b5-1 (trading plans) |
| **Capital, customer protection, recordkeeping** | Rule 15c3-1 (Net Capital), 15c3-3 (Customer Protection), 17a-3/17a-4 (Books & Records), 15c3-5 (Market Access) |
| **Supervision** | FINRA Rule 3110, FINRA Rule 3120, FINRA Rule 3130 (WSP annual certification) |
| **RIA side (Kestrel Advisors)** | Advisers Act §206 (fiduciary duty), Rule 206(4)-1 (Marketing Rule), Rule 206(4)-2 (Custody), Rule 204A-1 (Code of Ethics) |
| **AML, cyber, privacy** | 31 CFR 1023 (BD BSA/CIP program), Reg S-P (Privacy), SEC Cybersecurity Risk Management Rule (2023) |
| **Enforcement artefacts** | 2–3 FINRA Letters of Acceptance Waiver & Consent (AWCs) and SEC enforcement orders from public databases |

~10–12 external documents, 20–60 KB each. All public-domain US federal / SRO guidance.

### Internal — synthetic, in Kestrel's voice

| Doc | Maps to |
|---|---|
| `kestrel-wsp-equities.md` | FINRA 3110 (the central supervisory doc — core to every workflow) |
| `kestrel-code-of-ethics.md` | Rule 204A-1, FINRA 3270/3280 (outside business / private securities) |
| `kestrel-best-execution-policy.md` | FINRA 5310, Rule 605/606 |
| `kestrel-reg-bi-disclosure-procedures.md` | Reg BI, Form CRS delivery |
| `kestrel-market-access-controls.md` | Rule 15c3-5 |
| `kestrel-reg-sho-locate-policy.md` | Reg SHO |
| `kestrel-information-barriers.md` | MNPI handling, Reg FD, Rule 10b-5 |
| `kestrel-aml-program.md` | 31 CFR 1023, FinCEN CIP rule |
| `kestrel-marketing-rule-review.md` | Rule 206(4)-1, FINRA 2210 |
| `kestrel-error-correction-policy.md` | Trade error standards, allocation policy |

Each 10–40 KB. Every internal doc must cite at least one external `citation_id` by name, so cross-reference queries have something to join on.

### Operational artefacts

| Artefact | What it enables |
|---|---|
| `kestrel-finra-exam-letter-2025.md` | Mock FINRA exam with two findings (best-ex documentation, email supervision sampling). Unlocks Job 3 (exam prep). |
| `kestrel-best-ex-committee-minutes-q1-2026.md` | Quarterly best-ex review committee output, references specific orders and venues. |
| `kestrel-wsp-annual-cert-2025.md` | Rule 3130 CEO certification. Unlocks "is our WSP cert current?" |
| `kestrel-trade-surveillance-alert-summary.md` | Redacted alerts with alert-type breakdowns. Unlocks "have we seen spoofing alerts this quarter?" |

---

## Data quality — three investments (down from five)

I've dropped the "definitions glossary" and collapsed "metadata richness" into "citation-aware chunking" — they move together in practice.

### 1. Citation-aware chunking + metadata

Split at the regulation's natural pinpoint boundaries and encode the pinpoint in the chunk ID and metadata. Securities law has **three** citation styles that need to coexist:

| Authority | Citation form | Paragraph markers |
|---|---|---|
| SEC (CFR) | `17 CFR 240.15l-1(a)(2)(ii)` | `(a)`, `(a)(2)`, `(a)(2)(ii)` |
| FINRA | `FINRA Rule 5310.01` | Supplementary materials `.01`, `.02` |
| MSRB | `MSRB Rule G-18(c)` | `(c)`, `(c)(i)` |

Chunk IDs encode the pinpoint: `FINRA-Rule-5310::(a)::p1`, not `FINRA-5310::chunk_3`. Front-matter per chunk carries `paragraph_path`, `topic_tags`, `version_status` (`current` / `proposed` / `superseded`), and `supersedes` where applicable.

**Unlocks:** auditability (goals "done" #4). Clicking `[^2]` in an answer lands on the paragraph, not a neighbourhood.

### 2. Cross-reference edge list

At ingest time, extract inline references — `17 CFR 240.15c3-5`, `FINRA Rule 3110`, `Notice to Members 05-54` — into `corpus/cross-refs.json` keyed by source chunk ID. Multi-hop retrieval (post-MVP) can walk the graph; for now the file is an unused side-car.

Dense authority-spanning references are exactly why this domain is a good forcing function. The WSP will reference FINRA rules, which reference SEC rules, which reference FINRA guidance. One pass over the corpus produces a rich graph.

**Unlocks:** Job 2 (cross-reference analysis).

### 3. Gold evaluation set

`eval/gold.jsonl` — 50–100 entries. Deterministic scoring: citation-overlap and substring checks. Covers:

- **Single-hop lookup** (Job 1): "What must a Reg BI Form CRS include?"
- **Cross-reference** (Job 2): "Does our best-ex policy satisfy FINRA 5310.09 on regular and rigorous review?"
- **Refusal-on-insufficient-retrieval** (done #1): "What's Kestrel's current net capital ratio?" — not in corpus, must refuse.
- **Adversarial near-miss**: "Does Rule 15c3-1 apply to introducing brokers?" (Kestrel is self-clearing — the nearby text about introducing brokers must not fool the retriever).

**Unlocks:** evaluation discipline (done #5).

---

## Phasing — 5 issues (down from 8)

| Issue | Scope | Acceptance |
|---|---|---|
| **A — Archetype + external corpus** | Commit Kestrel profile in `corpus/README.md`. Retire the current SEC/OCC/FFIEC/CFPB files to an `archive/` branch. Add the ~12 Kestrel-relevant external docs. | `pnpm ingest` produces ≥150 chunks from externals alone; every doc has extended front-matter. |
| **B — Internal + operational corpus** | Write 10 `kestrel-*` policies + 4 operational artefacts. Every internal doc names ≥1 external `citation_id` in body text. | Spot-check retrieval: query for WSP content returns the internal doc; query for FINRA 5310 returns both the rule and the best-ex policy. |
| **C — Citation-aware chunker** | Extend `ingest/chunk.ts` to recognise SEC, FINRA, and MSRB citation forms and split at paragraph markers. Chunk IDs encode `paragraph_path`. | Unit tests cover one example from each authority; IDs match the expected pinpoints. |
| **D — Cross-ref extractor** | Side-car `corpus/cross-refs.json` produced at ingest time. No pipeline changes yet. | Spot-check: `kestrel-best-execution-policy.md` has outgoing edges to both `FINRA-Rule-5310` and `Rule-605`. |
| **E — Gold eval set v1** | `eval/gold.jsonl` with ≥50 entries, `pnpm eval` script, baseline metrics captured in README. | Runs in <60s; any change to corpus or pipeline re-scores; baseline recorded. |

A → B runs serial (archetype drives content). C is independent of B. D depends on C (it reads new chunk IDs). E depends on B (questions reference specific Kestrel docs).

---

## Non-goals

- **No full verbatim reg text.** Excerpts only.
- **No scraper / fetcher.** Hand-copied with `retrieved_at`.
- **No LLM-as-judge grading in v1.** Deterministic checks first; semantic overlays later.
- **No FINRA / SEC live data integration.** The corpus is a snapshot.
- **No multi-hop retrieval yet.** Cross-refs are built but not consumed — that's post-MVP.

---

## Risks (trimmed)

- **Content authorship cost.** Writing 10 broker-dealer internal docs with domain fidelity is higher effort than banking equivalents. Mitigation: anchor content to the two exam findings and work outward. If it's not needed to answer a Kestrel-specific query, don't write it.
- **Citation-parser scope creep.** Every extra authority (MSRB, CBOE, NFA, state blue-sky) is another parser branch. Mitigation: support SEC + FINRA in v2; MSRB stub-only; others deferred with a clear TODO.
- **Portfolio legibility.** An interviewer unfamiliar with broker-dealer compliance may not see the depth. Mitigation: a one-page "scenario overview" in `corpus/README.md` that explains Kestrel's setup in plain language, so the first query anyone writes lands.

---

## Open questions for you

1. **Kestrel's clearing model — self-clearing or introducing?** Self-clearing adds 15c3-1 / 15c3-3 richness but is rarer for mid-size firms; introducing is more common but thins the external surface. My vote: self-clearing, for corpus density.
2. **Include the RIA arm, or keep it broker-dealer pure?** Keeping it in gives Marketing Rule + Custody Rule + fiduciary-duty material, at the cost of scenario complexity. My vote: keep it in — it's realistic and adds cross-regulator cross-references the banking plan couldn't offer.
3. **Securities *or* banking — or both?** Running both archetypes in parallel bloats the index and dilutes the demo. My vote: pick one. If this plan wins, archive the banking plan for later.
