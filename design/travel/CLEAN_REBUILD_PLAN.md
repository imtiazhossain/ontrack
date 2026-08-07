# Clean Rebuild Plan — Prevent Legacy Travel UI From Lingering

This document is mandatory when repairing an existing Travel home implementation.

## Objective
Rebuild the Travel home presentation cleanly while preserving valid application behavior. The final codebase must not contain an old Travel-home UI hidden underneath or alongside the approved implementation.

## 1. Inventory before editing
Search the repository for all files that contribute to the Travel home screen. Include:
- screen/routes
- Travel/Trip cards
- hero components
- itinerary buttons
- image carousels
- edit/add controls
- trip-count UI
- Travel-specific styles/tokens
- old icons/assets
- platform-specific Travel overrides
- feature flags

Create an internal working inventory. Do not output it unless asked.

## 2. Classify each piece
For every existing piece, classify it as one of:

**KEEP** — business/data/navigation code that is compatible with the new implementation.

**REFACTOR** — reusable code whose API is useful but whose rendering/style must change.

**REPLACE** — presentation code whose structure conflicts with the approved design.

**DELETE** — obsolete code/assets/styles/controls that are no longer used.

Default Travel-specific presentation code to REPLACE when it conflicts with the canonical component hierarchy.

## 3. Single-source rule
After the rebuild, there must be only one active source of truth for:
- Travel hero dimensions
- card dimensions
- image aspect/crop behavior
- card spacing
- footer layout
- itinerary button geometry
- trip-count treatment
- avatar stack geometry
- Travel typography roles
- Travel signature icons

Do not leave competing old constants or styles in the repository.

## 4. Forbidden migration shortcuts
Do not:
- hide the old screen behind opacity/visibility styles
- leave old JSX/SwiftUI/Compose views commented out
- maintain duplicated old/new Travel cards without an intentional architecture
- add large negative margins to compensate for old layout
- use transforms to visually force old components into place
- add platform-specific hacks that reproduce the reference accidentally
- keep unused legacy assets "just in case"

## 5. Preservation boundaries
Do not unnecessarily rewrite stable backend/data/navigation code. The rebuild is visual and architectural at the screen/component layer, not an excuse to churn unrelated systems.

## 6. Post-build repository cleanup
After the new screen is working, search for:
- names of removed Travel components
- previous icon filenames
- old trip-count styles
- `DATES` label implementation
- old hero blur constants
- old card height constants
- floating up-arrow component
- old image-overlay code
- unused imports
- dead props
- stale test IDs

Delete or update all obsolete references.

## 7. Runtime verification
Verify that no navigation path, deep link, feature flag, or conditional can still display the old Travel-home screen unintentionally.

## 8. Platform verification
The same rebuilt hierarchy must drive both iOS and Android wherever the app architecture allows shared code. Platform differences should be limited to native requirements such as:
- safe-area/window insets
- font metric compensation
- elevation/shadow implementation
- haptic API
- system-back handling
- accessibility APIs

Do not maintain a visually divergent iOS screen and Android screen.

## 9. Final cleanup checklist
Before completion, all must be true:
- [ ] New Travel home is the only active visual implementation.
- [ ] Old hero presentation removed.
- [ ] Old trip-card presentation removed or fully refactored.
- [ ] Old trip-count pill removed.
- [ ] Old `DATES` footer removed.
- [ ] Floating up-arrow removed.
- [ ] Obsolete Travel-specific styling removed.
- [ ] Obsolete Travel-specific assets removed.
- [ ] No hidden old UI remains.
- [ ] No duplicate source-of-truth constants remain.
- [ ] No dead imports/props/state remain from the previous screen.
- [ ] iOS visual check passed.
- [ ] Android visual check passed.
- [ ] Empty/one/many-trip states passed.
- [ ] Visual comparison performed against canonical reference.
