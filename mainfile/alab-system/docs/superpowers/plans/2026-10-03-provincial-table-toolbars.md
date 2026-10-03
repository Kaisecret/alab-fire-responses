# Provincial table toolbars and pagination

User-approved requirements: keep live data automatic, remove manual refresh controls, put summary cards before action rows, group issue/provision/export/download controls above their tables, remove the water-source register badge, and default primary registry tables to seven rows. The incident command roster keeps its existing list.

Implementation:
- Add seven-row support to validated management filters and list state while preserving export limits.
- Share responsive table toolbar styling and pagination; retain filters, forms, and selections during background reads.
- Relocate account, application, personnel, station, report, and fleet actions below summary cards.
- Remove refresh controls and use existing visibility-aware polling; add polling to remaining registry reads.
- Verify pagination, filter resets, polling state preservation, actions, responsive layouts, lint, and production build.

Preserve unrelated resident call-flow edits and existing deployment configuration.

Implemented and verified:
- 63 regression tests passed, including execution of the actual registry SQL in PGlite with 15 matching records, distinct seven-row pages, full-result metrics, province isolation, and filtered totals.
- Account tests verify automatic reads preserve the selected page and an open form draft, skip hidden tabs, and remove polling listeners on unmount.
- Browser checks used the actual components with local API fixtures across all 16 provincial views at 1440, 1024, 768, and 390 pixels. Verified no manual refresh controls, card/action ordering, exports and provisioning dialogs, 7/7/1 page navigation, search resets, report selection persistence, and preserved GIS zoom/position through incident and water-source polling.
- `npm run build` passed, including TypeScript and evidence-runtime verification. Targeted ESLint passed with zero errors; existing image and hook-dependency warnings remain.
- Screenshots: `outputs/provincial-table-toolbars`. Browser harness: `C:/Users/janna/AppData/Local/Temp/alab-dashboard-preview-tools/review-provincial-table-toolbars.mjs`.
