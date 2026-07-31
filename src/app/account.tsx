import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSession } from '@/features/auth/auth-provider';
import { AuthScreen } from '@/features/auth/auth-screen';
import { isSafeAuthReturnTo } from '@/utils/auth-return-to';

export default function AccountUpgradeScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user } = useAuthSession();

  useEffect(() => {
    if (user && isSafeAuthReturnTo(returnTo)) {
      router.replace(returnTo as never);
    }
  }, [returnTo, router, user]);

  return <AuthScreen variant="upgrade" returnTo={returnTo} />;
}
