import { useEffect, useRef } from 'react';

import {
  CURRENT_MEAL_PHOTO_PROCESSING_VERSION,
  enhanceMealPhoto,
} from '@/services/nutrition';
import { useSchedule } from '@/store/schedule';

/** Upgrades user-added meal photos once after persisted state has loaded. */
export function useMealPhotoMigration(enabled: boolean) {
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    let cancelled = false;

    const migrate = async () => {
      const state = useSchedule.getState();
      const pending = state.meals.filter((meal) =>
        typeof meal.photo === 'string' &&
        meal.photoProcessingVersion !== CURRENT_MEAL_PHOTO_PROCESSING_VERSION,
      );

      for (const meal of pending) {
        if (cancelled || typeof meal.photo !== 'string') return;
        try {
          const enhanced = await enhanceMealPhoto(
            meal.originalPhoto ?? meal.photo,
            meal.name,
            `meal-${meal.activityId}-v${CURRENT_MEAL_PHOTO_PROCESSING_VERSION}`,
          );
          if (cancelled) return;
          useSchedule.getState().setProcessedMealPhoto(
            meal.activityId,
            enhanced.photoUri,
            meal.originalPhoto ?? meal.photo,
            enhanced.version,
          );
        } catch {
          // Keep the original usable photo. A future app launch can retry.
        }
      }
    };

    void migrate();
    return () => { cancelled = true; };
  }, [enabled]);
}
