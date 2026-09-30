# Durable event processing

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Engineering context](../docs/engineering-decisions.md#asynchronous-commerce-events)

## Decision

A fictional workshop receives a reservation notice and a separate eligibility notice. Either can arrive first. The processing goal is to produce one reviewable pickup proposal once the relevant evidence exists, without releasing equipment.

This is a behavioral model. Durable acceptance, duplicate recognition, and exclusive processing are abstract requirements, **not implementations** of correlation, deduplication, locking, or queue storage.

## State model

| State | Meaning | Permitted progression |
| --- | --- | --- |
| Accepted | Work is durably available | Evaluate the available evidence |
| Waiting for evidence | A required dependency is missing | Reconsider when related evidence is available |
| Recoverable interruption | Local processing did not finish conclusively | Resume against durable progress |
| Needs review | Evidence is inconsistent or cannot support a proposal | Human investigation |
| Completed | The intended local proposal is established | Duplicate handling preserves the same business result |

“Completed” refers to local proposal generation, not payment, physical delivery, or a remote side effect.

## Pseudocode

```text
onAcceptedWork(work, availableEvidence):
  if the intended local result is already durably established:
    return CompletedWithoutAnotherProposal

  if availableEvidence is inconsistent:
    return NeedsReview

  if availableEvidence lacks a required dependency:
    return WaitingForEvidence

  return EstablishLocalProposalRecoverably
```

The final operation is an abstract obligation: after interruption, re-evaluation must distinguish established progress from unfinished work. Its storage and concurrency mechanism is intentionally unspecified. The pseudocode alone cannot provide an exactly-once guarantee.

## Synthetic event sequences

| Sequence | Expected observable result |
| --- | --- |
| Reservation → eligibility | Wait, then one local proposal |
| Eligibility → reservation | Same final proposal as the opposite order |
| Reservation → duplicate reservation → eligibility | Duplicate delivery does not create a second business proposal |
| Eligibility never arrives | Work remains unresolved and diagnosable; no invented eligibility |
| Interruption before local result is established | Work remains recoverable |
| Interruption after local result is established but before completion is observed | Re-evaluation recognizes durable progress; no duplicate proposal |
| Concurrent processing attempts | Final intended result is equivalent to one successful processing attempt |
| Contradictory eligibility evidence | Needs review; no automatic equipment release |

These are synthetic test expectations, not executed queue tests. A separate external action would need the [uncertain-outcome pattern](uncertain-outcome-pattern.md); repeating local evaluation is not permission to repeat remote effects.

## Tradeoff

Durability and idempotent outcomes require more operational state than processing directly in an event callback. The benefit is a recoverable account of incomplete work. This example exposes that contract while withholding the implementation needed to enforce it.
