import { appPrompt } from '@/components/primitives';

/**
 * Standard destructive confirm: Cancel + destructive action.
 * Prefer this over ad-hoc appPrompt.alert for delete/clear flows.
 */
export function confirmDestructiveAction(options: {
  title: string;
  message?: string;
  actionLabel?: string;
  onConfirm: () => void;
}): void {
  appPrompt.alert(options.title, options.message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: options.actionLabel ?? 'Delete',
      style: 'destructive',
      onPress: options.onConfirm,
    },
  ]);
}
