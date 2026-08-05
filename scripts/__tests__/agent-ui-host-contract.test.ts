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
