import { View } from 'react-native';
import Svg, {
    Circle,
    Defs,
    G,
    LinearGradient,
    Path,
    Rect,
    Stop,
} from 'react-native-svg';

/**
 * Travel Home icon marks from `design/travel/assets/icons/*.svg`.
 * Kept as RN SVG so `currentColor` maps to theme — do not substitute icon-library approximations.
 */

type TravelHomeIconProps = {
  size?: number;
  color: string;
};

/** Spec `edit.svg` — pencil for hero edit control. */
export function TravelHomeEditIcon({ size = 20, color }: TravelHomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20L8.3 19.1L18.4 9L15 5.6L4.9 15.7L4 20Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path
        d="M13.9 6.7L17.3 10.1"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M15 5.6L16.7 3.9C17.4 3.2 18.5 3.2 19.2 3.9L20.1 4.8C20.8 5.5 20.8 6.6 20.1 7.3L18.4 9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Spec `add.svg` — add-trip FAB. */
export function TravelHomePlusIcon({ size = 24, color }: TravelHomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Location pin for trip rows — solid mark matching the user reference. */
export function TravelHomeLocationPin({ size = 17, color }: TravelHomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.5C12 21.5 4.5 14.8 4.5 9.4C4.5 5.2 7.8 2.2 12 2.2C16.2 2.2 19.5 5.2 19.5 9.4C19.5 14.8 12 21.5 12 21.5Z"
        fill={color}
      />
      <Circle cx="12" cy="9.3" r="2.6" fill="#FFFFFF" />
    </Svg>
  );
}

/** Spec `itinerary-route.svg` — S-curve route between open endpoints. */
export function TravelHomeRouteIcon({ size = 26, color }: TravelHomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.6 18.2H15.2C17.6 18.2 18.8 16.7 18.8 14.9C18.8 12.4 16.6 11.6 13.4 11.6C10.2 11.6 8 10.7 8 8.3C8 6.5 9.3 5 11.8 5H17.6"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="5.35"
        cy="18.2"
        r="2.15"
        stroke={color}
        strokeWidth="1.7"
        fill="none"
      />
      <Circle
        cx="19.7"
        cy="5"
        r="2.15"
        stroke={color}
        strokeWidth="1.7"
        fill="none"
      />
    </Svg>
  );
}

/** Spec `calendar.svg` — trip dates leading mark. */
export function TravelHomeCalendarIcon({ size = 16, color }: TravelHomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M7 3V7M17 3V7M3 10H21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Plane / flourish viewBox height (kit `travel-route.svg`). */
export const TRAVEL_HOME_PLANE_VB = 40;
/** Plane pivot in the flourish viewBox — matches kit `translate(20 16)`. */
export const TRAVEL_HOME_PLANE_CENTER = { x: 20, y: 16 } as const;
/**
 * Nose angle from north (SVG degrees: 0 = up, negative = CCW).
 * Change this alone — trail attach recomputes from both stabilizer tips.
 */
export const TRAVEL_HOME_PLANE_ROTATION_DEG = -62;
/** Material `flight` horizontal-stabilizer tips (glyph-local, nose-up). */
const PLANE_TAIL_TIP_LEFT = { x: 8, y: 22 } as const;
const PLANE_TAIL_TIP_RIGHT = { x: 15, y: 22 } as const;
/** Clear air between mid-tail and first dash (px at plane size 34). */
export const TRAVEL_HOME_TRAIL_TAIL_GAP = 5;

/**
 * Kit mock S-curve in unit trail space (x 0→1, y deltas from start).
 * Shape: down into a trough, then up past the start to a high crest, settle.
 * Source: `travel-route.svg` `M…C43.3 26.2 52 30 68 14C80 4 88 9 95 14`.
 */
const TRAVEL_HOME_TRAIL_S_UNIT = {
  c1: { x: 0.161, y: 4.3 },
  c2: { x: 0.302, y: 8.1 },
  mid: { x: 0.562, y: -7.9 },
  c3: { x: 0.757, y: -17.9 },
  c4: { x: 0.886, y: -12.9 },
  end: { x: 1, y: -7.9 },
} as const;

/** Same transform stack as kit / `TravelHomeRouteFlourish` plane `<G>`. */
export function travelHomePlaneTransformPoint(
  localX: number,
  localY: number,
  rotationDeg: number = TRAVEL_HOME_PLANE_ROTATION_DEG,
) {
  const scale = 1.15;
  const x = (localX - 12) * scale;
  const y = (localY - 12) * scale;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: TRAVEL_HOME_PLANE_CENTER.x + x * cos - y * sin,
    y: TRAVEL_HOME_PLANE_CENTER.y + x * sin + y * cos,
  };
}

/**
 * Midpoint between the two tail stabilizer tips in the plane viewBox —
 * recomputed from `TRAVEL_HOME_PLANE_ROTATION_DEG` so attach survives rotates.
 */
export function travelHomePlaneTailMidVb(
  rotationDeg: number = TRAVEL_HOME_PLANE_ROTATION_DEG,
) {
  const left = travelHomePlaneTransformPoint(
    PLANE_TAIL_TIP_LEFT.x,
    PLANE_TAIL_TIP_LEFT.y,
    rotationDeg,
  );
  const right = travelHomePlaneTransformPoint(
    PLANE_TAIL_TIP_RIGHT.x,
    PLANE_TAIL_TIP_RIGHT.y,
    rotationDeg,
  );
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

/** Mid-tail in plane layout pixels for a given `size`. */
export function travelHomePlaneTailPoint(
  size: number,
  rotationDeg: number = TRAVEL_HOME_PLANE_ROTATION_DEG,
) {
  const mid = travelHomePlaneTailMidVb(rotationDeg);
  const s = size / TRAVEL_HOME_PLANE_VB;
  return { x: mid.x * s, y: mid.y * s };
}

/** Gap in plane viewBox units between mid-tail and first dash. */
export function travelHomeTrailGapVb(planeSize = 34) {
  return TRAVEL_HOME_TRAIL_TAIL_GAP * (TRAVEL_HOME_PLANE_VB / planeSize);
}

/**
 * Unit vector from nose → tail in the plane viewBox (rear / trail direction).
 * Rotates with `TRAVEL_HOME_PLANE_ROTATION_DEG`.
 */
export function travelHomePlaneRearAxisUnit(
  rotationDeg: number = TRAVEL_HOME_PLANE_ROTATION_DEG,
) {
  const nose = travelHomePlaneTransformPoint(11.5, 2, rotationDeg);
  const tail = travelHomePlaneTailMidVb(rotationDeg);
  const dx = tail.x - nose.x;
  const dy = tail.y - nose.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Trail start: mid-tail + gap along the fuselage axis (not a raw +X nudge). */
export function travelHomeTrailStartVb(
  planeSize = 34,
  rotationDeg: number = TRAVEL_HOME_PLANE_ROTATION_DEG,
) {
  const mid = travelHomePlaneTailMidVb(rotationDeg);
  const axis = travelHomePlaneRearAxisUnit(rotationDeg);
  const gap = travelHomeTrailGapVb(planeSize);
  return {
    x: mid.x + axis.x * gap,
    y: mid.y + axis.y * gap,
    mid,
    axis,
    gap,
  };
}

/**
 * Plane + dashed trail in one SVG / one viewBox.
 * Trail leaves mid-tail (gap on fuselage axis), then follows the kit mock S
 * (down → trough → up over the start → crest → settle at +).
 */
export function TravelHomeRouteFlourish({
  width,
  planeSize = 34,
  height,
  color,
  rotationDeg = TRAVEL_HOME_PLANE_ROTATION_DEG,
}: {
  width: number;
  planeSize?: number;
  /** Band height — keep ≥ viewBox 40 so the mock S is not vertically crushed. */
  height?: number;
  color: string;
  rotationDeg?: number;
}) {
  const size = Math.max(28, Math.round(planeSize));
  const bandH = Math.max(TRAVEL_HOME_PLANE_VB, Math.round(height ?? TRAVEL_HOME_PLANE_VB));
  const totalW = Math.max(size + 24, Math.round(width));
  /** Uniform scale: viewBox height 40 → bandH px; width follows the same scale. */
  const viewW = totalW * (TRAVEL_HOME_PLANE_VB / bandH);
  const { x: startX, y: startY } = travelHomeTrailStartVb(size, rotationDeg);
  const endX = viewW - 2.5;
  const spanX = Math.max(8, endX - startX);
  const u = TRAVEL_HOME_TRAIL_S_UNIT;
  const pt = (t: { x: number; y: number }) => ({
    x: startX + spanX * t.x,
    y: startY + t.y,
  });
  const c1 = pt(u.c1);
  const c2 = pt(u.c2);
  const mid = pt(u.mid);
  const c3 = pt(u.c3);
  const c4 = pt(u.c4);
  const end = { ...pt(u.end), x: endX };
  const d =
    `M${startX.toFixed(2)} ${startY.toFixed(2)}` +
    `C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ` +
    `${mid.x.toFixed(1)} ${mid.y.toFixed(1)}` +
    `C${c3.x.toFixed(1)} ${c3.y.toFixed(1)} ${c4.x.toFixed(1)} ${c4.y.toFixed(1)} ` +
    `${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const { x: cx, y: cy } = TRAVEL_HOME_PLANE_CENTER;
  const planeTransform = `translate(${cx} ${cy}) rotate(${rotationDeg}) scale(1.15) translate(-12 -12)`;
  /** Screen ~1.25pt stroke after viewBox → px scale (bandH/40). */
  const sw = 1.25 * (TRAVEL_HOME_PLANE_VB / bandH);

  return (
    <Svg
      width={totalW}
      height={bandH}
      viewBox={`0 0 ${viewW.toFixed(2)} ${TRAVEL_HOME_PLANE_VB}`}
      preserveAspectRatio="none"
      fill="none">
      <G transform={planeTransform}>
        <Path
          fill={color}
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </G>
      <Path
        d={d}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${1.5 * (TRAVEL_HOME_PLANE_VB / bandH)} ${2.6 * (TRAVEL_HOME_PLANE_VB / bandH)}`}
      />
    </Svg>
  );
}

/** Fixed-size header plane only — nose from `TRAVEL_HOME_PLANE_ROTATION_DEG`. */
export function TravelHomeRoutePlane({
  size = 34,
  color,
  rotationDeg = TRAVEL_HOME_PLANE_ROTATION_DEG,
}: {
  size?: number;
  color: string;
  rotationDeg?: number;
}) {
  const { x: cx, y: cy } = TRAVEL_HOME_PLANE_CENTER;
  const planeTransform = `translate(${cx} ${cy}) rotate(${rotationDeg}) scale(1.15) translate(-12 -12)`;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${TRAVEL_HOME_PLANE_VB} ${TRAVEL_HOME_PLANE_VB}`}
      fill="none">
      <G transform={planeTransform}>
        <Path
          fill={color}
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </G>
    </Svg>
  );
}

/**
 * Header motif: plane + trail filling `width` in one coordinate system.
 * See GLYPH_MATCHING.md.
 */
export function TravelHomeRouteMotif({
  width = 96,
  height = 40,
  color,
}: {
  width?: number;
  height?: number;
  color: string;
}) {
  return (
    <TravelHomeRouteFlourish
      width={Math.max(96, width)}
      planeSize={34}
      height={Math.max(40, height)}
      color={color}
    />
  );
}

/** Spec `destination-placeholder.svg` — image unavailable / loading fallback. */
export function TravelHomeDestinationPlaceholder({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="travelHomePlaceholderG" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#E9F0FA" />
          <Stop offset="0.5" stopColor="#F7E9DC" />
          <Stop offset="1" stopColor="#C7D8EC" />
        </LinearGradient>
      </Defs>
      <Rect width="1200" height="800" fill="url(#travelHomePlaceholderG)" />
      <Path
        d="M0 610L260 360L430 515L650 290L920 515L1200 340V800H0Z"
        fill="#000000"
        opacity={0.18}
      />
      <Path
        d="M0 690L300 500L520 620L720 470L990 610L1200 500V800H0Z"
        fill="#000000"
        opacity={0.12}
      />
    </Svg>
  );
}
