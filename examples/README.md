# Reconstructed engineering examples

[Return to case study](../README.md)

This is an independently reconstructed educational example created for the public case study. It is not production Loom source code and cannot reproduce or deploy Loom.

The collection uses fictional club catalogs, workshop reservations, and parcel plans to illustrate engineering decisions. All sketches were written from scratch from the public work packet, without access to the private repository. Pseudocode describes observable behavior; it deliberately omits storage schemas, authorization procedures, provider logic, correlation-key construction, deduplication, and locking implementations.

| Example | Decision under review |
| --- | --- |
| [Desired-state catalog update](desired-state-update.md) | Preserve identity and propose only unambiguous changes. |
| [Calendar request validation](calendar-validation.md) | Evaluate an invented calendar policy without external effects. |
| [Durable event processing](durable-event-processing.md) | Keep duplicate and out-of-order evidence recoverable. |
| [Uncertain external outcomes](uncertain-outcome-pattern.md) | Preserve uncertainty instead of blindly repeating a request. |
| [Billing versus delivery](billing-vs-delivery.md) | Separate financial evidence from physical delivery intent. |
| [Bounded browse versus lookup](bounded-browse-vs-lookup.md) | Make retrieval scope, permission limits, and missing data visible. |

Each example includes synthetic review cases with expected outcomes. These are specifications for the toy model, not reported execution results from Loom's private test suite. There is no installation, application entry point, or deployable integration in this directory.
