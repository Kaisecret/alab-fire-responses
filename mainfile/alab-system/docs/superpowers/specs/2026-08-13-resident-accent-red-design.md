# Resident Accent Red Design

## Goal

Use `#DB1B0D` as the resident-side dark-red accent wherever the resident interface currently uses `#B8150C`.

## Scope

- Replace only the exact `#B8150C` / `#b8150c` color values in resident-side source files.
- Keep layout, typography, spacing, content, routes, interactions, and all other colors unchanged.
- Do not change login, signup, landing, municipal, or database code.

## Verification

- A focused automated test checks that resident source no longer contains `#B8150C` and contains `#DB1B0D`.
- Run the complete test suite and production build.
