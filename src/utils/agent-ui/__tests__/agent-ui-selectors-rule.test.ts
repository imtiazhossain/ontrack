import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('agent-ui selector rule', () => {
  it('requires always stamping testIDs on interactive controls', () => {
    const rule = readFileSync(
      join(process.cwd(), '.cursor/rules/agent-ui-selectors.mdc'),
      'utf8',
    );
    expect(rule).toMatch(/Always add an ID/i);
    expect(rule).toContain('ontrack.<feature>.<surface>.<control>');
    expect(rule).toContain('docs/agent-ui-map.md');
    expect(rule).toContain('src/utils/agent-ui/ids.ts');
    expect(rule).toContain('agent-ui-open.sh');
    expect(rule).toContain('agent-ui-flow.sh');
    expect(rule).toContain('agent-ui.sh once');
    expect(rule).toContain('agent-ui.sh verify');
    expect(rule).toContain('ensure-packager.sh');
    expect(rule).not.toMatch(/coordinates are a \*\*last resort\*\*/i);
    expect(rule).toMatch(/Coordinates are not an alternative/i);
  });

  it('mandates a navigation decision tree and per-verification budget', () => {
    const rule = readFileSync(
      join(process.cwd(), '.cursor/rules/agent-ui-selectors.mdc'),
      'utf8',
    );
    expect(rule).toMatch(/Navigation decision tree/i);
    expect(rule).toMatch(/Per-verification budget/i);
    expect(rule).toMatch(/Assert-first proof/i);
    expect(rule).toContain('≤ 1');
    expect(rule).toMatch(/mid-flow screenshots/i);
    expect(rule).toContain('agent-ui-flow.sh');
    expect(rule).toContain('agent-ui-assert.sh');
    expect(rule).toContain('travel.planDetail.transportSection');
    expect(rule).toContain('--color');
    expect(rule).toMatch(/Dump “just to be sure”/i);
    expect(rule).toMatch(/Fail-fast when warm/i);
    expect(rule).toMatch(/verify` before `flow`/i);
    expect(rule).toMatch(/No re-land for handoff/i);
    expect(rule).toMatch(/Re-run `once --flow`/i);
    expect(rule).toMatch(/layout anchors/i);
    expect(rule).toContain('agent-ui-source.sh');
    expect(rule).toContain('agent-ui-hit.sh');
    expect(rule).toContain('hit|overlay');
    expect(rule).toContain('scroll');
    expect(rule).toContain('agent-ui-scroll');
    expect(rule).toMatch(/Never.*host cursor|Never.*CGEvent|in-app/i);

    const screenshotRule = readFileSync(
      join(process.cwd(), '.cursor/rules/show-simulator-screenshot.mdc'),
      'utf8',
    );
    expect(screenshotRule).toMatch(/Screenshot budget/i);
    expect(screenshotRule).toMatch(/Forbidden:\*\* mid-flow screenshots/i);
    expect(screenshotRule).toMatch(/agent-ui-assert\.sh/i);
    expect(screenshotRule).toMatch(/STOP after assert/i);
    expect(screenshotRule).toMatch(/ritual handoff screenshot/i);
    expect(rule).toMatch(/No ritual screenshot/i);

    const triage = readFileSync(
      join(process.cwd(), '.cursor/rules/screenshot-triage.mdc'),
      'utf8',
    );
    expect(triage).toMatch(/Screenshot → code triage/i);
    expect(triage).toContain('agent-ui-source.sh');
    expect(triage).toContain('agent-ui-hit.sh');
    expect(triage).toContain('agent-ui-overlay.sh');
    expect(triage).toContain('docs/agent-ui-sources.json');

    const agents = readFileSync(join(process.cwd(), 'AGENTS.md'), 'utf8');
    expect(agents).toMatch(/navigation decision tree/i);
    expect(agents).toContain('agent-ui.sh verify');
    expect(agents).toContain('agent-ui-flow.sh');
    expect(agents).toMatch(/Never re-run a flow just to re-check/i);
    expect(agents).toContain('agent-ui-source.sh');
  });

  it('forwards testID on core primitives', () => {
    for (const relative of [
      'src/components/primitives/button.tsx',
      'src/components/primitives/input.tsx',
      'src/components/primitives/date-field.tsx',
      'src/components/primitives/settings-row.tsx',
    ] as const) {
      const source = readFileSync(join(process.cwd(), relative), 'utf8');
      expect(source).toContain('testID');
      expect(source).toContain('useAgentUiTarget');
    }
  });
});
