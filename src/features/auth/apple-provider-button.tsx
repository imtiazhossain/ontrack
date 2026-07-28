import { AppleMark } from './provider-marks';
import { ProviderButton } from './provider-button';

export function AppleProviderButton({
  onPress,
  disabled,
  dark,
}: {
  onPress: () => void;
  disabled?: boolean;
  dark: boolean;
}) {
  const backgroundColor = dark ? '#FFFFFF' : '#000000';
  const textColor = dark ? '#000000' : '#FFFFFF';
  return (
    <ProviderButton
      icon={<AppleMark color={textColor} />}
      onPress={onPress}
      disabled={disabled}
      backgroundColor={backgroundColor}
      borderColor={backgroundColor}
      textColor={textColor}
      accessibilityLabel="Continue with Apple">
      Continue with Apple
    </ProviderButton>
  );
}
