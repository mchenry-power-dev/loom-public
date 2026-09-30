# Engineering decisions

[Return to case study](../README.md)

These deep dives describe public-safe engineering approaches and their tradeoffs. They intentionally omit production algorithms and operational recipes. A conceptual safety approach does not imply every related lifecycle action is fully delivered; consult the [maturity matrix](roadmap.md).

## Stable selling-plan identity

**Problem.** Purchase-option settings evolve while remote resources already have identities.

**Why it matters.** Replacing resources indiscriminately makes configuration history and commerce references harder to reason about.

**Public-safe implementation approach.** Express desired state, compare it with observed state, retain unambiguous identity, and update only relevant differences. Treat ambiguous matching as a review condition. The [toy catalog example](../examples/desired-state-update.md) shows the pattern with fictional items.

**Tradeoff / limitation.** Reconciliation requires more explicit state than replacing everything. This case study omits identity construction and production matching rules; the example cannot establish behavior against Shopify.

The design treats remote identity as a domain constraint and configuration changes as controlled reconciliation.

## Asynchronous commerce events

**Problem.** Related order, contract, and line evidence can arrive out of order or more than once.

**Why it matters.** An event is evidence of change, not proof that every dependency is already present. Processing it as a complete workflow can create incorrect conclusions or duplicate effects.

**Public-safe implementation approach.** Authenticate intake, preserve work durably, and let a separate worker correlate available evidence. Represent missing dependencies and recoverable failures explicitly. Idempotent processing must preserve the intended result when the same evidence is handled again. The [event example](../examples/durable-event-processing.md) specifies behavior without revealing deduplication or locking internals.

**Tradeoff / limitation.** Durable asynchronous work introduces lag and operational state. Local persistence and mocked integrations can test scenarios, but they do not prove every live delivery order or failure mode.

Correctness is designed around asynchronous evidence and recovery, rather than relying on arrival order.

## Deterministic scheduling

**Problem.** A seemingly simple requested date depends on timezone interpretation, lead time, cutoff, blackout, and horizon constraints.

**Why it matters.** An unexplained calendar decision undermines merchant trust and can confuse delivery intent with billing or execution.

**Public-safe implementation approach.** Separate calendar evaluation from external effects, provide explicit time context, and expose validation results alongside schedule proposals. Test boundary conditions with fixed inputs. The [calendar example](../examples/calendar-validation.md) uses an invented policy and does not encode Loom's scheduling precedence.

**Tradeoff / limitation.** A valid preview is only a proposal. A later operational action needs current evidence and its own controls. This documentation does not define production calendar constants or ambiguous-time handling rules.

The design makes time a domain input and keeps planning separate from execution.

## Guarded external actions

**Problem.** A remote request may take effect even when the caller never receives a conclusive response.

**Why it matters.** Blind retry can duplicate a consequential action; automatic local rollback can conceal a remote change that still exists.

**Public-safe implementation approach.** Separate eligibility, authorization, request submission, and outcome evidence. Distinguish confirmed, rejected, and unknown outcomes; route uncertainty to reconciliation. See the [uncertain-outcome example](../examples/uncertain-outcome-pattern.md).

**Tradeoff / limitation.** Conservative handling adds manual review. Controlled submission and rollback / recovery are partial or gated, and remote side effects are not assumed reversible. This is a safety model, not a claim of production-proven recovery across all actions.

Distributed uncertainty is treated as a first-class operational state.

## Merchant recovery UX

**Problem.** Incomplete evidence, missing permissions, or an uncertain result can all prevent a workflow from advancing, for different reasons.

**Why it matters.** A generic error leaves merchants unable to distinguish waiting, investigation, and a capability limitation.

**Public-safe implementation approach.** Use contract detail, reconciliation / audit views, merchant health, and capability coverage to make degraded states readable. Describe what evidence is available, what remains unresolved, and what kind of review is needed. The [recovery model](reliability-and-recovery.md) separates diagnostic visibility from recovery execution.

**Tradeoff / limitation.** More descriptive states require careful wording and consistent evidence. Visibility does not guarantee that a corrective action exists or that a remote side effect can be undone.

Operational diagnostics are part of merchant UX, with limits made explicit.

## Analytics with bounded evidence

**Problem.** Paginated retrieval, permissions, and missing evidence can limit the data available to a report.

**Why it matters.** A partial total presented as a global total, or missing evidence presented as zero, creates false certainty.

**Public-safe implementation approach.** Keep report scope and coverage visible, distinguish missing from measured values, and separate bounded browsing from exact lookup. Saved views and arithmetic metrics operate within the evidence available to them. Exports need the same interpretive context as on-screen reports. The [browse / lookup example](../examples/bounded-browse-vs-lookup.md) demonstrates synthetic retrieval states.

**Tradeoff / limitation.** Bounded reports may answer narrower questions than merchants initially expect. Missing inputs constrain a derived metric; a custom formula does not manufacture evidence.

Data interpretation, permission-aware retrieval, and reporting UX are treated as one correctness problem.
