# Team Bouma Card Generator

A standalone, local-first tool for handwritten thank-you cards. Choose a saved template, enter recipient names, edit a working message, and download a **7 × 10 inch portrait Word document**. One 7 × 5 inch half receives the handwriting; the other stays blank. No account, database, backend, analytics, or Team Bouma/DYMO integration is required.

Based on [Text to Handwriting by Saurabh Daware](https://github.com/saurabhdaware/text-to-handwriting). Original **MIT licence and Copyright (c) 2020 Saurabh Daware** are preserved in [LICENSE](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for library and font licences.

## Run locally

Use Node 24 and npm 11 (tested). From this checkout:

```sh
npm ci
npm run dev
```

The development server listens on port 5000. `npm run build` bundles the pinned DOCX library and local handwriting fonts into ignored `dist/`. The card workflow needs no external network requests after installation/build. Keep this server private; it is a development server. No public deployment is configured.

If Cypress's separate legacy binary is not needed, install using `CYPRESS_INSTALL_BINARY=0 npm ci`. This skips only that runner download, not package integrity validation. Run `npx cypress install` later to restore the legacy runner. All JS/font dependencies are lockfile-pinned.

## Make a card

1. Choose a saved template, or leave **Custom message** selected.
2. Enter recipient first names. Mailing address is optional and supports multiple lines. It appears in the message **only** if the template explicitly contains `{address}`.
3. Edit the personalized message. Paragraphs and line breaks are preserved. Recipient data and one-off messages are not persisted.
4. Open **Handwriting & print preferences** for font, size, colour, letter/word spacing, custom font upload, and alignment. These choices persist locally, except uploaded font files (session only).
5. Select **Top half** or **Bottom half**. This is a physical printer choice: the initial top-half setting is provisional, not a claim about your stationery feed direction.
6. Click **Generate Word Document**. Empty messages, unresolved `{placeholders}`, and messages that exceed the printable panel block export with instructions to shorten the message or adjust its size/spacing.

Changing handwriting preferences never replaces your message. If you edit the message manually, later recipient changes preserve those edits. Click **Update recipient in message** to refresh the remaining template-derived name/address fields without replacing your custom prose. A manually edited recipient field is no longer managed and is left untouched, even if it matches an old name elsewhere in the message. If you rewrite the whole message, edit the greeting directly or insert `{first_names}` / `{address}` and click the update button. Multiple separate edits can make a field's provenance ambiguous; the safe fallback is to leave it alone, never guess by replacing matching names throughout your text. Switching templates asks before discarding one-off edits. Keep a copy of important unsaved messages before closing the page.

## Manage and back up templates

Open **Manage templates** to create, select, edit, rename, explicitly **Save Template**, or delete with confirmation. Working card edits never change saved templates. Saving an edited template does not overwrite the current working card; reselect the template to use the saved revision.

Example buyer, seller, referral, and general thank-you templates are editable/deletable. They are seeded only when storage is first initialized; deleted examples never reappear after refresh.

**Back up templates** is always visible beside template management on the main screen; it downloads the same versioned JSON backup as **Export Templates to JSON** in the manager. **Import Templates from JSON** validates the entire file before saving and adds copies with new IDs; it never replaces existing templates, including same-name templates. Invalid files leave current data unchanged. Limits: 2 MB per import, 200 total templates, 100 characters per name, and 10,000 per template message. A backup has the form:

```json
{"version":1,"templates":[{"name":"Thank you","message":"Dear {first_names},\n\nThank you!\n\nMike"}]}
```

Templates and preferences use **browser-specific localStorage**. They do not sync across devices or browsers and can be erased by clearing browser data. Back up JSON regularly. Browser storage failures are reported; data is never silently reset. Avoid including client details in reusable templates or backups. Recipient addresses and personalized cards stay in page memory; downloaded files are your responsibility.

## Printing and calibration

Use a test sheet before expensive stationery:

1. In Word and the printer driver set a **custom 7 inch wide × 10 inch high portrait** paper size. The fold is horizontal at 5 inches.
2. Choose a panel and download **calibration**. The document labels the chosen half and the top of the sheet; its inner rectangle is exactly **6 × 4 inches**.
3. Mark your plain paper's leading edge, print single-sided, and fold it. Use the result to choose the correct top/bottom panel and paper-feed orientation. Test both panels if needed.
4. Measure the calibration rectangle. Print at **100% / Actual Size**, never Fit to Page. Disable printer-driver scaling as well. If the size is wrong, fix scaling rather than alignment offsets.
5. Adjust horizontal/vertical offsets (±6 mm) for small printer shifts, then repeat calibration. Offsets retain more than 0.26 inches of edge/fold clearance.

The normal message area is a fixed **6 × 4 inches**, centred within the selected half with 0.5 inch nominal margins. Text is vertically centred at your chosen font size; short messages are not enlarged. Rendering is **1800 × 1200 pixels (300 DPI)**, embedded as a page-relative PNG at its original physical dimensions. The preview stays plain white. Export uses a **transparent PNG background**, so only your ink is painted onto coloured or textured stationery. There is no opaque white rectangle, notebook ruling, margin line, scanner effect, or preview fold guide. The calibration rectangle and labels also have a transparent background. Printer/Word handling of transparency still needs the physical acceptance check below. Font size defaults to 18 pt, dark blue, plain paper, high resolution.

## Tests

```sh
npm run check
npx playwright install --with-deps chromium
npm test
```

The pinned Playwright suite starts its own local server on port 5010. Python 3 is required for independent ZIP/XML/PNG checks of generated DOCX files. In managed environments with a system Chromium you can instead run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Coverage includes startup without runtime network dependencies, preferences, fonts/ink, templates and backups, refresh persistence, placeholders, recipient separation, one-off edits, short/medium/overflow messages, calibration, 300 DPI PNG dimensions, exact DOCX page/anchor/image sizes, and equivalent original rendering controls.

Original Cypress tests remain at `tests/generateImage.spec.js`, targeting `/legacy/index.html`. Keep a server on port 5000 and run `npm run test:legacy`. Cypress 4.4.1 requires its binary, Linux libraries and Xvfb. During cloud validation Xvfb was installed without root at `/workspace/onboarding/xvfb-runtime`; in that instance prepend its `usr/bin` to PATH. Do not rely on this external helper directory for fresh machines; CI uses a supported Ubuntu runner. Playwright is now the primary test runner; Cypress is retained for comparison.

## Known limitations / physical acceptance

- DOCX XML dimensions, single-section structure, image anchors, transparency, lack of printable text/headers/footers, a minimal single anchor paragraph, and resolution are tested. **Microsoft Word and a physical printer are unavailable here**: final opening, pagination, printer-feed orientation and alignment need the calibration process above. XML checks cannot certify every Word version/driver.
- Each export contains one anchored image on one logical card page. Word renders it as an image, not editable/selectable handwriting text. Long content is blocked, not split into extra cards.
- Bundled fonts cover Latin text; other scripts require an appropriately licensed custom font. The original Hindi font remains only in the legacy fixture. Custom font upload is not persisted between sessions.
- Legacy PDF/PNG controls remain in the regression fixture; the simplified card workflow exports Word only. There is no card PDF export in Phase 1.
- Local browser storage is not a backup or central database. No client information is intentionally persisted by the app unless the user explicitly types it into and saves a reusable template.
- New card code is separate in `card/storage.js`, `card/app.js` and `card/export.js`. Recipient data is a `{firstNames, address}` record ready for future adapters; no integration endpoints or label printer dependencies were added.
