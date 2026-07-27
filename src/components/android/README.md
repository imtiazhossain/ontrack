# Android-only components

Components in this folder exist **only on Android** and have no iOS twin.

## Rules

1. **iOS must never import from `@/components/android/`.** Prefer Metro platform files (`.android.tsx`) so the iOS bundle never resolves these modules.
2. Cross-platform APIs that differ by OS belong under `src/components/primitives/` as `.ios.tsx` / `.android.tsx` (+ shared `.types.ts`). The `.android.tsx` file may import helpers from this folder.
3. Shared design-system primitives (`DateField`, `Symbol`, etc.) stay in `primitives/` even when they branch on `EXPO_OS`.

## When to add a file here

Use this folder for Material / Android-system UI that would be wrong to ship on iOS (for example a Material time dialog field chrome). If both platforms need a variant of the same API, put the shared export in `primitives/` and keep only Android-specific pieces here.
