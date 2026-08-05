import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/primitives/button';

describe('Button smoke', () => {
  it('fires onPress when enabled', () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} testID="ontrack.test.button">
        Continue
      </Button>,
    );
    fireEvent.press(screen.getByTestId('ontrack.test.button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
