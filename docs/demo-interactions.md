# Demo interaction inventory

This inventory describes the public demo's browser behavior. It does not describe production integrations or upgrade the private product's maturity. Names below are visible control text or accessible labels; repeated row controls act on the selected synthetic record. Automated coverage is in [`demo/tests/e2e`](../demo/tests/e2e/). Actual run results and verification limits belong in [demo validation](demo-validation.md).

## Shared navigation and overlays

| Controls / accessible names | Expected result and state effect | Mobile treatment | Coverage |
| --- | --- | --- | --- |
| Loom home; Home; Orders & Activity; Products; Analytics; Integrations; Settings | Open stable hash routes; logo returns to the compact Home launchpad. No external navigation or account connection. | Sidebar becomes a drawer; selecting a destination closes it. | `core.spec.ts`: first visit/navigation |
| Overview; Subscriptions; Scheduling; Cancellations | Change Orders section route. Order detail links retain the list's filter query. | Tabs wrap rather than losing labels. | Core navigation and Orders journeys |
| Analytics Overview; Reports; Automations; Loom AI™ | Change Analytics section route; direct links and refresh render the selected workspace. | Same routes and state; responsive navigation. | Core navigation, report/automation/insight journeys |
| Open navigation; Close navigation | Open/close the mobile navigation; Escape closes it. | Mobile-only triggers with accessible names. | Responsive and core journeys |
| Search orders, products, and reports; Search query; search result links | Search the shared synthetic orders, products, and saved reports and open the matching record. Empty results explain how to retry. | Search button opens a full-width dialog. | `core.spec.ts`: local search/history |
| Help and sample guidance; Ask Loom; three guidance links | Open a local explanation and task shortcuts; no free-text model call. | Same dialog, reachable controls. | `core.spec.ts`: modal keyboard focus |
| Close dialog; Cancel; Escape; dialog backdrop | Close the current overlay, preserving the underlying view; cancel leaves uncommitted changes untouched. Modal focus returns to the trigger. | Dialog fits the viewport with reachable footer controls. | Core focus test and individual cancel journeys |
| Dismiss notification; Undo when offered | Dismiss the live status notification; Undo reverses the explicitly described local action. | Notification stays within the viewport. | Insight completion journey |
| Skip to main content | Moves keyboard focus past global navigation. | Available at all sizes. | Keyboard inspection |

## Orders and activity

Reference: [01 — Orders & Activity](../screenshots/01-orders-activity.png).

| Controls / accessible names | Expected result and state effect | Mobile treatment | Coverage |
| --- | --- | --- | --- |
| Reporting period | Changes the fixed reporting window, six summary cards, attention counts, and available table rows together. | Full-width selector. | Orders filter/period checks |
| Analyze in Loom | Opens Analytics with the same shared fixture source. | Reachable link above cards. | Navigation |
| Orders need review; payments need attention; ready to release | Open the matching list filter. Payment, fulfillment, and release remain separate states. | Stacked attention buttons. | `orders.spec.ts`: valid review and blocked order |
| Search orders; Order type; Payment status; Clear filters | Apply/reset the URL-backed list filters immediately; reset pagination and selection to prevent stale scope. | Search spans the card width; selectors wrap. | `orders.spec.ts`: saved view, empty result |
| Additional order filters; Fulfillment; Release state; Sort orders; Done | Reveal extra filters and sorting; Done closes the overlay. | Modal controls retain readable labels. | `orders.spec.ts`: paging/sort |
| Created sort button | Toggles oldest/newest order sorting. | Equivalent Sort orders selector remains available. | Sort journey |
| Select all orders on this page; Select order / Select sample order | Maintain a selected set independently of summary metrics; export uses selected records within the filtered scope. | Labeled card checkbox per record. | `orders.spec.ts`: selected CSV scope |
| Order number; Review; Ready; View; Complete; Review order; View order | Open the focused order route with line items, independent states, dates, and eligibility explanation. | Card action and order number remain visible. | Review and blocked-order journeys |
| Review and release; Mark complete in demo; I reviewed the sample fulfillment details; Apply to demo | Require review confirmation; apply only a permitted local transition; update order state and local activity once. Blocked/unpaid/cancelled records cannot be released. | Full-width focused view and confirmation dialog. | `orders.spec.ts`: release; domain transition tests |
| Back to orders; Return to list | Return to the exact filtered list; released records leave Needs review results. | Visible back path. | `orders.spec.ts`: preserved filter |
| Customize view; column checkbox; Move column left/right; Done | Change visible desktop columns and their order while retaining order number/action access. | Configuration remains available; cards retain essential labeled facts. | `orders.spec.ts`: column choice saved/restored |
| Save view; View name; Saved views | Save a named combination of filters, sort, and columns; selecting it restores those values. Local storage failure is labeled session-only. | Same saved state and selector. | Orders saved-view and persistence suites |
| Export; Download CSV | Download the selected or filtered scope with actual order identifiers and net values; no server request. Errors remain visible. | Same modal and download action. | CSV contents asserted against the selected record |
| Rows per page; Previous orders page; Next orders page | Change bounded pagination; disabled endpoints communicate unavailable navigation. | Controls wrap above labeled cards. | `orders.spec.ts`: paging |

## Purchase options

Reference: [02 — Purchase Options](../screenshots/02-purchase-options.png). Coverage: `products.spec.ts` and purchase calculation/validation unit tests.

| Controls / accessible names | Expected result and state effect | Mobile treatment |
| --- | --- | --- |
| Product catalog cards; Products back link; View product; Preview storefront | Open the correct product editor or its applied local storefront; products keep separate draft/applied records. | Catalog cards and clear back paths. |
| Load example setup | Load the explicit 10% discount/two-week-or-monthly preset; remains an unsaved editable draft. | Same preset and manual controls. |
| Enable one-time purchase; Edit / Done | Toggle the one-time mode; explain the fixed catalog price/inventory when expanded. | Full-width option section. |
| Enable Subscribe and Save; Discount (%); delivery-frequency checkboxes; Default frequency | Update the draft and live preview; require an enabled default and at least one purchasable mode; distinguish calendar months from four weeks. | Editor form uses readable labels and inputs. |
| New subscriber benefit; Add benefit; Remove benefit | Add/remove a bounded benefit list shown in the storefront. | Wrapping chips with named remove buttons. |
| Enable prepaid plans; Expand / Collapse prepaid settings; Prepaid deliveries; Prepaid discount (%) | Keep prepaid off/collapsed initially; validate bounded delivery count/discount and show the upfront sample total. | Expanded controls stack. |
| Edit / Preview; Preview device size; Mobile / Desktop storefront preview | Change preview presentation while preserving the same draft. | Edit/Preview views replace the side-by-side editor; no tiny nested phone frame. |
| Storefront purchase-mode radios; Deliver every; Quantity; Add to cart; Continue exploring | Select a supported purchase mode/frequency, calculate integer-cent totals, and add a local cart item; no checkout. | Full-width preview and sample-cart modal. |
| Save draft; Publish changes; Apply to demo store | Save a draft separately from applied settings; explicit confirmation applies to the local storefront only. | Actions remain reachable above the editor. |
| Keep editing; Discard changes | Retain or discard unsaved edits when navigating away. | Same confirmation dialog. |

## Scheduling

Reference: [03 — Scheduling](../screenshots/03-scheduling.png). Coverage: `scheduling.spec.ts` and calendar/rules/transition unit tests.

| Controls / accessible names | Expected result and state effect | Mobile treatment |
| --- | --- | --- |
| Previous / Next schedule month | Move the correctly aligned calendar across month/year boundaries via a shareable query. | Same month controls. |
| Calendar day (date, scheduled count, capacity, textual status); Inspect any day; Close | Inspect that day's sample orders and capacity; color is supplemented by counts/status text. | Agenda defaults; Show calendar / Show agenda offers an optional calendar. |
| Scheduling rules; Blackout dates; Capacity limits | Open the common rule editor populated from current rules. | Tools stack below the agenda. |
| Daily capacity; Minimum lead time (days); Black out Saturdays and Sundays; Add blackout date; Add date; Remove blackout; Apply rules to demo | Validate/apply a bounded local rule set and recalculate unresolved conflicts. | Stacked, labeled inputs. |
| Cancel; Keep editing; Discard changes | Discard or retain a modified rule draft without silently applying it. | Focused confirmation. |
| Search scheduling actions; Scheduling issue filter | Filter unresolved actions without changing the baseline schedule. | Full-width controls and labeled action cards. |
| Select all unresolved scheduling orders; individual selection; Reschedule selected; Clear selection | Build/reset the explicit order set to simulate. | Per-card labeled checkboxes. |
| Review; Review schedule; day-level Reschedule; Simulate changes | Open a focused proposed-date workflow; no permanent individual detail panel. | Full-width modal. |
| Proposed fulfillment date; Preview changes; Cancel; Apply to demo | Preview separately; reject blackout/capacity/lead-time violations; cancel leaves baseline untouched; apply revalidates and updates queue/counts/activity once. Billing dates are retained. | All actions reachable without tiny calendar targets. |

## Analytics and reports

References: [04 — Analytics Overview](../screenshots/04-analytics-overview.png), [05 — Custom Reports](../screenshots/05-custom-reports.png). Coverage: `analytics-insights.spec.ts`, `reports-automations.spec.ts`, `core.spec.ts`, selector/export unit tests.

| Controls / accessible names | Expected result and state effect | Mobile treatment |
| --- | --- | --- |
| Analytics period; Compare to; Trend metric; Trend time grouping | Recalculate the scoped cards, trend, ranking, and export data. Comparison rate changes use percentage points. | Controls wrap into labeled rows. |
| Inspect period; chart points; View chart data | Reveal exact chart values through keyboard/select, pointer/touch, or semantic table. | Touch/select/table alternative. |
| View report; ranked product links | Open the matching report with period context or the correct local product. | Locally scrollable ranking with real links. |
| Store-wide insight selectors | Change the distinct fixed-context sample explanation; preserve report-versus-store scope wording. | Stacked insight selector and detail. |
| Saved report; Template; Time grouping; Compare to; Reporting period | Open saved configuration or edit the current report draft; changing the template uses a finite metric/visual catalog. | Stacked builder controls. |
| More report options; Purpose; Breakdown | Reveal/edit optional report context and supported product/purchase-type breakdown. | Collapsed extra options. |
| Remove metric; Add metric; Choose report metrics; Done | Change the finite selected metric set; keep at least one metric and reconcile visual metrics. | Wrapping chips and modal checklist. |
| Metric Card(s); Primary chart type; Add visual | Toggle cards, change supported chart type, or add a genuine report visual. | Full-width preview sections. |
| Edit visual (named); Visual title/type/metric; Apply visual; Remove visual; Cancel | Edit a separate visual draft; Apply changes the report, Cancel discards that visual draft, Remove retains at least one visual. | Focused modal. |
| Save report; Save as copy; Report name; Save changes | Save/rename or copy the report; saved reports become selectable automation sources. | Same named dialog; immediate typing/submission covered. |
| Reset; Keep editing; Reset edits | Restore the last saved report only after confirmation. | Modal confirmation. |
| Delete report; Replacement report; Cancel | Require explicit replacement for linked automations/insights; retain at least one report. | Modal with labeled replacement selector. |
| Create alert | Link the saved report into a local alert editor; require unsaved report edits to be saved first. | Same route and guard. |
| Export / Export overview; PDF; PowerPoint; Excel; CSV; Sample summary (JSON); fallback file link | Generate authentic browser-local files from the current report scope; show generation/download failure and manual-link fallback; summary is deterministic. | Download dialog; heavy libraries load only on request. |

## Automations

Reference: [06 — Automations](../screenshots/06-automations.png). Coverage: `reports-automations.spec.ts`, export unit tests, next-run/validation unit tests.

| Controls / accessible names | Expected result and state effect | Mobile treatment |
| --- | --- | --- |
| All; Reports; Alerts; AI briefings; Search automations; Folder view; Automation folder | Filter the local automation list and show a meaningful empty result. | Wrapping controls above readable cards. |
| Create automation; automation name; Edit automation; Close automation editor; Back | Open/close a focused route-backed editor, preserving unsaved-edit confirmation. Default center has no open editor. | Full-width editor and explicit back/close. |
| Actions for named automation; Edit; Duplicate; Pause / Resume; Delete | Open a nearby overflow menu; duplicate as paused; pause removes date next-run; resume computes date/trigger state; delete confirms and retains source report. Escape returns focus. | Card overflow uses bounded viewport positioning. |
| Configure manually; Use Loom AI; Load example setup | Switch setup presentation; sample option applies only its explicit visible preset, with no model interpretation. | Same manual configuration. |
| Automation name; Report / data source; View report; Automation type; Folder | Validate/edit the saved configuration and its report link. | Labeled fields. |
| Cadence; Weekday / Day of month; Schedule time; Time zone; Revenue change threshold (%) | Configure a deterministic schedule or trigger against the fixed snapshot. | Wrapping field grid. |
| PDF / PowerPoint / Excel / AI Summary output; Email / Teams / Slack / Text destination | Select multiple supported outputs and simulated destination types; table/editor/preview reuse the same distinct icons. | Wrapping multi-select controls. |
| Destination recipients; Message; Include sample summary in message body | Validate channel-specific destinations and save message configuration; no sending or authentication. | Full-width inputs. |
| Summary instructions; Saved summary instructions | Save configuration text explicitly labeled as uninterpreted by any live model. | Expandable section. |
| Delivery & failure notifications; Include selected file attachments; Failure recipient; Automation status | Save attachment/failure/status preferences with a separate failure destination. | Expandable section. |
| View preview; Download selected outputs | Inspect actual selected report facts, destinations, formats, and local files. | Padded preview and focused modal. |
| Save automation; Send test | Validate/save; require saved configuration before preparing a labeled local test. Record local activity and expose selected artifacts. No delivery is claimed. | Nonoverlapping footer controls. |

## Insight workspace and supporting views

Reference: [07 — Loom AI](../screenshots/07-loom-ai.png). Coverage: `analytics-insights.spec.ts`, core navigation, persistence tests, task/subscription unit tests.

| Controls / accessible names | Expected result and state effect | Mobile treatment |
| --- | --- | --- |
| Two supported example questions; For you; To do; Saved; Completed; insight title | Open stable insight/view queries; narrow list and selected detail share the full title. No arbitrary chat input. | Stacked list/detail with accessible full titles. |
| Insight; Next steps; Supporting data | Switch between the original sample explanation, investigation recommendation, and definitions. | Wrapping local tabs. |
| Save insight / Saved insight; Add to to-do / Task added | Independently bookmark an insight and create exactly one linked task; duplicate task creation is disabled. | Wrapping labeled actions. |
| Remind me / Edit reminder; Reminder date; Save reminder; Remove reminder; Cancel | Record/remove a local date; preserve saved insight/task context. No background execution or notification is requested. | Focused date dialog. |
| Mark completed; Completed; Undo; Undo completion | Move the task to history or restore it; original metric/context remain unchanged. | Same status announcement and Undo. |
| Ask a follow-up; Example question; Close; Open supporting report | Select a deterministic fixture-grounded explanation or open its local supporting report. | Accessible selector and dialog. |
| Home task shortcuts | Open order review, purchase options, or report building. | Three stacked cards. |
| Search subscriptions / cancelled contracts; status / category; Clear filters; contract View / Categorize; Previous / Next contracts page | Browse/filter/paginate shared synthetic contracts and open focused details. | Labeled cards replace desktop rows. |
| Pause in demo; Resume in demo; Skip next occurrence; Apply to demo; Cancel | Confirm a permitted local contract transition; skip moves matching scheduled occurrences using the contract cadence. | Focused detail and modal. |
| Cancellation reason; Save category; Back; Keep editing / Discard changes | Categorize an already-cancelled sample contract; preserve or discard an uncommitted category edit. | Stacked detail form. |
| Integration live-connection controls | Remain visibly disabled with a named reason; Configure a local automation is usable. | Readable provider cards; no credential inputs. |
| Display time zone; Compact desktop table rows; Reduce interface motion | Apply and persist local preferences; automation schedules retain their explicit zone. | Stacked settings. |
| Reset demo data; acknowledgment; Confirm reset; Cancel | Confirm a reset of this demo's scoped key only; Cancel preserves edits and sibling project storage is untouched. | Focused modal. |
| Explore sample workflows; load newer saved state when offered | Return Home or explicitly reconcile another tab's saved state. | Same local behavior. |

## Storage and state integrity

| Behavior | Expected result | Coverage |
| --- | --- | --- |
| Browser refresh | Restores validated versioned state and stable route; fixtures use a fixed clock. | Purchase/order/report refresh journeys |
| Browser Back / Forward | Restores the selected hash route; filtered order details retain their query. | `core.spec.ts` and order journey |
| Storage unavailable or quota exhausted | Keep the current session usable and show a session-only warning; never claim persistent saving succeeded. | `persistence.spec.ts` |
| Unsupported or invalid stored schema | Load a fresh sample with an explanatory warning; leave unrelated origin data untouched. | `persistence.spec.ts` |
| Another tab saves first | Warn and reject a stale write; preserve the newer stored state. | `persistence.spec.ts` |

The inventory is kept alongside source so changes to visible controls can be reviewed against their state effects, accessible labels, mobile behavior, and evidence. A click handler alone is not verification.
