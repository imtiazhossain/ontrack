import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { Activity } from '@/types/models';

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
    'Move to tomorrow',
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

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex,
        title: activity.title,
      },
      handle,
    );
    return;
  }

  Alert.alert(activity.title, undefined, [
    { text: 'Edit', onPress: () => onAction('edit') },
    { text: isSkipped ? 'Unskip' : 'Skip', onPress: () => onAction(isSkipped ? 'unskip' : 'skip') },
    { text: 'Duplicate', onPress: () => onAction('duplicate') },
    { text: 'Move to tomorrow', onPress: () => onAction('move-tomorrow') },
    { text: 'Delete', style: 'destructive', onPress: () => onAction('delete') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function confirmDeleteActivity(title: string, onConfirm: () => void) {
  Alert.alert('Delete activity', `Remove "${title}" from your schedule?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
