import {
    handleAgentUiRequest,
    isAgentUiUrl,
    parseAgentUiUrl,
} from '../handle-agent-ui-url';
import {
    listAgentUiTargets,
    registerAgentUiTarget,
    resetAgentUiRegistry,
    tapAgentUiTarget,
    unregisterAgentUiTarget,
} from '../registry';
import {
    agentUiDeepLinkForDestination,
    expandAgentUiShortcuts,
    resolveAgentUiDestination,
    setAgentUiNavigator,
    setAgentUiRoute,
} from '../route';

const mockWrite = jest.fn();
const mockCreate = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  File: jest.fn().mockImplementation(() => ({
    exists: false,
    create: mockCreate,
    write: mockWrite,
  })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '127.0.0.1:8081' } },
}));

jest.mock('../http-bridge', () => ({
  getAgentUiActiveNonce: jest.fn(() => undefined),
  postAgentUiStatus: jest.fn(async () => undefined),
  setAgentUiActiveNonce: jest.fn(),
  fetchAgentUiCommand: jest.fn(async () => null),
  probeAgentUiHttp: jest.fn(async () => false),
  resolveAgentUiHttpBase: jest.fn(() => 'http://127.0.0.1:8191'),
  resetAgentUiHttpBaseCache: jest.fn(),
}));

describe('agent-ui registry', () => {
  beforeEach(() => {
    resetAgentUiRegistry();
    mockWrite.mockClear();
    mockCreate.mockClear();
  });

  it('registers, lists, taps, and unregisters targets', () => {
    const press = jest.fn();
    registerAgentUiTarget('ontrack.tabs.travel', {
      label: 'Travel',
      frame: { x: 10, y: 20, width: 40, height: 44 },
      press,
    });

    expect(listAgentUiTargets()).toEqual([
      {
        testID: 'ontrack.tabs.travel',
        label: 'Travel',
        frame: { x: 10, y: 20, width: 40, height: 44 },
        tappable: true,
      },
    ]);

    expect(tapAgentUiTarget('ontrack.tabs.travel')).toBe(true);
    expect(press).toHaveBeenCalledTimes(1);
    expect(tapAgentUiTarget('missing')).toBe(false);

    unregisterAgentUiTarget('ontrack.tabs.travel');
    expect(listAgentUiTargets()).toEqual([]);
  });
});

describe('agent-ui url parsing', () => {
  it('detects and parses dump/tap/exists/goto/reset/route/prefix urls', () => {
    expect(isAgentUiUrl('ontrack://agent/ui?op=dump')).toBe(true);
    expect(parseAgentUiUrl('ontrack://agent/ui?op=dump')).toEqual({
      op: 'dump',
    });
    expect(
      parseAgentUiUrl('ontrack://agent/ui?op=tap&id=ontrack.tabs.travel'),
    ).toEqual({
      op: 'tap',
      id: 'ontrack.tabs.travel',
    });
    expect(
      parseAgentUiUrl('ontrack://agent/ui?op=scroll&id=ontrack.profile.tmdb'),
    ).toEqual({
      op: 'scroll',
      id: 'ontrack.profile.tmdb',
    });
    expect(
      parseAgentUiUrl('ontrack://agent/ui?op=exists&id=ontrack.tabs.travel'),
    ).toEqual({
      op: 'exists',
      id: 'ontrack.tabs.travel',
    });
    expect(parseAgentUiUrl('ontrack://agent/ui?op=goto&to=calendar')).toEqual({
      op: 'goto',
      to: 'calendar',
    });
    expect(parseAgentUiUrl('ontrack://agent/ui?op=reset')).toEqual({
      op: 'reset',
    });
    expect(parseAgentUiUrl('ontrack://agent/ui?op=route')).toEqual({
      op: 'route',
    });
    expect(
      parseAgentUiUrl(
        'ontrack://agent/ui?op=prefix&prefix=ontrack.travel.',
      ),
    ).toEqual({
      op: 'prefix',
      prefix: 'ontrack.travel.',
    });
    expect(isAgentUiUrl('ontrack://travel/abc')).toBe(false);
  });
});

describe('agent-ui routes', () => {
  it('resolves aliases and deep links', () => {
    expect(resolveAgentUiDestination('today')).toBe('/');
    expect(resolveAgentUiDestination('checklists')).toBe('/to-do');
    expect(resolveAgentUiDestination('travel/abc')).toBe('/travel/abc');
    expect(resolveAgentUiDestination('/profile')).toBe('/profile');
    expect(agentUiDeepLinkForDestination('reset')).toBe('ontrack:///');
    expect(agentUiDeepLinkForDestination('calendar')).toBe(
      'ontrack:///calendar',
    );
  });

  it('expands nested travel shortcuts and preserves query strings', () => {
    expect(expandAgentUiShortcuts('travel/abc/add/flight')).toBe(
      '/travel/abc?add=flight',
    );
    expect(expandAgentUiShortcuts('travel/abc/add/timeline')).toBe(
      '/travel/abc?add=timeline',
    );
    expect(expandAgentUiShortcuts('travel/abc/import')).toBe(
      '/travel/abc?previewModal=import',
    );
    expect(expandAgentUiShortcuts('travel/abc/expense')).toBe(
      '/travel/abc?previewModal=expense',
    );
    expect(expandAgentUiShortcuts('travel/abc/expense-saved')).toBe(
      '/travel/abc?previewModal=expense-saved',
    );
    expect(expandAgentUiShortcuts('travel/abc/stay-booking')).toBe(
      '/travel/abc?openStayBooking=1',
    );
    expect(expandAgentUiShortcuts('health/mood')).toBe('/health/mood-check-in');
    expect(expandAgentUiShortcuts('checklists/list-1')).toBe('/to-do/list-1');
    expect(expandAgentUiShortcuts('checklists/list-1/recipe-import')).toBe(
      '/todos/list-1/recipe-import',
    );
    expect(expandAgentUiShortcuts('plants/new')).toBe('/plants/new');
    expect(resolveAgentUiDestination('travel/abc?add=stay')).toBe(
      '/travel/abc?add=stay',
    );
    expect(resolveAgentUiDestination('travel/abc/add/flight')).toBe(
      '/travel/abc?add=flight',
    );
    expect(agentUiDeepLinkForDestination('travel/abc/import')).toBe(
      'ontrack:///travel/abc?previewModal=import',
    );
  });
});

describe('agent-ui request handler', () => {
  beforeEach(() => {
    resetAgentUiRegistry();
    setAgentUiRoute(null);
    setAgentUiNavigator(null);
    mockWrite.mockClear();
    mockCreate.mockClear();
  });

  it('skips Documents dump/status mirrors on Android', async () => {
    const Platform = require('react-native').Platform as { OS: string };
    const previous = Platform.OS;
    Platform.OS = 'android';
    try {
      setAgentUiRoute('/travel');
      registerAgentUiTarget('ontrack.tabs.travel', {
        label: 'Travel',
        frame: { x: 1, y: 2, width: 3, height: 4 },
      });
      await expect(handleAgentUiRequest({ op: 'dump' })).resolves.toBe(true);
      expect(mockWrite).not.toHaveBeenCalled();
    } finally {
      Platform.OS = previous;
    }
  });

  it('dumps registered elements and taps by id without rewriting dump', async () => {
    const press = jest.fn();
    setAgentUiRoute('/travel');
    registerAgentUiTarget('ontrack.tabs.travel', {
      label: 'Travel',
      press,
      frame: { x: 1, y: 2, width: 3, height: 4 },
    });

    await expect(handleAgentUiRequest({ op: 'dump' })).resolves.toBe(true);
    expect(mockWrite).toHaveBeenCalled();
    const dumpPayload = JSON.parse(mockWrite.mock.calls[0][0] as string);
    expect(dumpPayload.route).toBe('/travel');
    expect(dumpPayload.screen).toEqual(
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        scale: expect.any(Number),
      }),
    );
    const writesAfterDump = mockWrite.mock.calls.length;

    await expect(
      handleAgentUiRequest({ op: 'tap', id: 'ontrack.tabs.travel' }),
    ).resolves.toBe(true);
    expect(press).toHaveBeenCalledTimes(1);
    // Status write only — no dump rewrite after tap.
    expect(mockWrite.mock.calls.length).toBe(writesAfterDump + 1);
    const statusPayload = JSON.parse(
      mockWrite.mock.calls[writesAfterDump][0] as string,
    );
    expect(statusPayload.op).toBe('tap');
    expect(statusPayload.ok).toBe(true);

    await expect(
      handleAgentUiRequest({ op: 'exists', id: 'ontrack.tabs.travel' }),
    ).resolves.toBe(true);
    await expect(
      handleAgentUiRequest({ op: 'exists', id: 'missing' }),
    ).resolves.toBe(false);
  });

  it('supports cheap route and prefix probes', async () => {
    setAgentUiRoute('/calendar');
    registerAgentUiTarget('ontrack.calendar.day', { label: 'Day' });
    registerAgentUiTarget('ontrack.calendar.next', { label: 'Next' });

    await expect(handleAgentUiRequest({ op: 'route' })).resolves.toBe(true);
    const routeStatus = JSON.parse(
      mockWrite.mock.calls.at(-1)?.[0] as string,
    );
    expect(routeStatus).toMatchObject({
      op: 'route',
      ok: true,
      route: '/calendar',
    });

    await expect(
      handleAgentUiRequest({ op: 'prefix', prefix: 'ontrack.calendar.' }),
    ).resolves.toBe(true);
    const prefixStatus = JSON.parse(
      mockWrite.mock.calls.at(-1)?.[0] as string,
    );
    expect(prefixStatus).toMatchObject({
      op: 'prefix',
      ok: true,
      count: 2,
    });

    await expect(
      handleAgentUiRequest({ op: 'prefix', prefix: 'ontrack.travel.' }),
    ).resolves.toBe(false);
  });

  it('navigates via goto and reset when a navigator is registered', async () => {
    const navigate = jest.fn();
    setAgentUiNavigator(navigate);

    await expect(
      handleAgentUiRequest({ op: 'goto', to: 'calendar' }),
    ).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('/calendar');

    await expect(handleAgentUiRequest({ op: 'reset' })).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('runs batch ops and stops on first failure', async () => {
    const navigate = jest.fn();
    const press = jest.fn();
    setAgentUiNavigator(navigate);
    setAgentUiRoute('/travel');
    registerAgentUiTarget('ontrack.travel.newTrip.open', {
      label: 'New trip',
      press,
    });

    await expect(
      handleAgentUiRequest({
        op: 'batch',
        ops: [
          { op: 'goto', to: 'travel' },
          { op: 'tap', id: 'ontrack.travel.newTrip.open' },
          { op: 'exists', id: 'ontrack.travel.newTrip.open' },
        ],
      }),
    ).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('/travel');
    expect(press).toHaveBeenCalledTimes(1);
    const batchStatus = JSON.parse(mockWrite.mock.calls.at(-1)?.[0] as string);
    expect(batchStatus.op).toBe('batch');
    expect(batchStatus.ok).toBe(true);
    expect(batchStatus.results).toHaveLength(3);

    await expect(
      handleAgentUiRequest({
        op: 'batch',
        ops: [
          { op: 'tap', id: 'ontrack.travel.newTrip.open' },
          { op: 'tap', id: 'missing' },
          { op: 'tap', id: 'ontrack.travel.newTrip.open' },
        ],
      }),
    ).resolves.toBe(false);
    const failed = JSON.parse(mockWrite.mock.calls.at(-1)?.[0] as string);
    expect(failed.ok).toBe(false);
    expect(failed.results).toHaveLength(2);
    expect(press).toHaveBeenCalledTimes(2);
  });

  it('waits until a prefix appears', async () => {
    setAgentUiRoute('/travel');
    setTimeout(() => {
      registerAgentUiTarget('ontrack.travel.planDetail.weather', {
        label: 'Weather',
      });
    }, 60);

    await expect(
      handleAgentUiRequest({
        op: 'wait',
        prefix: 'ontrack.travel.planDetail.',
        timeoutMs: 1000,
        ms: 0,
      }),
    ).resolves.toBe(true);
  });

  it('runs named flows and keeps status.op=flow', async () => {
    const navigate = jest.fn();
    setAgentUiNavigator(navigate);
    registerAgentUiTarget('ontrack.calendar.day', { label: 'Day' });

    await expect(
      handleAgentUiRequest({ op: 'flow', to: 'calendar' }),
    ).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('/calendar');
    const flowStatus = JSON.parse(mockWrite.mock.calls.at(-1)?.[0] as string);
    expect(flowStatus.op).toBe('flow');
    expect(flowStatus.ok).toBe(true);
    expect(flowStatus.results?.length).toBeGreaterThanOrEqual(2);
  });

  it('asserts exists, route, label contains, and missing', async () => {
    setAgentUiRoute('/travel/trip-agent-ui-demo');
    registerAgentUiTarget('ontrack.travel.planDetail.weather', {
      label: 'Weather clear',
    });

    await expect(
      handleAgentUiRequest({
        op: 'assert',
        id: 'ontrack.travel.planDetail.weather',
        to: '/travel/trip-agent-ui-demo',
        contains: 'Weather',
      }),
    ).resolves.toBe(true);
    const okStatus = JSON.parse(mockWrite.mock.calls.at(-1)?.[0] as string);
    expect(okStatus.op).toBe('assert');
    expect(okStatus.ok).toBe(true);
    expect(okStatus.results?.length).toBeGreaterThanOrEqual(2);

    await expect(
      handleAgentUiRequest({
        op: 'assert',
        id: 'ontrack.travel.ghost',
        missing: true,
      }),
    ).resolves.toBe(true);

    await expect(
      handleAgentUiRequest({
        op: 'assert',
        id: 'ontrack.travel.planDetail.weather',
        contains: 'MissingText',
      }),
    ).resolves.toBe(false);
  });

  it('asserts --contains against registered Input value (not just label)', async () => {
    registerAgentUiTarget('ontrack.travel.flight.connectionAirport', {
      label: 'Connection airport',
      value: 'IAH',
    });

    await expect(
      handleAgentUiRequest({
        op: 'assert',
        id: 'ontrack.travel.flight.connectionAirport',
        contains: 'IAH',
      }),
    ).resolves.toBe(true);
    const status = JSON.parse(mockWrite.mock.calls.at(-1)?.[0] as string);
    expect(status.ok).toBe(true);
    expect(
      status.results?.some(
        (r: { op?: string; detail?: string }) =>
          r.op === 'label' && String(r.detail || '').includes('value contains'),
      ),
    ).toBe(true);
  });
});
