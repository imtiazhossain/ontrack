# Travel Home — Canonical Design Specification

## Authority
This file is the source of truth for the Travel home screen. Do not redesign, reinterpret, simplify, or substitute specified assets. The screenshots are visual references, not measurement sources.

## Platforms
The feature must ship on **iOS and Android** with the same information architecture and visual identity while respecting platform-safe areas, native text rendering, accessibility, back behavior, and performance conventions. Use one shared component contract where the codebase permits it.

## Screen composition

```text
TravelHomeScreen
├── TravelHero
│   ├── TravelTitle
│   ├── TravelTagline
│   ├── TravelRouteMotif
│   └── AddTripButton
├── TripsSectionHeader
│   ├── SectionTitle
│   └── TripCountBadge
└── TripCardList
    └── TripCard
        ├── DestinationImageCarousel
        │   ├── DestinationImage
        │   ├── CarouselIndicator
        │   └── EditTripButton
        └── TripCardContent
            ├── DestinationHeader
            │   ├── DestinationName
            │   ├── Location
            │   └── MemberStack
            ├── Divider
            └── TripCardFooter
                ├── TripDates
                ├── DurationBadge
                └── ViewItineraryButton
```

## Layout tokens
- Screen horizontal padding: **20 dp/pt**
- Hero minimum visual height: **408**
- Section gap: **24**
- Trip-card gap: **18**
- Trip-card radius: **28**
- Trip image height: **230** at baseline phone width
- Card content padding: **20**
- Edit button: **56×56**, image inset **16**
- Avatar: **48×48**, overlap **12**, 2pt/dp surface border
- Itinerary button: **58 high**, radius **17**, icon **26**
- Minimum interactive target: iOS **44×44 pt**, Android **48×48 dp**

Use the token files rather than duplicating these values in components.

## Typography
Use the app's existing font system first. When explicit platform mapping is needed:
- Display serif: iOS `New York` when available; Android `Noto Serif`/approved bundled equivalent.
- UI sans: iOS system (`SF Pro`); Android system (`Roboto`).
- Do not download fonts at runtime.
- Do not ship private/system font files.

Roles are defined in `tokens/typography.ts`. Preserve hierarchy even if font metrics require tiny platform-specific line-height adjustments.

## Hero
- Large `Travel` title, upper left.
- Subtitle `Plan. Explore. Remember.` directly below.
- Floating add action in upper-right safe area.
- Decorative motif uses `assets/icons/travel-route.svg`: fine dashed trail + recognizable top-down airplane (Material `flight` path), light-theme color `motifTan`. Verify with `GLYPH_MATCHING.md` — never ship an abstract blob or location-pin substitute.
- Background image is dynamically derived from the **first visible trip card** and its selected carousel image.
- Blend hero imagery into the page with a soft surface fade; no hard cut line.

## Trips section
- Heading: `Your Trips`.
- Count pill displays total trips, e.g. `3 Trips`.
- Do not show the count pill when count is 0 unless product logic specifically requires it.

## Trip card
- One continuous elevated surface composed of image + content.
- Image has no text baked in.
- Destination content slightly overlaps/blends with image area visually, but layout must remain deterministic and accessible.
- Destination name is primary. Location is secondary.
- Member stack appears on the same information row when space allows; on narrow widths it may move below the location according to `RESPONSIVE_BEHAVIOR.md`.
- Footer keeps dates, day-count pill, and itinerary action visually grouped.

## View Itinerary action
Use the supplied asset exactly:
`assets/icons/itinerary-route.svg`

Do not replace it with an airplane, a generic pin, a Lucide approximation, SF Symbol approximation, Material icon approximation, emoji, or text glyph.

Label: **View Itinerary**
Trailing chevron: use supplied `chevron-right.svg` or the app's canonical chevron if visually identical.

## Image carousel
- Maximum images: **3**
- Minimum: **1**
- Horizontal paging with one image snapped per page
- Autoplay: **off**
- Indicator: bottom-center overlay
- Active dot: **7**
- Inactive dot: **5**
- Gap: **6**
- Bottom inset: **12**
- Changing a trip card's active image updates the hero if that trip is the first visible/selected trip.
- Hero image crossfade: **350ms**. Disable or simplify under Reduce Motion.

## Data states
Must support:
1. Loading trips
2. Multiple trips
3. One trip
4. Zero trips
5. Image loading
6. Image unavailable
7. Offline/cache-only
8. No participants
9. Many participants
10. Long destination names
11. Large accessibility text
12. Dark mode
13. Reduced motion

## Empty state
Title: `Your next adventure starts here.`
Supporting copy: `Add a trip to organize your itinerary, stays, activities, friends, and memories.`
Primary action: `Add Your First Trip`
Use the supplied destination placeholder or an app-approved travel illustration. Do not reserve blank card space when no trips exist.

## Dark mode
Do not invert photographs. Use semantic surfaces/text and an image scrim where needed for contrast. Keep the brand navy/blue identity but use the app's semantic dark-mode palette if already defined.

## Press and motion
- Buttons: native-feeling press feedback; no layout shift.
- Cards may have subtle scale/opacity feedback only if consistent with the app-wide design system.
- Haptics are optional and should use the app's shared haptic utility.

## Non-negotiable implementation rules
- No hardcoded Iceland/Guatemala image URLs in production components.
- No per-screen duplicate button primitives if a shared `Button` exists.
- No asset substitution when an asset is supplied.
- No absolute positioning for primary text/layout except deliberate decorative overlays.
- No clipping under Dynamic Island/notches/status bars/navigation bars.
- No iOS-only APIs in shared business logic.
- No Android back behavior regressions.
- No magic spacing values when a token exists.
