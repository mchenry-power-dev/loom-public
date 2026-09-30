# Bounded browse versus explicit lookup

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Engineering context](../docs/engineering-decisions.md#analytics-with-bounded-evidence)

## Decision

A fictional library interface supports a paginated browse view and an explicit exact-reference lookup. The first page is a useful working set, not the entire collection. Failure to find a record in loaded rows does not establish that it does not exist.

Toy references such as `demo-book-c` are fictional and unrelated to Shopify resource identifiers. Retrieval operations are abstract; no endpoint or authorization recipe is included.

## Pseudocode

```text
loadBrowsePage(query, continuation):
  show Loading for this request
  result = retrieve one bounded page with available permissions
  if retrieval fails:
    show Error with any previously loaded rows labeled stale
  else:
    show Page(result.rows, result.nextContinuation, result.coverage)

lookupExactReference(reference):
  show Loading for this lookup
  result = explicitly retrieve reference with available permissions
  if retrieval fails:
    show Error
  else if result cannot establish absence because access is restricted:
    show UnavailableWithCurrentAccess
  else if result establishes a matching record:
    show Found(result.record)
  else if result conclusively establishes absence within the authorized scope:
    show NotFoundWithinScope
  else:
    show Unresolved
```

Each response belongs to a particular request. A late response for an old query must not overwrite the active query. Pagination follows the supplied continuation, and “no more pages” only describes that query's authorized retrieval scope.

## Synthetic tests

The fixture has three fictional entries: `demo-book-a`, `demo-book-b`, and `demo-book-c`. The browse fixture returns two entries per page. These fixture choices are toy values, not production limits.

| Scenario | Expected presentation |
| --- | --- |
| First page returns A and B with a continuation | Two loaded entries; more available; no global count of two |
| Next page returns C with no continuation | Three entries loaded in the stated query scope |
| Exact lookup for C before its browse page is loaded | Found through explicit retrieval; not rejected based on local rows |
| Second page fails | Error; retain previously loaded rows with incomplete / stale context |
| Lookup is pending | Loading; no temporary “not found” claim |
| Access restriction hides the target | Unavailable with current access, not universal absence |
| Authorized lookup conclusively finds no match | Not found within the authorized scope |
| Query changes while an earlier page is in flight | Ignore the old response for the active view |
| Empty page with a continuation | Preserve continuation; do not infer exhausted scope from row count |

## Analytics implication

A count of two loaded records is a count of the loaded set. It is not a count of the whole library. Arithmetic based on missing inputs remains unavailable or explicitly incomplete. Exports should retain the report's scope and coverage context rather than silently turn a partial view into a global claim.

## Tradeoff

Explicit retrieval states make the interface more detailed, but let users distinguish “not on this page,” “still loading,” “cannot access,” and “not found within scope.” Neither pagination nor an exact lookup bypasses permission limits.
