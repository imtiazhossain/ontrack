# Android Implementation Notes

- Render edge-to-edge only through the app's established window-inset scaffold.
- Use dp/sp and respect font scale.
- Shadow/elevation should visually approximate the reference without relying on iOS shadow APIs. Tokens provide an Android elevation starting point.
- If Jetpack Compose: use `HorizontalPager`/foundation pager for destination images and Coil or the app's existing image loader/cache.
- If React Native: use the same shared component contract as iOS and platform-select only where native rendering materially differs.
- Preserve system back navigation and TalkBack order.
