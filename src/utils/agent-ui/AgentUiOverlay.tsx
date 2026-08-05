import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { AgentUiIds } from './ids';
import {
  agentUiOverlayShortLabel,
  isAgentUiOverlayEnabled,
  subscribeAgentUiOverlay,
} from './overlay';
import { isAgentUiEnabled, listAgentUiTargets } from './registry';
import { getAgentUiRoute } from './route';
import { useAgentUiTarget } from './use-agent-ui-target';

/**
 * __DEV__ visual overlay: route chip + framed testIDs so screenshots carry
 * reference points. Uses FullWindowOverlay on iOS so native-stack screens
 * do not cover it. pointerEvents=none — never blocks taps.
 */
export function AgentUiOverlay() {
  const enabled = useSyncExternalStore(
    subscribeAgentUiOverlay,
    isAgentUiOverlayEnabled,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const root = useAgentUiTarget(AgentUiIds.agentUi.overlayRoot, {
    label: enabled ? 'Agent UI overlay on' : 'Agent UI overlay',
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [enabled]);

  if (!isAgentUiEnabled()) return null;

  void tick;
  const route = getAgentUiRoute() ?? '(unknown route)';
  const elements = enabled
    ? listAgentUiTargets().filter(
        (entry) =>
          entry.testID !== AgentUiIds.agentUi.overlayRoot &&
          entry.frame &&
          entry.frame.width > 0 &&
          entry.frame.height > 0,
      )
    : [];

  const probe = (
    <View
      ref={root.ref}
      collapsable={false}
      onLayout={root.onLayout}
      style={styles.hiddenProbe}
      testID={root.testID}
    />
  );

  if (!enabled) return probe;

  const layer = (
    <View pointerEvents="none" style={styles.layer} collapsable={false}>
      <View style={styles.routeChip}>
        <Text style={styles.routeText} numberOfLines={1}>
          {route}
        </Text>
        <Text style={styles.routeMeta} numberOfLines={1}>
          {elements.length} ids · overlay on
        </Text>
      </View>
      {elements.map((entry) => {
        const frame = entry.frame!;
        return (
          <View
            key={entry.testID}
            style={[
              styles.box,
              entry.tappable ? styles.boxTappable : styles.boxAnchor,
              {
                left: frame.x,
                top: frame.y,
                width: Math.max(frame.width, 1),
                height: Math.max(frame.height, 1),
              },
            ]}>
            <Text style={styles.boxLabel} numberOfLines={1}>
              {agentUiOverlayShortLabel(entry.testID)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <>
      {probe}
      {Platform.OS === 'ios' ? (
        <FullWindowOverlay>{layer}</FullWindowOverlay>
      ) : (
        layer
      )}
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  hiddenProbe: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  routeChip: {
    position: 'absolute',
    top: 54,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  routeText: {
    color: '#F4F7FB',
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '600',
  },
  routeMeta: {
    color: '#9DB0C7',
    fontSize: 10,
    fontFamily: 'System',
  },
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  boxTappable: {
    borderColor: 'rgba(56, 189, 248, 0.95)',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  boxAnchor: {
    borderColor: 'rgba(250, 204, 21, 0.95)',
    backgroundColor: 'rgba(250, 204, 21, 0.16)',
  },
  boxLabel: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 3,
    paddingVertical: 1,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    color: '#F4F7FB',
    fontSize: 9,
    fontFamily: 'System',
  },
});
