import { DevAccessGate } from '@/features/account/dev-access-gate';
import { DeveloperHub } from '@/features/account/developer-hub';

export default function DeveloperRoute() {
  return (
    <DevAccessGate>
      <DeveloperHub />
    </DevAccessGate>
  );
}
