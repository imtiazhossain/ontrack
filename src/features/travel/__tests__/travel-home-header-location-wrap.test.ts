import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel home atmosphere location caption', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-home-header.tsx'),
    'utf8',
  );

  it('forces long place names onto two lines via wrap helper', () => {
    expect(source).toContain('wrapAtmosphereLocationCaption');
    expect(source).toContain('AgentUiIds.travel.list.atmosphereLocation');
    expect(source).toContain('numberOfLines={2}');
  });
});
