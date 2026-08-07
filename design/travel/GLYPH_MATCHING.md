# Travel micro-glyph matching

How to get signature Travel icons (header flight motif, itinerary mark, etc.)
**exactly right** — and keep them from drifting into unreadable blobs.

## Hard rule

Tiny glyphs are **not** trustworthy from screenshot vision alone (ship size
~16–28pt). Always prove the silhouette at **large render** before shipping.

## Method (header flight motif)

1. **Crop the mock** — isolate the motif at 4–6× from the approved reference /
   user crop (plane + trail only; drop the FAB and title).
2. **Sample color** from mid-tone plane pixels (not sky, not anti-alias edge).
   Plane + trail always use token `motifTan` (`#D0AE6E`) in light **and**
   dark — never `theme.textSecondary` (reads gray on dark chrome).
3. **Compose vector**
   - Trail: separate stroked path, short dashes (`1.4 2.5`), thin (~1.15).
   - Plane: solid fill. Prefer a **known-good platform silhouette** over
     freehand blobs.
   - Canonical plane path: Material Symbols `flight`
     (`M21 16v-2l-8-5V3.5…`). Kit SVG:
     `translate(20 16) rotate(-62) scale(1.15) translate(-12 -12)`.
     RN: `TRAVEL_HOME_PLANE_ROTATION_DEG` + nested `<G>` scale (avoid one
     long transform string — RN can disagree with qlmanage). Nose = **WNW /
     close to west** (~-62° from north; 0=N, -90=W).
   - Layout: plane on the **left** (beside Travel), dashed trail from the
     **mid-tail** (midpoint between both horizontal stabilizer tips)
     sweeping **right** toward add (+), with a small gap (not touching).
     Recompute mid-tail via `travelHomePlaneTailMidVb()` whenever rotation
     changes; never hard-code a single tip.
4. **Large-render gate** (mandatory)

   ```bash
   qlmanage -t -s 600 -o /tmp design/travel/assets/icons/travel-route.svg
   open /tmp/travel-route.svg.png
   ```

   Pass only if you can clearly name: **fuselage, wings, tail stabilizers**,
   nose pointing ~NE, trail meeting the **tail** (not crossing a blob).
5. **Side-by-side** the large render with the mock crop. Reject abstract
   crosses / K-shapes / pin replacements.
6. **Sync both copies** of the SVG:
   - `design/travel/assets/icons/travel-route.svg` (kit source of truth)
   - `assets/images/travel/icons/travel-route.svg` (bundled mirror)
   - RN implementation: `TravelHomeRouteMotif` in
     `src/features/travel/travel-home-icons.tsx` (paths must match the SVG).
7. **Ship-size check** on device (`travel-home` flow). Assert route/ids; one
   screenshot only if you need a visual claim. Do **not** loop
   screenshot→vision for orientation micro-tweaks.

## What failed before (do not revive)

| Attempt | Why it failed |
|---|---|
| Freehand “plane” paths in early `travel-route.svg` | At large render: abstract cross / blob — not fuselage+wings+tail |
| Navy location pin + trail | Wrong metaphor vs user flight mock |
| Trusting ship-size screenshots alone | Compression + anti-alias hides whether it reads as a plane |

## Acceptance checklist

- [ ] Large render (≥600px wide) reads as an airplane without squinting
- [ ] Trail is fine dashed gold/tan; plane is solid same family color
- [ ] Plane nose ~NE; trail approaches the tail
- [ ] Kit SVG, bundled SVG, and `TravelHomeRouteMotif` paths match
- [ ] Plane + trail use `motifTan` in light and dark (no trail-only opacity)
- [ ] Dual iOS/Android verify on `/travel` still passes

## Related

- Asset catalog: `assets/ASSET_CATALOG.md`
- App plane orientation note: `src/components/primitives/symbol.tsx`
- Compare full-screen Travel home: `tools/compare_travel_reference.py`
