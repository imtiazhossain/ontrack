import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

describe('agent-ui host scripts contract', () => {
  it('ships shared host lib and fast-path scripts', () => {
    expect(existsSync(join(root, 'scripts/lib/agent-ui-host.sh'))).toBe(true);
    for (const script of [
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
      expect(read(script)).toContain('agent-ui-host.sh');
    }
  });

  it('open prefers batch goto+wait and can heal the packager', () => {
    const open = read('scripts/agent-ui-open.sh');
    const wait = read('scripts/agent-ui-wait.sh');
    expect(open).toContain('agent_ui_send_op batch');
    expect(open).toContain('agent_ui_send_op goto');
    expect(open).toContain('agent_ui_send_op prefix');
    expect(open).toContain('agent_ui_heal_packager');
    expect(open).not.toMatch(/agent-ui-dump\.sh/);
    expect(wait).toContain('agent_ui_send_op exists');
    expect(wait).toContain('agent_ui_send_op prefix');
    expect(wait).toContain('agent_ui_send_op route');
    expect(wait).not.toMatch(/agent-ui-dump\.sh/);
  });

  it('host lib can heal a dead packager/dev-client connection', () => {
    const host = read('scripts/lib/agent-ui-host.sh');
    expect(host).toContain('agent_ui_heal_packager');
    expect(host).toContain('ensure-packager.sh');
    expect(host).toContain('AGENT_UI_SKIP_HEAL');
    expect(host).toContain('seed');
    expect(host).toContain('flow');
    expect(host).toContain('wait');
  });

  it('batch/flow/seed scripts support fixtures and in-app waits', () => {
    const batch = read('scripts/agent-ui-batch.sh');
    const flow = read('scripts/agent-ui-flow.sh');
    const seed = read('scripts/agent-ui-seed.sh');
    expect(batch).toContain('--goto');
    expect(batch).toContain('--wait-prefix');
    expect(batch).toContain('--seed');
    expect(batch).toContain('--flow');
    expect(batch).toContain('agent_ui_send_op batch');
    expect(flow).toContain('agent_ui_send_op flow');
    expect(flow).toContain('travel-demo');
    expect(seed).toContain('agent_ui_send_op seed');
  });
});
