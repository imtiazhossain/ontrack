import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel header sky décor', () => {
  const sky = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-header-sky-decor.tsx'),
    'utf8',
  );
  const night = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-sky-night.tsx'),
    'utf8',
  );
  const day = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-sky-day.tsx'),
    'utf8',
  );
  const weather = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-sky-weather-fx.tsx'),
    'utf8',
  );
  const flourish = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-flight-path-arc.tsx'),
    'utf8',
  );

  it('composes night/day layers from theme + weather condition', () => {
    expect(sky).toContain("theme.name === 'dark'");
    expect(sky).toContain('resolveHeaderSkyCondition');
    expect(sky).toContain('TravelSkyNight');
    expect(sky).toContain('TravelSkyDay');
    expect(sky).toContain('weatherCode');
    expect(sky).toContain('AgentUiIds.travel.chrome.skyDecor');
    expect(night).toContain('PhaseMoon');
    expect(night).toContain('projectStarsToPlate');
    expect(night).toContain('TravelSkyAurora');
    expect(night).toContain('travel-sky-aurora-destinations');
    expect(day).toContain('SoftCloud');
    expect(day).toContain('DaySun');
  });

  it('keeps sun and moon round under plate stretch', () => {
    const plate = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-sky-plate.ts'),
      'utf8',
    );
    expect(plate).toContain('celestialDiscHostStyle');
    expect(plate).toContain('aspectRatio: 1');
    expect(night).toContain('celestialDiscHostStyle');
    expect(day).toContain('celestialDiscHostStyle');
  });

  it('renders a realistic terminator moon with surface detail', () => {
    expect(night).toContain('moonTerminatorPath');
    expect(night).toContain('ClipPath');
    expect(night).toContain('MOON_CRATERS');
    expect(night).toContain('MOON_MARIA');
    expect(night).toContain('MOON_TYCHO');
  });

  it('shows rain streaks and lightning for wet weather', () => {
    expect(weather).toContain('TravelSkyWeatherFx');
    expect(weather).toContain('LightningBolt');
    expect(weather).toContain('RainDrop');
    expect(night).toContain('TravelSkyWeatherFx');
    expect(day).toContain('TravelSkyWeatherFx');
    expect(night).toContain('condition.rain');
    expect(day).toContain('condition.lightning');
  });

  it('animates birds, sun rays, meteors, and destination accents', () => {
    expect(day).toContain('FlyingBird');
    expect(day).toContain('SunRays');
    expect(day).toContain('HeatShimmer');
    expect(day).toContain('FogWisps');
    expect(day).toContain('accents.tropical');
    expect(night).toContain('ShootingStar');
    expect(night).toContain('accents.desert');
  });

  it('drives twinkle and ray shine from device tilt motion', () => {
    expect(sky).toContain('useTiltSkyMotion');
    expect(night).toContain('MotionLayer');
    expect(night).toContain('motion.energy');
    expect(day).toContain('MotionLayer');
    expect(day).toContain('motion.energy');
    const motion = readFileSync(
      join(process.cwd(), 'src/features/travel/use-tilt-sky-motion.ts'),
      'utf8',
    );
    expect(motion).toContain('expo-sensors');
    expect(motion).toContain('DeviceMotion');
    expect(motion).toContain('useReducedMotion');
  });

  it('keeps sun and moon below the status-bar band', () => {
    expect(sky).toContain('statusBandRatio');
    expect(night).toContain('SKY_CELESTIAL_CLEARANCE');
    expect(day).toContain('SKY_CELESTIAL_CLEARANCE');
    expect(night).toContain('statusBand + SKY_CELESTIAL_CLEARANCE');
    expect(day).toContain('statusBand + SKY_CELESTIAL_CLEARANCE');
  });

  it('paints one continuous sky on app-shell chrome (status bar + header)', () => {
    const hero = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-hero.tsx'),
      'utf8',
    );
    const body = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-detail-body.tsx'),
      'utf8',
    );
    // Single plate from window y=0 — aurora/day washes stay live behind the clock.
    expect(hero).toContain('TravelHeaderSkyDecor');
    expect(hero).toContain('useTravelAtmosphere');
    expect(hero).toContain('weatherCode');
    expect(hero).toContain('useSafeAreaChrome');
    expect(hero).toContain('useSafeAreaChromeOverlay');
    expect(hero).toContain('headerSkyChromeColor');
    expect(hero).toContain('statusBandRatio');
    expect(hero).toContain('priority: 1');
    expect(hero).not.toContain('skyOnHeader');
    expect(hero.match(/<TravelHeaderSkyDecor/g)).toHaveLength(1);
    expect(body).toContain('transparentScreen');
    expect(body).toContain('pageWash');
    expect(flourish).toContain('TravelHeaderSkyDecor');
    expect(flourish).toContain('styles.skyBehind');
    expect(sky).toContain('StyleSheet.absoluteFill');
  });
});

describe('safe-area chrome overlay', () => {
  it('exposes an independent overlay layer for status-bar art', () => {
    const chrome = readFileSync(
      join(process.cwd(), 'src/components/primitives/safe-area-chrome.tsx'),
      'utf8',
    );
    const appSafe = readFileSync(
      join(process.cwd(), 'src/components/primitives/app-safe-area.tsx'),
      'utf8',
    );
    expect(chrome).toContain('useSafeAreaChromeOverlay');
    expect(appSafe).toContain('useSafeAreaChromeOverlayLayer');
    expect(appSafe).toContain('chromeOverlay');
  });
});
