import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Dropdown } from '@/components/primitives';
import { spacing } from '@/design-system';

import {
  MUSCLE_ATLAS_CATEGORIES,
  MUSCLE_ATLAS_CATEGORY_BY_ID,
  musclesInCategory,
  type MuscleAtlasCategoryId,
  type MuscleAtlasEntry,
} from './muscle-atlas';
import { formatMuscleLabel } from './format-muscle-label';

type OpenMenu = 'category' | 'muscle';

interface MuscleAtlasDropdownsProps {
  categoryId: MuscleAtlasCategoryId;
  muscle: MuscleAtlasEntry;
  onSelectCategory: (categoryId: MuscleAtlasCategoryId) => void;
  onSelectMuscle: (muscle: MuscleAtlasEntry) => void;
}

/** Body-part then muscle selectors with shared overlay menus. */
export function MuscleAtlasDropdowns({
  categoryId,
  muscle,
  onSelectCategory,
  onSelectMuscle,
}: MuscleAtlasDropdownsProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>();
  const category = MUSCLE_ATLAS_CATEGORY_BY_ID[categoryId];
  const muscles = musclesInCategory(categoryId);

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Dropdown
          label="Body part"
          value={categoryId}
          open={openMenu === 'category'}
          onOpenChange={(next) => setOpenMenu(next ? 'category' : undefined)}
          options={MUSCLE_ATLAS_CATEGORIES.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
          onChange={(id) => onSelectCategory(id)}
        />
      </View>
      <View style={styles.flex}>
        <Dropdown
          label="Muscle"
          value={muscle.id}
          open={openMenu === 'muscle'}
          onOpenChange={(next) => setOpenMenu(next ? 'muscle' : undefined)}
          options={muscles.map((item) => ({
            value: item.id,
            label: formatMuscleLabel(item.name),
          }))}
          onChange={(id) => {
            const next = muscles.find((item) => item.id === id);
            if (next) onSelectMuscle(next);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 2,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
});
