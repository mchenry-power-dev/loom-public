# Product maturity and roadmap

[Return to case study](../README.md)

**Private pilot product available internally and to a small cohort of partner businesses for pilot testing, feedback, and telemetry.** Loom is not generally available. “Current” below means described as available in that pilot; it does not mean production-scale certification.

The supplied product context groups some work as partial, gated, preview, or roadmap without an exact per-feature completion level. This matrix preserves that uncertainty instead of inventing a release status. There are no promised dates or release commitments.

## Current pilot capabilities

| Area | Available scope |
| --- | --- |
| Merchant application | Shopify-embedded workspace and product-level purchase-option configuration |
| Purchase structures | Native one-time purchases; pay-per-order subscriptions; prepaid recurring and prepaid finite / one-time structures; weekly, biweekly, monthly delivery cadences |
| Selling plans | Stable identity and selective updates |
| Storefront | Purchase selector, first-fulfillment selection, schedule preview |
| Scheduling | Lead-time, cutoff, blackout, horizon, timezone validation; dashboard and simulator |
| Evidence processing | Durable event processing and order / contract / line correlation |
| Visibility | Contract registry, canonical detail, reconciliation / audit views, unified order browsing and exact lookup |
| Fulfillment review | Group review and eligibility assessment |
| Cancellation analysis | Reason categorization for already-canceled contracts |
| Reporting | Bounded analytics, saved views, custom arithmetic metrics, PDF / spreadsheet / CSV exports |
| Readiness and previews | Merchant health / capability coverage, notification previews, production-runtime preparation and validation |

## Partial, gated, preview, or roadmap work

These areas are not presented as broadly available, completed workflows. The precise maturity of each remains unspecified in this public case study; grouping below describes product concerns rather than asserting release stages.

| Operational area | Boundary for public claims |
| --- | --- |
| Fulfillment rescheduling | Existing scheduling visibility does not establish unrestricted live rescheduling. |
| Controlled fulfillment submission | Review and eligibility do not establish authorization or automatic provider release. |
| Rollback / recovery | Diagnostic visibility does not establish reversibility or production-proven recovery for every action. |
| Scheduled report delivery | Existing on-demand exports do not establish automatic report distribution. |
| Alert rules | Analytics visibility does not establish a completed alerting workflow. |
| Notification delivery | Notification previews exist; fully delivered notification infrastructure is not claimed. |

| Broader product area | Boundary for public claims |
| --- | --- |
| Pause / resume / skip / general contract mutation | Contract visibility and cancellation categorization do not establish broad lifecycle mutation. |
| Rotations / swaps | Not represented as completed purchase or contract workflows. |
| Rewards | No delivered rewards capability is claimed. |
| Gifting | No delivered gifting workflow is claimed. |
| Customer portal / preferences | Customer self-service is not a current completed capability. |
| Commercial app billing | Subscription commerce support does not establish Loom's own commercial app billing. |
| Public developer API | No publicly available developer integration surface is claimed. |
| Broader lifecycle automation | Complete autonomous recurring billing and complete subscription lifecycle automation are not claimed. |

## Product-direction interfaces

The [product gallery](product-gallery.md) explores possible future-state interfaces using demonstration data. AI-assisted configuration, generated insights, external website-performance signals, automated multi-format report delivery, pictured communication integrations, and insight task management are product direction, not established implemented capabilities. Calendar capacity controls and suggested date changes in the visuals likewise do not establish unrestricted rescheduling. Navigation labels and interface controls do not change the maturity of a feature.

## Evidence needed as maturity advances

Future documentation changes should identify the actual delivered scope, the remaining gates, and the validation boundary. Evidence of implementation must be distinguished from product-direction imagery. Production-scale performance and enterprise certification require their own evidence; they do not follow from runtime preparation or pilot availability.
