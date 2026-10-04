# Interactive demo captures

These images show the independently implemented **Interactive demo · Sample data**. The seven authoritative Photoshop exports remain unchanged in [`screenshots/`](../../screenshots/). Demo captures are implementation evidence, not screenshots of the private application.

| Workspace | Desktop | Mobile |
| --- | --- | --- |
| Orders & Activity | [1440 px](01-orders-activity-desktop.png) | [390 px](01-orders-activity-mobile.png) |
| Purchase Options | [1440 px](02-purchase-options-desktop.png) | [390 px](02-purchase-options-mobile.png) |
| Scheduling | [1440 px](03-scheduling-desktop.png) | [390 px](03-scheduling-mobile.png) |
| Analytics Overview | [1440 px](04-analytics-overview-desktop.png) | [390 px](04-analytics-overview-mobile.png) |
| Custom Reports | [1440 px](05-custom-reports-desktop.png) | [390 px](05-custom-reports-mobile.png) |
| Automations | [1440 px](06-automations-desktop.png) | [390 px](06-automations-mobile.png) |
| Loom AI | [1440 px](07-loom-ai-desktop.png) | [390 px](07-loom-ai-mobile.png) |

## Reproduce and review

The fixed viewport sizes are 1440 × 900 and 390 × 844 CSS pixels. Full-page PNGs extend vertically to include the workspace. Captures use fresh browser contexts, Windows, the lockfile's Playwright Chromium, device scale 1, `en-US`, `America/New_York`, light colors, and reduced motion. Mobile captures are Chromium emulation, not physical-device testing.

From `demo/`, start a production preview with the `/loom-public/` base. `PLAYWRIGHT_BASE_URL` may point to another production preview or the hosted demo.

```powershell
node tests/visual/capture-review.mjs ../.local/visual-review/candidate
```

Review every candidate beside its original reference and inspect the complete mobile page. Correct defects before copying approved PNGs here. Never blindly accept new snapshots. These same fourteen files are the reviewed Windows regression baselines:

```powershell
npx playwright test --config playwright.visual.config.ts
```

The visual command deliberately requires Windows. Linux CI runs the functional and responsive suite; it does not compare against a different platform's font rasterization. Browser or font upgrades require a new explicit visual review. See [validation evidence](../demo-validation.md) for the tested renderer and recorded results.
