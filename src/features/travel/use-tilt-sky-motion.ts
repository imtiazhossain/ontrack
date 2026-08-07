import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

export type TiltSkyMotion = {
  /** -1…1 left ↔ right tilt */
  tiltX: SharedValue<number>;
  /** -1…1 forward ↔ back tilt */
  tiltY: SharedValue<number>;
  /** 0…1 motion energy — drives twinkle / ray shine intensity */
  energy: SharedValue<number>;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Device-motion tilt for the itinerary header sky.
 * Falls back to idle (zeros) when sensors are unavailable, denied, or
 * Reduce Motion is on. Safe on Simulator (no-op).
 */
export function useTiltSkyMotion(): TiltSkyMotion {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const energy = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      tiltX.value = 0;
      tiltY.value = 0;
      energy.value = 0;
      return;
    }

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;
    let active = AppState.currentState === 'active';

    const start = async () => {
      try {
        const { DeviceMotion } = await import('expo-sensors');
        const available = await DeviceMotion.isAvailableAsync();
        if (!available || cancelled) return;

        const permission = await DeviceMotion.getPermissionsAsync();
        const granted =
          permission.granted ||
          (await DeviceMotion.requestPermissionsAsync()).granted;
        if (!granted || cancelled) return;

        DeviceMotion.setUpdateInterval(36);
        subscription = DeviceMotion.addListener((sample) => {
          if (!active || cancelled) return;

          const gamma = sample.rotation?.gamma ?? 0;
          const beta = sample.rotation?.beta ?? 0;
          // Normalize typical handheld tilt into -1…1.
          const nextX = clamp(gamma / 0.55, -1, 1);
          const nextY = clamp((beta - 0.55) / 0.7, -1, 1);

          const rate = sample.rotationRate;
          const spin =
            Math.abs(rate?.alpha ?? 0) +
            Math.abs(rate?.beta ?? 0) +
            Math.abs(rate?.gamma ?? 0);
          const accel = sample.acceleration;
          const jolt = accel
            ? Math.hypot(accel.x, accel.y, accel.z)
            : 0;
          const burst = clamp(spin / 140 + jolt / 5.5, 0, 1);

          // Light exponential smoothing — responsive, not jittery.
          tiltX.value = tiltX.value * 0.72 + nextX * 0.28;
          tiltY.value = tiltY.value * 0.72 + nextY * 0.28;
          energy.value = energy.value * 0.78 + burst * 0.22;
        });
      } catch {
        // Native module missing (old binary) or Sensor unavailable — idle.
      }
    };

    void start();

    const appSub = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (!active) {
        energy.value = energy.value * 0.35;
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
      appSub.remove();
    };
  }, [energy, reduceMotion, tiltX, tiltY]);

  return { tiltX, tiltY, energy };
}
