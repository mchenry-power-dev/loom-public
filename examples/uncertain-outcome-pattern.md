# Uncertain external outcomes

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Engineering context](../docs/engineering-decisions.md#guarded-external-actions)

## Decision

A fictional club sends an already-authorized request to reserve a workshop room. The service may accept the reservation even if its response never reaches the club. The local view must preserve uncertainty rather than imply failure and automatically send another request.

Eligibility and authorization are preconditions supplied to this model. No authorization procedure or external integration is described.

## Outcome model

```text
classifyOutcome(evidence):
  if authoritative evidence establishes the requested reservation:
    return Confirmed
  if conclusive evidence establishes rejection:
    return Rejected
  return Unknown

nextStep(outcome):
  Confirmed -> record the specific established effect
  Rejected  -> explain rejection; require reassessment for any new attempt
  Unknown   -> preserve unresolved state; reconcile; do not blindly retry
```

A response is useful only to the extent it establishes the requested effect. Transport success alone is not business confirmation. A timeout alone is not rejection. Conflicting or incomplete evidence remains unknown pending review.

## Synthetic review cases

| Evidence | Classification | Next step |
| --- | --- | --- |
| Authoritative reservation confirmation | Confirmed | Record reservation; do not infer attendance |
| Conclusive rejection | Rejected | Explain reason and reassess |
| Connection closes after sending | Unknown | Investigate before another consequential request |
| Timeout after the remote service accepts | Unknown until confirmed | Reconcile; no blind retry |
| Generic error that does not establish whether a reservation exists | Unknown | Preserve uncertainty |
| Later authoritative evidence confirms reservation | Confirmed | Resolve the prior unknown state with supporting evidence |
| Manual review is inconclusive | Unknown | Keep unresolved rather than force a terminal answer |

## Manual reconciliation

A reviewer compares the known request intent with available authoritative evidence. New evidence can support a confirmed or rejected state; lack of evidence cannot be converted into either. Any future action must consider the unresolved effect and its own authorization. This example specifies no retry timing, provider matching, or recovery protocol.

## Tradeoff

Manual reconciliation is slower than immediate retry, but preserves the possibility that the effect already happened. A local reversal cannot cancel a remote reservation by itself. For Loom, controlled fulfillment submission and recovery remain partial or gated; this pattern is not evidence of universal rollback.
