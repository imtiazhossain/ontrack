import { useState } from 'react';

import {
    AppText,
    HeaderBackButton,
    IconButton,
    Screen,
    ScreenHeader,
    SegmentedControl,
    SheetScaffold,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

import { DesignSystemCatalogPanel } from './design-system-catalog-panel';
import type { DesignCatalogElement } from './design-system-catalog';
import { DesignSystemColorsPanel } from './design-system-colors-panel';
import { DesignSystemDemosPanel } from './design-system-demos-panel';
import { DesignSystemFontsPanel } from './design-system-fonts-panel';
import { DesignSystemIconsPanel } from './design-system-icons-panel';

export type GalleryMode = 'elements' | 'demos' | 'colors' | 'fonts' | 'icons';

const MODES = [
  {
    value: 'elements' as const,
    label: 'Elements',
    testID: AgentUiIds.designSystem.mode('elements'),
  },
  {
    value: 'demos' as const,
    label: 'Demos',
    testID: AgentUiIds.designSystem.mode('demos'),
  },
  {
    value: 'colors' as const,
    label: 'Colors',
    testID: AgentUiIds.designSystem.mode('colors'),
  },
  {
    value: 'fonts' as const,
    label: 'Type',
    testID: AgentUiIds.designSystem.mode('fonts'),
  },
  {
    value: 'icons' as const,
    label: 'Icons',
    testID: AgentUiIds.designSystem.mode('icons'),
  },
] as const;

function demoTabFor(demo: DesignCatalogElement['demo']): GalleryMode {
  if (demo === 'colors') return 'colors';
  if (demo === 'fonts') return 'fonts';
  if (demo === 'icons') return 'icons';
  return 'demos';
}

export function DesignSystemGallery() {
  const { spacing } = useResponsive();
  const [mode, setMode] = useState<GalleryMode>('elements');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Screen contentStyle={{ gap: spacing.lg }}>
        <ScreenHeader
          eyebrow="Development only"
          title="Design System"
          subtitle="Shared building blocks — browse, try, then tune foundations"
          leading={
            <HeaderBackButton
              compact
              accessibilityLabel="Back to developer tools"
              fallback="/(tabs)/profile/developer"
              testID={AgentUiIds.designSystem.back}
            />
          }
          trailing={
            <IconButton
              icon="smart"
              testID={AgentUiIds.designSystem.info}
              accessibilityLabel="How to use this gallery"
              onPress={() => setSheetOpen(true)}
            />
          }
        />

        <SegmentedControl value={mode} options={[...MODES]} onChange={setMode} wrap />

        {mode === 'elements' ? (
          <DesignSystemCatalogPanel
            onOpenDemo={(demo) => setMode(demoTabFor(demo))}
          />
        ) : null}
        {mode === 'demos' ? (
          <DesignSystemDemosPanel onOpenSheet={() => setSheetOpen(true)} />
        ) : null}
        {mode === 'colors' ? <DesignSystemColorsPanel /> : null}
        {mode === 'fonts' ? <DesignSystemFontsPanel /> : null}
        {mode === 'icons' ? <DesignSystemIconsPanel /> : null}
      </Screen>

      <SheetScaffold
        visible={sheetOpen}
        eyebrow="How to use"
        title="Design System Gallery"
        subtitle="One place to learn the shared UI."
        onClose={() => setSheetOpen(false)}
        closeTestID={AgentUiIds.designSystem.sheetClose}
        closeAccessibilityLabel="Close design-system sheet">
        <AppText color="secondary" style={{ marginBottom: spacing.md }}>
          Elements — the full list of shared components, grouped by what they’re for. Tap a row to
          jump to a live demo.
        </AppText>
        <AppText color="secondary" style={{ marginBottom: spacing.md }}>
          Demos — press the real controls (buttons, forms, glass, settings).
        </AppText>
        <AppText color="secondary">
          Colors, Type, and Icons — foundations you can preview and tweak for the whole app.
        </AppText>
      </SheetScaffold>
    </>
  );
}
