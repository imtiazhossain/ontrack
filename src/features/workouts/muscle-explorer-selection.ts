import type { BodyView, MuscleKey } from '@/features/workouts/muscle-data';
import { MUSCLE_GROUPS } from '@/features/workouts/muscle-data';

export const DEFAULT_MUSCLE: Record<BodyView, MuscleKey> = {
  front: 'chest',
  back: 'upper-back',
  side: 'glutes',
};

export const BODY_VIEW_TABS: { view: BodyView; label: string }[] = [
  { view: 'front', label: 'Front' },
  { view: 'side', label: 'Side' },
  { view: 'back', label: 'Back' },
];

export const HIGHLIGHT_COLOR = '#FF7A1F';

export function bodyViewLabel(view: BodyView) {
  switch (view) {
    case 'front':
      return 'Anterior';
    case 'back':
      return 'Posterior';
    case 'side':
      return 'Side';
  }
}

/** Groups shown as chips for the current body plate. */
export function musclesVisibleForBodyView(bodyView: BodyView) {
  return MUSCLE_GROUPS.filter((group) => {
    if (bodyView === 'side') {
      // Side plate: groups that have side hit targets.
      return (
        group.key === 'chest' ||
        group.key === 'biceps' ||
        group.key === 'glutes' ||
        group.key === 'quadriceps' ||
        group.key === 'hamstrings'
      );
    }
    return group.view === bodyView;
  });
}
