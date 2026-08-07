import { BRIGHT_STARS, type BrightStar } from '@/features/travel/travel-sky-bright-stars';

const SYNODIC_DAYS = 29.530588853;
/** Approximate new moon near J2000 (UTC). */
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export type ProjectedStar = {
  name: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
  mag: number;
};

/** 0 = new, 0.5 = full, approaches 1 = new again. */
export function moonPhaseCycle(date: Date): number {
  const days = (date.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000;
  const cycle = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  return cycle / SYNODIC_DAYS;
}

/** Illuminated fraction 0–1. */
export function moonIllumination(date: Date): number {
  const phase = moonPhaseCycle(date);
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

/** True when waxing (light grows on the right in N-hemisphere convention). */
export function moonIsWaxing(date: Date): boolean {
  return moonPhaseCycle(date) < 0.5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Full lunar disc path (circle) in SVG path commands. */
export function moonDiscPath(cx: number, cy: number, r: number): string {
  const top = `${round2(cx)} ${round2(cy - r)}`;
  const bottom = `${round2(cx)} ${round2(cy + r)}`;
  return `M${top} A${r} ${r} 0 1 1 ${bottom} A${r} ${r} 0 1 1 ${top} Z`;
}

/**
 * SVG path of the moon's lit region for a phase cycle (0 = new, 0.5 = full).
 * Standard terminator geometry: outer semicircular limb on the lit side plus
 * an inner half-ellipse terminator with rx = r·|cos(2π·cycle)| — true
 * crescent → half → gibbous → full. Returns '' near new (nothing to draw).
 * Northern-hemisphere convention (lit right while waxing); pass `southern`
 * to mirror.
 */
export function moonTerminatorPath(
  cycle: number,
  cx: number,
  cy: number,
  r: number,
  southern = false,
): string {
  const illum = (1 - Math.cos(2 * Math.PI * cycle)) / 2;
  if (illum < 0.04) return '';

  const top = `${round2(cx)} ${round2(cy - r)}`;
  const bottom = `${round2(cx)} ${round2(cy + r)}`;
  if (illum > 0.97) {
    return moonDiscPath(cx, cy, r);
  }

  const rx = round2(r * Math.abs(Math.cos(2 * Math.PI * cycle)));
  const waxing = cycle < 0.5;
  const litRight = southern ? !waxing : waxing;
  const crescent = illum < 0.5;
  // Outer limb from top to bottom through the lit side.
  const outerSweep = litRight ? 1 : 0;
  // Terminator from bottom back to top; sweep 0 passes right of center,
  // sweep 1 passes left. Crescents bulge toward the lit side, gibbous away.
  const bulgeRight = crescent ? litRight : !litRight;
  const termSweep = bulgeRight ? 0 : 1;
  return `M${top} A${r} ${r} 0 0 ${outerSweep} ${bottom} A${rx} ${r} 0 0 ${termSweep} ${top} Z`;
}

/**
 * Translucent phase-shadow path over a bright disc.
 * - Near full → null (no shadow)
 * - Near new → full disc (dim earthshine orb still visible)
 * - Else → evenodd of full disc minus lit terminator so craters show through
 */
export function moonPhaseShadowPath(
  cycle: number,
  cx: number,
  cy: number,
  r: number,
  southern = false,
): { d: string; fillRule?: 'evenodd' } | null {
  const illum = (1 - Math.cos(2 * Math.PI * cycle)) / 2;
  if (illum > 0.97) return null;
  const disc = moonDiscPath(cx, cy, r);
  if (illum < 0.04) return { d: disc };
  const lit = moonTerminatorPath(cycle, cx, cy, r, southern);
  if (!lit) return { d: disc };
  return { d: `${disc} ${lit}`, fillRule: 'evenodd' };
}

/**
 * Approximate latitude for a destination label when weather geocode is absent.
 * Coarse region heuristics — good enough for a thin header star plate.
 */
export function approximateLatitudeForDestination(destination: string): number {
  const d = destination.trim().toLowerCase();
  if (!d) return 40;
  if (/iceland|reykjav|norway|oslo|stockholm|helsinki|alaska|yukon/.test(d)) {
    return 64;
  }
  if (/scotland|sweden|finland|denmark|estonia|latvia|lithuania/.test(d)) {
    return 58;
  }
  if (
    /london|paris|berlin|amsterdam|brussels|prague|vienna|munich|zurich|dublin/.test(
      d,
    )
  ) {
    return 50;
  }
  if (
    /new york|boston|chicago|toronto|montreal|seattle|vancouver|portland/.test(d)
  ) {
    return 42;
  }
  if (/madrid|rome|milan|barcelona|lisbon|porto|athens|istanbul|ankara/.test(d)) {
    return 40;
  }
  if (
    /los angeles|san francisco|tokyo|seoul|beijing|nyc|philadelphia|denver/.test(
      d,
    )
  ) {
    return 35;
  }
  if (/miami|houston|dubai|cairo|delhi|mexico|tel aviv|austin/.test(d)) return 28;
  if (/hawaii|cancun|bangkok|manila|mumbai|chennai|hanoi/.test(d)) return 18;
  if (/singapore|kuala|panama|caracas|lagos/.test(d)) return 5;
  if (/sydney|melbourne|santiago|buenos|cape town|auckland/.test(d)) return -34;
  if (/patagonia|ushuaia|falkland|south georgia/.test(d)) return -52;
  // Hash mid-latitudes for unknown labels so each place gets a stable band.
  let hash = 0;
  for (const ch of d) hash = (hash * 33 + ch.charCodeAt(0)) | 0;
  return 15 + (Math.abs(hash) % 45);
}

function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/** Local sidereal time in degrees for longitude east. */
export function localSiderealTimeDeg(date: Date, longitudeDeg: number): number {
  const jd = julianDate(date);
  const t = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  return (((gmst + longitudeDeg) % 360) + 360) % 360;
}

function starHorizontal(
  star: BrightStar,
  latDeg: number,
  lstDeg: number,
): { alt: number; az: number } | undefined {
  const raDeg = star.raHours * 15;
  const dec = (star.decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  let ha = ((lstDeg - raDeg) * Math.PI) / 180;
  while (ha > Math.PI) ha -= 2 * Math.PI;
  while (ha < -Math.PI) ha += 2 * Math.PI;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));
  if (alt <= 0.02) return undefined;
  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) /
    (Math.cos(alt) * Math.cos(lat) + 1e-9);
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az;
  return { alt: (alt * 180) / Math.PI, az: (az * 180) / Math.PI };
}

/**
 * Project bright stars into a header plate (viewBox coords).
 * Higher altitude → higher on plate; azimuth fans left–right.
 */
export function projectStarsToPlate(options: {
  date: Date;
  latitude: number;
  longitude?: number;
  viewW: number;
  viewH: number;
  /** Soften / thin field when overcast. */
  cloudy?: boolean;
}): ProjectedStar[] {
  const lon = options.longitude ?? 0;
  const lst = localSiderealTimeDeg(options.date, lon);
  const out: ProjectedStar[] = [];
  for (const star of BRIGHT_STARS) {
    const horiz = starHorizontal(star, options.latitude, lst);
    if (!horiz) continue;
    // Map alt 0–90 → bottom–top of plate with a bias toward the upper band.
    const yNorm = 1 - Math.min(1, horiz.alt / 75);
    const xNorm = ((horiz.az + 180) % 360) / 360;
    const x = xNorm * options.viewW;
    const y = yNorm * options.viewH * 0.92 + options.viewH * 0.04;
    const bright = Math.max(0.15, Math.min(1, (2.8 - star.mag) / 3.2));
    const opacity = options.cloudy ? bright * 0.5 : 0.65 + bright * 0.35;
    if (options.cloudy && bright < 0.4) continue;
    out.push({
      name: star.name,
      x,
      y,
      r: 0.7 + bright * 1.35,
      opacity,
      mag: star.mag,
    });
  }
  return out;
}

/** Deterministic dim field fillers so the strip never looks empty. */
export function dimFieldStars(
  viewW: number,
  viewH: number,
  seed: string,
  cloudy: boolean,
  /** Dark-sky boost (desert destinations) — denser field. */
  dense = false,
): ProjectedStar[] {
  const stars: ProjectedStar[] = [];
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const count = cloudy ? 36 : dense ? 104 : 72;
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const u = ((h >>> 0) % 10_000) / 10_000;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 10_000) / 10_000;
    stars.push({
      name: `field-${i}`,
      x: u * viewW,
      y: v * viewH,
      r: 0.5 + u * 0.7,
      opacity: cloudy ? 0.28 + v * 0.28 : 0.42 + v * 0.45,
      mag: 3.5,
    });
  }
  return stars;
}
