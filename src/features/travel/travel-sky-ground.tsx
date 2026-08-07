import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { TravelSkyGroundKind } from '@/features/travel/travel-sky-ground-kind';
import {
  SKY_PLATE_VIEWBOX,
  SKY_VIEW_H,
  SKY_VIEW_W,
} from '@/features/travel/travel-sky-plate';
import type { TiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';

type GroundPalette = {
  far: string;
  mid: string;
  near: string;
  window: string;
  road: string;
};

function groundPalette(night: boolean): GroundPalette {
  if (night) {
    return {
      far: 'rgba(14, 28, 42, 0.78)',
      mid: 'rgba(8, 16, 28, 0.9)',
      near: 'rgba(3, 6, 12, 0.96)',
      window: 'rgba(255, 214, 140, 0.55)',
      road: 'rgba(18, 24, 34, 0.95)',
    };
  }
  return {
    far: 'rgba(110, 132, 152, 0.42)',
    mid: 'rgba(70, 92, 112, 0.55)',
    near: 'rgba(42, 58, 74, 0.68)',
    window: 'rgba(255, 240, 200, 0.35)',
    road: 'rgba(55, 68, 82, 0.55)',
  };
}

function Fir({
  x,
  y,
  h,
  fill,
}: {
  x: number;
  y: number;
  h: number;
  fill: string;
}) {
  const w = h * 0.55;
  return (
    <Path
      d={`M${x} ${y} L${x + w / 2} ${y - h} L${x + w} ${y} Z`}
      fill={fill}
    />
  );
}

function Palm({
  x,
  y,
  fill,
}: {
  x: number;
  y: number;
  fill: string;
}) {
  return (
    <G>
      <Path
        d={`M${x} ${y} Q${x - 1} ${y - 18} ${x + 1} ${y - 28}`}
        stroke={fill}
        strokeWidth={1.4}
        fill="none"
      />
      <Path
        d={`M${x + 1} ${y - 26} Q${x - 10} ${y - 30} ${x - 14} ${y - 22}`}
        stroke={fill}
        strokeWidth={1.2}
        fill="none"
      />
      <Path
        d={`M${x + 1} ${y - 26} Q${x + 12} ${y - 32} ${x + 16} ${y - 22}`}
        stroke={fill}
        strokeWidth={1.2}
        fill="none"
      />
      <Path
        d={`M${x + 1} ${y - 26} Q${x + 4} ${y - 36} ${x - 2} ${y - 34}`}
        stroke={fill}
        strokeWidth={1.1}
        fill="none"
      />
    </G>
  );
}

function Car({
  x,
  y,
  w,
  fill,
}: {
  x: number;
  y: number;
  w: number;
  fill: string;
}) {
  const h = w * 0.38;
  return (
    <G>
      <Path
        d={`M${x} ${y}
           H${x + w * 0.18}
           L${x + w * 0.28} ${y - h * 0.55}
           H${x + w * 0.68}
           L${x + w * 0.8} ${y}
           H${x + w}
           V${y + h * 0.45}
           H${x}
           Z`}
        fill={fill}
      />
      <Circle cx={x + w * 0.28} cy={y + h * 0.45} r={w * 0.08} fill={fill} />
      <Circle cx={x + w * 0.72} cy={y + h * 0.45} r={w * 0.08} fill={fill} />
    </G>
  );
}

function House({
  x,
  y,
  w,
  h,
  fill,
  window,
  lit,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const roof = h * 0.45;
  return (
    <G>
      <Path
        d={`M${x} ${y - h}
           L${x + w / 2} ${y - h - roof}
           L${x + w} ${y - h}
           Z`}
        fill={fill}
      />
      <Rect x={x} y={y - h} width={w} height={h} fill={fill} />
      {lit ? (
        <>
          <Rect
            x={x + w * 0.18}
            y={y - h * 0.7}
            width={w * 0.22}
            height={h * 0.28}
            rx={0.6}
            fill={window}
          />
          <Rect
            x={x + w * 0.58}
            y={y - h * 0.7}
            width={w * 0.22}
            height={h * 0.28}
            rx={0.6}
            fill={window}
          />
        </>
      ) : null}
    </G>
  );
}

/**
 * Hallgrímskirkja — basalt-column wings stepping into a tall central tower.
 * Individual fins (with gaps) read as the church, not a generic skyscraper.
 */
function Hallgrimskirkja({
  x,
  fill,
  window,
  lit,
}: {
  x: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const baseY = SKY_VIEW_H - 2;
  /** Outer → inner wing column heights (mirrored). */
  const wingHs = [12, 18, 24, 30, 37, 44, 51, 58];
  const colW = 2.35;
  const gap = 0.5;
  const towerW = 11;
  const towerH = 76;
  const wingPitch = colW + gap;
  const wingSpan = wingHs.length * wingPitch - gap;
  const left0 = x - towerW / 2 - gap - wingSpan;

  return (
    <G>
      {/* Left basalt-column wing */}
      {wingHs.map((h, i) => (
        <Rect
          key={`L${i}`}
          x={left0 + i * wingPitch}
          y={baseY - h}
          width={colW}
          height={h}
          fill={fill}
        />
      ))}
      {/* Central tower + faceted spire */}
      <Rect
        x={x - towerW / 2}
        y={baseY - towerH}
        width={towerW}
        height={towerH}
        fill={fill}
      />
      <Path
        d={`M${x - towerW / 2 + 1.2} ${baseY - towerH}
           L${x} ${baseY - towerH - 10}
           L${x + towerW / 2 - 1.2} ${baseY - towerH}
           Z`}
        fill={fill}
      />
      {/* Right wing (mirror) */}
      {wingHs.map((h, i) => (
        <Rect
          key={`R${i}`}
          x={x + towerW / 2 + gap + (wingHs.length - 1 - i) * wingPitch}
          y={baseY - h}
          width={colW}
          height={h}
          fill={fill}
        />
      ))}
      {/* Gothic door arch cue */}
      <Path
        d={`M${x - 2.4} ${baseY}
           V${baseY - 10}
           Q${x - 2.4} ${baseY - 16} ${x} ${baseY - 16}
           Q${x + 2.4} ${baseY - 16} ${x + 2.4} ${baseY - 10}
           V${baseY}
           Z`}
        fill={lit ? window : 'rgba(20, 32, 48, 0.35)'}
      />
      {lit ? (
        <>
          {[28, 36, 44, 52, 60].map((dy) => (
            <Rect
              key={dy}
              x={x - 1.4}
              y={baseY - dy}
              width={2.8}
              height={2.4}
              rx={0.3}
              fill={window}
            />
          ))}
          <Circle cx={x} cy={baseY - 68} r={2.2} fill={window} />
        </>
      ) : null}
    </G>
  );
}

/** Wide-eave alpine chalet — pitched roof overhangs the walls. */
function Chalet({
  x,
  y,
  w,
  h,
  fill,
  window,
  lit,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const roof = h * 0.7;
  const overhang = w * 0.18;
  return (
    <G>
      <Path
        d={`M${x - overhang} ${y - h}
           L${x + w / 2} ${y - h - roof}
           L${x + w + overhang} ${y - h}
           Z`}
        fill={fill}
      />
      <Rect x={x} y={y - h} width={w} height={h} fill={fill} />
      {lit ? (
        <Rect
          x={x + w * 0.35}
          y={y - h * 0.65}
          width={w * 0.3}
          height={h * 0.32}
          rx={0.5}
          fill={window}
        />
      ) : null}
    </G>
  );
}

/** Coastal lighthouse — tapered shaft + lantern cage. */
function Lighthouse({
  x,
  fill,
  window,
  lit,
}: {
  x: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const baseY = SKY_VIEW_H - 4;
  return (
    <G>
      <Path
        d={`M${x - 5} ${baseY}
           L${x - 3.2} ${baseY - 36}
           H${x + 3.2}
           L${x + 5} ${baseY}
           Z`}
        fill={fill}
      />
      <Rect x={x - 4} y={baseY - 42} width={8} height={7} rx={0.6} fill={fill} />
      <Path
        d={`M${x - 3.2} ${baseY - 42}
           L${x} ${baseY - 48}
           L${x + 3.2} ${baseY - 42}
           Z`}
        fill={fill}
      />
      {lit ? (
        <Rect
          x={x - 2.4}
          y={baseY - 40.5}
          width={4.8}
          height={3.6}
          rx={0.4}
          fill={window}
        />
      ) : null}
    </G>
  );
}

/** Desert / tropical stepped pyramid cue. */
function SteppedPyramid({
  x,
  fill,
  tiers = 4,
}: {
  x: number;
  fill: string;
  tiers?: number;
}) {
  const baseY = SKY_VIEW_H - 2;
  const baseW = 36;
  const tierH = 7;
  return (
    <G>
      {Array.from({ length: tiers }, (_, i) => {
        const t = i / Math.max(tiers - 1, 1);
        const w = baseW * (1 - t * 0.72);
        const y = baseY - (i + 1) * tierH;
        return (
          <Rect
            key={i}
            x={x - w / 2}
            y={y}
            width={w}
            height={tierH + 0.4}
            fill={fill}
          />
        );
      })}
      <Path
        d={`M${x - 3} ${baseY - tiers * tierH}
           L${x} ${baseY - tiers * tierH - 6}
           L${x + 3} ${baseY - tiers * tierH}
           Z`}
        fill={fill}
      />
    </G>
  );
}

/** Smooth desert pyramid. */
function Pyramid({ x, fill }: { x: number; fill: string }) {
  const baseY = SKY_VIEW_H - 2;
  return (
    <Path
      d={`M${x - 22} ${baseY}
         L${x} ${baseY - 42}
         L${x + 22} ${baseY}
         Z`}
      fill={fill}
    />
  );
}

/** Pastoral country church — nave + steeple. */
function CountryChurch({
  x,
  fill,
  window,
  lit,
}: {
  x: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const baseY = SKY_VIEW_H - 2;
  return (
    <G>
      <Rect x={x - 12} y={baseY - 14} width={24} height={14} fill={fill} />
      <Path
        d={`M${x - 13} ${baseY - 14}
           L${x} ${baseY - 22}
           L${x + 13} ${baseY - 14}
           Z`}
        fill={fill}
      />
      <Rect x={x - 3.2} y={baseY - 34} width={6.4} height={20} fill={fill} />
      <Path
        d={`M${x - 4} ${baseY - 34}
           L${x} ${baseY - 42}
           L${x + 4} ${baseY - 34}
           Z`}
        fill={fill}
      />
      {lit ? (
        <Rect
          x={x - 1.6}
          y={baseY - 28}
          width={3.2}
          height={4}
          rx={0.3}
          fill={window}
        />
      ) : null}
    </G>
  );
}

/** Metro setback tower (art-deco / Empire-adjacent cue). */
function SetbackTower({
  x,
  w,
  h,
  fill,
  window,
  lit,
}: {
  x: number;
  w: number;
  h: number;
  fill: string;
  window: string;
  lit: boolean;
}) {
  const baseY = SKY_VIEW_H - 2;
  const midH = h * 0.55;
  const topH = h * 0.28;
  const midW = w * 0.72;
  const topW = w * 0.42;
  return (
    <G>
      <Rect x={x} y={baseY - midH} width={w} height={midH} fill={fill} />
      <Rect
        x={x + (w - midW) / 2}
        y={baseY - midH - topH}
        width={midW}
        height={topH}
        fill={fill}
      />
      <Rect
        x={x + (w - topW) / 2}
        y={baseY - h}
        width={topW}
        height={h - midH - topH}
        fill={fill}
      />
      <Path
        d={`M${x + w / 2 - 1} ${baseY - h}
           V${baseY - h - 6}
           H${x + w / 2 + 1}
           V${baseY - h}
           Z`}
        fill={fill}
      />
      {lit
        ? Array.from({ length: Math.floor(midH / 8) }, (_, i) => (
            <Rect
              key={i}
              x={x + w * 0.22}
              y={baseY - midH + 3 + i * 8}
              width={w * 0.18}
              height={2}
              rx={0.3}
              fill={i % 2 === 0 ? window : 'rgba(255,214,140,0.22)'}
            />
          ))
        : null}
    </G>
  );
}

function GroundFarMountains({ fill }: { fill: string }) {
  return (
    <Path
      d={`M0 ${SKY_VIEW_H - 18}
         L28 ${SKY_VIEW_H - 36}
         L52 ${SKY_VIEW_H - 28}
         L88 ${SKY_VIEW_H - 48}
         L118 ${SKY_VIEW_H - 32}
         L150 ${SKY_VIEW_H - 52}
         L190 ${SKY_VIEW_H - 30}
         L230 ${SKY_VIEW_H - 46}
         L270 ${SKY_VIEW_H - 28}
         L310 ${SKY_VIEW_H - 42}
         L340 ${SKY_VIEW_H - 30}
         L360 ${SKY_VIEW_H - 22}
         V${SKY_VIEW_H}
         H0 Z`}
      fill={fill}
    />
  );
}

function NordicGround({ p, night }: { p: GroundPalette; night: boolean }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      {/* Esja-like far ridge */}
      <Path
        d={`M0 ${base - 16}
           L40 ${base - 34}
           L78 ${base - 22}
           L120 ${base - 40}
           L168 ${base - 24}
           L210 ${base - 38}
           L260 ${base - 20}
           L310 ${base - 32}
           L360 ${base - 18}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.far}
      />
      {/* Mid ridge + firs */}
      <Path
        d={`M0 ${base - 6}
           L55 ${base - 16}
           L110 ${base - 10}
           L170 ${base - 18}
           L240 ${base - 8}
           L300 ${base - 14}
           L360 ${base - 6}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      <Fir x={18} y={base - 6} h={14} fill={p.mid} />
      <Fir x={34} y={base - 5} h={11} fill={p.mid} />
      <Fir x={300} y={base - 7} h={13} fill={p.mid} />
      <Fir x={318} y={base - 5} h={10} fill={p.mid} />
      {/* Town row — church is the hero landmark */}
      <House x={42} y={base} w={16} h={11} fill={p.near} window={p.window} lit={night} />
      <House x={60} y={base} w={14} h={10} fill={p.near} window={p.window} lit={night} />
      <House x={76} y={base} w={18} h={12} fill={p.near} window={p.window} lit={night} />
      <House x={96} y={base} w={13} h={9} fill={p.near} window={p.window} lit={false} />
      <Hallgrimskirkja x={188} fill={p.near} window={p.window} lit={night} />
      <House x={236} y={base} w={15} h={10} fill={p.near} window={p.window} lit={night} />
      <House x={254} y={base} w={17} h={12} fill={p.near} window={p.window} lit={night} />
      <House x={274} y={base} w={14} h={9} fill={p.near} window={p.window} lit={false} />
      {/* Road + cars */}
      <Rect x={0} y={base + 1} width={SKY_VIEW_W} height={4} fill={p.road} />
      <Car x={58} y={base + 1} w={16} fill={p.near} />
      <Car x={290} y={base + 1.5} w={14} fill={p.mid} />
    </G>
  );
}

function TropicalGround({ p, night }: { p: GroundPalette; night: boolean }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      <Path
        d={`M0 ${base - 8}
           Q90 ${base - 18} 180 ${base - 10}
           Q270 ${base - 20} 360 ${base - 8}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.far}
      />
      <Path
        d={`M0 ${base}
           Q120 ${base - 6} 240 ${base - 2}
           L360 ${base}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      <Palm x={40} y={base} fill={p.near} />
      <Palm x={62} y={base + 1} fill={p.mid} />
      <Palm x={290} y={base} fill={p.near} />
      <Palm x={318} y={base + 1} fill={p.mid} />
      <SteppedPyramid x={180} fill={p.near} tiers={4} />
      <House x={110} y={base} w={18} h={9} fill={p.mid} window={p.window} lit={night} />
      <House x={230} y={base} w={16} h={10} fill={p.mid} window={p.window} lit={night} />
      <Rect x={0} y={base + 1} width={SKY_VIEW_W} height={4} fill={p.road} />
      <Car x={250} y={base + 1} w={15} fill={p.near} />
    </G>
  );
}

function DesertGround({ p }: { p: GroundPalette }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      <Path
        d={`M0 ${base - 4}
           Q60 ${base - 22} 120 ${base - 8}
           Q180 ${base - 28} 250 ${base - 10}
           Q310 ${base - 24} 360 ${base - 6}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.far}
      />
      <Path
        d={`M0 ${base}
           Q100 ${base - 10} 200 ${base - 2}
           Q280 ${base - 12} 360 ${base}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      <Pyramid x={178} fill={p.near} />
      {/* Sparse cactus / rock markers */}
      <Rect x={72} y={base - 14} width={2.2} height={14} rx={1} fill={p.near} />
      <Rect x={68} y={base - 10} width={10} height={2} rx={1} fill={p.near} />
      <Rect x={300} y={base - 12} width={2} height={12} rx={1} fill={p.near} />
      <Rect x={296} y={base - 9} width={9} height={2} rx={1} fill={p.near} />
      <Car x={240} y={base} w={14} fill={p.mid} />
    </G>
  );
}

function MetroGround({ p, night }: { p: GroundPalette; night: boolean }) {
  const base = SKY_VIEW_H - 2;
  const blockTowers = [
    { x: 18, w: 12, h: 28 },
    { x: 34, w: 9, h: 22 },
    { x: 48, w: 14, h: 36 },
    { x: 66, w: 10, h: 24 },
    { x: 118, w: 11, h: 30 },
    { x: 134, w: 16, h: 38 },
    { x: 210, w: 12, h: 26 },
    { x: 226, w: 15, h: 34 },
    { x: 280, w: 11, h: 24 },
    { x: 296, w: 14, h: 32 },
    { x: 318, w: 10, h: 22 },
    { x: 332, w: 16, h: 30 },
  ];
  return (
    <G>
      <GroundFarMountains fill={p.far} />
      {blockTowers.map((t) => (
        <G key={`${t.x}-${t.h}`}>
          <Rect x={t.x} y={base - t.h} width={t.w} height={t.h} fill={p.mid} />
          {night
            ? Array.from({ length: Math.floor(t.h / 8) }, (_, i) => (
                <Rect
                  key={i}
                  x={t.x + t.w * 0.25}
                  y={base - t.h + 4 + i * 8}
                  width={t.w * 0.2}
                  height={2}
                  rx={0.3}
                  fill={i % 3 === 0 ? p.window : 'rgba(255,214,140,0.2)'}
                />
              ))
            : null}
        </G>
      ))}
      {/* Hero setback towers — art-deco / skyline cue */}
      <SetbackTower
        x={82}
        w={18}
        h={56}
        fill={p.near}
        window={p.window}
        lit={night}
      />
      <SetbackTower
        x={158}
        w={22}
        h={68}
        fill={p.near}
        window={p.window}
        lit={night}
      />
      <SetbackTower
        x={248}
        w={16}
        h={50}
        fill={p.near}
        window={p.window}
        lit={night}
      />
      <Rect x={0} y={base + 1} width={SKY_VIEW_W} height={4} fill={p.road} />
      <Car x={90} y={base + 1} w={15} fill={p.mid} />
      <Car x={210} y={base + 1.5} w={13} fill={p.near} />
    </G>
  );
}

function AlpineGround({ p }: { p: GroundPalette }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      <Path
        d={`M0 ${base - 10}
           L45 ${base - 48}
           L70 ${base - 28}
           L110 ${base - 58}
           L150 ${base - 30}
           L200 ${base - 62}
           L245 ${base - 34}
           L290 ${base - 54}
           L330 ${base - 28}
           L360 ${base - 40}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.far}
      />
      <Path
        d={`M0 ${base}
           L80 ${base - 14}
           L160 ${base - 6}
           L240 ${base - 16}
           L320 ${base - 8}
           L360 ${base}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      {[24, 40, 56, 250, 268, 290, 310].map((x, i) => (
        <Fir key={x} x={x} y={base - (i % 2)} h={12 + (i % 3) * 3} fill={p.near} />
      ))}
      <Chalet
        x={132}
        y={base}
        w={22}
        h={12}
        fill={p.near}
        window={p.window}
        lit={false}
      />
      <Chalet
        x={168}
        y={base}
        w={18}
        h={10}
        fill={p.mid}
        window={p.window}
        lit={false}
      />
      <Car x={210} y={base} w={14} fill={p.near} />
    </G>
  );
}

function CoastalGround({ p, night }: { p: GroundPalette; night: boolean }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      <Path
        d={`M0 ${base - 12}
           Q80 ${base - 20} 160 ${base - 10}
           Q240 ${base - 22} 360 ${base - 12}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.far}
      />
      {/* Water shelf */}
      <Path
        d={`M0 ${base + 2}
           Q120 ${base - 2} 240 ${base + 1}
           T360 ${base}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      <House x={36} y={base - 2} w={15} h={10} fill={p.near} window={p.window} lit={night} />
      <House x={54} y={base - 2} w={13} h={9} fill={p.near} window={p.window} lit={night} />
      <Lighthouse x={188} fill={p.near} window={p.window} lit={night} />
      <House x={250} y={base - 2} w={16} h={11} fill={p.near} window={p.window} lit={night} />
      {/* Pier + boats */}
      <Rect x={120} y={base - 1} width={50} height={2} fill={p.near} />
      <Path
        d={`M130 ${base - 1} L137 ${base - 8} L150 ${base - 1} Z`}
        fill={p.near}
      />
      <Path
        d={`M155 ${base} L163 ${base - 7} L173 ${base} Z`}
        fill={p.mid}
      />
      <Palm x={300} y={base - 2} fill={p.near} />
      <Car x={76} y={base - 1} w={14} fill={p.near} />
    </G>
  );
}

function PastoralGround({ p, night }: { p: GroundPalette; night: boolean }) {
  const base = SKY_VIEW_H - 2;
  return (
    <G>
      <GroundFarMountains fill={p.far} />
      <Path
        d={`M0 ${base}
           Q90 ${base - 12} 180 ${base - 4}
           Q270 ${base - 14} 360 ${base}
           V${SKY_VIEW_H} H0 Z`}
        fill={p.mid}
      />
      {[30, 48, 70, 250, 275, 300, 330].map((x, i) => (
        <Fir key={x} x={x} y={base} h={10 + (i % 4) * 2} fill={p.near} />
      ))}
      <CountryChurch x={168} fill={p.near} window={p.window} lit={night} />
      <House x={120} y={base} w={16} h={10} fill={p.mid} window={p.window} lit={night} />
      <House x={196} y={base} w={14} h={9} fill={p.mid} window={p.window} lit={false} />
      <Rect x={0} y={base + 1} width={SKY_VIEW_W} height={3.5} fill={p.road} />
      <Car x={230} y={base + 1} w={15} fill={p.near} />
    </G>
  );
}

function GroundArt({
  kind,
  night,
}: {
  kind: TravelSkyGroundKind;
  night: boolean;
}) {
  const p = groundPalette(night);
  switch (kind) {
    case 'nordic':
      return <NordicGround p={p} night={night} />;
    case 'tropical':
      return <TropicalGround p={p} night={night} />;
    case 'desert':
      return <DesertGround p={p} />;
    case 'metro':
      return <MetroGround p={p} night={night} />;
    case 'alpine':
      return <AlpineGround p={p} />;
    case 'coastal':
      return <CoastalGround p={p} night={night} />;
    default:
      return <PastoralGround p={p} night={night} />;
  }
}

/**
 * Location-flavored ground band for the itinerary sky plate —
 * mountains, trees, town/city, cars — dissolving with the horizon fade.
 */
export function TravelSkyGround({
  kind,
  night,
  motion,
}: {
  kind: TravelSkyGroundKind;
  night: boolean;
  motion: TiltSkyMotion;
}) {
  const style = useAnimatedStyle(() => {
    const depth = 0.22;
    return {
      transform: [
        { translateX: motion.tiltX.value * 10 * depth },
        {
          translateY: interpolate(motion.tiltY.value, [-1, 1], [1.2, -1.2]) * depth,
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox={SKY_PLATE_VIEWBOX}
          preserveAspectRatio="none">
          <GroundArt kind={kind} night={night} />
        </Svg>
      </View>
    </Animated.View>
  );
}
