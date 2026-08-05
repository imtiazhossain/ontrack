import { fireEvent, render, screen } from '@testing-library/react-native';

import { TravelSheetHeader } from '@/features/travel/travel-sheet';

describe('TravelSheetHeader smoke', () => {
  it('renders title and closes via the close control', () => {
    const onClose = jest.fn();
    render(
      <TravelSheetHeader
        eyebrow="Trip"
        title="Add Flight"
        onClose={onClose}
        closeAccessibilityLabel="Close add flight"
        closeTestID="ontrack.travel.addFlight.close"
      />,
    );
    expect(screen.getByText('Add Flight')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ontrack.travel.addFlight.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
