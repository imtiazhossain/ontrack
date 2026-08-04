# onTrack design-system contract

Consistency wins over feature-specific control styling. Feature themes may change semantic accent colors,
imagery, category colors, and data visualizations; they do not redefine controls or interaction placement.

## Action hierarchy

| Intent | Component | Placement |
|---|---|---|
| Dismiss or cancel | `IconButton` through `ScreenHeader` / `SheetScaffold` | Neutral top-right X |
| Back | `HeaderBackButton` | Standard leading header position |
| Save, create, confirm | `Button variant="primary"` | Main footer or final form action |
| Secondary action | `Button variant="secondary"` | After the primary action |
| Low-emphasis inline action | `Button variant="ghost"` | Inline only; never the sheet dismiss action |
| Delete or remove | `Button variant="danger"` / `DestructiveSection` | Separated destructive section |
| Icon-only action | `IconButton` | At least 44pt with label and `testID` |

Irreversible actions must call `confirmDestructiveAction`. Its Cancel action is represented by the prompt’s
top-right X; it is not rendered as a second full-width button.

## Intuitive path

- Every screen has one visually dominant next step. Equal-weight action walls are grouped by user intent.
- Primary actions use plain verbs that describe the result (`Open Trip Itinerary`, `Create Trip`, `Save`).
- Tappable cards include a directional affordance; icon-only controls are reserved for familiar chrome.
- Related actions stay together and use the same order across empty, populated, and editing states.
- The interface responds immediately with pressed state and haptics, then shows shared loading or error UI.
- Helpful defaults and nearby field errors replace instructions users would otherwise have to remember.
- Navigation preserves context. Back returns to the previous task; X dismisses without implying navigation.
- Color adds recognition and feature identity, but meaning never depends on color alone.

## Composition

- Routes start with `Screen`; standard titles use `ScreenHeader`.
- Modal sheets use `SheetScaffold`; do not create feature-specific sheet frames.
- Forms group related fields with `FormSection`, use `Input` / `DateField` / `TimeField`, and use
  `SegmentedControl` for compact exclusive choices.
- Surfaces use `Card`; loading, empty, and error states use `LoadingBlock`, `EmptyState`, and `ErrorMessage`.
- UI text uses `AppText`. Chrome is single-line with `fit`; body copy may wrap.
- Colors come from `useTheme()`. Spacing, control sizes, and type come from `useResponsive()` or primitives.
- Every interactive control has an `ontrack.*` `testID` registered in `AgentUiIds` and documented in the UI map.

## Exceptions

Custom drawing, maps, destination photography, workout anatomy, and game canvases may use domain-specific
visual values internally. Their headers, forms, buttons, prompts, sheets, loading states, and errors still use
the shared system.
