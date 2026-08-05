import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/primitives/app-text';

describe('AppText smoke', () => {
  it('renders chrome label text', () => {
    render(
      <AppText variant="callout" fit>
        Save trip
      </AppText>,
    );
    expect(screen.getByText('Save trip')).toBeTruthy();
  });
});
