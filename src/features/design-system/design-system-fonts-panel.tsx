import { View } from 'react-native';

import { AppText, Button, Card, Dropdown, PanelTitle } from '@/components/primitives';
import {
  DEFAULT_MONO_FONT_PRESET_ID,
  DEFAULT_UI_FONT_PRESET_ID,
  FONT_ROLE_LABELS,
  MONO_FONT_PRESETS,
  resolveActiveFontFamilies,
  resolveFontPreset,
  typeConfig,
  UI_FONT_PRESETS,
  type FontPreset,
  type FontRole,
  type TypeVariant,
} from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useThemeOverrides } from '@/store/theme-overrides';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

const TYPE_SAMPLES: { variant: TypeVariant; label: string; sample: string; bold?: boolean }[] = [
  { variant: 'display', label: 'Display', sample: 'August 5' },
  { variant: 'title', label: 'Title', sample: 'Design System' },
  { variant: 'heading', label: 'Heading', sample: 'Canonical components' },
  { variant: 'subheading', label: 'Subheading', sample: 'Editable theme accents', bold: true },
  { variant: 'body', label: 'Body', sample: 'A day built one block at a time.' },
  { variant: 'callout', label: 'Callout', sample: 'Primary action labels stay one line.' },
  { variant: 'caption', label: 'Caption', sample: 'Supporting copy and field hints.' },
  { variant: 'overline', label: 'Overline', sample: 'Timeline' },
  { variant: 'metric', label: 'Metric', sample: '100%' },
  { variant: 'mono', label: 'Mono', sample: 'ontrack.designSystem.fonts' },
];

export function DesignSystemFontsPanel() {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const fonts = useThemeOverrides((s) => s.fonts);
  const setFont = useThemeOverrides((s) => s.setFont);
  const resetFonts = useThemeOverrides((s) => s.resetFonts);
  const hasFontOverrides = Boolean(fonts.ui || fonts.mono);
  const faces = resolveActiveFontFamilies(fonts);
  const uiPreset = resolveFontPreset('ui', fonts.ui);
  const monoPreset = resolveFontPreset('mono', fonts.mono);

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="callout" color="secondary">
        Type foundations. Default UI face is system serif (`{typeConfig.fontFamily}`). Presets apply
        live until restored.
      </AppText>

      <Card airy style={{ gap: spacing.md }}>
        <PanelTitle>Active faces</PanelTitle>
        <AppText variant="caption" color="secondary">
          UI: {uiPreset.label} · {faces.fontFamily}
        </AppText>
        <AppText variant="caption" color="secondary">
          Mono: {monoPreset.label} · {faces.monoFamily}
        </AppText>
        <Button
          variant={hasFontOverrides ? 'danger' : 'secondary'}
          testID={AgentUiIds.designSystem.resetFonts}
          accessibilityLabel="Restore default fonts"
          disabled={!hasFontOverrides}
          onPress={() =>
            confirmDestructiveAction({
              title: 'Restore default fonts?',
              message: 'Return to system serif and system mono. Logged in change history.',
              actionLabel: 'Restore Fonts',
              confirmTestID: AgentUiIds.designSystem.confirmRestoreFonts,
              onConfirm: resetFonts,
            })
          }>
          Restore Default Fonts
        </Button>
      </Card>

      <FontRolePicker
        role="ui"
        title={FONT_ROLE_LABELS.ui}
        description="Headlines, body, chrome, and most AppText."
        presets={UI_FONT_PRESETS}
        selectedId={fonts.ui ?? DEFAULT_UI_FONT_PRESET_ID}
        onSelect={(id) => setFont('ui', id)}
      />

      <FontRolePicker
        role="mono"
        title={FONT_ROLE_LABELS.mono}
        description="Technical / code chrome (`mono` type variant)."
        presets={MONO_FONT_PRESETS}
        selectedId={fonts.mono ?? DEFAULT_MONO_FONT_PRESET_ID}
        onSelect={(id) => setFont('mono', id)}
      />

      <Card airy style={{ gap: spacing.md }}>
        <AgentTestId testID={AgentUiIds.designSystem.fontScale} label="Type scale preview">
          <View style={{ gap: spacing.md }}>
            <PanelTitle>Type scale</PanelTitle>
            <AppText variant="caption" color="secondary">
              Live preview using the active UI / mono faces.
            </AppText>
            {TYPE_SAMPLES.map((row) => (
              <View
                key={row.variant}
                style={{
                  gap: spacing.xs,
                  paddingBottom: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.separator,
                }}>
                <AppText variant="caption" color="tertiary" fit>
                  {row.label}
                </AppText>
                <AppText variant={row.variant} bold={row.bold}>
                  {row.sample}
                </AppText>
              </View>
            ))}
          </View>
        </AgentTestId>
      </Card>
    </View>
  );
}

function FontRolePicker({
  role,
  title,
  description,
  presets,
  selectedId,
  onSelect,
}: {
  role: FontRole;
  title: string;
  description: string;
  presets: readonly FontPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { spacing } = useResponsive();
  const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0];
  const options = presets.map((preset) => ({
    value: preset.id,
    label: preset.label,
    testID: AgentUiIds.designSystem.fontPreset(role, preset.id),
  }));

  return (
    <Card airy style={{ gap: spacing.md }}>
      <AppText variant="caption" color="secondary">
        {description}
      </AppText>
      <Dropdown
        label={title}
        value={selectedId}
        options={options}
        onChange={onSelect}
        testID={AgentUiIds.designSystem.fontRole(role)}
        menuMaxHeight={320}
      />
      {selected ? (
        <AppText
          variant="caption"
          color="tertiary"
          numberOfLines={1}
          style={{ fontFamily: selected.family }}>
          The quick brown fox — {selected.family}
        </AppText>
      ) : null}
    </Card>
  );
}
