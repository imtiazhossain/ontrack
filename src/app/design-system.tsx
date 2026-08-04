import { Redirect } from 'expo-router';

import { DesignSystemGallery } from '@/features/design-system/design-system-gallery';

export default function DesignSystemRoute() {
  if (!__DEV__) return <Redirect href="/(tabs)/profile" />;
  return <DesignSystemGallery />;
}
