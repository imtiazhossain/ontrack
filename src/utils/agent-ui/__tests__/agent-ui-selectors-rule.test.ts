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
    expect(rule).toContain('ensure-packager.sh');
    expect(rule).not.toMatch(/coordinates are a \*\*last resort\*\*/i);
    expect(rule).toMatch(/Coordinates are not an alternative/i);
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
