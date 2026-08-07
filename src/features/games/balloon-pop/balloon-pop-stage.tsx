import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { newId } from '@/utils/id';

import { balloonFill } from './colors';
import { EdgeFan } from './fan';
import { spawnBalloonPositions, stepBalloons } from './physics';
import type { Balloon, FanConfig, LevelConfig, StageBounds } from './types';

const BALLOON_RADIUS = 28;
const TICK_MS_FULL = 1000 / 30;
const TICK_MS_REDUCED = 1000 / 18;

interface BalloonPopStageProps {
  level: LevelConfig;
  playing: boolean;
  onPopTarget: () => void;
  onPopWrong: () => void;
  onTargetsCleared: () => void;
}

export function BalloonPopStage({
  level,
  playing,
  onPopTarget,
  onPopWrong,
  onTargetsCleared,
}: BalloonPopStageProps) {
  const theme = useTheme();
  const { tier, particleScale, allowsLoopMotion } = usePerformanceTier();
  const tickMs =
    tier === 'full' ? TICK_MS_FULL : tier === 'reduced' ? TICK_MS_REDUCED : 0;
  const [bounds, setBounds] = useState<StageBounds>({ width: 0, height: 0 });
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const balloonsRef = useRef<Balloon[]>([]);
  const callbacksRef = useRef({ onPopTarget, onPopWrong, onTargetsCleared });
  callbacksRef.current = { onPopTarget, onPopWrong, onTargetsCleared };

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBounds({ width, height });
  }, []);

  useEffect(() => {
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const budget = Math.max(
      level.targetCount,
      Math.round((level.targetCount + level.distractorCount) * Math.max(0.35, particleScale || 0.35)),
    );
    const targets = Math.min(level.targetCount, budget);
    const distractors = Math.max(0, budget - targets);
    const total = targets + distractors;
    const positions = spawnBalloonPositions(
      total,
      bounds,
      BALLOON_RADIUS,
      level.driftScale,
    );
    const distractorPool = level.colorPool.filter((id) => id !== level.targetColorId);
    const next: Balloon[] = positions.map((pos, index) => {
      const isTarget = index < targets;
      const colorId = isTarget
        ? level.targetColorId
        : (distractorPool[index % Math.max(1, distractorPool.length)] ??
          level.colorPool[0] ??
          'blue');
      return {
        id: newId('balloon'),
        colorId,
        radius: BALLOON_RADIUS,
        ...pos,
      };
    });
    balloonsRef.current = next;
    setBalloons(next);
  }, [bounds, level, particleScale]);

  useEffect(() => {
    if (!playing || bounds.width <= 0 || !allowsLoopMotion || tickMs <= 0) {
      return;
    }

    const id = setInterval(() => {
      const stepped = stepBalloons(
        balloonsRef.current,
        level.fans,
        bounds,
        tickMs / 1000,
      );
      balloonsRef.current = stepped;
      setBalloons(stepped);
    }, tickMs);

    return () => clearInterval(id);
  }, [allowsLoopMotion, playing, bounds, level.fans, tickMs]);

  const handlePop = useCallback(
    (balloon: Balloon) => {
      if (!playing) return;
      const remaining = balloonsRef.current.filter((item) => item.id !== balloon.id);
      balloonsRef.current = remaining;
      setBalloons(remaining);

      if (balloon.colorId === level.targetColorId) {
        callbacksRef.current.onPopTarget();
        const targetsLeft = remaining.filter(
          (item) => item.colorId === level.targetColorId,
        ).length;
        if (targetsLeft === 0) {
          callbacksRef.current.onTargetsCleared();
        }
      } else {
        callbacksRef.current.onPopWrong();
      }
    },
    [level.targetColorId, playing],
  );

  return (
    <View
      onLayout={onLayout}
      style={[styles.stage, { backgroundColor: theme.backgroundSunken }]}>
      {level.fans.map((fan) => (
        <EdgeFan key={fan.side} side={fan.side} strength={fan.strength} />
      ))}
      {balloons.map((balloon) => (
        <BalloonView
          key={balloon.id}
          balloon={balloon}
          darkMode={theme.name === 'dark'}
          disabled={!playing}
          onPop={() => handlePop(balloon)}
        />
      ))}
    </View>
  );
}

interface BalloonViewProps {
  balloon: Balloon;
  darkMode: boolean;
  disabled: boolean;
  onPop: () => void;
}

function BalloonView({ balloon, darkMode, disabled, onPop }: BalloonViewProps) {
  const fill = balloonFill(balloon.colorId, darkMode);
  const size = balloon.radius * 2;

  return (
    <View
      style={[
        styles.balloonWrap,
        {
          width: size,
          height: size + 14,
          left: balloon.x - balloon.radius,
          top: balloon.y - balloon.radius,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${balloon.colorId} balloon`}
        disabled={disabled}
        hitSlop={6}
        onPress={onPop}
        testID={AgentUiIds.games.balloon(balloon.id)}
        style={styles.pressable}>
        <View style={[styles.balloon, { width: size, height: size, backgroundColor: fill }]}>
          <View style={styles.highlight} />
        </View>
        <View style={[styles.string, { backgroundColor: fill }]} />
      </Pressable>
    </View>
  );
}

/** Exported for tests that want fan metadata without importing UI. */
export function activeFanSides(fans: readonly FanConfig[]): FanConfig['side'][] {
  return fans.map((fan) => fan.side);
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  balloonWrap: {
    position: 'absolute',
    zIndex: 3,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
  },
  balloon: {
    borderRadius: 999,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingLeft: 10,
  },
  highlight: {
    width: 10,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  string: {
    width: 2,
    height: 12,
    opacity: 0.55,
    marginTop: 1,
  },
});
