# Responsive Behavior — iOS + Android

## Units
Treat values as logical units: pt on iOS, dp on Android. Do not scale dimensions from physical pixels.

## Width classes
### Compact phone: 320–374
- Keep 16–20 logical px horizontal padding; prefer 16 if required to prevent truncation.
- Destination/member row may wrap.
- Footer may place `View Itinerary` on its own full-width row if horizontal layout cannot meet touch-target and text requirements.

### Standard phone: 375–430
- Use canonical 20 horizontal padding and reference layout.
- Footer attempts one-row arrangement when label remains fully readable.

### Large phone / foldable pane >430
- Do not stretch cards indefinitely. Use app-wide max-content rules or a centered content column if the rest of the app does.
- Preserve image aspect/crop quality.

## Safe areas
- iOS: respect top/bottom safe-area insets and Dynamic Island/notch.
- Android: edge-to-edge is allowed only when the app's root scaffold handles status/navigation bar insets. Use `WindowInsets`/framework equivalent.
- The floating add button must never overlap system status content.

## Android back
Back behavior must match the rest of the application. Travel home should not intercept system back unless the screen owns nested navigation state that genuinely needs dismissal first.

## Text expansion
Allow at least 2 lines for long destination names. Never shrink text below tokens simply to keep a single line. At very large text sizes, stack metadata and actions vertically.

## Keyboard
This screen has no always-visible text inputs. Any add/edit flow launched from it must use the app's standard keyboard-avoidance behavior.
