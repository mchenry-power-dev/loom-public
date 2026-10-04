# Interactive demo guide

The public demo is independently written portfolio software with synthetic records. It runs in the browser and does not connect to Shopify, an AI model, email, Slack, Teams, SMS, billing, or production services. Its behavior is separate from the product maturity described in the [product overview](product-overview.md) and [roadmap](roadmap.md).

## Run locally

Use Node 24 and the committed lockfile. From the repository root:

```sh
npm --prefix demo ci
npm --prefix demo run dev
```

Open the displayed local address with `/loom-public/`. The static production build uses the same base path:

```sh
npm --prefix demo run check
npm --prefix demo run preview
```

No environment file, account, token, or service connection is needed. Navigation uses hash routes, so a URL such as `/loom-public/#/reports/revenue-overview` can be refreshed on static hosting.

## Suggested walkthrough

1. In **Orders & Activity**, filter synthetic records, inspect an order, and review its separate payment, fulfillment, and release states. Resolve a permitted local review and see the shared totals change.
2. In **Scheduling**, change sample planning inputs, preview the proposed dates, and apply the proposal. Preview alone does not update orders.
3. In **Analytics**, choose a reporting period and inspect actual chart values. Open its related report.
4. In **Reports**, select metrics, edit a visual, save a named copy, and reopen it. Export its current scope as PDF, PowerPoint, Excel, CSV, or a sample summary JSON file.
5. In **Automations**, create a configuration using that saved report. Select multiple formats and simulated destinations; preview, save, and prepare a local test. Pause or resume the configuration from its action menu.
6. In **Loom AI**, open a labeled sample insight, save it, or create a local follow-up. Completion and undo update browser state. No model runs.

See the [interaction inventory](demo-interactions.md) for individual controls and the [validation record](demo-validation.md) for actual test results and limits.

## Data, persistence, and export behavior

The fixture snapshot is fixed at **September 27, 2026, 12:00 UTC**; the scheduling scenario begins **December 1, 2026**. Reset starts with 930 synthetic orders, 174 subscriptions, five products, three saved reports, three automations, and four sample insights. Order counts in a selected reporting period are a subset of this fixture, which also includes historical and planned records.

The UI, reports, automation previews, and downloads use shared selectors over those records. Money is stored in integer USD cents; rates are percentages. Definitions beside the charts and in exports explain the denominators and previous-period comparisons. A missing comparison baseline is labeled instead of divided by zero.

Changes save to versioned local browser storage. Reload keeps compatible saved changes. A second tab cannot silently overwrite a newer revision; the demo asks you to load that saved state. When storage is blocked or full, the UI explains that changes last only for the session. Settings provides a confirmed reset to the deterministic starting dataset. Use sample values only; this demo has no server backup.

Reports remain independent of automation configurations, and automations reference saved reports by ID. Deleting a linked report requires a replacement. Exporting a report includes its current preview scope; automation tests use its saved report. Export writers load only when requested. Downloads are genuine PDF, PPTX, XLSX, CSV, and JSON files. The summary is deterministic sample text, and a local test does not send a message. The browser may require its visible fallback download link or permission for downloads.

The XLSX exporter writes three defined SpreadsheetML worksheets and packages them with JSZip. It preserves typed numbers and dates, number formats, frozen headers, filters, and cached additive formulas. Its bounded scope avoids shipping a general workbook engine and its embedded legacy browser dependencies. ExcelJS is a development-only round-trip validator. The package structure follows the [Microsoft Open XML documentation](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document).

Charts provide a period inspector and data-table alternative for keyboard and touch use. Mobile layouts retain the same state transitions with cards, wrapping controls, and reachable editor sections. A running server, background scheduler, external recipient delivery, and live AI inference are outside this demo.

## Build and publication

The [workflow](../.github/workflows/demo.yml) checks types, domain rules, exports, the production build, and browser journeys. Chromium runs desktop and mobile journeys; WebKit and Firefox run the shared core suite. Deployment is limited to successful `main` runs and consumes only the checked `demo/dist` artifact. It does not publish the repository root or local verification files.

CI sets the optional `VITE_DEMO_COMMIT` build value to the public commit SHA. The built `/loom-public/version.json` contains only that validated commit ID; local builds without it say `local`. Compare that value with the deployed Actions run to verify which commit is served.

Third-party notices ship at `third-party-notices.txt` beside the demo. The [source notices](../demo/public/third-party-notices.txt) preserve dependency attribution without changing this repository's license. After changing dependencies, regenerate and check them:

```sh
node demo/scripts/generate-notices.mjs
node demo/scripts/generate-notices.mjs --check
```

The implementation is organized into [`fixtures`](../demo/src/fixtures/), [`domain`](../demo/src/domain/), [`selectors`](../demo/src/selectors/), [`persistence`](../demo/src/persistence/), [`routes`](../demo/src/routes/), and lazy [`exports`](../demo/src/exports/). It contains no copied private production source.
