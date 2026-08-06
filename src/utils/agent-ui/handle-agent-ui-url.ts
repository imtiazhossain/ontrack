import { Platform } from 'react-native';

import { formatAgentUiSeedDetail, seedAgentUiFixture } from './fixtures';
import {
  AGENT_UI_ANDROID_WAIT_TIMEOUT_MS,
  AGENT_UI_WAIT_TIMEOUT_MS,
  resolveAgentUiFlow,
} from './flows';
import {
    isAgentUiOverlayEnabled,
    setAgentUiOverlayEnabled,
    toggleAgentUiOverlay,
} from './overlay';
import {
    writeAgentUiDump,
    writeAgentUiStatus,
    type AgentUiStatusResult,
} from './persist';
import {
    getAgentUiTarget,
    hitAgentUiTarget,
    hitAgentUiTargets,
    isAgentUiEnabled,
    listAgentUiTargets,
    tapAgentUiTarget,
} from './registry';
import {
    agentUiNavigate,
    getAgentUiRoute,
    resolveAgentUiDestination,
} from './route';
import { scrollAgentUiTargetIntoView } from './scroll-into-view';

export type AgentUiOp =
  | 'dump'
  | 'tap'
  | 'scroll'
  | 'exists'
  | 'prefix'
  | 'route'
  | 'goto'
  | 'reset'
  | 'batch'
  | 'wait'
  | 'seed'
  | 'flow'
  | 'assert'
  | 'hit'
  | 'overlay';

export type AgentUiRequest = {
  op?: string | string[];
  id?: string | string[];
  to?: string | string[];
  path?: string | string[];
  prefix?: string | string[];
  /** Logical window X for `op=hit` (points, not screenshot pixels). */
  x?: number | string | string[];
  /** Logical window Y for `op=hit` (points, not screenshot pixels). */
  y?: number | string | string[];
  /** Pure settle delay (ms) before wait polling / as standalone delay. */
  ms?: number | string | string[];
  /** Max poll window for wait (ms). Default 2000 iOS / 4000 Android. */
  timeoutMs?: number | string | string[];
  /** Assert: label must contain this substring (case-insensitive). */
  contains?: string | string[];
  /** Assert: id must be absent when true. */
  missing?: boolean | string | string[];
  /** Batch / flow steps. */
  ops?: AgentUiRequest[];
  /** When true on tap/goto, also rewrite the dump file (default false). */
  refreshDump?: boolean | string | string[];
  /** Host/daemon correlation id (echoed on status). */
  nonce?: number | string | string[];
  /** Host pin: ios | android (daemon routes per platform). */
  platform?: string | string[];
};

export type ParsedAgentUiUrl = {
  op: AgentUiOp;
  id?: string;
  to?: string;
  prefix?: string;
  x?: string;
  y?: string;
};

const AGENT_UI_PATH = /(?:^|\/)agent\/ui\/?$/i;
const OPS = new Set<AgentUiOp>([
  'dump',
  'tap',
  'scroll',
  'exists',
  'prefix',
  'route',
  'goto',
  'reset',
  'batch',
  'wait',
  'seed',
  'flow',
  'assert',
  'hit',
  'overlay',
]);

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
    const prefix = parsed.searchParams.get('prefix') ?? undefined;
    const x = parsed.searchParams.get('x') ?? undefined;
    const y = parsed.searchParams.get('y') ?? undefined;
    return {
      op,
      ...(id ? { id } : {}),
      ...(to ? { to } : {}),
      ...(prefix ? { prefix } : {}),
      ...(x ? { x } : {}),
      ...(y ? { y } : {}),
    };
  } catch {
    const opMatch = /[?&]op=([^&]+)/i.exec(url);
    const idMatch = /[?&]id=([^&]+)/i.exec(url);
    const toMatch = /[?&](?:to|path)=([^&]+)/i.exec(url);
    const prefixMatch = /[?&]prefix=([^&]+)/i.exec(url);
    const xMatch = /[?&]x=([^&]+)/i.exec(url);
    const yMatch = /[?&]y=([^&]+)/i.exec(url);
    const id = idMatch?.[1] ? decodeURIComponent(idMatch[1]) : undefined;
    const to = toMatch?.[1] ? decodeURIComponent(toMatch[1]) : undefined;
    const prefix = prefixMatch?.[1]
      ? decodeURIComponent(prefixMatch[1])
      : undefined;
    const x = xMatch?.[1] ? decodeURIComponent(xMatch[1]) : undefined;
    const y = yMatch?.[1] ? decodeURIComponent(yMatch[1]) : undefined;
    return {
      op: parseOp(opMatch?.[1] ?? 'dump'),
      ...(id ? { id } : {}),
      ...(to ? { to } : {}),
      ...(prefix ? { prefix } : {}),
      ...(x ? { x } : {}),
      ...(y ? { y } : {}),
    };
  }
}

export async function handleAgentUiUrl(url: string): Promise<boolean> {
  const parsed = parseAgentUiUrl(url);
  if (!parsed) return false;
  return handleAgentUiRequest(parsed);
}

/**
 * Run one agent-ui op. By default writes status (and dump only for `dump`).
 * Batch/flow steps pass `emitStatus: false` and collect results.
 */
export async function handleAgentUiRequest(
  request: AgentUiRequest,
  options: { emitStatus?: boolean } = {},
): Promise<boolean> {
  const emitStatus = options.emitStatus !== false;

  if (!isAgentUiEnabled()) {
    if (emitStatus) {
      await writeAgentUiStatus({
        op: String(asSingle(request.op) ?? 'dump'),
        id: asSingle(request.id),
        ok: false,
        detail: 'Agent UI bridge is only available in __DEV__ builds.',
      });
    }
    return false;
  }

  const op = parseOp(asSingle(request.op) ?? 'dump');
  const id = asSingle(request.id);
  const to = asSingle(request.to) ?? asSingle(request.path);
  const prefix = asSingle(request.prefix) ?? (op === 'prefix' ? id : undefined);
  const refreshDump = asBool(request.refreshDump);

  if (op === 'flow') {
    const flowName = to ?? id;
    const steps = resolveAgentUiFlow(flowName);
    if (!steps) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op: 'flow',
          ok: false,
          detail: `Unknown flow: ${flowName ?? '(missing)'}`,
        });
      }
      return false;
    }
    // Expand inline so status.op stays `flow` (host scripts wait on that).
    const results: AgentUiStatusResult[] = [];
    let allOk = true;
    for (const step of steps) {
      const stepOp = parseOp(asSingle(step.op) ?? 'dump');
      const ok = await handleAgentUiRequest(step, { emitStatus: false });
      const stepId =
        asSingle(step.id) ?? asSingle(step.prefix) ?? asSingle(step.to);
      results.push({
        op: stepOp,
        id: stepId,
        ok,
        route: getAgentUiRoute(),
        detail: ok ? 'ok' : 'failed',
      });
      if (!ok) {
        allOk = false;
        break;
      }
    }
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'flow',
        id: flowName,
        ok: allOk,
        detail: `${results.filter((r) => r.ok).length}/${steps.length} ok`,
        results,
        route: getAgentUiRoute(),
      });
    }
    return allOk;
  }

  if (op === 'batch') {
    const ops = Array.isArray(request.ops) ? request.ops : [];
    if (ops.length === 0) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op: 'batch',
          ok: false,
          detail: 'Missing ops array for batch.',
          results: [],
        });
      }
      return false;
    }
    const results: AgentUiStatusResult[] = [];
    let allOk = true;
    for (const step of ops) {
      const stepOp = parseOp(asSingle(step.op) ?? 'dump');
      const ok = await handleAgentUiRequest(step, { emitStatus: false });
      const stepId =
        asSingle(step.id) ?? asSingle(step.prefix) ?? asSingle(step.to);
      results.push({
        op: stepOp,
        id: stepId,
        ok,
        route: getAgentUiRoute(),
        detail: ok ? 'ok' : 'failed',
      });
      if (!ok) {
        allOk = false;
        break;
      }
    }
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'batch',
        ok: allOk,
        detail: `${results.filter((r) => r.ok).length}/${ops.length} ok`,
        results,
        route: getAgentUiRoute(),
      });
    }
    return allOk;
  }

  if (op === 'seed') {
    const seeded = seedAgentUiFixture(to ?? id);
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'seed',
        ok: Boolean(seeded),
        detail: seeded
          ? formatAgentUiSeedDetail(seeded)
          : `Unknown fixture: ${to ?? id ?? '(missing)'}`,
        id: seeded?.primaryId,
        route: getAgentUiRoute(),
      });
    }
    return Boolean(seeded);
  }

  if (op === 'assert') {
    return await runAssert(request, { id, prefix, to, emitStatus });
  }

  if (op === 'wait') {
    const settleMs = Math.max(0, asNumber(request.ms) ?? 0);
    const defaultWaitMs =
      Platform.OS === 'android'
        ? AGENT_UI_ANDROID_WAIT_TIMEOUT_MS
        : AGENT_UI_WAIT_TIMEOUT_MS;
    const timeoutMs = Math.max(
      settleMs,
      asNumber(request.timeoutMs) ??
        (hasWaitTarget(id, prefix, to) ? defaultWaitMs : settleMs || 0),
    );
    if (settleMs > 0) await sleep(settleMs);

    const routeTarget = to;
    const started = Date.now();
    const poll = () => {
      if (id && getAgentUiTarget(id)) return true;
      if (
        prefix &&
        listAgentUiTargets().some((e) => e.testID.startsWith(prefix))
      ) {
        return true;
      }
      if (routeTarget && routeMatches(getAgentUiRoute(), routeTarget)) {
        return true;
      }
      return false;
    };

    if (!hasWaitTarget(id, prefix, routeTarget)) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op: 'wait',
          ok: true,
          detail: `delayed ${settleMs}ms`,
          route: getAgentUiRoute(),
        });
      }
      return true;
    }

    let ok = poll();
    while (!ok && Date.now() - started < timeoutMs) {
      await sleep(16);
      ok = poll();
    }
    const count = prefix
      ? listAgentUiTargets().filter((e) => e.testID.startsWith(prefix)).length
      : undefined;
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'wait',
        id: id ?? prefix ?? routeTarget,
        ok,
        detail: ok
          ? `ready after ${Date.now() - started}ms`
          : `timed out after ${timeoutMs}ms`,
        count,
        route: getAgentUiRoute(),
      });
    }
    return ok;
  }

  if (op === 'dump') {
    const dump = writeAgentUiDump();
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'dump',
        ok: true,
        detail: `Wrote ${dump.count} elements.`,
        count: dump.count,
        route: dump.route,
        // Host materializes Android dumps from status (no simctl container).
        elements: dump.elements,
      });
    }
    return true;
  }

  if (op === 'overlay') {
    const mode = (to ?? id ?? 'toggle').trim().toLowerCase();
    let enabled = isAgentUiOverlayEnabled();
    if (mode === 'on' || mode === '1' || mode === 'true' || mode === 'yes') {
      setAgentUiOverlayEnabled(true);
      enabled = true;
    } else if (
      mode === 'off' ||
      mode === '0' ||
      mode === 'false' ||
      mode === 'no'
    ) {
      setAgentUiOverlayEnabled(false);
      enabled = false;
    } else if (mode === 'status' || mode === 'get') {
      // leave as-is
    } else {
      enabled = toggleAgentUiOverlay();
    }
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'overlay',
        ok: true,
        detail: enabled ? 'overlay on' : 'overlay off',
        id: enabled ? 'on' : 'off',
        route: getAgentUiRoute(),
      });
    }
    return true;
  }

  if (op === 'hit') {
    const x = asNumber(request.x) ?? asNumber(asSingle(request.id)?.split(',')[0]);
    const y =
      asNumber(request.y) ??
      asNumber(asSingle(request.id)?.split(',')[1]) ??
      asNumber(to);
    if (x === undefined || y === undefined) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op: 'hit',
          ok: false,
          detail: 'Missing x/y (logical window points).',
          route: getAgentUiRoute(),
        });
      }
      return false;
    }
    const element = hitAgentUiTarget(x, y);
    const stack = hitAgentUiTargets(x, y);
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'hit',
        id: element?.testID,
        ok: Boolean(element),
        detail: element
          ? `hit ${element.testID} @ (${x},${y}) stack=${stack.length}`
          : `no target @ (${x},${y})`,
        element,
        count: stack.length,
        route: getAgentUiRoute(),
      });
    }
    return Boolean(element);
  }

  if (op === 'route') {
    const route = getAgentUiRoute();
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'route',
        ok: Boolean(route),
        detail: route ?? 'unknown',
        route,
      });
    }
    return Boolean(route);
  }

  if (op === 'prefix') {
    if (!prefix) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op: 'prefix',
          ok: false,
          detail: 'Missing prefix.',
          count: 0,
        });
      }
      return false;
    }
    const count = listAgentUiTargets().filter((e) =>
      e.testID.startsWith(prefix),
    ).length;
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'prefix',
        id: prefix,
        ok: count > 0,
        detail: count > 0 ? `matches=${count}` : 'no matches',
        count,
        route: getAgentUiRoute(),
      });
    }
    return count > 0;
  }

  if (op === 'reset' || op === 'goto') {
    const destination = resolveAgentUiDestination(
      op === 'reset' ? 'reset' : to,
    );
    if (!destination) {
      if (emitStatus) {
        await writeAgentUiStatus({
          op,
          ok: false,
          detail: 'Missing to/path destination for goto.',
        });
      }
      return false;
    }
    // Unblock the host before router.replace — on Android, solo goto/reset
    // can stall inside navigate/Documents I/O and never post a post-nav status
    // (batch steps skip emitStatus and still succeed). Re-post if navigate fails.
    if (emitStatus) {
      await writeAgentUiStatus({
        op,
        ok: true,
        detail: `Navigated to ${destination}`,
        route: destination,
      });
    }
    const ok = Boolean(agentUiNavigate(destination));
    if (emitStatus && !ok) {
      await writeAgentUiStatus({
        op,
        ok: false,
        detail: 'Navigator not ready (wait for app mount).',
        route: getAgentUiRoute(),
      });
    }
    if (ok && refreshDump) {
      try {
        writeAgentUiDump();
      } catch {
        /* best-effort */
      }
    }
    return ok;
  }

  if (!id) {
    if (emitStatus) {
      await writeAgentUiStatus({
        op,
        ok: false,
        detail: 'Missing id query parameter.',
      });
    }
    return false;
  }

  if (op === 'exists') {
    const element = getAgentUiTarget(id);
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'exists',
        id,
        ok: Boolean(element),
        detail: element ? 'found' : 'not found',
        element,
        route: getAgentUiRoute(),
      });
    }
    return Boolean(element);
  }

  if (op === 'scroll') {
    const scrolled = await scrollAgentUiTargetIntoView(id);
    if (emitStatus) {
      await writeAgentUiStatus({
        op: 'scroll',
        id,
        ok: scrolled,
        detail: scrolled
          ? 'scrolled into view'
          : 'not found or no active scroll container',
        element: getAgentUiTarget(id),
        route: getAgentUiRoute(),
      });
    }
    if (scrolled && refreshDump) writeAgentUiDump();
    return scrolled;
  }

  if (op !== 'tap') {
    if (emitStatus) {
      await writeAgentUiStatus({
        op,
        id,
        ok: false,
        detail: `Unsupported op with id: ${op}`,
        route: getAgentUiRoute(),
      });
    }
    return false;
  }

  const tapped = tapAgentUiTarget(id);
  if (emitStatus) {
    await writeAgentUiStatus({
      op: 'tap',
      id,
      ok: tapped,
      detail: tapped ? 'tapped' : 'not found or not tappable',
      element: getAgentUiTarget(id),
      route: getAgentUiRoute(),
    });
  }
  if (tapped && refreshDump) writeAgentUiDump();
  return tapped;
}

function hasWaitTarget(
  id: string | undefined,
  prefix: string | undefined,
  routeTarget: string | undefined,
): boolean {
  return Boolean(id || prefix || routeTarget);
}

function asTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  if (Array.isArray(value)) return asTruthyFlag(value[0]);
  return false;
}

async function runAssert(
  request: AgentUiRequest,
  opts: {
    id?: string;
    prefix?: string;
    to?: string;
    emitStatus: boolean;
  },
): Promise<boolean> {
  const { id, prefix, to, emitStatus } = opts;
  const contains = asSingle(request.contains);
  const wantMissing = asTruthyFlag(request.missing);
  const checks: AgentUiStatusResult[] = [];
  const route = getAgentUiRoute();

  if (id) {
    const element = getAgentUiTarget(id);
    const found = Boolean(element);
    if (wantMissing) {
      checks.push({
        op: 'missing',
        id,
        ok: !found,
        detail: found ? 'still registered' : 'absent',
        element,
        route,
      });
    } else {
      checks.push({
        op: 'exists',
        id,
        ok: found,
        detail: found ? 'found' : 'not found',
        element,
        route,
      });
      if (contains) {
        const label = element?.label ?? '';
        const value = element?.value ?? '';
        const needle = contains.toLowerCase();
        const inLabel = label.toLowerCase().includes(needle);
        const inValue = value.toLowerCase().includes(needle);
        const ok = inLabel || inValue;
        checks.push({
          op: 'label',
          id,
          ok: found && ok,
          detail: found
            ? ok
              ? inValue && !inLabel
                ? `value contains "${contains}"`
                : `label contains "${contains}"`
              : `label "${label}" value "${value}" missing "${contains}"`
            : 'missing element for label check',
          element,
          route,
        });
      }
    }
  } else if (wantMissing) {
    checks.push({
      op: 'missing',
      ok: false,
      detail: 'Missing id for missing assert.',
      route,
    });
  } else if (contains) {
    checks.push({
      op: 'label',
      ok: false,
      detail: 'Missing id for label contains assert.',
      route,
    });
  }

  if (prefix) {
    const count = listAgentUiTargets().filter((e) =>
      e.testID.startsWith(prefix),
    ).length;
    checks.push({
      op: 'prefix',
      id: prefix,
      ok: count > 0,
      detail: count > 0 ? `matches=${count}` : 'no matches',
      count,
      route,
    });
  }

  if (to) {
    const ok = routeMatches(route, to);
    checks.push({
      op: 'route',
      id: to,
      ok,
      detail: ok ? `route=${route}` : `route=${route ?? 'unknown'} want=${to}`,
      route,
    });
  }

  const ok = checks.length > 0 && checks.every((c) => c.ok);
  if (emitStatus) {
    await writeAgentUiStatus({
      op: 'assert',
      id: id ?? prefix ?? to,
      ok,
      detail:
        checks.length === 0
          ? 'assert requires --exists/--missing/--prefix/--route/--contains'
          : ok
            ? `${checks.length} check(s) passed`
            : checks
                .filter((c) => !c.ok)
                .map((c) => c.detail || c.op)
                .join('; '),
      results: checks,
      route,
      element: id ? getAgentUiTarget(id) : undefined,
      count: prefix
        ? listAgentUiTargets().filter((e) => e.testID.startsWith(prefix)).length
        : undefined,
    });
  }
  return ok;
}

function routeMatches(current: string | null, target: string): boolean {
  if (!current) return false;
  const resolved = resolveAgentUiDestination(target) ?? target;
  const want = resolved.split('?')[0];
  if (current === want) return true;
  if (current.endsWith(want)) return true;
  if (want !== '/' && current.includes(want)) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asNumber(
  value: number | string | string[] | undefined,
): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = asSingle(
    typeof value === 'string' || Array.isArray(value) ? value : undefined,
  );
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function asBool(value: boolean | string | string[] | undefined): boolean {
  if (typeof value === 'boolean') return value;
  const raw = asSingle(
    typeof value === 'string' || Array.isArray(value) ? value : undefined,
  );
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true';
}
