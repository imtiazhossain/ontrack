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
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import { DesignSystemCatalogPanel } from './design-system-catalog-panel';
import { DesignSystemColorsPanel } from './design-system-colors-panel';
import { DesignSystemComponentsPanel } from './design-system-components-panel';
import { DesignSystemFontsPanel } from './design-system-fonts-panel';
import { DesignSystemFormsPanel } from './design-system-forms-panel';
import { DesignSystemIconsPanel } from './design-system-icons-panel';

export type GalleryMode =
  | 'catalog'
  | 'components'
  | 'forms'
  | 'colors'
  | 'fonts'
  | 'icons';

const MODES = [
  { value: 'catalog', label: 'Catalog', testID: AgentUiIds.designSystem.mode('catalog') },
  {
    value: 'components',
    label: 'UI',
    testID: AgentUiIds.designSystem.mode('components'),
  },
  { value: 'forms', label: 'Forms', testID: AgentUiIds.designSystem.mode('forms') },
  { value: 'colors', label: 'Colors', testID: AgentUiIds.designSystem.mode('colors') },
  { value: 'fonts', label: 'Type', testID: AgentUiIds.designSystem.mode('fonts') },
  { value: 'icons', label: 'Icons', testID: AgentUiIds.designSystem.mode('icons') },
] as const;

export function DesignSystemGallery() {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const [mode, setMode] = useState<GalleryMode>('catalog');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Screen contentStyle={{ gap: spacing.lg }}>
        <ScreenHeader
          eyebrow="Development only"
          title="Design System"
          subtitle="Catalog, components, forms, accents, type, and icons"
          leading={
            <HeaderBackButton
              compact
              accessibilityLabel="Back to developer tools"
              fallback="/developer"
              testID={AgentUiIds.designSystem.back}
            />
          }
          trailing={
            <IconButton
              icon="smart"
              testID={AgentUiIds.designSystem.info}
              accessibilityLabel="Design-system guidance"
              onPress={() => setSheetOpen(true)}
              background={theme.backgroundSunken}
              borderColor={theme.separator}
            />
          }
        />

        <SegmentedControl value={mode} options={[...MODES]} onChange={setMode} wrap />

        {mode === 'catalog' ? (
          <DesignSystemCatalogPanel onOpenDemo={setMode} />
        ) : null}
        {mode === 'components' ? (
          <DesignSystemComponentsPanel onOpenSheet={() => setSheetOpen(true)} />
        ) : null}
        {mode === 'forms' ? <DesignSystemFormsPanel /> : null}
        {mode === 'colors' ? <DesignSystemColorsPanel /> : null}
        {mode === 'fonts' ? <DesignSystemFontsPanel /> : null}
        {mode === 'icons' ? <DesignSystemIconsPanel /> : null}
      </Screen>

      <SheetScaffold
        visible={sheetOpen}
        eyebrow="Canonical sheet"
        title="Shared Sheet Scaffold"
        subtitle="The neutral X is the only dismiss action."
        onClose={() => setSheetOpen(false)}
        closeTestID={AgentUiIds.designSystem.sheetClose}
        closeAccessibilityLabel="Close design-system sheet">
        <AppText color="secondary">
          Feature content can vary, but safe areas, header hierarchy, dismissal, scrolling, and
          footer actions stay consistent. Use Catalog to see which features use each element.
        </AppText>
      </SheetScaffold>
    </>
  );
}
