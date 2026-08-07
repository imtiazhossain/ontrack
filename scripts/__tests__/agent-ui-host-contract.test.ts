import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

function runBridge(args: string[]): string {
  return execFileSync(
    'python3',
    [join(root, 'scripts/lib/agent_ui_bridge.py'), ...args],
    { encoding: 'utf8', env: { ...process.env, AGENT_UI_ROOT: root } },
  ).trim();
}

describe('agent-ui host scripts contract', () => {
  it('ships shared host lib and fast-path scripts', () => {
    expect(existsSync(join(root, 'scripts/lib/agent-ui-host.sh'))).toBe(true);
    expect(existsSync(join(root, 'scripts/lib/agent_ui_bridge.py'))).toBe(true);
    expect(existsSync(join(root, 'scripts/lib/agent_ui_daemon.py'))).toBe(true);
    for (const script of [
      'scripts/agent-ui.sh',
      'scripts/agent-ui-assert.sh',
      'scripts/agent-ui-verify.sh',
      'scripts/agent-ui-dump.sh',
      'scripts/agent-ui-tap.sh',
      'scripts/agent-ui-open.sh',
      'scripts/agent-ui-wait.sh',
      'scripts/agent-ui-exists.sh',
      'scripts/agent-ui-route.sh',
      'scripts/agent-ui-goto.sh',
      'scripts/agent-ui-batch.sh',
      'scripts/agent-ui-seed.sh',
      'scripts/agent-ui-flow.sh',
      'scripts/agent-ui-devmode.sh',
    ]) {
      expect(existsSync(join(root, script))).toBe(true);
      if (script !== 'scripts/agent-ui.sh') {
        expect(read(script)).toContain('agent-ui-host.sh');
      }
    }
    expect(existsSync(join(root, 'scripts/lib/agent_ui_ids.py'))).toBe(true);
    expect(existsSync(join(root, 'scripts/lib/agent_ui_color.py'))).toBe(true);
  });

  it('resolves AgentUiIds key paths to wire testIDs', () => {
    expect(runBridge(['resolve-id', 'travel.planDetail.transportSection'])).toBe(
      'ontrack.travel.planDetail.section.transport',
    );
    expect(
      runBridge(['resolve-id', 'AgentUiIds.travel.planDetail.transportSection']),
    ).toBe('ontrack.travel.planDetail.section.transport');
    // Factory / parameterized ids aren't static leaves — still get ontrack. prefix.
    expect(
      runBridge([
        'resolve-id',
        'travel.timelineItem.trip-item-ms5dgy44-8.default',
      ]),
    ).toBe('ontrack.travel.timelineItem.trip-item-ms5dgy44-8.default');
    expect(
      runBridge([
        'resolve-id',
        'travel.flight.openConfirmation.trip-item-ms5dgy44-8',
      ]),
    ).toBe('ontrack.travel.flight.openConfirmation.trip-item-ms5dgy44-8');
    expect(
      runBridge([
        'resolve-id',
        'ontrack.travel.timelineItem.trip-item-ms5dgy44-8.default',
      ]),
    ).toBe('ontrack.travel.timelineItem.trip-item-ms5dgy44-8.default');
    const ops = JSON.parse(
      runBridge([
        'batch-args',
        '--',
        '--assert-exists',
        'travel.planDetail.transportSection',
        '--assert-prefix',
        'travel.planDetail.',
        '--tap',
        'travel.timelineItem.item-agent-ui-demo-flight.default',
      ]),
    );
    expect(ops).toEqual([
      {
        op: 'assert',
        id: 'ontrack.travel.planDetail.section.transport',
      },
      { op: 'assert', prefix: 'ontrack.travel.planDetail.' },
      {
        op: 'tap',
        id: 'ontrack.travel.timelineItem.item-agent-ui-demo-flight.default',
      },
    ]);
  });

  it('open prefers batch goto+wait and heals only after failure', () => {
    const open = read('scripts/agent-ui-open.sh');
    const wait = read('scripts/agent-ui-wait.sh');
    expect(open).toContain('agent_ui_send_op batch');
    expect(open).toContain('agent_ui_apply_wait_budget');
    expect(open).toContain('agent_ui_heal_packager');
    expect(open).toContain('batch open failed');
    // No happy-path soft heal / cold probe before the batch.
    expect(open).not.toContain('agent_ui_bridge_is_warm');
    expect(open).not.toMatch(/agent-ui-dump\.sh/);
    expect(wait).toContain('agent_ui_send_op wait');
    expect(wait).toContain('--id');
    expect(wait).toContain('--prefix');
    expect(wait).toContain('--route');
    expect(wait).not.toContain('agent_ui_send_op exists');
    expect(wait).not.toMatch(/agent-ui-dump\.sh/);
  });

  it('host lib uses daemon bridge with warm fail-fast budgets', () => {
    const host = read('scripts/lib/agent-ui-host.sh');
    const bridge = read('scripts/lib/agent_ui_bridge.py');
    const daemon = read('scripts/lib/agent_ui_daemon.py');
    const metro = read('metro.config.js');
    expect(host).toContain('agent_ui_bridge.py');
    expect(host).toContain('agent_ui_bridge_is_warm');
    expect(host).toContain('agent_ui_apply_wait_budget');
    expect(host).toContain('AGENT_UI_WARM_WAIT_SECS');
    expect(host).toContain('agent_ui_heal_packager');
    expect(host).toContain('agent_ui_ensure_app_up');
    expect(host).toContain('agent_ui_app_process_running');
    expect(host).toContain('agent_ui_bridge_answers');
    expect(host).toContain('ensure-packager.sh');
    expect(host).toContain('agent-ui-route.sh');
    expect(bridge).toContain('agent-ui-data-dir');
    expect(bridge).toContain('send_via_daemon');
    expect(bridge).toContain('batch-args');
    expect(bridge).toContain('run_once');
    expect(bridge).toContain('"assert"');
    expect(daemon).toContain('agent-ui.sock');
    expect(daemon).toContain('/next');
    expect(metro).toContain('/__agent_ui');
    expect(metro).toContain('8191');
  });

  it('claims a dedicated agent device pool slot (max 5) across entry points', () => {
    const host = read('scripts/lib/agent-ui-host.sh');
    const pool = read('scripts/lib/agent-ui-pool.sh');
    expect(host).toContain('agent-ui-pool.sh');
    expect(host).toContain('agent_ui_ensure_lease');
    expect(pool).toContain('agent_ui_release_lease');
    expect(pool).toContain('agent_ui_pool_shutdown_slot');
    expect(pool).toContain('ios_sim_shutdown_agent_named');
    expect(pool).toContain('android_emu_shutdown_named');
    expect(pool).toContain('AGENT_UI_KEEP_DEVICES');
    expect(pool).toContain('agent-ui-slots');
    expect(pool).toContain('AGENT_UI_POOL_MAX');
    expect(pool).toContain('onTrack Agent');
    expect(pool).toContain('onTrack_Agent_');
    expect(host).toContain('AGENT_UI_SKIP_LEASE');
    expect(host).toContain('AGENT_UI_LOCK_WAIT_SECS');
    expect(host).toContain('AGENT_UI_LOCK_DIR');
    expect(host).toMatch(
      /if \[\[ "\$\{AGENT_UI_SKIP_LEASE:-0\}" != "1" \]\]; then\s*agent_ui_ensure_lease/,
    );
    // Fresh pool slots: heal may boot without install — fall through to clone.
    expect(host).toContain('agent_ui_pool_ensure_app_installed');
    expect(host).toContain('Fall through to clone/launch');
    expect(host).toContain('agent_ui_soft_reconnect_dev_client');
    expect(host).toContain('agent_ui_write_slot_pin');
    expect(host).toContain('agent_ui_pin_android_serial');
    expect(host).toContain('never talk to Galaxy_S26');
    expect(pool).toContain('agent_ui_pool_clone_ios_app');
    expect(pool).toContain('agent_ui_pool_clone_android_app');
    // ensure-packager sources pool.sh without host — clone must resolve ROOT alone.
    expect(pool).toContain('agent_ui_pool_repo_root');

    const verifyBoth = read('scripts/agent-ui-verify-both.sh');
    expect(verifyBoth).toContain('agent-ui-host.sh');
    expect(verifyBoth).toContain('AGENT_UI_LOCK_HELD');
    expect(verifyBoth).toContain('AGENT_UI_SLOT');
    expect(verifyBoth).toContain('AGENT_UI_SKIP_LEASE');

    const ensure = read('scripts/ensure-packager.sh');
    expect(ensure).toContain('AGENT_UI_SKIP_LEASE=1');
    expect(ensure).toContain('packager_pool_clone_app_if_needed');
    expect(ensure).toContain('Installed ${BUNDLE_ID} onto pool');
    expect(ensure).toContain('packager_write_slot_pin');

    const bridge = read('scripts/lib/agent_ui_bridge.py');
    expect(bridge).toContain('write_android_slot_pin_file');
    expect(bridge).toContain('write-slot-pin');
    expect(bridge).toContain('files/agent-ui-pin.json');

    const daemon = read('scripts/lib/agent_ui_daemon.py');
    expect(daemon).toContain('queue_key');
    expect(daemon).toContain('normalize_slot');

    // Functional: two slots can be held at once; a 3rd waits when max=2.
    const script = `
set -euo pipefail
ROOT=${JSON.stringify(root)}
export AGENT_UI_ROOT="$ROOT"
export AGENT_UI_POOL_DIR="$ROOT/.cursor/agent-ui-pool-test"
export AGENT_UI_POOL_MAX=2
export AGENT_UI_LOCK_WAIT_SECS=1
export AGENT_UI_USE_POOL=1
export AGENT_UI_POOL_BIND_DEVICES=0
rm -rf "$AGENT_UI_POOL_DIR"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/agent-ui-host.sh"
test "\${AGENT_UI_LOCK_ACQUIRED:-0}" = "1"
test -n "\${AGENT_UI_SLOT:-}"
test -d "$AGENT_UI_POOL_DIR/\${AGENT_UI_SLOT}.lockdir"
SLOT1="$AGENT_UI_SLOT"
# Nested inherit must not block or steal release duty.
AGENT_UI_POOL_DIR="$AGENT_UI_POOL_DIR" AGENT_UI_POOL_MAX=2 AGENT_UI_POOL_BIND_DEVICES=0 \
AGENT_UI_SLOT="$SLOT1" \
AGENT_UI_LOCK_DIR="$AGENT_UI_LOCK_DIR" AGENT_UI_LOCK_HELD=1 AGENT_UI_LOCK_ACQUIRED=0 \
AGENT_UI_LOCK_WAIT_SECS=1 \
  bash -c 'source "'"$ROOT"'/scripts/lib/agent-ui-host.sh"'
# Sibling claims the other free slot and holds it briefly.
env -u AGENT_UI_SLOT \
  AGENT_UI_POOL_DIR="$AGENT_UI_POOL_DIR" AGENT_UI_POOL_MAX=2 AGENT_UI_USE_POOL=1 \
  AGENT_UI_POOL_BIND_DEVICES=0 \
  AGENT_UI_LOCK_HELD=0 AGENT_UI_LOCK_ACQUIRED=0 AGENT_UI_LOCK_WAIT_SECS=1 \
  bash -c 'source "'"$ROOT"'/scripts/lib/agent-ui-host.sh"; printf %s "$AGENT_UI_SLOT" >"$AGENT_UI_POOL_DIR/slot2"; sleep 2' &
child=$!
sleep 0.3
test -f "$AGENT_UI_POOL_DIR/slot2"
# Hold both slots busy: parent still holds SLOT1; child holds SLOT2.
# Third waiter must fail after LOCK_WAIT_SECS=1.
set +e
env -u AGENT_UI_SLOT \
  AGENT_UI_POOL_DIR="$AGENT_UI_POOL_DIR" AGENT_UI_POOL_MAX=2 AGENT_UI_USE_POOL=1 \
  AGENT_UI_POOL_BIND_DEVICES=0 \
  AGENT_UI_LOCK_HELD=0 AGENT_UI_LOCK_ACQUIRED=0 AGENT_UI_LOCK_WAIT_SECS=1 \
  bash -c 'source "'"$ROOT"'/scripts/lib/agent-ui-host.sh"' 2>/tmp/agent-ui-pool-wait.err
rc=$?
set -e
wait "$child" || true
test "$rc" -ne 0
grep -qE 'agent device slot|device slots are busy' /tmp/agent-ui-pool-wait.err
`;
    execFileSync('bash', ['-c', script], { encoding: 'utf8', timeout: 30_000 });
  });

  it('verification entry points gate on app-up before bridge work', () => {
    for (const script of [
      'scripts/agent-ui.sh',
      'scripts/agent-ui-verify.sh',
      'scripts/agent-ui-assert.sh',
      'scripts/agent-ui-flow.sh',
      'scripts/agent-ui-open.sh',
      'scripts/agent-ui-batch.sh',
      'scripts/agent-ui-seed.sh',
    ]) {
      expect(read(script)).toContain('agent_ui_ensure_app_up');
    }
    // Low-level probes must not recurse through app-up (heal/preflight uses them).
    for (const script of [
      'scripts/agent-ui-route.sh',
      'scripts/agent-ui-tap.sh',
      'scripts/agent-ui-exists.sh',
      'scripts/agent-ui-dump.sh',
      'scripts/agent-ui-wait.sh',
      'scripts/agent-ui-goto.sh',
    ]) {
      expect(read(script)).not.toContain('agent_ui_ensure_app_up');
    }
  });

  it('batch/flow/seed/assert/once scripts support fixtures and asserts', () => {
    const batch = read('scripts/agent-ui-batch.sh');
    const flow = read('scripts/agent-ui-flow.sh');
    const seed = read('scripts/agent-ui-seed.sh');
    const assertScript = read('scripts/agent-ui-assert.sh');
    const once = read('scripts/agent-ui.sh');
    expect(batch).toContain('batch-args');
    expect(batch).toContain('agent_ui_send_op batch');
    expect(batch).toContain('agent_ui_apply_wait_budget');
    expect(batch).not.toMatch(/python3 -c.*goto/);
    expect(flow).toContain('agent_ui_send_op flow');
    expect(flow).toContain('agent_ui_apply_wait_budget');
    expect(flow).toContain('travel-demo');
    expect(seed).toContain('agent_ui_send_op seed');
    expect(assertScript).toContain('batch-args');
    expect(assertScript).toContain('--assert-route');
    expect(assertScript).toContain('--color');
    expect(assertScript).toContain("passed' if ok else 'failed");
    expect(once).toContain('once');
    expect(once).toContain('verify');
    expect(once).toContain('agent_ui_bridge.py');
    expect(once).toContain('agent-ui-assert.sh');
    expect(once).toContain('agent-ui-verify.sh');
    const verify = read('scripts/agent-ui-verify.sh');
    const bridgePy = read('scripts/lib/agent_ui_bridge.py');
    expect(verify).toContain('verify');
    expect(verify).toContain('skippedLand');
    expect(bridgePy).toContain('run_verify');
    expect(bridgePy).toContain('assert-color');
    expect(bridgePy).toContain('resolve_test_id');
  });
});
