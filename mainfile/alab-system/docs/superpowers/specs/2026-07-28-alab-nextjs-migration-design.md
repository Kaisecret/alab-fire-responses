# ALAB Next.js Migration Design

## Goal

Convert `BFP/index.html` and `login.html` into the existing Next.js application at `mainfile/alab-system` without changing the user interface.

## Confirmed Requirements

- The landing page must be the first page shown when the Next.js application runs.
- The landing page must be available at `/`.
- The login page must be available at `/login`.
- All image assets from `BFP/images` must be available through the Next.js `public` directory.
- The visual interface must remain unchanged: layout, copy, colors, typography, spacing, images, responsive breakpoints, hover states, and animations must match the existing HTML pages.
- Landing-page login links must navigate to `/login`.
- Login-page home and back links must navigate to `/`.

## Architecture

The existing application in `mainfile/alab-system` remains the project root. The landing route will use `app/page.tsx`, and the login route will use `app/login/page.tsx`. Interactive browser behavior will be placed in client components, while route metadata remains in server route files where appropriate.

The original CSS will be migrated with only syntax and scoping changes required by Next.js. It will not be visually redesigned. Image paths will be updated from relative HTML paths to root-relative paths under `/images`.

## Components

### Landing Page

The landing page will retain its header, navigation, hero, incident overview, response journey, resources, access system, field-ready section, response connection section, footer, mobile navigation, scroll-state behavior, reveal effects, and scroll-to-top behavior.

### Login Page

The login page will retain its two-column banner and form layout, branding, input fields, password visibility toggle, responsive layout, animations, and navigation controls. Submitting the current demonstration form will continue to navigate to the landing page because no authentication backend is part of this migration.

### Assets

All source image files will be copied without visual modification to `mainfile/alab-system/public/images`. Existing filenames will be preserved to avoid unnecessary asset changes.

## Data and Navigation Flow

- Starting the Next.js app and opening `/` renders the landing page.
- Selecting a login or portal action routes to `/login`.
- Selecting a back, logo, or home action on the login page routes to `/`.
- In-page landing navigation continues to use section anchors.
- The login form remains a front-end demonstration and routes to `/` after submission.

## Error Handling

No external API or backend is introduced. Interactive scripts will guard optional DOM-dependent behavior through React lifecycle cleanup and null-safe logic. Image dimensions and alt text will be retained or declared explicitly so assets render consistently.

## Verification

- Run ESLint and resolve migration errors.
- Run the Next.js production build and require a successful result.
- Confirm `/` and `/login` are generated successfully.
- Compare the converted pages with the original HTML at desktop and mobile viewport sizes.
- Verify navigation, mobile menu, scroll behavior, reveal effects, password visibility, form submission, and all image paths.

## Out of Scope

- Visual redesign or copy changes.
- Authentication backend, database, or user registration.
- Image editing or optimization that changes appearance.
- New features beyond the behavior already present in the two HTML files.
