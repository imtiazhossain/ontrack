/**
 * Optional UI hooks for confirmation import phases (status labels, etc.).
 * Hosts that used RN Modal had to hide before the system picker on iOS; the
 * Add Stay/Flight/Rental sheet is now an in-tree overlay so prepare/dismiss
 * hiding is no longer required there.
 */
export type ConfirmationImportPhase = 'picker' | 'reading';

/** How long the opening spinner stays after the system picker starts presenting. */
export const PICKER_OPEN_SPINNER_HOLD_MS = 1000;

export interface ConfirmationImportOptions {
  onPhase?: (phase: ConfirmationImportPhase) => void;
  /** Awaited immediately before the system picker opens. */
  preparePicker?: () => void | Promise<void>;
  /**
   * Called ~1s after the system files/photos sheet begins presenting —
   * hosts should hide the opening spinner here.
   */
  pickerWillPresent?: () => void;
  /** Called after the system picker dismisses (selected or cancelled). */
  pickerDidDismiss?: () => void;
}

/** Run a system picker with optional prepare/dismiss hooks. */
export async function runConfirmationPicker<T>(
  options: ConfirmationImportOptions | undefined,
  pick: () => Promise<T>,
): Promise<T> {
  options?.onPhase?.('picker');
  await options?.preparePicker?.();
  // Give React a beat to paint the import spinner before the system sheet covers it.
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  const pickPromise = pick();
  // Avoid an unhandled rejection if pick fails during the spinner hold.
  void pickPromise.catch(() => undefined);
  // Keep the spinner up briefly after the picker starts so it doesn't flash away.
  await new Promise<void>((resolve) =>
    setTimeout(resolve, PICKER_OPEN_SPINNER_HOLD_MS),
  );
  options?.pickerWillPresent?.();
  try {
    return await pickPromise;
  } finally {
    options?.pickerDidDismiss?.();
  }
}
