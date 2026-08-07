# Asset Catalog

| Asset | Purpose | Rule |
|---|---|---|
| `icons/itinerary-route.svg` | Signature View Itinerary mark | Must use exactly |
| `icons/travel-route.svg` | Header flight motif (dashed trail + Material `flight` plane, gold/`motifTan`) | Must match kit + `TravelHomeRouteMotif`; verify with `GLYPH_MATCHING.md` / `tools/render_motif_check.py` |
| `icons/location-pin.svg` | Location metadata | May use app-native equivalent only if visually identical |
| `icons/edit.svg` | Edit trip | May use shared app equivalent if canonical |
| `icons/calendar.svg` | Trip dates | May use shared app equivalent if canonical |
| `icons/add.svg` | Add trip | Shared app/native equivalent acceptable |
| `icons/chevron-right.svg` | CTA direction | Shared canonical chevron acceptable |
| `placeholders/destination-placeholder.svg` | Destination image fallback | Use when provider/cache unavailable |
| `placeholders/avatar-placeholder.svg` | Missing avatar | Use only if product wants placeholder avatars; otherwise omit missing avatars |
