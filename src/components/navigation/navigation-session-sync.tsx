import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import {
    consumeNavigationRestorePath,
    rememberNavigationPathname,
} from '@/utils/navigation-session';

/**
 * Remembers the last in-app route for this JS session and restores it when
 * Fast Refresh remounts the Stack on the default Today tab.
 */
export function NavigationSessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  const didBootstrapRestore = useRef(false);

  useEffect(() => {
    if (!didBootstrapRestore.current) {
      didBootstrapRestore.current = true;
      const restoreTo = consumeNavigationRestorePath(pathname);
      if (restoreTo) {
        router.replace(restoreTo as never);
        return;
      }
    }
    rememberNavigationPathname(pathname);
  }, [pathname, router]);

  return null;
}
