import { confirmDestructiveAction } from '../confirm-destructive';

jest.mock('@/components/primitives', () => ({
  appPrompt: {
    alert: jest.fn(),
  },
}));

const { appPrompt } = jest.requireMock('@/components/primitives') as {
  appPrompt: { alert: jest.Mock };
};

describe('confirmDestructiveAction', () => {
  beforeEach(() => {
    appPrompt.alert.mockClear();
  });

  it('presents cancel + destructive buttons', () => {
    const onConfirm = jest.fn();
    confirmDestructiveAction({
      title: 'Delete item?',
      message: 'Gone for good.',
      actionLabel: 'Remove',
      onConfirm,
    });
    expect(appPrompt.alert).toHaveBeenCalledWith(
      'Delete item?',
      'Gone for good.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onConfirm },
      ],
    );
  });
});
