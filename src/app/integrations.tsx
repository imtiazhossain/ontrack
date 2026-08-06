import { ApiUsageScreen } from '@/features/account/api-usage-screen';
import { DevAccessGate } from '@/features/account/dev-access-gate';

export default function IntegrationsRoute() {
  return (
    <DevAccessGate>
      <ApiUsageScreen />
    </DevAccessGate>
  );
}
