import { DevAccessGate } from '@/features/account/dev-access-gate';
import { DesignSystemGallery } from '@/features/design-system/design-system-gallery';

export default function DesignSystemRoute() {
  return (
    <DevAccessGate>
      <DesignSystemGallery />
    </DevAccessGate>
  );
}
