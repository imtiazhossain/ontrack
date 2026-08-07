# Travel UI Implementation Kit V3 — Clean Replacement Edition

V3 is designed specifically to repair an already-implemented Travel screen without allowing old UI decisions to linger.

## What changed in V3
The repair workflow now explicitly requires Cursor to:
- preserve valid data/navigation/business logic;
- replace or refactor the existing Travel-home presentation layer;
- remove obsolete legacy components/styles/assets/controls;
- avoid hiding or patch-stacking over the old UI;
- verify no stale navigation path/feature flag can still render the old presentation;
- perform a repository cleanup audit after the visual rebuild;
- validate both iOS and Android.

## Use this prompt now
For the existing incorrect implementation, paste the contents of:
`REPAIR_EXISTING_IMPLEMENTATION.md`
into Cursor.

That prompt will tell Cursor to read `CLEAN_REBUILD_PLAN.md` first and rebuild the presentation cleanly.

## Visual truth
Primary reference: `references/travel-home-reference.png`
Bad example to avoid: `references/current-implementation/bad-current-implementation.png`

## Required visual workflow
Implementation is not complete at compile-time. Capture simulator/emulator screenshots and compare with:

`python design/travel/tools/compare_travel_reference.py <current-screenshot.png>`

Iterate on iOS, then Android.

## Key rule
Do not preserve the old Travel-home visual implementation merely because it already exists. Preserve useful behavior; replace incorrect presentation.
