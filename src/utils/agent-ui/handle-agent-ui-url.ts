import {
  getAgentUiTarget,
  isAgentUiEnabled,
  tapAgentUiTarget,
} from './registry';
import { writeAgentUiDump, writeAgentUiStatus } from './persist';
import {
  agentUiNavigate,
  getAgentUiRoute,
  resolveAgentUiDestination,
} from './route';

export type AgentUiOp = 'dump' | 'tap' | 'exists' | 'goto' | 'reset';

export type ParsedAgentUiUrl = {
  op: AgentUiOp;
  id?: string;
  to?: string;
};

const AGENT_UI_PATH = /(?:^|\/)agent\/ui\/?$/i;
const OPS = new Set<AgentUiOp>(['dump', 'tap', 'exists', 'goto', 'reset']);

function parseOp(raw: string): AgentUiOp {
  const op = raw.toLowerCase() as AgentUiOp;
  return OPS.has(op) ? op : 'dump';
}

export function isAgentUiUrl(url: string): boolean {
  if (!url) return false;
  if (/agent\/ui/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (AGENT_UI_PATH.test(path) || path === '/agent/ui') return true;
    // Custom schemes sometimes put the host as the first path segment.
    if (parsed.host === 'agent' && (parsed.pathname === '/ui' || parsed.pathname === '/ui/')) {
      return true;
    }
    return false;
  } catch {
    return /agent\/ui/i.test(url);
  }
}

export function parseAgentUiUrl(url: string): ParsedAgentUiUrl | null {
  if (!isAgentUiUrl(url)) return null;
  try {
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(url)
      ? url
      : `ontrack:///${url.replace(/^\/+/, '')}`;
    const parsed = new URL(normalized);
    const op = parseOp(parsed.searchParams.get('op') ?? 'dump');
    const id = parsed.searchParams.get('id') ?? undefined;
    const to =
      parsed.searchParams.get('to') ??
      parsed.searchParams.get('path') ??
      undefined;
    return {
      op,
      id: id || undefined,
      to: to || undefined,
    };
  } catch {
    const opMatch = /[?&]op=([^&]+)/i.exec(url);
    const idMatch = /[?&]id=([^&]+)/i.exec(url);
    const toMatch = /[?&](?:to|path)=([^&]+)/i.exec(url);
    return {
      op: parseOp(opMatch?.[1] ?? 'dump'),
      id: idMatch?.[1] ? decodeURIComponent(idMatch[1]) : undefined,
      to: toMatch?.[1] ? decodeURIComponent(toMatch[1]) : undefined,
    };
  }
}

export async function handleAgentUiUrl(url: string): Promise<boolean> {
  const parsed = parseAgentUiUrl(url);
  if (!parsed) return false;
  return handleAgentUiRequest(parsed);
}

export async function handleAgentUiRequest(request: {
  op?: string | string[];
  id?: string | string[];
  to?: string | string[];
  path?: string | string[];
}): Promise<boolean> {
  if (!isAgentUiEnabled()) {
    writeAgentUiStatus({
      op: String(request.op ?? 'dump'),
      id: asSingle(request.id),
      ok: false,
      detail: 'Agent UI bridge is only available in __DEV__ builds.',
    });
    return false;
  }

  const op = parseOp(asSingle(request.op) ?? 'dump');
  const id = asSingle(request.id);
  const to = asSingle(request.to) ?? asSingle(request.path);

  if (op === 'dump') {
    const dump = writeAgentUiDump();
    writeAgentUiStatus({
      op: 'dump',
      ok: true,
      detail: `Wrote ${dump.count} elements.`,
      route: dump.route,
    });
    return true;
  }

  if (op === 'reset' || op === 'goto') {
    const destination = resolveAgentUiDestination(
      op === 'reset' ? 'reset' : to,
    );
    if (!destination) {
      writeAgentUiStatus({
        op,
        ok: false,
        detail: 'Missing to/path destination for goto.',
      });
      return false;
    }
    const ok = agentUiNavigate(destination);
    writeAgentUiStatus({
      op,
      ok,
      detail: ok
        ? `Navigated to ${destination}`
        : 'Navigator not ready (wait for app mount).',
      route: getAgentUiRoute(),
    });
    // Give navigation a tick, then refresh dump.
    writeAgentUiDump();
    return ok;
  }

  if (!id) {
    writeAgentUiStatus({
      op,
      ok: false,
      detail: 'Missing id query parameter.',
    });
    return false;
  }

  if (op === 'exists') {
    const element = getAgentUiTarget(id);
    writeAgentUiStatus({
      op: 'exists',
      id,
      ok: Boolean(element),
      detail: element ? 'found' : 'not found',
      element,
    });
    return Boolean(element);
  }

  const tapped = tapAgentUiTarget(id);
  writeAgentUiStatus({
    op: 'tap',
    id,
    ok: tapped,
    detail: tapped ? 'tapped' : 'not found or not tappable',
    element: getAgentUiTarget(id),
  });
  // Refresh dump after tap so hosts can re-read the tree.
  writeAgentUiDump();
  return tapped;
}

function asSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
