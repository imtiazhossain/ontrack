# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Safe-area rule

The device clock, status bar, camera cutout, and Dynamic Island are a strict
non-scrolling boundary. Keep every route inside the shared `AppSafeArea`
navigation shell. Never put the top safe-area inset inside a `ScrollView`,
`FlatList`, or `SectionList` content container. Any native full-screen `Modal`,
which renders outside the navigation shell, must apply `insets.top` to a
non-scrolling parent before its scrollable content.

# Date-field rule

All editable calendar dates must use the shared design-system `DateField`.
Never use `Input`, `TextInput`, or duplicated parsing/formatting for a date.
`DateField` owns the native iOS calendar popover, Android calendar dialog,
browser date control, date limits, locale display, and conversion to the
timezone-safe `YYYY-MM-DD` storage key.
