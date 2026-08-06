import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Card,
  DateField,
  Dropdown,
  FieldLeadingIcon,
  FormSection,
  Input,
  PanelTitle,
  SegmentedControl,
  SettingsActionRow,
  SettingsToggleRow,
  TimeField,
} from '@/components/primitives';
import { fieldLeadingIconRowStyle } from '@/components/primitives/field-leading-icon';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { todayKey } from '@/utils/date';

import {
  DESIGN_CATALOG,
  DESIGN_FEATURE_LABELS,
} from './design-system-catalog';

function usedIn(id: string): string {
  const el = DESIGN_CATALOG.find((e) => e.id === id);
  if (!el || el.usedBy.length === 0) return 'Gallery ready';
  return el.usedBy.map((f) => DESIGN_FEATURE_LABELS[f]).join(' · ');
}

export function DesignSystemFormsPanel() {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const [destination, setDestination] = useState('Lisbon');
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState(9 * 60 + 30);
  const [mode, setMode] = useState<'one' | 'round'>('round');
  const [sort, setSort] = useState<'name' | 'date'>('name');
  const [toggle, setToggle] = useState(true);

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="callout" color="secondary">
        Form fields, selects, and settings rows. Labels stay Title Case through StackedFieldLabel.
      </AppText>

      <Card>
        <FormSection
          title="Trip details"
          description="Labels, supporting copy, fields, and errors share one rhythm."
          error={!destination.trim() ? 'Destination is required.' : undefined}>
          <Input
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            testID={AgentUiIds.designSystem.input}
            accessibilityLabel="Gallery destination"
          />
          <AppText variant="caption" color="tertiary">
            Input · {usedIn('input')}
          </AppText>
        </FormSection>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <PanelTitle>Date and time</PanelTitle>
        <AppText variant="caption" color="tertiary">
          DateField · {usedIn('dateField')}
        </AppText>
        <DateField
          label="Departure"
          value={date}
          onChange={setDate}
          testID={AgentUiIds.designSystem.demo('date')}
        />
        <AppText variant="caption" color="tertiary">
          TimeField · {usedIn('timeField')}
        </AppText>
        <TimeField
          label="Departure Time"
          value={time}
          onChange={setTime}
          testID={AgentUiIds.designSystem.demo('time')}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <PanelTitle>Choices</PanelTitle>
        <AppText variant="caption" color="tertiary">
          SegmentedControl · {usedIn('segmented')}
        </AppText>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'one', label: 'One Way', testID: AgentUiIds.designSystem.demo('seg.one') },
            { value: 'round', label: 'Round Trip', testID: AgentUiIds.designSystem.demo('seg.round') },
          ]}
        />
        <AppText variant="caption" color="tertiary">
          Dropdown · {usedIn('dropdown')}
        </AppText>
        <Dropdown
          label="Sort By"
          value={sort}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'date', label: 'Date' },
          ]}
          onChange={setSort}
          testID={AgentUiIds.designSystem.demo('formDropdown')}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <PanelTitle>Field leading icon</PanelTitle>
        <AppText variant="caption" color="tertiary">
          FieldLeadingIcon · {usedIn('fieldLeading')}
        </AppText>
        <View
          style={fieldLeadingIconRowStyle({
            minHeight: s(60),
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: s(14),
            borderWidth: 1,
            borderColor: theme.separator,
            backgroundColor: theme.backgroundSunken,
          })}>
          <FieldLeadingIcon name="flight" backgroundColor={theme.accentFaint} color={theme.accentPrimary} />
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
            <AppText variant="caption" color="secondary" fit>
              Flight
            </AppText>
            <AppText variant="callout" fit>
              AA 100 · JFK → LIS
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <PanelTitle>Settings rows</PanelTitle>
        <AppText variant="caption" color="tertiary">
          SettingsRow family · {usedIn('settingsRow')}
        </AppText>
        <SettingsToggleRow
          label="Dev Overlay"
          detail="Show agent-ui hit targets in the simulator."
          value={toggle}
          onValueChange={setToggle}
          testID={AgentUiIds.designSystem.demo('settingsToggle')}
        />
        <SettingsActionRow
          label="Open Colors"
          detail="Jump to the accent token editor."
          icon="background"
          onPress={() => undefined}
          testID={AgentUiIds.designSystem.demo('settingsAction')}
        />
      </Card>
    </View>
  );
}
