# Interactive demo validation

This record covers the independently written public demo, not the private Loom application. Validation date: October 4, 2026. The original seven [design references](product-gallery.md) retain their future-state captions and remain unchanged.

## Local evidence

Tested with Node **24.18.0**, npm **11.16.0**, Playwright **1.63.0**, Windows, and the production build served under `/loom-public/`.

| Check | Result |
| --- | --- |
| Clean `npm --prefix demo ci` | Passed using the committed lockfile |
| TypeScript, domain and export tests, production build | Passed; 38 unit tests |
| Dependency audit | 0 reported vulnerabilities; deprecated dependencies of the development-only ExcelJS validator remain |
| Formatting and retained dependency notices | Passed; notices cover 45 production package versions |
| Chromium 153.0.8010.12 desktop | All 34 cases verified, including targeted reruns described below |
| Chromium mobile emulation, 390 × 844 | All 34 cases verified, including targeted reruns described below |
| Playwright WebKit 26.6 | 5 core navigation, form, export, focus, and history cases passed |
| Playwright Firefox 155 | Local engine initialization timed out; all 5 core cases passed in Linux CI |
| Reviewed visual regression | 14/14 exact Windows Chromium comparisons passed |

The final local functional run passed 71/73 cases. Two order-export assertions used an outdated fallback-link label; after correcting the locator, both passed and verified that the fallback downloads identical CSV bytes. The two 200% text cases were also rerun with an explicit wait for the loaded workspace after refresh; both passed. No failing application assertion was removed or skipped.

Coverage includes filtered order review and return context; purchase draft/apply/storefront/cart behavior; schedule preview/cancel/apply and capacity rules; report creation, visual editing, reference reassignment and genuine exports; multi-output automation preview/test/pause/resume/duplicate/delete; insight save/task/reminder/completion/undo; native Back/Forward with dirty editors; immediate form submission; dialog focus; unavailable/quota-limited storage; invalid stored schema; stale-tab rejection; and scoped reset isolation. See the [interaction inventory](demo-interactions.md) and [tests](../demo/tests/).

Reflow checks cover all seven views at **320 × 812, 375 × 812, 390 × 844, 768 × 1024, 1024 × 768, 1440 × 900, and 1920 × 1080**, plus doubled text sizes. Dense tables use local scrolling or labeled mobile cards. Mobile scheduling defaults to an agenda, and purchase editing separates Edit and Preview.

Keyboard checks exercise trapped dialog/drawer focus, Escape and return focus, native history, and reachable controls. Charts expose exact values through a period selector and semantic data table. A focused computed-color review across nine routes found and corrected low-contrast secondary/status text; the final scan found no below-threshold solid-background text pairs. Gradient rendering, every assistive technology, physical devices, and formal WCAG certification were **not** comprehensively tested.

## Visual review and deliberate differences

The shell and Orders layout were compared with the approved Orders reference before extending the shared components. All seven completed desktop/mobile views were inspected before establishing the [14 actual captures](demo-images/README.md) as Windows regression baselines. Snapshot updates are disabled by default; visual changes require inspection. Linux functional CI does not compare Windows font rasterization.

| Reference | Preserved hierarchy and deliberate adaptation |
| --- | --- |
| Orders & Activity | Six compact context cards, attention strip, full-width table, three primary filters, Customize before Save. Totals and sparklines come from shared synthetic records rather than conflicting pictured figures. |
| Purchase Options | Wide editor, narrower phone preview, prepaid off/collapsed, original locally drawn SVG packaging. System fonts and explicit sample wording replace unsupported live-AI behavior; mobile uses Edit/Preview. |
| Scheduling | Calendar, separate tools/capacity, unresolved-action queue. December 2026 has 126 planned orders, one over-capacity day, one blackout, and four unresolved actions; these values follow the fixtures and rules. |
| Analytics Overview | Five cards, trend, product ranking, separate store-wide insight section. Available fixture metrics include refund rate and defined contract retention; no invented external acquisition or renewal data. |
| Custom Reports | Builder, metrics/visuals, preview, and distinct insight panel. A bounded metric catalog replaces arbitrary formulas. Weekly trailing buckets can contain fewer days; the data table exposes their actual dates. |
| Automations | Spacious center with editor closed by default; selecting Create/Edit opens the editor. Only browser-local configurations and downloadable tests are implemented. |
| Loom AI | Narrow selected insight list and wider repeated-title analysis. Four curated fixture-grounded insights, supported questions, independent bookmarks/tasks/reminders, and preserved context replace live inference. |

Secondary text/status colors are darker than the references where needed for readability. Touch controls and wrapping labels take precedence over reproducing small desktop targets. The demo uses bundled icons, system fonts, and original SVG product illustrations; full reference PNGs are never runtime UI backgrounds. These are documented design differences, not a pixel-fidelity score.

## Export and performance evidence

PDF headers/page objects, PPTX package/slides/editable chart data, XLSX package/three worksheets/typed cells/styles/frozen headers/formulas, CSV values and selected scope, and deterministic JSON summaries are checked. Representative PDF, all three PowerPoint slides, and all three Excel sheets were rendered and visually inspected. The sample report's net revenue reconciles to **$8,052.20**. XLSX user strings are escaped and never treated as formulas; CSV neutralizes formula-like strings. Files use the same selectors as the UI.

Three fresh Chromium contexts at 1440 × 900, device scale 1, on a local production preview without CPU/network throttling measured:

| Lab measurement | Runs |
| --- | --- |
| Initial JavaScript, gzip-compressed from requested assets | 97,040 bytes each (about 94.8 KiB) |
| First contentful paint | 136 / 120 / 124 ms |
| Populated Orders ready | 165 / 147 / 140 ms |
| Heavy exporter loaded on initial visit | No, in all three runs |

These are local lab measurements, not field Core Web Vitals or a prediction of hosted/network/device performance. The [measurement script](../demo/tests/performance/cold-load.mjs) records fresh contexts and requested asset sizes. Exporters and secondary routes load on demand.

## Privacy and release boundary

Source, fixtures, new documentation, and publication files were reviewed for credentials, private-key/token patterns, credential-bearing URLs, private store hosts, and local-user paths. None were found. Runtime checks rejected unexpected external requests, console errors/warnings, and missing required assets. A separate seven-route/five-format export audit made only same-origin requests. There is no backend, tracking, live model, external sending, or production API access.

Only this public repository was used. Other repositories, the profile, original screenshots, and existing maturity documentation were left alone. No project license was added; distributed dependency notices are retained. Browser storage uses only the versioned Loom demo key. Automation schedules and reminders do not run while the browser is closed, and local tests never deliver messages.

The [Pages workflow](../.github/workflows/demo.yml) requires type/domain/export/build checks and four browser projects before a `main` deployment. Feature branches and PRs cannot deploy. The artifact contains only `demo/dist`; its `version.json` records the public commit ID.

The [initial main release](https://github.com/mchenry-power-dev/loom-public/actions/runs/37245481103) passed all 78 Linux browser cases, build checks, and Pages deployment. The hosted `version.json` matched merge commit `aba87501b1bae21078699df5fcd680445e63c386`. A clean browser opened the base URL without a hash and the direct mobile purchase route; both rendered correctly, including the $30.60 subscription preview. The live [demo](https://mchenry-power-dev.github.io/loom-public/) is separate from the private application.

All **68 hosted Chromium desktop/mobile tests passed** against that public release in fresh contexts. These exercised the complete primary workflows, authentic downloads, direct links and refresh, dirty-edit/history guards, storage isolation, all seven viewport widths, and 200% text. Hosted desktop Orders and mobile storefront captures were also inspected. The README and repository homepage were linked only after the deployed application and served commit were verified.

## Reproduce

From the repository root:

```sh
npm --prefix demo ci
npm --prefix demo run check
npm --prefix demo run format:check
npm --prefix demo run notices:check
```

From `demo/`, install the Playwright engines, then run the browser matrix:

```sh
npx playwright install
npm run test:e2e
npm run test:visual
```

The visual command requires Windows and the locked browser. For cold-load measurement, start `npm run preview` in another terminal, then run `npm run measure:load`. See the [guide](demo-guide.md) for local-only behavior and source layout.
