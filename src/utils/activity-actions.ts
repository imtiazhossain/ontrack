import { appPrompt } from '@/components/primitives';
import type { Activity } from '@/types/models';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

export type ActivityAction = 'edit' | 'skip' | 'unskip' | 'delete' | 'duplicate' | 'move-tomorrow';

interface ShowActivityActionsInput {
  activity: Activity;
  onAction: (action: ActivityAction) => void;
}

export function showActivityActions({ activity, onAction }: ShowActivityActionsInput) {
  const isSkipped = activity.status === 'skipped';

  const options = [
    'Edit',
    isSkipped ? 'Unskip' : 'Skip',
    'Duplicate',
    'Move to Tomorrow',
    'Delete',
    'Cancel',
  ];
  const destructiveIndex = 4;
  const cancelIndex = 5;

  const handle = (index: number) => {
    switch (index) {
      case 0:
        onAction('edit');
        break;
      case 1:
        onAction(isSkipped ? 'unskip' : 'skip');
        break;
      case 2:
        onAction('duplicate');
        break;
      case 3:
        onAction('move-tomorrow');
        break;
      case 4:
        onAction('delete');
        break;
    }
  };

  appPrompt.actionSheet(
    {
      options,
      cancelButtonIndex: cancelIndex,
      destructiveButtonIndex: destructiveIndex,
      title: activity.title,
    },
    handle,
  );
}

export function confirmDeleteActivity(title: string, onConfirm: () => void) {
  confirmDestructiveAction({
    title: 'Delete Activity',
    message: `Remove "${title}" from your schedule?`,
    onConfirm,
  });
}
