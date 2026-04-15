---
title: "Kestrel Reg SHO Locate Policy and Fail-to-Deliver Close-Out Procedures"
source: "Kestrel Securities, LLC — Operations and Compliance"
authority: "Kestrel"
citation_id: "Kestrel-Reg-SHO-Locate-Policy"
citation_id_display: "Kestrel Reg SHO Locate Policy"
jurisdiction: "Internal"
doc_type: "internal"
effective_date: "2024-09-01"
sunset_date: "n/a"
version_status: "current"
supersedes: "Kestrel-Reg-SHO-Locate-Policy-2022"
source_url: "internal://kestrel/policies/reg-sho-locate-2024-09.md"
retrieved_at: "2026-04-15"
topic_tags:
  - "reg-sho"
  - "short-sales"
  - "locate-requirement"
  - "close-out"
  - "threshold-securities"
---

# Kestrel Reg SHO Locate Policy and Fail-to-Deliver Close-Out Procedures

**Owner:** Operations — Stock Loan Desk, with Compliance oversight
**Applies to:** Equities Trading Desk, Stock Loan Desk, Operations, and
Compliance.

## 1. Scope

This Policy implements Kestrel Securities' obligations under 17 CFR
242.200-204 (Regulation SHO) for short-sale orders in equity
securities, the close-out of fail-to-deliver positions, and
related recordkeeping. Kestrel self-clears and is therefore its own
participant for Rule 204 purposes.

## 2. Short-sale order marking — 17 CFR 242.200(g)

The OMS assigns each sell order one of three short-sale marks based on
the selling aggregation unit's net position:

- **Long** — where the unit is deemed to own the security under
  17 CFR 242.200(a)–(f);
- **Short** — where the unit is not deemed to own the security; or
- **Short exempt** — where an exception to Rule 201 applies (e.g.,
  bona fide market making within the definition of 17 CFR 242.201(d)).

### 2.1 Aggregation units

Kestrel operates two aggregation units within the meaning of 17 CFR
242.200(f):

- **Retail AU** — retail customer flow, aggregated for net-position
  purposes.
- **Market-Making AU** — Kestrel's market-making activity in a defined
  set of OTC equity securities.

Each aggregation unit has a distinct trading objective, maintains
positions separately, is supervised by independent personnel, and is
documented in the Aggregation Unit Charter maintained by the CRO.

## 3. Long-sale documentation — 17 CFR 242.200(g)(1)

Before executing a sale marked "long," Kestrel confirms either:

1. The security is in Kestrel's possession or control — i.e., held at
   DTC in a free position for the selling customer or aggregation
   unit; or
2. The security can reasonably be expected to be in the selling
   party's possession or control by settlement date, on the basis of a
   documented arrangement (e.g., a pending delivery from a
   counterparty confirmed by Operations).

The documentation lives in the Long-Sale Documentation record,
retained under 17 CFR 240.17a-4.

## 4. Locate — 17 CFR 242.203(b)

### 4.1 The locate requirement

Kestrel may not accept a short-sale order from a customer or effect a
short sale for its own account unless it has borrowed the security,
entered into a bona fide arrangement to borrow the security, or has
reasonable grounds to believe that the security can be borrowed so
that delivery can be made by settlement date — and has documented the
locate.

### 4.2 Easy-to-borrow list (ETB)

The Stock Loan Desk maintains an Easy-to-Borrow List based on the
availability of shares across Kestrel's primary stock-loan
counterparties. The ETB is:

- Updated no less than twice per trading day (morning and mid-day) and
  additionally whenever counterparty availability materially changes;
- Distributed to KTG for pre-trade enforcement; and
- Preserved as a point-in-time record daily.

A short-sale order in an ETB security does not require an order-by-
order locate; the ETB entry itself supports the "reasonable grounds"
determination under 17 CFR 242.203(b)(1)(ii).

### 4.3 Order-by-order locate

A short-sale order in a security not on the ETB requires an
order-by-order locate, which the Stock Loan Desk documents in the
Locate Log. The Locate Log captures:

- Order ID (or the identity of the aggregation unit, for proprietary
  shorts);
- Security symbol;
- Number of shares requested;
- Identity of the lender providing the locate;
- Time of the locate; and
- Number of shares located (which must equal or exceed the shares
  requested).

### 4.4 Exceptions — bona fide market making

Short sales effected by the Market-Making AU in connection with its
bona fide market-making activity in an OTC equity security are
exempt from the locate requirement under 17 CFR 242.203(b)(2). The
scope of bona fide market making is documented in the Aggregation
Unit Charter and reviewed annually by the CCO. "Ostensible" market
making — activity that does not reflect a regular and continuous
intent to provide two-sided liquidity — is not bona fide and is not
exempt.

## 5. Settlement and close-out — 17 CFR 242.204

### 5.1 Daily fail monitoring

Operations runs a daily fail-to-deliver report at the close of each
settlement day. The report identifies open FTD positions and their
days-aged.

### 5.2 Close-out obligation

Kestrel, as a participant of a registered clearing agency, must
close out a fail-to-deliver position by the beginning of regular
trading hours on the settlement day following the settlement date on
which the FTD arose. The close-out deadline is extended:

- For FTDs resulting from a long sale, or from bona fide market
  making, to the beginning of regular trading hours on the third
  consecutive settlement day following settlement (see 17 CFR
  242.204(a)(1)–(2)).

Close-out is executed by borrowing or purchasing shares sufficient to
cover the FTD position. The Stock Loan Desk coordinates the close-out
and documents the action taken.

### 5.3 Pre-borrow requirement

If Kestrel fails to close out a fail position by the applicable
deadline, the affected security is flagged in the OMS as
"pre-borrow required." No further short sales in that security may
be effected by Kestrel or any customer absent a confirmed pre-borrow
and associated documentation. The flag is lifted only when the
close-out is completed and reconciled.

## 6. Threshold-security monitoring

Kestrel subscribes to the daily threshold-security list feeds
published by the primary listing markets. Each morning, Operations
reviews the firm's open fail positions against the threshold list and
escalates any concentrations to the Head of Operations and the CCO.
Although Rule 204 applies the close-out framework to all equity
securities, the threshold designation remains a useful indicator of
settlement stress in a name.

## 7. Recordkeeping

All records required by this Policy — including the ETB point-in-time
snapshots, Locate Log entries, Long-Sale Documentation records,
fail-to-deliver reports, close-out actions, and pre-borrow flags —
are preserved under 17 CFR 240.17a-4.

## 8. Training

All Stock Loan Desk personnel, Equities Trading Desk personnel, and
relevant Operations personnel complete annual Reg SHO training. New
hires complete training within 30 days of registration.

## 9. References

- 17 CFR 242.200-204 (`17 CFR 242.200-204`)
- 17 CFR 240.17a-4 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- 17 CFR 240.15c3-5 (`17 CFR 240.17a-3, 240.17a-4, 240.15c3-5`)
- Kestrel-WSP-Equities
- Kestrel-Market-Access-Controls
