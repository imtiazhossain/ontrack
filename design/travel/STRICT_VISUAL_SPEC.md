# Travel Home — Strict Visual Specification (V2)

This file overrides any conflicting visual/layout guidance in V1 files.

## Baseline reference
Primary reference image:
`references/travel-home-reference.png`

Reference canvas: **863 × 1822 px**.
Treat this as the canonical visual composition. Layout must scale proportionally to the actual device width while respecting safe areas. Do not scale fonts and controls independently in a way that changes the composition.

## Critical rule
The previous implementation drifted because the spec gave component-level values but did not sufficiently constrain the **whole-screen composition**. The screenshot itself is now a final acceptance authority together with these values.

Implementation priority for visual decisions:
1. This file
2. `references/travel-home-reference.png`
3. supplied assets
4. shared app primitives
5. platform conventions

If a shared primitive cannot visually match the reference within tolerance, extend it with a reusable variant rather than accepting the mismatch.

## Canonical width scaling
All measurements below are based on 863px reference width. Use:

`scale = availableContentWidth / 863`

For native layouts, convert the measured reference proportions to pt/dp using screen width. Avoid literal 863-based px in production code; store normalized ratios/tokens.

## Whole-screen vertical composition
At baseline reference proportions:
- Header/status + hero occupies roughly the top **31–33%** of the screen.
- `Your Trips` sits immediately above the first card with only a modest gap.
- First trip card occupies roughly **33%** of screen height, not ~50%.
- Second card must be meaningfully visible on initial load, not reduced to a sliver.
- The initial viewport should show: full first card + substantial upper portion of second card.

The implementation screenshot in `references/current-implementation/bad-current-implementation.png` is explicitly **not** acceptable and must not be used as a styling source.

## Header / hero
- `Travel` must not dominate the screen. Target visual height: about **88–96 px** in the 863px reference.
- Title left edge aligns with trip cards and `Your Trips`.
- Subtitle is compact and close to title; do not create a large title/subtitle block.
- Add button diameter: about **88–94 px** at reference scale, not oversized.
- Travel motif remains secondary and decorative.
- Background must be a recognizable destination scene, not a heavily blurred generic wash.
- Apply only enough blur/scrim to preserve text contrast; the scene should remain visually legible.

## Trips section header
- `Your Trips` and the count indicator are **not one combined blue pill**.
- `Your Trips` is plain dark serif text.
- Count control is a separate small light/white capsule toward the right, containing a blue circular `3` and `Trips` text.
- Do not render `3 Trips` as a solid navy pill.
- Section header should remain compact.

## Trip card outer geometry
Reference target at 863px width:
- Horizontal card margin: ~**52–56 px** each side.
- Card width: ~**750–760 px**.
- Outer radius: ~**32 px**.
- First card begins around y ≈ **600–620 px** in the baseline image.
- First card total height: ~**595–620 px**, not 850+ px.

Use width-relative sizing. The card should read as a wide landscape card, not a tall portrait card.

## Destination image
- Image area height: ~**300–320 px** at reference scale.
- Aspect should feel approximately **2.35–2.5:1** inside the card.
- Do not use a tall 4:3/portrait-like crop.
- `resizeMode/contentMode = cover`.
- Keep focal point near destination landmark when metadata exists.
- Carousel indicator sits near the bottom center of the image.

## Edit button
- Floating over image, upper right.
- Diameter: ~**72–78 px** at reference scale.
- It must not overlap card content.
- Subtle shadow only.

## Trip content
- White content panel starts immediately under image and visually merges into the same card.
- Content panel should be compact: ~**260–285 px** tall at reference scale.
- Destination name must fit on one line for `Iceland` and should not consume excessive vertical space.
- Location sits directly below destination name.
- Member stack is aligned with destination header area on the right, not pushed into footer.

## Avatars
- Avatar diameter: ~**48–54 px** reference scale.
- Overlap: ~**10–14 px**.
- `+N` is a light circular count item, not a text badge with arbitrary initials unless real avatar data is unavailable.
- If using initials fallback, style it consistently with the circular avatar system and do not let it visually overpower photo avatars.

## Divider
- One subtle horizontal divider between destination header block and footer.
- Keep margins consistent with content padding.

## Footer layout — non-negotiable
Footer must be **one horizontal row** on standard phone widths similar to the reference.

Left cluster:
- label `Trip Dates`
- `7 Days` light-blue pill inline with label
- date below, one line: `Sep 8 – Sep 14, 2026`

Right cluster:
- `View Itinerary` button

Do **not**:
- use uppercase `DATES` as the primary label
- place a large calendar icon as a separate column
- wrap `Sep 8 – Sep 14, 2026` onto multiple lines on normal phone widths
- make the itinerary button so wide/tall that it forces the date to wrap

## View Itinerary button
- Reference width: ~**255–275 px** at 863px canvas.
- Reference height: ~**70–76 px**.
- Deep navy background.
- Supplied custom `itinerary-route.svg` leading icon.
- White label.
- No mandatory trailing chevron for the V2 target unless the final approved reference shows one. If present, keep it small and subtle.
- Button must feel secondary to the destination title; it cannot dominate half the card.

## Typography hierarchy
Use the app's actual available font stack, but size to match the reference rather than blindly using platform defaults.

Approximate reference pixel heights at 863px canvas:
- `Travel`: 82–94 px visual cap-height range
- `Your Trips`: 42–50 px
- destination title `Iceland`: 52–62 px
- location: 25–31 px
- footer date: 27–32 px
- itinerary button label: 24–30 px

Translate these into responsive native font sizes using width scale. Do not use a font size so large that date strings wrap at the canonical width.

## Scroll position / initial viewport
On first render at the canonical iPhone-like viewport:
- first trip card fully visible
- second trip image and at least part of its content should be visible
- no arbitrary floating up-arrow control between cards
- no extra spacer that creates large blank gaps

## Images
- Do not use watermarked images in production.
- If a provider returns watermarked or branded previews, reject those results.
- Production image service must return clean image assets permitted for app use.
- Development fixtures may use local reference assets only for visual validation.

## Visual tolerance
At canonical screenshot comparison:
- major element x/y placement: ±6 px
- card width/height: ±8 px
- image height: ±8 px
- button size: ±6 px
- typography size: ±2 px equivalent
- radii: ±3 px

A visually obvious composition mismatch fails even if individual tokens are technically within tolerance.

## Required iterative loop
The coding agent must not stop after one implementation pass.

1. Build the screen.
2. Run the app on the target iOS simulator.
3. Capture a screenshot at the same logical screen size as the reference where possible.
4. Run `tools/compare_travel_reference.py` against the screenshot.
5. Inspect the overlay/diff.
6. Fix the largest visual mismatches first.
7. Repeat until the layout closely matches.
8. Repeat on Android and resolve platform-specific drift without changing the shared visual contract.

If automated screenshot capture is unavailable, the agent must still use the reference side-by-side and explicitly verify every item in `testing/QA_CHECKLIST_V2.md` before stopping.
