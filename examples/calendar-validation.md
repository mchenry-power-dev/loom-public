# Calendar request validation

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

[Example index](README.md) · [Engineering context](../docs/engineering-decisions.md#deterministic-scheduling)

## Decision

A fictional workshop accepts requests for equipment pickup. Its validator receives an already-resolved local calendar context and returns all applicable issues. It does not read the clock, contact a service, reserve equipment, or charge a payment.

This **invented policy** has a one-calendar-day minimum lead time, an inclusive seven-calendar-day horizon, and a noon cutoff for next-day pickup. A blackout excludes its entire local calendar date. These are toy constants, not Loom's rules or scheduling precedence.

## Explicit inputs

- Requested local date, expressed as a calendar date rather than a UTC timestamp.
- Current local date and local time, derived from a supplied instant and named timezone.
- A flag indicating whether that timezone context was resolved successfully.
- A set of fictional blackout dates.

Calendar-day differences use date arithmetic, not elapsed milliseconds divided by 24 hours. Timezone resolution belongs to a separate boundary; this toy validator rejects unresolved context and does not implement a timezone conversion engine.

## Pseudocode

```text
validatePickup(request, context):
  if context is unresolved or request date is invalid:
    return InvalidInput

  issues = set()
  daysAhead = calendarDayDifference(context.localDate, request.localDate)

  if daysAhead < 1:
    issues.add("lead-time")
  if daysAhead > 7:
    issues.add("horizon")
  if daysAhead == 1 and context.localTime >= noon:
    issues.add("cutoff")
  if request.localDate is in context.blackoutDates:
    issues.add("blackout")

  return Valid if issues is empty else Invalid(issues)
```

The set has no decision precedence. If cutoff and blackout both apply, both are returned. A valid result authorizes no external action.

## Table-driven boundary cases

Unless overridden, the synthetic local date is **2030-04-08**, local time **11:59**, and blackout date **2030-04-11**. Dates are fictional test inputs.

| Input / override | Expected result | Boundary |
| --- | --- | --- |
| Request April 8 | lead-time | Same local day |
| Request April 9 at 11:59 | Valid | Before next-day cutoff |
| Request April 9 at 12:00 | cutoff | Cutoff is inclusive |
| Request April 10 at 12:00 | Valid | Cutoff applies only to next day |
| Request April 11 | blackout | Excluded local date |
| Request April 15 | Valid | Inclusive horizon |
| Request April 16 | horizon | Beyond horizon |
| Blackout April 9; request April 9 at 12:00 | cutoff and blackout | Independent reasons |
| Unresolved timezone context | InvalidInput | No machine-timezone fallback |
| Invalid date text | InvalidInput | No normalization into a different date |
| Supplied adjacent local dates across an offset change, before noon | Valid if otherwise eligible | Calendar adjacency remains one day |
| Repeat identical inputs | Identical result; zero external effects | Determinism |

A table-driven harness would pass each row's explicit inputs to the validator and compare the resulting issue set. Integration tests would separately cover timezone resolution, including offset transitions. This example does not claim to test that separate conversion layer.

## Tradeoff

Pure validation is easy to reason about, but its result reflects the supplied context at evaluation time. A later action needs fresh evidence and separate controls. Loom's actual calendar constants, precedence, and scheduling algorithm are intentionally absent.
