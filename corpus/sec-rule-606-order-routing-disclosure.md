---
title: "Regulation NMS Rule 606 — Broker Disclosure of Order Routing Information"
source: "SEC"
authority: "SEC"
citation_id: "17-CFR-242.606"
citation_id_display: "17 CFR 242.606"
jurisdiction: "US-Federal"
doc_type: "regulation"
effective_date: "2001-04-01"
sunset_date: "n/a"
version_status: "current"
supersedes: "n/a"
source_url: "https://www.ecfr.gov/current/title-17/chapter-II/part-242/section-242.606"
retrieved_at: "2026-04-14"
topic_tags:
  - "order-routing"
  - "disclosures"
  - "payment-for-order-flow"
  - "customer-specific-report"
  - "reg-nms"
---

# § 242.606 Disclosure of order routing information.

## (a) Quarterly public routing report.

Every broker or dealer shall make publicly available for each calendar
quarter a report on the routing of non-directed orders in NMS stocks that are
submitted on a held basis, and non-directed orders in NMS securities that
are option contracts, during that quarter. The report must be divided into
four separate sections:

- NMS stocks listed on the NYSE;
- NMS stocks listed on the Nasdaq Stock Market;
- NMS stocks listed on any other national securities exchange; and
- Options.

For each section, the broker or dealer must disclose:

1. The percentage of total non-directed customer orders (by share volume)
   that were market orders, marketable limit orders, non-marketable limit
   orders, and other orders;
2. The identity of the 10 venues to which the largest number of total
   non-directed orders were routed for execution and any venue to which 5% or
   more of non-directed orders were routed for execution;
3. For each such venue, the percentage of total non-directed orders of the
   broker or dealer that were routed to the venue, broken down by market
   orders, marketable limit orders, and non-marketable limit orders;
4. A discussion of the material aspects of the broker-dealer's relationship
   with each venue, including a description of any arrangement for payment
   for order flow and any profit-sharing relationship, and a description of
   any rebates or fees; and
5. For retail investor orders executed in NMS stocks (see paragraph (c)
   definition), statistics on net aggregate payment for order flow received,
   expressed in dollars and on a per-hundred-share basis.

The report must be made available on a publicly accessible internet
location, in a downloadable machine-readable format (XML), and free of
charge, within one month after the end of the quarter to which the report
relates.

## (b) Customer-specific routing report.

On request of a customer, a broker or dealer must, within seven business
days, provide a written report on the routing of that customer's specific
orders for the prior six months. The report must disclose:

1. For each order routed, the venue to which the order was routed, whether
   the order was directed or non-directed, and the time of transmission;
2. The time and price of any resulting execution, if known; and
3. For retail investor orders in NMS stocks, the net amount of any payment
   for order flow received, or rebate paid, attributable to the order.

The report must be provided in a format specified by the Commission and
without charge to the customer. A broker-dealer must also provide notice to
each customer at account opening and at least annually thereafter that the
customer may request such a report, and must describe how to do so.

## (c) Retail investor order.

"Retail investor order" means an order that originates from a natural person
and that is not for an account that trades more than 40 times per day on
average during the prior six months. The definition excludes institutional
orders, proprietary orders, and orders for sophisticated-trader accounts.

## (d) Held and not-held orders.

The quarterly public report under paragraph (a) is limited to held orders.
The customer-specific report under paragraph (b) extends to both held and
not-held orders.

## (e) Definitions.

- "Non-directed order" means a customer order that the customer has not
  specifically instructed the broker-dealer to route to a particular venue
  for execution.
- "Venue" means a market center (exchange, ATS, market maker, or other
  broker-dealer that executes orders).
- "Payment for order flow" has the meaning set forth in Rule 10b-10(d)(8)
  and includes any monetary payment, service, property, or other benefit
  that results in remuneration, compensation, or consideration to a
  broker-dealer from any broker or dealer, national securities exchange,
  registered securities association, or exchange member in return for the
  routing of customer orders by such broker-dealer to any broker or dealer,
  national securities exchange, registered securities association, or
  exchange member for execution. PFOF does not include price-improvement
  amounts received on behalf of customers.

---

# Interpretive notes

## Rule 606(a) — Material Aspects of Relationships

The "material aspects" discussion required by Rule 606(a)(1)(iv) must go
beyond a statement that the broker-dealer receives payment for order flow.
It must describe:

- The arrangements by which such payments are received (e.g., per-share
  cents payment tiers, liquidity-provider rebates);
- Any conflicts of interest that such payments create;
- Any net aggregate payment received by the broker-dealer during the
  reporting period; and
- The broker-dealer's approach to addressing such conflicts, including its
  best-execution process.

## Rule 606(b) — Individualized Report Format

The Commission adopted a standardized XML schema for the customer-specific
report in 2018 amendments. The schema requires, at a minimum, a per-order
row identifying venue, time, price (if any), and PFOF amount where
applicable. Members may provide the report via a customer-portal download
or as an email attachment, provided the format conforms to the schema.

## Institutional Routing — Rule 606(b)(3)

For not-held orders in NMS stocks from institutional customers, paragraph
(b)(3) requires — on customer request — detailed handling reports including
fill rates, execution times, and routing destinations on an
order-by-order basis. The not-held institutional reports are distinct from
the held retail reports under paragraph (b)(1) and use a different XML
schema.

## Recordkeeping

Records underlying the Rule 605 and Rule 606 reports must be preserved
pursuant to Rule 17a-4(b)(4) for at least three years, the first two years
in an easily accessible place. Members should preserve the raw inputs (order
logs, execution messages, time-stamped venue responses) in addition to the
generated XML output, so that reports can be regenerated if errors are
discovered.
