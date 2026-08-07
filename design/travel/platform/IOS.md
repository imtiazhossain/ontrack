# iOS Implementation Notes

- Respect `SafeAreaInsets`; do not hardcode top offsets against a specific iPhone shell screenshot.
- Prefer app-shared typography and button/card primitives.
- If native SwiftUI: use `AsyncImage` only if it meets caching requirements; otherwise the app's image pipeline. `TabView` paging or a custom paging scroll can implement the carousel.
- If React Native: use the project's existing safe-area, image caching, and gesture/pager stack; do not add duplicate dependencies if avoidable.
- System text should use Dynamic Type where compatible with the app architecture.
- Keep the full visual treatment in logical pt, not screenshot pixels.
