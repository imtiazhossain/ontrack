# Travel Home Visual QA Checklist V2

A build fails visual acceptance if any checked item is false.

## Composition
- [ ] Hero occupies no more than roughly the top third of the initial viewport.
- [ ] First trip card is fully visible on initial load.
- [ ] Significant portion of second trip is visible.
- [ ] No unexplained floating controls between trip cards.

## Header
- [ ] `Travel` visually matches reference scale.
- [ ] Subtitle is compact and aligned.
- [ ] Add button matches reference scale and placement.
- [ ] Hero destination image is visibly recognizable, not over-blurred.

## Trips header
- [ ] `Your Trips` is plain text.
- [ ] Count is separate light capsule with blue circular number + `Trips`.
- [ ] No solid navy `3 Trips` pill.

## Card
- [ ] Card is landscape-oriented and compact.
- [ ] Image height matches target proportion.
- [ ] Edit button floats over image upper-right.
- [ ] Destination title/location/member stack fit in compact header zone.
- [ ] Divider present.

## Footer
- [ ] `Trip Dates` text present.
- [ ] `7 Days`/`6 Days` pill is inline with `Trip Dates`.
- [ ] Date is one line at standard phone width.
- [ ] `View Itinerary` does not force date wrapping.
- [ ] Custom itinerary-route asset is used.

## Cross-platform
- [ ] iOS safe areas correct.
- [ ] Android status/navigation insets correct.
- [ ] Visual hierarchy remains the same on both platforms.
- [ ] Tap targets meet 44pt iOS / 48dp Android minimums without visually inflating controls.

## Images
- [ ] No watermarks.
- [ ] No hardcoded production destination URLs.
- [ ] Up to 3 images per trip work.
- [ ] Carousel indicator works.
- [ ] Hero synchronizes with first visible trip.
