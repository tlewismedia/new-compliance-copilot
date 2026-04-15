---
title: "Kestrel Securities — Written Supervisory Procedures: Equities Trading Desk"
source: "Kestrel Securities, LLC — Compliance Department"
authority: "Kestrel"
citation_id: "Kestrel-WSP-Equities"
citation_id_display: "Kestrel WSP Equities"
jurisdiction: "Internal"
doc_type: "internal"
effective_date: "2025-07-01"
sunset_date: "n/a"
version_status: "current"
supersedes: "Kestrel-WSP-Equities-2024"
source_url: "internal://kestrel/policies/wsp/equities-2025-07.md"
retrieved_at: "2026-04-15"
topic_tags:
  - "wsp"
  - "equities"
  - "supervision"
  - "order-handling"
  - "best-execution"
---

# Kestrel Securities — WSP: Equities Trading Desk

**Document owner:** Head of Compliance
**Approver:** Chief Compliance Officer (CCO)
**Annual review:** Required under FINRA Rule 3130; next review July 2026.
**Distribution:** All Equities Trading Desk personnel and supervising principals.

## 1. Purpose and scope

These Written Supervisory Procedures (WSPs) implement Kestrel Securities'
supervisory system for the Equities Trading Desk pursuant to FINRA Rule
3110. They cover order entry, routing, execution, allocation, and
post-trade review for both customer and proprietary equity orders in NMS
stocks and OTC equity securities. They do not cover options (see
`Kestrel-WSP-Options`), municipal securities (`Kestrel-WSP-Muni`), or
fixed-income (`Kestrel-WSP-FixedIncome`).

These WSPs are read in conjunction with:

- `Kestrel-Best-Execution-Policy` — the operative best-execution policy
  implementing FINRA Rule 5310;
- `Kestrel-Market-Access-Controls` — pre-trade risk controls implementing
  17 CFR 240.15c3-5;
- `Kestrel-Reg-SHO-Locate-Policy` — short-sale locate procedures under
  17 CFR 242.200-204;
- `Kestrel-Reg-BI-Disclosure-Procedures` — recommendation-handling
  procedures under 17 CFR 240.15l-1;
- `Kestrel-Code-of-Ethics` — personal-trading and information-barrier
  policy.

## 2. Supervisory structure

### 2.1 Supervisory hierarchy

- **Head of Equities Trading** (Series 24, Series 7) — primary supervisor
  of all desk personnel; reports to the President.
- **Equities Desk Compliance Officer (EDCO)** (Series 14, Series 24) —
  embedded compliance officer; reports administratively to the Head of
  Equities Trading and functionally to the CCO.
- **Trading Floor Supervisors** — three Series 24 principals, each
  assigned a defined book of associated persons.
- **Operations Manager** — supervises post-trade allocation,
  confirmation, and clearance.

### 2.2 Designation as Office of Supervisory Jurisdiction

The Equities Trading Desk operates within the New York headquarters,
which is designated as Kestrel's sole Office of Supervisory Jurisdiction
under FINRA Rule 3110(a)(3). All order acceptance, market making, and
final-approval functions for the desk occur at this OSJ.

## 3. Order entry and pre-trade review

### 3.1 Order acceptance

All customer orders are received electronically (via FIX from the firm's
order-management system, "OMS") or by phone. Phone orders must be:

1. Time-stamped on receipt by the receiving registered representative;
2. Entered into the OMS within 60 seconds of receipt; and
3. Subject to a same-day review by a Trading Floor Supervisor.

The OMS records original entry time, modification history, and routing
destination for every order, satisfying the order-memorandum requirement
of 17 CFR 240.17a-3(a)(6).

### 3.2 Pre-trade controls

Every order, regardless of channel, passes through Kestrel's pre-trade
risk controls before it is routed to a venue. Controls include:

- **Symbol restrictions** — orders in restricted-list, watch-list, and
  control-list securities are blocked or routed for principal review per
  `Kestrel-Information-Barriers`;
- **Order-size sanity** — hard block on orders exceeding 10% of ADV or
  $5 million notional, whichever is smaller (override requires a Trading
  Floor Supervisor approval logged in the OMS);
- **Price-collar checks** — hard block on limit orders >5% away from
  last sale (overridable);
- **Short-sale locate** — short orders may not be released without a
  documented locate per `Kestrel-Reg-SHO-Locate-Policy`;
- **Reg SHO Rule 201 short-sale price test** — where in effect, the
  system enforces the price-test restriction set forth at
  17 CFR 242.201;
- **Capital and credit thresholds** — the order is checked against the
  customer's intraday credit limit and against the firm's net capital
  cushion under 17 CFR 240.15c3-1.

These controls are maintained under `Kestrel-Market-Access-Controls` per
17 CFR 240.15c3-5 and reviewed annually.

## 4. Order routing

### 4.1 Routing destinations

Default routing is established by the Equities Trading Desk in
consultation with the Best Execution Committee (`Kestrel-Best-Execution-Policy`).
Approved routing destinations as of the effective date of these WSPs:

- **Wholesale market makers**: Venue A and Venue B (held retail
  market and marketable-limit flow);
- **Exchange order routers**: NYSE, Nasdaq, Cboe BZX, NYSE Arca;
- **ATS access**: One dark pool ATS for non-marketable limit orders
  >1,000 shares;
- **DMA pass-through** (institutional-only, currently de minimis).

Any change to the default routing table requires written approval by the
Head of Equities Trading and the CCO, and a same-day update to the
publicly disclosed Rule 606 quarterly report inputs.

### 4.2 Customer-directed orders

A customer-directed order — one in which the customer specifies the
execution venue — is routed only to that venue and is not subject to the
default routing logic. Customer direction must be documented in the
order memorandum and confirmed in writing for institutional accounts.
Customer-directed orders are excluded from the Rule 606(a) public
disclosure but are reportable on customer-specific Rule 606(b) requests.

## 5. Execution and allocation

### 5.1 Principal execution

Kestrel acts as principal in a defined set of OTC equity securities for
which it is a registered market maker. Principal execution is permitted
only in those securities, and only at prices that satisfy:

- The best-execution standard of FINRA Rule 5310;
- The fair-pricing standard of FINRA Rule 2121 (markups and markdowns);
- The order-handling rules of SEA Rule 11Ac1-4 (limit-order display)
  where applicable.

Principal execution against a customer order in a non-market-making
security is prohibited absent an explicit pre-trade approval logged in
the OMS by a Trading Floor Supervisor.

### 5.2 Allocations of block orders

Block orders intended for allocation across multiple customer accounts
must be entered with a pre-trade allocation schedule. Post-trade
re-allocation is prohibited absent written CCO approval, which will be
granted only in the case of demonstrable error per
`Kestrel-Error-Correction-Policy`.

## 6. Post-trade supervisory review

### 6.1 Daily review

A Trading Floor Supervisor must complete a daily exception-based review
covering:

- Trades flagged by the trade-surveillance system (price spikes, size
  outliers, atypical timing);
- Orders that triggered any pre-trade override;
- Customer-directed orders to non-default venues;
- Late allocations and any post-trade modifications.

The review is documented in the daily blotter signoff in the OMS.

### 6.2 Quarterly best-execution review

The Best Execution Committee meets quarterly under
`Kestrel-Best-Execution-Policy` to perform the regular and rigorous review
required by FINRA Rule 5310 Supplementary Material .02. EDCO produces a
pre-meeting analytics pack for the committee.

### 6.3 Insider-trading surveillance

Pursuant to FINRA Rule 3110(d) and `Kestrel-Information-Barriers`, the
EDCO oversees a daily review of trades in securities subject to a
restricted-list or watch-list entry. Suspect trades are escalated to
the Insider Trading Review Committee (ITRC) within one business day.

## 7. Recordkeeping

All order memoranda, executions, allocations, and supervisory reviews
are preserved electronically in accordance with 17 CFR 240.17a-3 and
17 CFR 240.17a-4. Books and records retention periods follow the
firm-wide retention schedule maintained by the General Counsel's office.

The firm uses the audit-trail electronic-recordkeeping option permitted
under the 2022 amendments to 17 CFR 240.17a-4(f); the annual senior-
officer representation is executed by the Chief Technology Officer.

## 8. Training

### 8.1 New-hire training

Every new associated person of the Equities Trading Desk completes
three hours of trading-desk-specific training within 30 days of
registration. Training includes a walkthrough of these WSPs, of the
order-management system, and of the trade-surveillance escalation path.

### 8.2 Annual training

Annual training is required under FINRA Rule 3110(a)(7). Training
content for the desk includes:

- Reg SHO and short-sale handling;
- Market access and pre-trade controls;
- Best-execution and routing economics, including
  payment-for-order-flow conflicts under FINRA Rule 5310;
- Reg BI obligations to the extent applicable to recommendations
  originating from the desk;
- Cyber and confidentiality obligations.

Completion is tracked in the Compliance Learning Management System.

## 9. Annual review and amendment

These WSPs are reviewed and reaffirmed annually as part of the FINRA
Rule 3130 certification process. Amendments outside the annual cycle
may be made by the CCO in response to regulatory developments,
findings from internal or external audits, or material changes in
business activity. Amendments are communicated to all desk personnel
within 10 business days of their effective date.

## 10. References

- FINRA Rule 3110 (`FINRA-Rule-3110-3130`)
- FINRA Rule 5310 (`FINRA-Rule-5310`)
- 17 CFR 240.15c3-1, 240.15c3-3 (`17 CFR 240.15c3-1, 240.15c3-3`)
- 17 CFR 240.15c3-5 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- 17 CFR 240.17a-3, 240.17a-4 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- 17 CFR 242.200-204 (`17 CFR 242.200-204`)
- 17 CFR 240.15l-1 (`17 CFR 240.15l-1`)
- Kestrel-Best-Execution-Policy
- Kestrel-Market-Access-Controls
- Kestrel-Reg-SHO-Locate-Policy
- Kestrel-Reg-BI-Disclosure-Procedures
- Kestrel-Code-of-Ethics
- Kestrel-Information-Barriers
- Kestrel-Error-Correction-Policy
