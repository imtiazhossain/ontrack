import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppText,
  Card,
  CollapsibleSection,
  PanelTitle,
  SegmentedControl,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import {
  catalogByFeature,
  catalogByGroup,
  DESIGN_CATALOG,
  DESIGN_CATALOG_GROUPS,
  DESIGN_FEATURE_LABELS,
  type DesignCatalogElement,
  type DesignFeatureId,
} from './design-system-catalog';

type CatalogView = 'elements' | 'features';

const VIEW_OPTIONS = [
  {
    value: 'elements' as const,
    label: 'By Element',
    testID: AgentUiIds.designSystem.catalogView('elements'),
  },
  {
    value: 'features' as const,
    label: 'By Feature',
    testID: AgentUiIds.designSystem.catalogView('features'),
  },
];

export function DesignSystemCatalogPanel({
  onOpenDemo,
}: {
  onOpenDemo: (demo: DesignCatalogElement['demo']) => void;
}) {
  const { spacing } = useResponsive();
  const [view, setView] = useState<CatalogView>('elements');
  const byGroup = catalogByGroup();
  const byFeature = catalogByFeature();
  const featureIds = (Object.keys(DESIGN_FEATURE_LABELS) as DesignFeatureId[]).filter(
    (id) => byFeature[id].length > 0,
  );

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ gap: spacing.sm }}>
        <PanelTitle>Element Catalog</PanelTitle>
        <AppText variant="callout" color="secondary">
          Every shared design element in the app, with the features that use it. Open a demo from
          any row.
        </AppText>
        <AppText variant="caption" color="tertiary" fit>
          {DESIGN_CATALOG.length} elements · {featureIds.length} features
        </AppText>
      </Card>

      <SegmentedControl value={view} options={[...VIEW_OPTIONS]} onChange={setView} />

      {view === 'elements'
        ? DESIGN_CATALOG_GROUPS.map((group, index) => (
            <CollapsibleSection
              key={group}
              title={`${group} · ${byGroup[group].length}`}
              defaultExpanded={index === 0}
              testID={AgentUiIds.designSystem.catalogGroup(group.toLowerCase())}>
              <View style={{ gap: spacing.sm }}>
                {byGroup[group].map((el) => (
                  <ElementRow key={el.id} element={el} onOpenDemo={onOpenDemo} />
                ))}
              </View>
            </CollapsibleSection>
          ))
        : featureIds.map((featureId, index) => {
            const elements = byFeature[featureId];
            return (
              <CollapsibleSection
                key={featureId}
                title={`${DESIGN_FEATURE_LABELS[featureId]} · ${elements.length}`}
                defaultExpanded={index === 0}
                testID={AgentUiIds.designSystem.catalogFeature(featureId)}>
                <Card style={{ gap: spacing.xs }}>
                  {elements.map((el) => (
                    <FeatureElementRow
                      key={el.id}
                      element={el}
                      featureId={featureId}
                      onOpenDemo={onOpenDemo}
                    />
                  ))}
                </Card>
              </CollapsibleSection>
            );
          })}
    </View>
  );
}

function FeatureElementRow({
  element,
  featureId,
  onOpenDemo,
}: {
  element: DesignCatalogElement;
  featureId: DesignFeatureId;
  onOpenDemo: (demo: DesignCatalogElement['demo']) => void;
}) {
  const { layout } = useResponsive();
  const label = `${element.name}. Open ${element.demo} demo`;
  const handlePress = () => {
    haptics.select();
    onOpenDemo(element.demo);
  };
  const testID = AgentUiIds.designSystem.catalogFeatureElement(featureId, element.id);
  const agent = useAgentUiTarget(testID, { label, onPress: handlePress });

  return (
    <Pressable
      ref={agent.ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onLayout={agent.onLayout}
      onPress={handlePress}
      style={{
        minHeight: Math.max(36, layout.minTapTarget - 8),
        justifyContent: 'center',
      }}>
      <AppText variant="callout" fit>
        {element.name}
      </AppText>
    </Pressable>
  );
}

function ElementRow({
  element,
  onOpenDemo,
}: {
  element: DesignCatalogElement;
  onOpenDemo: (demo: DesignCatalogElement['demo']) => void;
}) {
  const theme = useTheme();
  const { spacing, s, layout } = useResponsive();
  const usage =
    element.usedBy.length === 0
      ? 'Gallery ready'
      : element.usedBy.map((id) => DESIGN_FEATURE_LABELS[id]).join(' · ');
  const label = `${element.name}. Open ${element.demo} demo`;
  const handlePress = () => {
    haptics.select();
    onOpenDemo(element.demo);
  };
  const testID = AgentUiIds.designSystem.catalogElement(element.id);
  const agent = useAgentUiTarget(testID, { label, onPress: handlePress });

  return (
    <Pressable
      ref={agent.ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onLayout={agent.onLayout}
      onPress={handlePress}
      style={{
        minHeight: layout.minTapTarget,
        borderRadius: s(14),
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: theme.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.separator,
        gap: spacing.xxs,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          minWidth: 0,
        }}>
        <AppText variant="callout" bold fit style={{ flexShrink: 1, minWidth: 0 }}>
          {element.name}
        </AppText>
        <AppText variant="caption" color="accent" fit>
          {element.demo}
        </AppText>
      </View>
      <AppText variant="caption" color="secondary" numberOfLines={2}>
        {element.description}
      </AppText>
      <AppText variant="caption" color="tertiary" numberOfLines={2}>
        {usage}
      </AppText>
    </Pressable>
  );
}
