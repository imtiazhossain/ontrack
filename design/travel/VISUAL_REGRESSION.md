# Visual Regression & Acceptance

## Canonical fixtures
Create deterministic screenshot scenarios:
- `travel-home-two-trips`
- `travel-home-one-trip`
- `travel-home-empty`
- `travel-home-dark`
- `travel-home-long-destination`
- `travel-home-image-loading`

Use `fixtures/travel-home.fixture.json` and local test images/placeholders for deterministic CI. Do not make live image-provider calls during visual tests.

## Reference
Primary visual reference: `references/travel-home-reference.png`.

## Tolerances
When using a pixel-aware comparison tool, start with:
- Position/dimensions: ±3 logical px
- Radius: ±2
- Spacing: ±3
- Typography token size: exact
- Color token: exact; allow platform anti-aliasing differences in screenshot diff threshold

## Required manual checks
- iOS light + dark
- Android light + dark
- Small phone width
- Large font size
- 0 / 1 / many trips
- 1 / 3 destination images
- Offline fallback

## Recommended tooling
Use the test stack already present in the repo. If absent: Maestro is a good cross-platform black-box option; native screenshot testing is acceptable; Detox/Appium are also valid if already part of the project. Do not add a heavyweight framework solely for this screen without checking existing architecture.
