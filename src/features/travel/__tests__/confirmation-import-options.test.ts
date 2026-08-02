import {
  runConfirmationPicker,
  type ConfirmationImportOptions,
} from '../confirmation-import-options';

describe('runConfirmationPicker', () => {
  it('prepares before pick and dismisses after, even when cancelled', async () => {
    const phases: string[] = [];
    const options: ConfirmationImportOptions = {
      onPhase: (phase) => phases.push(phase),
      preparePicker: async () => {
        phases.push('prepare');
      },
      pickerWillPresent: () => {
        phases.push('will-present');
      },
      pickerDidDismiss: () => {
        phases.push('dismiss');
      },
    };

    const result = await runConfirmationPicker(options, async () => undefined);

    expect(result).toBeUndefined();
    expect(phases).toEqual(['picker', 'prepare', 'will-present', 'dismiss']);
  });

  it('still dismisses when the picker throws', async () => {
    const phases: string[] = [];
    await expect(
      runConfirmationPicker(
        {
          onPhase: (phase) => phases.push(phase),
          preparePicker: async () => {
            phases.push('prepare');
          },
          pickerWillPresent: () => {
            phases.push('will-present');
          },
          pickerDidDismiss: () => {
            phases.push('dismiss');
          },
        },
        async () => {
          throw new Error('picker failed');
        },
      ),
    ).rejects.toThrow('picker failed');
    expect(phases).toEqual(['picker', 'prepare', 'will-present', 'dismiss']);
  });
});
