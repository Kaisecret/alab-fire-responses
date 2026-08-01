# ALAB Web Role Modules Design

## Goal

Set up the Next.js web application around role-based modules for the web users:
Resident or Citizen Reporter, Municipal BFP Personnel, and Provincial BFP
Personnel.

The Firefighter or Authorized Field Responder role is intentionally excluded
from the Next.js web route setup because that user belongs to the separate
mobile application codebase.

## Current Context

The Next.js app lives in `mainfile/alab-system`. It currently has:

- `/` as the public landing page, which should also serve as the resident-facing
  entry point.
- `/login` as the shared login page.
- Shared content files in `app/_content`.
- Shared page components in `app/_components`.

## Route Architecture

Use role-based route folders instead of a dashboard-only structure. Each role
gets a top-level module folder so future pages can grow naturally under the
role.

Planned route groups:

- `/resident`
  - Resident or Citizen Reporter module home.
  - Future child pages may include `/resident/report` and `/resident/status`.
- `/municipal-bfp`
  - Municipal BFP Personnel module home.
  - Future child pages may include reports, incidents, firetrucks,
    water-sources, and assistance.
- `/provincial-bfp`
  - Provincial BFP Personnel module home.
  - Future child pages may include incidents, municipalities, resources,
    analytics, and reports.

Do not create `/dashboard/firefighter`, `/firefighter`, or any firefighter web
module in this app.

## File Architecture

Add focused module files that match the current app pattern:

```text
mainfile/alab-system/app/
  resident/
    page.tsx
  municipal-bfp/
    page.tsx
  provincial-bfp/
    page.tsx

  _components/
    module-shell.tsx
    resident-module.tsx
    municipal-bfp-module.tsx
    provincial-bfp-module.tsx

  _content/
    user-modules.ts
```

The `module-shell.tsx` component provides the shared role-module frame:
navigation, title area, summary cards, and primary action links.

Each role component owns only the role-specific presentation and passes content
from `user-modules.ts` into the shared shell.

## Content Model

`user-modules.ts` exports a typed content map for the three web roles. Each
module definition includes:

- `role`
- `title`
- `description`
- `primaryActions`
- `highlights`
- `sections`

This keeps the first setup data-driven without introducing backend logic,
authentication, or database dependencies.

## Navigation Behavior

The existing `/` landing page remains the resident-facing public entry point.
The `/resident` route is a resident module page for logged-in or module-style
resident workflows.

The `/login` page remains shared. No real authentication routing is added in
this setup; role access can be connected later when auth exists.

## Error Handling

Because this setup is static module scaffolding, error handling is limited to
compile-time safety:

- TypeScript types should prevent invalid role keys.
- Each route imports a known role component directly.
- No runtime fetching or async loading is introduced.

## Testing

Add route/file-structure tests using the existing Node test style in
`mainfile/alab-system/tests`. Tests should verify:

- The three web role route pages exist.
- No firefighter route exists under the web app.
- The content model contains only `resident`, `municipal-bfp`, and
  `provincial-bfp`.
- The app still builds with `npm run build --prefix mainfile/alab-system`.

## Non-Goals

- Do not implement the firefighter mobile app.
- Do not add database integration.
- Do not add real login/session authorization.
- Do not replace the existing landing page.
- Do not create a dashboard-only route structure.
