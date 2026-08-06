import { execFileSync } from 'node:child_process';
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

    // sessionStart must not open Simulator — only Metro keep-alive.
    const sessionHook = read('.cursor/hooks/ensure-packager-session.sh');
    expect(sessionHook).toContain('--metro-only');
    expect(sessionHook).not.toMatch(/ensure-packager\.sh" --start\s*$/);

    const ensure = read('scripts/ensure-packager.sh');
    expect(ensure).toContain('--metro-only');
    expect(ensure).toContain('Metro-only: skipping device boot/reconnect');

    const host = read('scripts/lib/agent-ui-host.sh');
    expect(host).toContain('agent_ui_heal_packager');
    expect(host).toContain('AGENT_UI_SKIP_HEAL');

    const open = read('scripts/agent-ui-open.sh');
    expect(open).toContain('agent_ui_heal_packager');
  });

  it('boots preferred simulator headless; GUI window is opt-in only', () => {
    const sim = read('scripts/lib/ios-simulator.sh');
    expect(sim).toContain('ONTRACK_IOS_SIMULATOR:=iPhone 17 Pro');
    expect(sim).toContain('ONTRACK_IOS_SIMULATOR_WINDOW:=0');
    expect(sim).toContain('ios_sim_want_window');
    expect(sim).toContain('Booting preferred simulator (headless)');
    // Window open is gated — never unconditional open in ensure_preferred.
    expect(sim).toMatch(/if ios_sim_want_window; then[\s\S]*?ios_sim_open_focused/);
    expect(sim).toContain('-CurrentDeviceUDID');
    expect(sim).toContain('ios_sim_prune_peers_briefly');
  });

  it('boots preferred Android emulator headless; GUI window is opt-in only', () => {
    const emu = read('scripts/lib/android-emulator.sh');
    expect(emu).toContain('ONTRACK_ANDROID_AVD:=Galaxy_S26');
    expect(emu).toContain('ONTRACK_ANDROID_EMULATOR_WINDOW:=0');
    expect(emu).toContain('android_emu_want_window');
    expect(emu).toContain('Booting preferred emulator (headless)');
    expect(emu).toContain('-no-window');
    expect(emu).toContain('no-boot-anim');
    expect(emu).toContain('hw.keyboard');
    expect(emu).toContain('android_emu_ensure_hw_keyboard');
    expect(emu).toContain('android_emu_set_clipboard');
    // Must detach like Metro — nohup alone dies with Cursor agent shells.
    expect(emu).toContain('start_new_session=True');
    expect(emu).toContain('Emulator detached (new session)');
    const ensure = read('scripts/ensure-android-emulator.sh');
    expect(ensure).toContain('ensure_preferred_android_emulator');
    expect(ensure).toContain('--window');
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['android:ensure']).toContain('ensure-android-emulator.sh');
    expect(pkg.scripts['android:ensure:start']).toContain('--android');
    expect(pkg.scripts['packager:ensure:android']).toContain('--android');
    expect(pkg.scripts['android:run']).toContain('ensure-android-emulator.sh --window');
    expect(pkg.scripts['android:push-fixture']).toContain('android-push-fixture.sh');
  });

  it('pins agent-ui commands by AGENT_UI_PLATFORM (ios|android)', () => {
    const daemon = read('scripts/lib/agent_ui_daemon.py');
    expect(daemon).toContain('pending_by_platform');
    expect(daemon).toContain('status_by_nonce');
    expect(daemon).toContain('MAX_PENDING_PER_PLATFORM');
    expect(daemon).toContain('daemon_code_fingerprint');
    expect(daemon).toContain('normalize_platform');
    expect(daemon).toContain('platform=');
    const bridge = read('scripts/lib/agent_ui_bridge.py');
    expect(bridge).toContain('agent_ui_platform');
    expect(bridge).toContain('agent_ui_device');
    expect(bridge).toContain('stamp_platform');
    expect(bridge).toContain('AGENT_UI_PLATFORM');
    expect(bridge).toContain('AGENT_UI_DEVICE');
    const host = read('scripts/lib/agent-ui-host.sh');
    expect(host).toContain('agent_ui_is_android');
    expect(host).toContain('AGENT_UI_ANDROID_WARM_WAIT_SECS');
    expect(host).toContain('agent_ui_bridge_recently_ok');
    expect(host).toContain('skipping force-reconnect heal');
    const packager = read('scripts/ensure-packager.sh');
    expect(packager).toContain('--android');
    expect(packager).toContain('ensure_preferred_android_emulator');
    expect(packager).toContain('AGENT_UI_PLATFORM=android');
    expect(packager).toContain('Target:');
    expect(packager).toContain('shared_prefs');
    const http = read('src/utils/agent-ui/http-bridge.ts');
    expect(http).toContain('platform=');
    expect(http).toContain("Platform.OS === 'android'");
    const sync = read('src/utils/agent-ui/AgentUiRouteSync.tsx');
    expect(sync).toContain('MAX_QUEUED_COMMANDS');
    expect(sync).toContain('Do not long-poll while draining');
    const color = read('scripts/lib/agent_ui_color.py');
    expect(color).toContain('screencap');
    expect(color).toContain('_agent_ui_platform');
    const recipe = read('scripts/agent-ui-android-travel-demo.sh');
    expect(recipe).toContain('AGENT_UI_PLATFORM=android');
    expect(recipe).toContain('travel-demo');
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['android:travel-demo']).toContain('agent-ui-android-travel-demo.sh');
    const dropdown = read('src/components/primitives/dropdown.tsx');
    expect(dropdown).toContain('value: String(value');
  });

  it('daemon BridgeState FIFO + status-by-nonce isolate platforms', () => {
    const lib = join(root, 'scripts/lib');
    const out = execFileSync(
      'python3',
      [
        '-c',
        [
          'import sys',
          `sys.path.insert(0, ${JSON.stringify(lib)})`,
          'from agent_ui_daemon import BridgeState',
          's = BridgeState()',
          'n1 = s.enqueue({"op": "route", "platform": "android"})',
          'n2 = s.enqueue({"op": "exists", "platform": "android"})',
          'n_ios = s.enqueue({"op": "route", "platform": "ios"})',
          'a1 = s.take_command(0, platform="android")',
          'a2 = s.take_command(0, platform="android")',
          'ios = s.take_command(0, platform="ios")',
          'assert a1["nonce"] == n1 and a1["op"] == "route"',
          'assert a2["nonce"] == n2 and a2["op"] == "exists"',
          'assert ios["nonce"] == n_ios',
          's.publish_status({"ok": True, "nonce": n1, "op": "route"})',
          's.publish_status({"ok": True, "nonce": n_ios, "op": "route"})',
          'assert s.wait_status(n1, 0.01)["nonce"] == n1',
          'assert s.wait_status(n_ios, 0.01)["nonce"] == n_ios',
          'assert s.take_command(0, platform="android") is None',
          'print("ok")',
        ].join('; '),
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(out.trim()).toBe('ok');
  });
});
