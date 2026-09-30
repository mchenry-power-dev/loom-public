# Billing versus delivery

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Product domain distinctions](../docs/product-overview.md#domain-distinctions-that-shape-the-product)

## Decision

A fictional seed club records one prepaid payment of **60 fictional currency units** for three planned parcels. A financial event, a funding association, and a delivery proposal answer different questions. These values are synthetic arithmetic, not product prices or business metrics.

| Concept | Toy evidence / intent | What it does not prove |
| --- | --- | --- |
| Payment evidence | A confirmed payment of 60 units | That any parcel was dispatched |
| Funding association | The payment is intended to fund three parcels | The actual date or outcome of each delivery |
| Delivery intent | Three proposed calendar dates | A billing date or completed operational action |
| Fulfillment evidence | A separately observed physical-delivery state, if available | That all related financial events are known |

The toy association is supplied as an input; no production correlation model or database schema is illustrated.

## Pseudocode

```text
describeParcelFunding(paymentEvidence, proposedParcelCount):
  if paymentEvidence is missing or unavailable:
    return FundingUnknown
  if paymentEvidence is incomplete:
    return FundingIncomplete
  if proposedParcelCount <= 0:
    return InvalidInput

  return {
    observedPayment: paymentEvidence.amount,
    illustrativeEqualAllocation: paymentEvidence.amount / proposedParcelCount,
    fulfillmentState: NotEstablishedByPayment
  }
```

For this deliberately divisible example, 60 / 3 = 20 units per parcel as an illustrative allocation. This is not revenue recognition, tax treatment, a refund rule, or Loom's commercial calculation. Rounding and allocation policy are outside the example.

## Synthetic review cases

| Inputs | Expected interpretation |
| --- | --- |
| Confirmed 60-unit payment; three proposed parcels | One payment; three delivery intentions; illustrative allocation of 20 each |
| Missing payment evidence; three proposed parcels | Funding unknown, not zero and not paid |
| Complete evidence explicitly records zero units | Measured zero; no inferred fulfillment |
| Partial financial evidence | Funding incomplete; no confident total |
| Delivery date changes | Does not rewrite the payment's observed date |
| One parcel is observed as delivered | Does not establish delivery of the other two |
| No proposed parcels | Invalid input for this allocation sketch |

## Tradeoff

Separating these concepts requires more explicit views and missing-data states, but avoids treating payment, scheduling, and delivery as one status. A requested date is intent; a payment date is financial evidence. Neither authorizes a fulfillment handoff.
