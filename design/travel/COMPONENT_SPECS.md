# Component Specifications

## `TravelHomeScreen`
Responsibilities: safe-area layout, trip data orchestration, first-visible-trip tracking, hero image coordination, empty/loading/error states. Must not own destination-image provider logic directly.

## `TravelHero`
Props: `image`, `title`, `subtitle`, `tripCount`, `onAddTrip`, `reduceMotion`. The background should use cover/center-crop with a configurable focal point returned by the image service when available.

## `TripCard`
Recommended props:
```ts
type TripCardProps = {
  trip: TripSummary;
  activeImageIndex: number;
  onImageIndexChange(index: number): void;
  onEdit(): void;
  onViewItinerary(): void;
  onMemberPress?(memberId: string): void;
};
```

## `DestinationImageCarousel`
Input: 1–3 normalized `TripImage` objects. Must prefetch the next image, render a placeholder during decode/network fetch, and preserve card height during state changes.

## `MemberStack`
- Avatar size 48.
- Show as many real avatars as fit the layout contract; default mock target is 2–3.
- Remaining count uses `+N` chip/avatar.
- If no avatars are available, do not render empty circles.
- Each avatar requires accessible name.

## `TripDates`
Format with the user's locale, but fixture/reference comparison may force the English reference strings. Date math, including day count, should come from domain logic rather than display-string parsing.

## `ViewItineraryButton`
- Shared button semantics.
- Height 58 baseline.
- Leading `itinerary-route.svg`.
- Label `View Itinerary`.
- Trailing chevron.
- Accessible role/button semantics and label.
- Press target meets both platform minimums.

## Ownership boundary
Presentation components receive normalized view-model data. Network/provider SDK calls belong in services/repositories, never inside card render functions.
