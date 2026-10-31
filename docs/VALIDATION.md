# Phase 1 validation

Validated in the managed Linux development environment on 2026-10-31, using Node 24.19.0, npm 11.9.0, system Chromium, and pinned Playwright Test 1.64.1.

- `npm run build`: passed; local DOCX bundle and fonts created.
- `npm run check`: passed.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`: **11 passed**, none failed/skipped. Includes mobile layout and the three original behaviours via the legacy fixture.
- `PATH=/workspace/onboarding/xvfb-runtime/usr/bin:$PATH npm run test:legacy`: **3 passed**, none failed/skipped, Cypress 4.4.1 / Electron 80. The local Xvfb runtime was prepared during validation and is not a project dependency.
- `git diff --check`: passed.
- Original `LICENSE`, `js/` rendering modules/vendor assets, and `css/` files are unchanged.
- Essential card workflow verified with all non-local requests blocked. Three handwriting fonts are bundled with their separate licence texts; the legacy fixture still has upstream external-resource references.
- DOCX ZIP/XML independently inspected using Python: page width 10080 twips, height 14400 twips, single section, page-relative top/bottom image anchors, 6 × 4 inch image extent, 1800 × 1200 embedded PNG. Pixel bounds verify text is present, vertically centred, and inside the image. Short and medium messages export; oversized, unresolved, and empty messages are rejected.
- Preview and embedded PNG visually inspected. [Interface screenshot](card-generator.png) uses fictitious recipients.

## Manual acceptance still required

Microsoft Word and a physical printer are unavailable in this environment. XML structure and image checks do not establish actual Word pagination or physical alignment. Before production printing, open the DOCX in Word, confirm a single 7 × 10 inch portrait page, print the calibration at 100% / Actual Size on plain paper, measure the 6 × 4 inch rectangle, and determine panel/feed orientation. Repeat with stationery before regular use. Do not use Fit to Page.

No DYMO or transaction-app integration, authentication, database, public deployment, merge, or environment publication was performed. Optional secondary card PDF/PNG export was deferred; Word is the primary card output. The retained legacy fixture supports its original export controls.
