import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel sky static destination plate', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-sky-static-destination.tsx'),
    'utf8',
  );

  it('resolves a destination landscape still with sky-biased framing', () => {
    expect(src).toContain('resolveTravelHomeAtmosphereImage');
    expect(src).toContain("mode: place ? 'trip' : 'home'");
    expect(src).toContain("contentPosition={{ top: '18%', left: '50%' }}");
    expect(src).toContain('topVeil');
    expect(src).toContain('bottomFade');
  });

  it('keeps Ken Burns gentle and respects Reduce Motion', () => {
    expect(src).toContain('useReducedMotion');
    expect(src).toContain('withRepeat');
    expect(src).toContain('KEN_BURNS_MS');
    expect(src).toContain('scale: 1.1');
  });

  it('falls back to wash + ground silhouette while the still loads', () => {
    expect(src).toContain('TravelSkyStaticWash');
    expect(src).toContain('TravelSkyGround');
    expect(src).toContain('resolveTravelSkyGroundKind');
    expect(src).toContain('useTiltSkyMotion(false)');
  });
});
