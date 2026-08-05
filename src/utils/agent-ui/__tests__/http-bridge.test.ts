import {
    getAgentUiActiveNonce,
    resetAgentUiHttpBaseCache,
    resolveAgentUiHttpBase,
    setAgentUiActiveNonce,
} from '../http-bridge';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '127.0.0.1:8081' } },
}));

describe('agent-ui http bridge', () => {
  const originalEnv = process.env.EXPO_PUBLIC_AGENT_UI_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_AGENT_UI_URL;
    } else {
      process.env.EXPO_PUBLIC_AGENT_UI_URL = originalEnv;
    }
    resetAgentUiHttpBaseCache();
    setAgentUiActiveNonce(undefined);
  });

  it('prefers EXPO_PUBLIC_AGENT_UI_URL override', () => {
    process.env.EXPO_PUBLIC_AGENT_UI_URL = 'http://example.test:9/';
    resetAgentUiHttpBaseCache();
    expect(resolveAgentUiHttpBase()).toBe('http://example.test:9');
  });

  it('uses localhost daemon when packager host is loopback', () => {
    delete process.env.EXPO_PUBLIC_AGENT_UI_URL;
    resetAgentUiHttpBaseCache();
    expect(resolveAgentUiHttpBase()).toBe('http://127.0.0.1:8191');
  });

  it('tracks active nonce for status correlation', () => {
    setAgentUiActiveNonce(42);
    expect(getAgentUiActiveNonce()).toBe(42);
    setAgentUiActiveNonce(undefined);
    expect(getAgentUiActiveNonce()).toBeUndefined();
  });
});
