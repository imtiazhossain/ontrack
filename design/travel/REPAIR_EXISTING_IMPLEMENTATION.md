# Cursor Prompt — Replace the Existing Travel Home UI Cleanly

The current Travel home implementation is visually incorrect and must be **replaced at the presentation/layout layer**, not incrementally patched on top of the existing UI.

The goal is to preserve working product behavior and data contracts while rebuilding the visible Travel home screen so there are **no lingering legacy layout decisions, obsolete controls, old styles, duplicate components, or hidden remnants** affecting the final result.

## Read before editing
Read these files in this order:
1. `CLEAN_REBUILD_PLAN.md`
2. `STRICT_VISUAL_SPEC.md`
3. `references/travel-home-reference.png`
4. `references/current-implementation/bad-current-implementation.png`
5. `TRAVEL_DESIGN_SPEC.md`
6. `COMPONENT_SPECS.md`
7. `IMAGE_SYSTEM.md`
8. `RESPONSIVE_BEHAVIOR.md`
9. `platform/CROSS_PLATFORM_MAPPING.md`
10. `testing/QA_CHECKLIST_V2.md`

## Mandatory implementation strategy

### Preserve
Preserve existing code only where it is still valid and useful for:
- navigation/routes
- trip data models
- backend/API integration
- state management
- image-provider integration that satisfies `IMAGE_SYSTEM.md`
- analytics
- permissions
- test infrastructure
- shared design-system primitives that can exactly satisfy this specification

### Replace
Replace the current Travel home **visual implementation** rather than layering fixes over it. Rebuild the screen hierarchy and relevant Travel-specific presentation components from the canonical component contract.

Do not retain a legacy view simply because it already renders. If an existing Travel-specific component conflicts with the new hierarchy, replace or refactor it.

### Remove
Before declaring completion, remove all obsolete Travel-home artifacts that are no longer part of the approved design, including:
- old hero containers and hero spacing rules
- old blurred-background implementations that create the oversized header
- old trip-card layout wrappers
- obsolete card-height/image-height constants
- old `3 Trips` solid-pill implementation
- old `DATES` footer treatment
- old oversized itinerary CTA layout
- unexplained floating up-arrow control
- duplicate edit/add buttons
- unused Travel-specific icons
- obsolete image overlays/gradients
- stale StyleSheet/style objects, Tailwind classes, theme values, CSS, or platform overrides that only supported the old screen
- dead props and state introduced for the previous layout
- unused imports and dead components
- legacy feature flags that select the old Travel-home presentation, unless they are intentionally required by the product

Do not hide legacy UI with `display: none`, zero opacity, off-screen positioning, conditional false branches, or commented code. Delete it when it is obsolete.

Do not keep both the old and new Travel home screen implementations in production code unless the repository has an explicit, intentional migration architecture requiring both.

## No patch stacking
Do **not** solve the mismatch by piling new margins, transforms, negative offsets, absolute-position overrides, or one-off platform exceptions on top of the old layout.

If the existing structure makes the reference difficult to reproduce cleanly, replace the structure.

There should be one clear source for each final spacing value, size, radius, typography role, icon, and state.

## Known defects in the current implementation
Fix all of these by replacing the responsible implementation, not merely masking symptoms:

- The hero is too tall and too blurred; it wastes vertical space.
- `Travel` is too large relative to the reference.
- The `Your Trips` count is rendered as a solid navy `3 Trips` pill; the target is a separate light capsule with a blue circular count.
- The first trip card is much too tall.
- The destination image uses a tall crop; target is a wide landscape crop.
- The white content section is too tall and vertically loose.
- The footer layout is wrong: the date wraps over multiple lines.
- `DATES` + large calendar treatment does not match the target; restore `Trip Dates` with the day-count pill inline.
- `View Itinerary` is too large and causes the date area to collapse.
- The member/avatar treatment is incorrect and too sparse/awkward.
- The first card consumes so much viewport height that the second trip is barely visible.
- Remove the unexplained floating up-arrow control between cards.
- The page currently looks like a reinterpretation rather than the approved design.
- Reject watermarked Unsplash preview imagery; do not ship watermarked images.

## Clean rebuild sequence

1. Locate every production file that participates in the current Travel home screen.
2. Identify which pieces are business/data logic versus presentation/layout logic.
3. Preserve valid business/data logic.
4. Remove or replace legacy Travel-home presentation code that conflicts with the new design.
5. Build the canonical hierarchy from `COMPONENT_SPECS.md`.
6. Wire it back to the preserved navigation/data/state contracts.
7. Search the repository for legacy Travel-home constants, component names, styles, icons, and controls and remove unused remnants.
8. Run typecheck/lint/tests.
9. Launch on iOS and capture the canonical fixture screenshot.
10. Compare against `references/travel-home-reference.png`.
11. Iterate until the composition is close.
12. Launch on Android and repeat, making only platform-correct inset/font/elevation adjustments—not a separate redesign.
13. Verify the empty, one-trip, multiple-trip, loading, error, and dark-mode states.
14. Perform the cleanup audit in `CLEAN_REBUILD_PLAN.md` before finishing.

## Visual geometry
Use width-proportional geometry anchored to the canonical 863×1822 reference. Do not pick arbitrary pt/dp values independently for iOS and Android.

The screen must preserve the same composition on both platforms while allowing small native font-metric, safe-area, and elevation adjustments.

## Completion rule
Compilation is not completion.

The work is complete only when:
- the new visual hierarchy is the active Travel home implementation;
- the old visible implementation cannot still be reached accidentally;
- obsolete Travel-home presentation code has been removed;
- there are no unexplained legacy controls/styles left behind;
- visual-regression comparison has been performed;
- both iOS and Android have been checked.

When finished, report only:
- `It’s fixed.`
- any environment/API key requirement that blocks clean destination images.
