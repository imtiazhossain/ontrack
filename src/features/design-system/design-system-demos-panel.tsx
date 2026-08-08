import { View } from 'react-native';

import { AppText } from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';

import { DesignSystemComponentsPanel } from './design-system-components-panel';
import { DesignSystemFormsPanel } from './design-system-forms-panel';

/** Live playground — components + forms in one scrollable list. */
export function DesignSystemDemosPanel({
  onOpenSheet,
}: {
  onOpenSheet: () => void;
}) {
  const { spacing } = useResponsive();

  return (
    <View style={{ gap: spacing.xl }}>
      <AppText variant="callout" color="secondary">
        Try the shared controls live. For the full list of what exists and where it’s used, switch
        back to Elements.
      </AppText>
      <DesignSystemComponentsPanel onOpenSheet={onOpenSheet} />
      <DesignSystemFormsPanel />
    </View>
  );
}
