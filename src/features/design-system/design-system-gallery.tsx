import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  DestructiveSection,
  ErrorMessage,
  FormSection,
  IconButton,
  Input,
  Screen,
  ScreenHeader,
  SegmentedControl,
  SheetScaffold,
} from '@/components/primitives';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

type GalleryMode = 'overview' | 'forms' | 'states';

const MODES = [
  { value: 'overview', label: 'Actions', testID: AgentUiIds.designSystem.mode('overview') },
  { value: 'forms', label: 'Forms', testID: AgentUiIds.designSystem.mode('forms') },
  { value: 'states', label: 'States', testID: AgentUiIds.designSystem.mode('states') },
] as const;

export function DesignSystemGallery() {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const [mode, setMode] = useState<GalleryMode>('overview');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sample, setSample] = useState('Lisbon');

  return (
    <>
      <Screen contentStyle={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Development only"
          title="Design System"
          subtitle="Canonical components and interaction states"
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

        <SegmentedControl value={mode} options={MODES} onChange={setMode} />

        {mode === 'overview' ? (
          <Card style={{ gap: spacing.md }}>
            <AppText variant="subheading" bold fit>Canonical actions</AppText>
            <Button
              size="lg"
              testID={AgentUiIds.designSystem.primary}
              accessibilityLabel="Primary action example"
              onPress={() => setSheetOpen(true)}>
              Primary Action
            </Button>
            <Button
              variant="secondary"
              testID={AgentUiIds.designSystem.secondary}
              accessibilityLabel="Secondary action example"
              onPress={() => setSheetOpen(true)}>
              Secondary Action
            </Button>
            <Button
              variant="ghost"
              testID={AgentUiIds.designSystem.ghost}
              accessibilityLabel="Ghost action example"
              onPress={() => setSheetOpen(true)}>
              Inline Action
            </Button>
            <DestructiveSection
              label="Delete Example"
              description="Destructive actions are separated and always confirmed."
              testID={AgentUiIds.designSystem.delete}
              onPress={() =>
                confirmDestructiveAction({
                  title: 'Delete Example?',
                  message: 'This demonstrates the canonical destructive prompt.',
                  actionLabel: 'Delete Example',
                  onConfirm: () => undefined,
                })
              }
            />
          </Card>
        ) : null}

        {mode === 'forms' ? (
          <Card>
            <FormSection
              title="Trip details"
              description="Labels, supporting copy, fields, and errors share one rhythm."
              error={!sample.trim() ? 'Destination is required.' : undefined}>
              <Input
                label="Destination"
                value={sample}
                onChangeText={setSample}
                testID={AgentUiIds.designSystem.input}
                accessibilityLabel="Gallery destination"
              />
            </FormSection>
          </Card>
        ) : null}

        {mode === 'states' ? (
          <Card style={{ gap: spacing.md }}>
            <AppText variant="subheading" bold fit>Shared states</AppText>
            <Button loading onPress={() => undefined}>Saving</Button>
            <Button disabled onPress={() => undefined}>Disabled</Button>
            <ErrorMessage message="Errors use the shared semantic danger treatment." />
          </Card>
        ) : null}

        <AppText variant="overline" color="tertiary" fit>Feature accents</AppText>
        <View style={{ gap: spacing.md }}>
          <FeatureAccent feature="travel" label="Travel" />
          <FeatureAccent feature="plants" label="Plants" />
          <FeatureAccent feature="vehicles" label="Vehicles" />
        </View>
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
          Feature content can vary, but safe areas, header hierarchy, dismissal, scrolling, and footer actions stay consistent.
        </AppText>
      </SheetScaffold>
    </>
  );
}

function FeatureAccent({
  feature,
  label,
}: {
  feature: 'travel' | 'plants' | 'vehicles';
  label: string;
}) {
  return (
    <FeatureThemeProvider feature={feature}>
      <FeatureAccentCard label={label} />
    </FeatureThemeProvider>
  );
}

function FeatureAccentCard({ label }: { label: string }) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  return (
    <Card variant="sunken" style={{ gap: spacing.sm }}>
      <AppText variant="callout" color="accent" bold fit>{label}</AppText>
      <View style={{ height: spacing.sm, borderRadius: spacing.sm, backgroundColor: theme.accentPrimary }} />
    </Card>
  );
}
