import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { ANATOMY_BEIGE, ART_VIEWBOX } from './anatomy-art';
import type { BodyView, MuscleKey, MuscleTarget } from './muscle-data';
import type { AnatomySex } from './muscle-data';
import { hitBoxStyle, orderedHitBoxes } from './muscle-hit-targets';
import { MuscleHighlightPlate } from './muscle-highlight-plate';

const BODY_ASPECT_RATIO = ART_VIEWBOX.width / ART_VIEWBOX.height;

export interface MuscleMapHit {
  key: MuscleKey;
  highlightId: string;
}

interface HumanBodyMapProps {
  bodyView: BodyView;
  anatomySex: AnatomySex;
  selectedMuscle: MuscleKey;
  selectedTarget: MuscleTarget;
  /** Atlas highlight id when it differs from the workout target id. */
  highlightMuscleId?: string;
  onSelectHit: (hit: MuscleMapHit) => void;
}

/**
 * Full-bleed finished JPG + invisible hit boxes.
 */
export function HumanBodyMap({
  bodyView,
  anatomySex,
  selectedMuscle,
  selectedTarget,
  highlightMuscleId,
  onSelectHit,
}: HumanBodyMapProps) {
  const plateMuscleId = highlightMuscleId;
  const boxes = orderedHitBoxes(bodyView);

  return (
    <View
      accessibilityLabel={`Interactive ${anatomySex} ${bodyView} anatomy map`}
      accessibilityValue={{ text: `${selectedTarget.label} in ${selectedMuscle} selected` }}
      style={styles.frame}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <MuscleHighlightPlate
          anatomySex={anatomySex}
          bodyView={bodyView}
          muscleId={plateMuscleId}
        />
        {/* Soften cool→warm parchment shift at the plate crown under the chrome bar. */}
        <LinearGradient
          colors={[ANATOMY_BEIGE, `${ANATOMY_BEIGE}00`]}
          locations={[0, 1]}
          pointerEvents="none"
          style={styles.parchmentBlend}
        />
      </View>

      {boxes.map((box) => (
        <Pressable
          key={box.id}
          accessibilityRole="button"
          accessibilityLabel={box.label}
          accessibilityHint="Shows this muscle highlight and workout suggestions"
          hitSlop={8}
          onPress={() => {
            if (
              box.highlightId === plateMuscleId &&
              box.key === selectedMuscle
            ) {
              return;
            }
            onSelectHit({ key: box.key, highlightId: box.highlightId });
          }}
          style={[styles.hitBox, hitBoxStyle(box)]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: BODY_ASPECT_RATIO,
    backgroundColor: ANATOMY_BEIGE,
    overflow: 'hidden',
  },
  parchmentBlend: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '14%',
  },
  hitBox: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
