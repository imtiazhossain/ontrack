# Cursor Implementation / Replacement Prompt

Paste the following into Cursor after placing this folder at `/design/travel/`:

---

Replace the existing Travel home **presentation implementation** with the approved design using `/design/travel/` as the authoritative implementation kit.

This is not an incremental styling pass. The current Travel-home visual structure is known to be wrong. Preserve valid navigation, trip data, API/state logic, analytics, and reusable shared primitives, but **rebuild/refactor the Travel-home presentation layer and remove obsolete legacy UI so nothing from the previous visual implementation lingers or continues to influence layout.**

Before modifying code, read in this order:
1. `/design/travel/CLEAN_REBUILD_PLAN.md`
2. `/design/travel/STRICT_VISUAL_SPEC.md`
3. `/design/travel/TRAVEL_DESIGN_SPEC.md`
4. `/design/travel/COMPONENT_SPECS.md`
5. `/design/travel/IMAGE_SYSTEM.md`
6. `/design/travel/RESPONSIVE_BEHAVIOR.md`
7. `/design/travel/ACCESSIBILITY.md`
8. `/design/travel/platform/CROSS_PLATFORM_MAPPING.md`
9. relevant iOS/Android platform notes
10. `/design/travel/VISUAL_REGRESSION.md`
11. `/design/travel/design-manifest.json`
12. `/design/travel/testing/QA_CHECKLIST_V2.md`

Then inspect the existing repository and identify all files that participate in the current Travel home screen. Separate business/data/navigation logic from presentation code. Keep valid business logic. Replace/refactor visual code that conflicts with the specification. Delete obsolete Travel-specific components, styles, constants, controls, icons, hidden legacy views, dead props/state, and unused imports.

Do not leave the old Travel home implementation hidden, commented out, disabled with CSS/styles, moved off-screen, or reachable via a stale feature flag. Do not stack patches, negative margins, transforms, or ad-hoc platform overrides on the old layout just to approximate the reference.

There must be one clear active Travel-home hierarchy matching `COMPONENT_SPECS.md` and one source of truth for its geometry/tokens.

Reuse established shared application primitives only when they can satisfy the approved design cleanly. Do not create duplicate global Button/Card/IconButton/Header primitives. If a shared primitive needs a reusable variant to achieve the approved design, extend it cleanly rather than accepting a mismatch.

The written specification and supplied assets are authoritative. Use `/design/travel/references/travel-home-reference.png` as the final visual authority. Do not replace supplied signature assets with icon-library approximations. In particular, `View Itinerary` must use `/design/travel/assets/icons/itinerary-route.svg`.

Implement both iOS and Android. Keep one shared component/data contract where the repository architecture permits it, while handling safe areas/window insets, shadows/elevation, font metrics, accessibility, Android system back, and platform image behavior correctly. Do not make Android a separate redesign.

Implement the dynamic destination image architecture in `IMAGE_SYSTEM.md`: up to 3 destination-relevant images per trip, provider-neutral service abstraction, caching/prefetching, placeholder/failure behavior, card carousel indicator, and hero background synchronized to the first visible trip and its selected image. Do not make provider calls directly from render components. Do not hardcode Iceland or Guatemala production image URLs. Reject watermarked preview imagery.

Implement all required states including zero trips, one trip, multiple trips, loading/error images, long destinations, participant variants, dark mode, reduced motion, and accessibility scaling.

Add deterministic development fixtures/component-preview states so the UI can be inspected without a live backend/image provider. Add or reuse visual-regression coverage.

After implementation, perform the cleanup audit in `/design/travel/CLEAN_REBUILD_PLAN.md`. Search the repository for old Travel-home presentation artifacts and remove anything obsolete.

Do not stop after the code compiles. Launch the canonical fixture on iOS, capture a screenshot, compare it with the reference, and iterate. Then repeat on Android. Use `/design/travel/tools/compare_travel_reference.py` when practical.

The work is not complete until the old visual implementation is gone, the new implementation is the only active Travel-home presentation, both platforms are checked, and the visual composition closely matches the approved reference.

When finished, report only `It’s fixed.` plus any environment/API-key requirement that prevents non-watermarked dynamic destination imagery.

---
