import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('agent-ui selector rule', () => {
  it('keeps a glob-scoped rule that requires stamping testIDs', () => {
    const rule = read('.cursor/rules/agent-ui-selectors.mdc');
    expect(rule).toContain('alwaysApply: false');
    expect(rule).toMatch(/Always add an ID/i);
    expect(rule).toContain('ontrack.<feature>.<surface>.<control>');
    expect(rule).toContain('docs/agent-ui-map.md');
    expect(rule).toContain('src/utils/agent-ui/ids.ts');
    expect(rule).toContain('.cursor/skills/agent-ui/SKILL.md');
    expect(rule).toMatch(/Coordinates are not an alternative/i);
  });

  it('puts the full navigation tree and budgets in the agent-ui skill', () => {
    const skill = read('.cursor/skills/agent-ui/SKILL.md');
    expect(skill).toMatch(/Navigation decision tree/i);
    expect(skill).toMatch(/Assert-first/i);
    expect(skill).toContain('agent-ui-flow.sh');
    expect(skill).toContain('agent-ui.sh verify');
    expect(skill).toContain('ensure-packager.sh');
    expect(skill).toContain('agent-ui-assert.sh');
    expect(skill).toContain('travel.planDetail.transportSection');
    expect(skill).toContain('--color');
    expect(skill).toMatch(/≤\s*1 dump/i);
    expect(skill).toMatch(/mid-flow screenshots/i);
    expect(skill).toMatch(/verify.*before.*flow|Already on surface/i);
    expect(skill).toMatch(/ritual handoff screenshot/i);
    expect(skill).toContain('agent-ui-source.sh');
    expect(skill).toContain('agent-ui-hit.sh');
    expect(skill).toContain('agent-ui-overlay.sh');
    expect(skill).toContain('agent-ui-scroll');
    expect(skill).toMatch(/Dual-platform close-out/i);
    expect(skill).toContain('agent-ui-verify-both.sh');

    const screenshotRule = read('.cursor/rules/show-simulator-screenshot.mdc');
    expect(screenshotRule).toContain('alwaysApply: false');
    expect(screenshotRule).toMatch(/Screenshot budget/i);
    expect(screenshotRule).toMatch(/Forbidden:\*\* mid-flow screenshots/i);
    expect(screenshotRule).toMatch(/STOP after assert/i);

    const triage = read('.cursor/rules/screenshot-triage.mdc');
    expect(triage).toContain('alwaysApply: false');
    expect(triage).toMatch(/Screenshot → code triage/i);
    expect(triage).toContain('docs/agent-ui-sources.json');

    const core = read('.cursor/rules/ontrack-core.mdc');
    expect(core).toContain('alwaysApply: true');
    expect(core).toContain('.cursor/skills/agent-ui/SKILL.md');

    const agents = read('AGENTS.md');
    expect(agents).toMatch(/navigation decision tree/i);
    expect(agents).toContain('agent-ui');
    expect(agents).toMatch(/Never re-run a flow just to re-check/i);
    expect(agents).toContain('.cursor/skills/agent-ui/SKILL.md');
  });

  it('forwards testID on core primitives', () => {
    for (const relative of [
      'src/components/primitives/button.tsx',
      'src/components/primitives/input.tsx',
      'src/components/primitives/date-field.tsx',
      'src/components/primitives/settings-row.tsx',
    ] as const) {
      const source = read(relative);
      expect(source).toContain('testID');
      expect(source).toContain('useAgentUiTarget');
    }
  });
});
