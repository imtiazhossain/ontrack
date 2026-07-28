import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AuthScreen } from '@/features/auth/auth-screen';
import { useAuthSession } from '@/features/auth/auth-provider';

export default function AccountUpgradeScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user } = useAuthSession();

  useEffect(() => {
    if (user && returnTo?.startsWith('/')) {
      router.replace(returnTo as never);
    }
  }, [returnTo, router, user]);

  return <AuthScreen variant="upgrade" returnTo={returnTo} />;
}
