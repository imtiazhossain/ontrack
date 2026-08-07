# Dynamic Destination Image System

## Goal
Trip photography must adapt to the destination. Each trip can have **up to 3 relevant images**. The first visible trip controls the page hero background.

## Provider architecture
Create a provider-neutral interface so image vendors can change without rewriting UI:

```ts
export interface DestinationImageProvider {
  search(input: {
    destination: string;
    country?: string;
    maxResults: 3;
    orientation: 'landscape';
  }): Promise<DestinationImageResult[]>;
}
```

Never hardcode a vendor into `TripCard`. Use the application's network/service layer and environment-based API configuration.

## Search strategy
1. Exact city + country + `travel landscape`
2. Destination + landmark/context keywords from trip metadata if available
3. Country/region + `travel landscape` fallback
4. Local `destination-placeholder.svg`

## Result filtering
Prefer:
- Landscape orientation
- Minimum useful source width around 1200px
- Strong destination relevance
- No watermarks
- No text-heavy promotional graphics
- Safe general-audience imagery

## Caching
Cache normalized image metadata and URLs keyed by destination identity. Respect provider licensing and cache rules. Store only what the provider permits. Avoid repeat searches on every render.

## Prefetching
- Prefetch first image for visible trip cards.
- Prefetch next carousel image after first image loads.
- First visible trip hero image receives highest priority.

## Failure behavior
Never collapse image height. Fade from placeholder to real image. If network/provider fails, use cached results; otherwise use local placeholder.

## Hero coordination
`TravelHomeScreen` owns the first-visible-trip ID and active image index. Hero consumes the same normalized image object. Crossfade only the image layer, not the whole header.

## Attribution
If the selected provider requires attribution, add a compliant attribution surface without contaminating the destination image asset itself.
