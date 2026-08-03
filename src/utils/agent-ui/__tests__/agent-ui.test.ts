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
  it('detects and parses dump/tap/exists/goto/reset urls', () => {
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
});

describe('agent-ui request handler', () => {
  beforeEach(() => {
    resetAgentUiRegistry();
    setAgentUiRoute(null);
    setAgentUiNavigator(null);
    mockWrite.mockClear();
    mockCreate.mockClear();
  });

  it('dumps registered elements and taps by id', async () => {
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

    await expect(
      handleAgentUiRequest({ op: 'tap', id: 'ontrack.tabs.travel' }),
    ).resolves.toBe(true);
    expect(press).toHaveBeenCalledTimes(1);

    await expect(
      handleAgentUiRequest({ op: 'exists', id: 'ontrack.tabs.travel' }),
    ).resolves.toBe(true);
    await expect(
      handleAgentUiRequest({ op: 'exists', id: 'missing' }),
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
});
