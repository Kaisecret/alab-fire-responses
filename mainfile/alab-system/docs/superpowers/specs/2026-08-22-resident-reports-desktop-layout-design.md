# Resident reports desktop layout

## Goal

Center the resident **My fire reports** workspace on desktop so its heading, status summary, controls, and table read as one intentional column. Preserve the existing mobile presentation exactly.

## Design

At viewports above 950px, the reports content will use a responsive centered maximum width with equal side margins. The layout remains a single report workspace: no data flow, filtering, status calculations, links, or mobile markup changes.

The desktop container will be wide enough for the five-column table while avoiding the left-heavy empty space in the current page. Existing status cards and controls will inherit the same centered width so their edges align with the report table.

## Responsiveness and verification

The adjustment is scoped only to a `min-width: 951px` media query. The current `max-width: 950px` mobile rules and markup remain untouched. Verification will include a focused source-level regression test for the desktop-only media rule plus the existing test suite and lint/build checks.
