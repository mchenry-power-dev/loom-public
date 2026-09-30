# Desired-state catalog update

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Engineering context](../docs/engineering-decisions.md#stable-selling-plan-identity)

## Decision

A fictional reading club maintains a remote catalog. An editor changes an item's display label without intending to replace the item. The planner preserves a supplied identity reference, compares editable content, and returns a proposal. It performs no remote writes.

Toy references below are arbitrary fictional values. They do not illustrate Shopify identifiers or how Loom constructs identity.

| Desired label | Supplied reference | Observed label | Proposal |
| --- | --- | --- | --- |
| Monthly reading parcel | toy-item-a | Reading parcel | Update label on the same item |
| Poetry parcel | toy-item-b | Poetry parcel | Keep unchanged |
| Essay parcel | None | None | Propose creation |

## Pseudocode

```text
planCatalogChange(desiredItems, observedItems):
  if desiredItems reuse a supplied reference:
    return ReviewRequired("Conflicting intentions for one item")

  proposals = []
  for each desired item:
    if item has no supplied reference:
      proposals.append(ProposeCreate(item.editableContent))
      continue

    candidates = observed items with that supplied reference
    if candidates.count != 1:
      return ReviewRequired("Missing or ambiguous referenced item")

    current = candidates.onlyItem
    changes = compareEditableContent(current, item)
    if changes is empty:
      proposals.append(Keep(current.reference))
    else:
      proposals.append(ProposeUpdate(current.reference, changes))

  return ReadyForReview(proposals)
```

The entire proposal is withheld if a reference is ambiguous. Labels are editable content, so label similarity never substitutes for an identity reference. Absence from the desired list does not imply deletion in this toy policy.

## Synthetic review cases

| Case | Expected outcome |
| --- | --- |
| Only a label changes | One update proposal retaining the existing reference |
| All editable content is unchanged | Keep; no update proposal |
| Two observed entries share the supplied reference | Review required; no actionable plan returned |
| A supplied reference cannot be found | Review required; no fallback creation |
| Two desired entries reuse a reference | Review required before planning changes |
| An observed item is absent from the desired list | No inferred delete |
| Observed state changes after planning | A future executor must re-observe and reassess; this plan is not permission to write |

## Tradeoff

This conservative planner requires explicit intent and refuses to guess. It demonstrates selective reconciliation, not remote atomicity. A real executor needs separate concurrency, authorization, and uncertain-outcome controls; their implementation is outside this example.
