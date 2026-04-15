---
title: "Kestrel Market Access Controls — 17 CFR 240.15c3-5"
source: "Kestrel Securities, LLC — Compliance and Risk"
authority: "Kestrel"
citation_id: "Kestrel-Market-Access-Controls"
citation_id_display: "Kestrel Market Access Controls"
jurisdiction: "Internal"
doc_type: "internal"
effective_date: "2025-02-01"
sunset_date: "n/a"
version_status: "current"
supersedes: "Kestrel-Market-Access-Controls-2023"
source_url: "internal://kestrel/policies/market-access-2025-02.md"
retrieved_at: "2026-04-15"
topic_tags:
  - "market-access"
  - "pre-trade-controls"
  - "risk-management"
  - "supervision"
  - "annual-ceo-certification"
---

# Kestrel Market Access Controls — 17 CFR 240.15c3-5

**Owner:** Chief Risk Officer (CRO), jointly with CCO
**Annual CEO certification:** Required under 17 CFR 240.15c3-5(d);
executed each February for the preceding calendar year.

## 1. Scope

Kestrel Securities is a broker-dealer with direct market access to
equity and options exchanges, to an ATS for dark-pool access, and to
two wholesale market makers for retail routed flow. Kestrel does not
currently provide sponsored access or market access to non-affiliated
customers. This policy governs the firm's own market access.

The policy implements SEC Rule 15c3-5 (17 CFR 240.15c3-5), which
requires Kestrel to have direct and exclusive control over its
financial- and regulatory-risk management controls with respect to its
market access.

## 2. Control architecture

Pre-trade controls are implemented in two layers:

1. **Kestrel Trading Gateway (KTG)** — an in-house gateway through
   which every order passes before transmission to any execution
   venue. KTG enforces order-level limits and sanity checks. KTG is
   operated by the Trading Technology team under the oversight of the
   CRO.
2. **Vendor-hosted pre-trade risk controls** — supplementary checks
   implemented by a third-party vendor; configured and monitored by
   Kestrel personnel. The vendor is contractually obligated to grant
   Kestrel direct and exclusive control over all risk parameters,
   satisfying the "exclusive control" condition of 17 CFR
   240.15c3-5(b). The vendor contract is on file with Legal.

Both layers are in-line (synchronous) with the order path; neither
layer is advisory-only. Orders that fail either layer are rejected
before reaching a venue.

## 3. Financial risk management controls

Per 17 CFR 240.15c3-5(c)(1), KTG enforces:

### 3.1 Per-account credit thresholds

Every account has a per-account credit threshold configured in KTG.
Thresholds are calibrated to the account's purpose (retail, market
making, proprietary trading), its demonstrated activity, and the
firm's aggregate capital exposure tolerance. Credit thresholds are
reviewed quarterly.

### 3.2 Capital-based firm limit

A firm-wide capital-based limit prevents the sum of all open orders
across all accounts from exceeding a specified multiple of Kestrel's
net capital position under 17 CFR 240.15c3-1 (the multiple is
configurable; the current setting is on file with the CRO and is below
the early-warning threshold).

### 3.3 Order-size and order-price sanity checks

- **Order size**: hard block on orders exceeding the lesser of 10%
  of the security's 20-day ADV or $5 million notional. Overrides
  require a Trading Floor Supervisor approval logged in the OMS.
- **Order price**: hard block on limit orders priced >5% away from
  last sale (for NMS equities) or >10% away from the consolidated
  NBBO midpoint (for listed options). Overrides require supervisor
  approval.
- **Duplicate-order detection**: KTG blocks an order that is
  functionally identical to another order received within the
  preceding 250 milliseconds unless an explicit duplicate-allowed flag
  is set on the order.

### 3.4 Throttle

KTG enforces a per-session and per-account maximum message rate. If
the rate is exceeded, additional orders from the session are rejected
until the rate returns below the threshold.

## 4. Regulatory risk management controls

Per 17 CFR 240.15c3-5(c)(2), KTG enforces:

### 4.1 Symbol restrictions

Orders in securities on Kestrel's Restricted List are blocked outright;
orders in Watch List and Control List securities are routed for
enhanced post-trade surveillance (`Kestrel-Information-Barriers`).

### 4.2 Reg SHO compliance

Short-sale orders require a valid locate per `Kestrel-Reg-SHO-Locate-Policy`
before release. Rule 201 (alternative uptick rule) price-test
restrictions are enforced using data supplied by the primary listing
market; short-sale orders that would violate the price-test are
rejected or, where applicable to short-exempt orders, routed with the
short-exempt order-mark per 17 CFR 242.200(g)(3).

### 4.3 Halt monitoring

KTG consumes real-time halt and LULD pause data from each exchange.
Orders in halted or paused securities are rejected during the halt or
pause; queued orders are held until the halt lifts and then reviewed
before release (a halt-persistence timeout of 30 minutes triggers an
order cancellation with notification to the customer).

### 4.4 Entitlement enforcement

Every order is tagged with the session ID of the entering terminal or
system. KTG rejects orders from sessions that lack entitlement for the
target venue or asset class. Session entitlements are provisioned
through the Identity and Access Management system and reviewed
quarterly.

### 4.5 Clock synchronization

KTG's internal clock is synchronized to the NIST time source with a
tolerance of ±50 microseconds, consistent with the CAT clock-
synchronization requirement. Clock-drift alerts are reviewed by
Operations daily.

### 4.6 Post-trade surveillance

All executions pass through a post-trade surveillance engine (vendor-
hosted, configured and monitored by Kestrel) that flags potential
spoofing, layering, wash trades, marking-the-close, and
front-running patterns. Escalation follows `Kestrel-WSP-Equities` §6.3.

## 5. Supervisory procedures

### 5.1 Ownership and review

- The CRO owns the financial-risk controls in §3 and reviews them
  monthly with the Head of Equities Trading.
- The CCO owns the regulatory-risk controls in §4 and reviews them
  monthly with the EDCO.
- The CRO and CCO jointly conduct an annual review of the effectiveness
  of the controls and of this policy.

### 5.2 Override logging

Every override of a hard block is logged with the approver's identity,
the reason code, and the time of approval. Overrides are reviewed
daily by the Trading Floor Supervisor and monthly in aggregate by the
CRO and CCO.

### 5.3 Change management

Any change to a control parameter requires written approval from the
owner of that control (CRO or CCO). Emergency changes may be made
orally by either officer and must be memorialized in writing within
one business day. All changes are recorded in the Control Parameter
Change Log.

## 6. Annual CEO certification

The CEO executes the annual written certification required by 17 CFR
240.15c3-5(d), attesting that Kestrel's market-access controls and
supervisory procedures comply with the rule and that the firm
conducted the review required by the rule. The certification is
executed in February of each year for the preceding calendar year and
is preserved under 17 CFR 240.17a-4 for at least three years.

The certification is prepared by the CCO and the CRO, reviewed by the
General Counsel, and executed by the CEO concurrently with the FINRA
Rule 3130 certification.

## 7. Records

All records supporting this policy — including control parameters,
override logs, monthly review minutes, and the annual review — are
preserved under 17 CFR 240.17a-4 for at least three years.

## 8. References

- 17 CFR 240.15c3-5 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- 17 CFR 240.15c3-1 (`17 CFR 240.15c3-1, 240.15c3-3`)
- 17 CFR 240.17a-4 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- 17 CFR 242.200-204 (Reg SHO) (`17 CFR 242.200-204`)
- FINRA Rule 3130 (`FINRA-Rule-3110-3130`)
- Kestrel-WSP-Equities
- Kestrel-Reg-SHO-Locate-Policy
- Kestrel-Information-Barriers
