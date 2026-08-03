import { redirectIncomingSystemPath } from '@/features/calendar-import/navigation';
import { handleAgentUiUrl } from '@/utils/agent-ui';

function agentUiUrlFromSystemPath(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const trimmed = path.replace(/^\/+/, '');
  return `ontrack:///${trimmed}`;
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  // Keep the current screen mounted: handle dump/tap here and skip routing.
  if (/agent\/ui/i.test(path)) {
    void handleAgentUiUrl(agentUiUrlFromSystemPath(path));
    return null;
  }
  return redirectIncomingSystemPath(path);
}
