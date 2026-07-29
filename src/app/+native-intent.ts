import { redirectIncomingSystemPath } from '@/features/calendar-import/navigation';

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  return redirectIncomingSystemPath(path);
}
