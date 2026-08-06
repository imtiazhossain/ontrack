import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Fail the build if known personal identifiers reappear in authored source.
 * Bundle / package reverse-DNS ids are exempt (already shipped store identity).
 */
const FORBIDDEN = [
  /imtihoss@gmail\.com/i,
  /imtihoss@/i,
  /imtiaz\s+hossain/i,
  /farhana\s+tasmin/i,
];

const ROOTS = ['src', 'supabase/migrations', '.cursor/rules'] as const;
const EXTENSIONS = new Set(['.ts', '.tsx', '.sql', '.mdc', '.md']);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if ([...EXTENSIONS].some((ext) => entry.endsWith(ext))) files.push(full);
  }
  return files;
}

describe('no personal identifiers in source', () => {
  it('does not hardcode personal emails, names, or email allowlist envs', () => {
    const root = process.cwd();
    const hits: string[] = [];
    for (const folder of ROOTS) {
      const abs = join(root, folder);
      try {
        statSync(abs);
      } catch {
        continue;
      }
      for (const file of walk(abs)) {
        const rel = relative(root, file);
        // Rule file may show ❌ examples using placeholder person@gmail.com only.
        if (rel.endsWith('no-personal-identifiers.mdc')) continue;
        if (rel.endsWith('no-personal-identifiers.test.ts')) continue;
        const text = readFileSync(file, 'utf8');
        for (const pattern of FORBIDDEN) {
          if (pattern.test(text)) {
            hits.push(`${rel} matches ${pattern}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('keeps developer access on account_flags, not email lists', () => {
    const access = readFileSync(join(process.cwd(), 'src/features/account/dev-access.ts'), 'utf8');
    expect(access).toContain('account_flags');
    expect(access).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
