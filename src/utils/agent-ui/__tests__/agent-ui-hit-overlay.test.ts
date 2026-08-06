import {
  handleAgentUiRequest,
  parseAgentUiUrl,
} from '../handle-agent-ui-url';
import {
  agentUiOverlayRoutePrefixes,
  agentUiOverlayShortLabel,
  dismissAgentUiFab,
  isAgentUiFabVisible,
  isAgentUiOverlayEnabled,
  isAgentUiOverlayPaintTarget,
  restoreAgentUiFab,
  setAgentUiOverlayEnabled,
} from '../overlay';
import {
  hitAgentUiTarget,
  hitAgentUiTargets,
  registerAgentUiTarget,
  remeasureAllAgentUiFrames,
  resetAgentUiRegistry,
} from '../registry';

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

describe('agent-ui hit-test', () => {
  beforeEach(() => {
    resetAgentUiRegistry();
    setAgentUiOverlayEnabled(false);
    mockWrite.mockClear();
  });

  it('prefers the smallest containing frame', () => {
    registerAgentUiTarget('ontrack.travel.planDetail.section.transport', {
      label: 'Transport',
      frame: { x: 0, y: 0, width: 300, height: 400 },
    });
    registerAgentUiTarget('ontrack.travel.planDetail.weather', {
      label: 'Weather',
      frame: { x: 20, y: 40, width: 80, height: 40 },
      press: () => undefined,
    });

    const hit = hitAgentUiTarget(40, 50);
    expect(hit?.testID).toBe('ontrack.travel.planDetail.weather');
    expect(hitAgentUiTargets(40, 50).map((e) => e.testID)).toEqual([
      'ontrack.travel.planDetail.weather',
      'ontrack.travel.planDetail.section.transport',
    ]);
  });

  it('handles op=hit via request', async () => {
    registerAgentUiTarget('ontrack.tabs.travel', {
      frame: { x: 100, y: 200, width: 50, height: 44 },
      press: () => undefined,
    });
    const ok = await handleAgentUiRequest({ op: 'hit', x: 110, y: 210 });
    expect(ok).toBe(true);
    const status = mockWrite.mock.calls.at(-1)?.[0] as string;
    expect(status).toContain('ontrack.tabs.travel');
  });
});

describe('agent-ui overlay', () => {
  beforeEach(() => {
    setAgentUiOverlayEnabled(false);
    // Ensure FAB is visible for each case (dismiss leaves it hidden).
    if (!isAgentUiFabVisible()) {
      setAgentUiOverlayEnabled(true);
      setAgentUiOverlayEnabled(false);
    }
    mockWrite.mockClear();
  });

  it('shortens wire ids for chips', () => {
    expect(
      agentUiOverlayShortLabel('ontrack.travel.planDetail.section.transport'),
    ).toBe('planDetail.section.transport');
  });

  it('paints only current-route targets (plus chrome)', () => {
    expect(agentUiOverlayRoutePrefixes('/profile')).toEqual(['profile', 'account']);
    expect(isAgentUiOverlayPaintTarget('ontrack.profile.addon.food', '/profile')).toBe(
      true,
    );
    expect(isAgentUiOverlayPaintTarget('ontrack.today.weather', '/profile')).toBe(false);
    expect(isAgentUiOverlayPaintTarget('ontrack.tabs.profile', '/profile')).toBe(true);
    expect(isAgentUiOverlayPaintTarget('ontrack.travel.planDetail.weather', '/travel/x')).toBe(
      true,
    );
  });

  it('remeasures registered node frames', () => {
    const measureInWindow = jest.fn((cb: (x: number, y: number, w: number, h: number) => void) => {
      cb(12, 34, 80, 44);
    });
    registerAgentUiTarget('ontrack.profile.homeLocation', {
      frame: { x: 0, y: 0, width: 10, height: 10 },
      node: { measureInWindow } as never,
    });

    expect(remeasureAllAgentUiFrames()).toBe(1);
    expect(measureInWindow).toHaveBeenCalled();
    expect(hitAgentUiTarget(20, 40)?.testID).toBe('ontrack.profile.homeLocation');
  });

  it('toggles via op=overlay', async () => {
    expect(isAgentUiOverlayEnabled()).toBe(false);
    await handleAgentUiRequest({ op: 'overlay', to: 'on' });
    expect(isAgentUiOverlayEnabled()).toBe(true);
    const onStatus = mockWrite.mock.calls.at(-1)?.[0] as string;
    expect(onStatus).toContain('overlay on');
    await handleAgentUiRequest({ op: 'overlay', to: 'off' });
    expect(isAgentUiOverlayEnabled()).toBe(false);
    await handleAgentUiRequest({ op: 'overlay', to: 'toggle' });
    expect(isAgentUiOverlayEnabled()).toBe(true);
  });

  it('hides the FAB on dismiss and restores it when overlay is turned on', () => {
    expect(isAgentUiFabVisible()).toBe(true);
    setAgentUiOverlayEnabled(true);
    dismissAgentUiFab();
    expect(isAgentUiFabVisible()).toBe(false);
    expect(isAgentUiOverlayEnabled()).toBe(false);

    setAgentUiOverlayEnabled(false);
    expect(isAgentUiFabVisible()).toBe(false);

    setAgentUiOverlayEnabled(true);
    expect(isAgentUiFabVisible()).toBe(true);
    expect(isAgentUiOverlayEnabled()).toBe(true);
  });

  it('restores a dismissed FAB without enabling overlay paint', () => {
    dismissAgentUiFab();
    expect(isAgentUiFabVisible()).toBe(false);
    expect(isAgentUiOverlayEnabled()).toBe(false);
    restoreAgentUiFab();
    expect(isAgentUiFabVisible()).toBe(true);
    expect(isAgentUiOverlayEnabled()).toBe(false);
  });


  it('parses hit/overlay urls', () => {
    expect(parseAgentUiUrl('ontrack://agent/ui?op=overlay&to=on')).toEqual({
      op: 'overlay',
      to: 'on',
    });
    expect(
      parseAgentUiUrl('ontrack://agent/ui?op=hit&x=12.5&y=80'),
    ).toMatchObject({
      op: 'hit',
      x: '12.5',
      y: '80',
    });
  });
});
