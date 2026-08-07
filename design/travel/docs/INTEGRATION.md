# Repository Integration

Recommended location: `/design/travel/`. Keep this directory checked into git.

Cursor should map these design tokens into the app's existing token/theme layer rather than importing design-folder files directly into production if your repo separates product code from design documentation. The package is the specification; production code should live where the repo expects it.

If the app already has equivalent tokens/components, alias/map them rather than creating a second design system. When existing global tokens conflict with a Travel-specific visual requirement, prefer semantic extension (`travel.*`) over hardcoded per-screen values.
