# Resident SOS spacing design

## Goal

On mobile, present the resident welcome card first and place the large SOS / Report Fire button below it without visual overlap.

## Approved layout

- Keep the shared red mobile header above all home content.
- Keep the welcome card in its normal document position.
- Move the SOS area below the card with a `1.5rem` top gap.
- Preserve the SOS button's direct link to `/resident/report-fire`.
- Preserve horizontal overflow protection for the home screen.

## Verification

The resident mobile-home test will assert the new SOS margin and stacking order, then the project build will be run.
