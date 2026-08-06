import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('responsive layout rule', () => {
  it('ships an always-on Cursor rule for responsive sizing', () => {
    const rule = read('.cursor/rules/responsive-layout.mdc');
    expect(rule).toContain('alwaysApply: true');
    expect(rule).toContain('useResponsive');
    expect(rule).toContain('fit');
  });

  it('wires scale into core text and control primitives', () => {
    expect(read('src/components/primitives/app-text.tsx')).toContain('useResponsive');
    expect(read('src/components/primitives/app-text.tsx')).toContain('fit');
    expect(read('src/components/primitives/button.tsx')).toContain('useResponsive');
    expect(read('src/components/primitives/button.tsx')).toContain('AppText');
    expect(read('src/components/primitives/input.tsx')).toContain('useResponsive');
    expect(read('src/components/primitives/screen.tsx')).toContain('useResponsive');
    expect(read('src/components/primitives/date-field.tsx')).toContain('useResponsive');
  });

  it('documents responsive helpers in AGENTS.md', () => {
    const agents = read('AGENTS.md');
    expect(agents).toMatch(/useResponsive|Responsive/);
    expect(agents).toContain('responsive-layout.mdc');
  });

  it('is cross-linked from token-optimization and ontrack-core', () => {
    const opt = read('.cursor/rules/token-optimization.mdc');
    expect(opt).toContain('alwaysApply: true');
    expect(opt).toContain('responsive-layout.mdc');
    expect(opt).toContain('useResponsive');

    const core = read('.cursor/rules/ontrack-core.mdc');
    expect(core).toContain('alwaysApply: true');
    expect(core).toContain('responsive-layout.mdc');
  });
});
