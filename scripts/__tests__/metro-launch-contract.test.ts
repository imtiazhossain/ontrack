import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

describe('metro launch command contract', () => {
  it('routes npm start family through the shared start-metro launcher', () => {
    const pkg = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.start).toBe('bash ./scripts/start-metro.sh');
    expect(pkg.scripts['start:clear']).toBe('bash ./scripts/start-metro.sh --clear');
    expect(pkg.scripts.ios).toBe('bash ./scripts/start-metro.sh --ios');
    expect(pkg.scripts.android).toBe('bash ./scripts/start-metro.sh --android');
    expect(pkg.scripts.web).toBe('bash ./scripts/start-metro.sh --web');

    for (const script of [
      pkg.scripts.start,
      pkg.scripts['start:clear'],
      pkg.scripts.ios,
      pkg.scripts.android,
      pkg.scripts.web,
    ]) {
      expect(script).not.toMatch(/--localhost/);
    }
  });

  it('binds with --lan and advertises REACT_NATIVE_PACKAGER_HOSTNAME', () => {
    const launcher = read('scripts/start-metro.sh');

    expect(launcher).toMatch(/expo start --lan/);
    expect(launcher).toContain('REACT_NATIVE_PACKAGER_HOSTNAME');
    expect(launcher).toContain('127.0.0.1');
    expect(launcher).toMatch(/Do not pass Expo `--localhost`/);
    expect(launcher).not.toMatch(/expo start[^\n]*--localhost/);
  });

  it('ensure-packager starts Metro via the shared launcher and detects IPv6-only', () => {
    const ensure = read('scripts/ensure-packager.sh');

    expect(ensure).toContain('scripts/start-metro.sh');
    expect(ensure).toContain('START_METRO_SH');
    expect(ensure).toContain('is_ipv6_only_metro');
    expect(ensure).toContain('Metro is bound to IPv6 only.');
    expect(ensure).toContain('print_packager_diagnostics');
    expect(ensure).toContain('stop_repo_metro_listeners');
    expect(ensure).toContain('pid_belongs_to_repo');
    expect(ensure).toContain('START_WAIT_SECS="${START_WAIT_SECS:-20}"');
    expect(ensure).not.toMatch(/nohup npm start/);
    expect(ensure).toContain('start_new_session=True');
    expect(ensure).toContain('Metro detached (new session)');
  });

  it('keeps Watchman hybrid crawl/watch and refuses dead subscriptions', () => {
    const metroConfig = read('metro.config.js');
    expect(metroConfig).toMatch(/resolver\.useWatchman\s*=\s*null/);
    expect(metroConfig).toMatch(/patch-expo-metro-watchman/);
    expect(metroConfig).toMatch(/healthCheck/);
    expect(metroConfig).toMatch(/enabled:\s*true/);

    const watchmanConfig = JSON.parse(read('.watchmanconfig')) as {
      ignore_dirs?: string[];
    };
    expect(watchmanConfig.ignore_dirs ?? []).toContain('node_modules');

    const patch = read('scripts/patch-expo-metro-watchman.sh');
    expect(patch).toContain('forceNodeFilesystemAPI');
    expect(patch).toContain('ontrack-watchman-hybrid');
    expect(patch).toContain('ontrack-node-crawl-hybrid');
    expect(patch).toContain('createFileMap-fork');

    const watcherLib = read('scripts/lib/metro-watcher.sh');
    expect(watcherLib).toContain('metro_has_watchman_client');
    expect(watcherLib).toContain('metro_watcher_healthy');
    expect(watcherLib).toContain('metro_entry_resolves');
    expect(watcherLib).toContain('metro_subscription_live');

    const ensure = read('scripts/ensure-packager.sh');
    expect(ensure).toContain('metro-watcher.sh');
    expect(ensure).toContain('ensure_metro_watcher');
    expect(ensure).toContain('CURSOR_AGENT');

    const launcher = read('scripts/start-metro.sh');
    expect(launcher).toContain('patch-expo-metro-watchman.sh');
    expect(launcher).toContain('wait_for_watchman');
  });

  it('reconnects the dev client whenever this run (re)launched Metro', () => {
    // A new Metro process orphans the app's HMR socket while the agent-ui
    // bridge (plain HTTP) keeps answering — probe_connected is a false
    // positive after a relaunch and must not short-circuit the reconnect.
    const ensure = read('scripts/ensure-packager.sh');
    expect(ensure).toContain('METRO_RELAUNCHED=0');
    expect(ensure).toContain('METRO_RELAUNCHED=1');
    expect(ensure).toMatch(/METRO_RELAUNCHED.*==\s*"1"[\s\S]*?reconnect_dev_client/);
  });

  it('heals a persisted Fast Refresh-off dev client toggle', () => {
    // RCTDevMenu.hotLoadingEnabled=0 persists per install and silently
    // disables HMR regardless of Metro/Watchman health.
    const ensure = read('scripts/ensure-packager.sh');
    expect(ensure).toContain('ensure_fast_refresh_enabled');
    expect(ensure).toContain('hotLoadingEnabled = 0');
    expect(ensure).toMatch(/defaults write "\$BUNDLE_ID" RCTDevMenu -dict-add hotLoadingEnabled -bool YES/);
  });

  it("live probe trusts Metro's watchman health check, not subscription since", () => {
    // debug-get-subscriptions reports the *initial* since only; requiring it
    // to advance made every ensure run falsely report a dead watcher.
    const watcherLib = read('scripts/lib/metro-watcher.sh');
    expect(watcherLib).toContain('metro_recent_health_check_ok');
    expect(watcherLib).toMatch(/Health check result/);
    expect(watcherLib).toMatch(/never required/);
  });

  it('hooks and agent-ui heal keep Metro alive across agent shells', () => {
    const hooks = JSON.parse(read('.cursor/hooks.json')) as {
      hooks: Record<string, Array<{ command: string }>>;
    };
    expect(hooks.hooks.sessionStart?.[0]?.command).toContain('ensure-packager-session.sh');
    expect(hooks.hooks.beforeShellExecution?.[0]?.command).toContain('block-shell-tied-metro.sh');

    const host = read('scripts/lib/agent-ui-host.sh');
    expect(host).toContain('agent_ui_heal_packager');
    expect(host).toContain('AGENT_UI_SKIP_HEAL');

    const open = read('scripts/agent-ui-open.sh');
    expect(open).toContain('agent_ui_heal_packager');
  });
});
