import type { CanvasFrame, VisionBoardItemKind } from './types';

export const VISION_BOARD_ASPECT_RATIO = 4 / 5;

export function clampCanvasFrame(frame: CanvasFrame): CanvasFrame {
  const width = Math.min(0.72, Math.max(0.18, frame.width));
  const height = Math.min(0.65, Math.max(0.12, frame.height));
  const x = Math.min(1 - width, Math.max(0, frame.x));
  const y = Math.min(1 - height, Math.max(0, frame.y));
  const rotation = ((((frame.rotation + 180) % 360) + 360) % 360) - 180;
  return {
    x,
    y,
    width,
    height,
    rotation,
    zIndex: Math.max(0, Math.round(frame.zIndex)),
  };
}

export function initialCanvasFrame(
  kind: VisionBoardItemKind,
  itemCount: number,
  zIndex: number,
  aspectRatio = 1,
): CanvasFrame {
  const width = kind === 'image' ? 0.42 : 0.38;
  const imageHeight = Math.min(0.44, Math.max(0.2, (width / Math.max(aspectRatio, 0.4)) * 0.8));
  const height = kind === 'image' ? imageHeight : kind === 'affirmation' ? 0.24 : 0.2;
  const offset = (itemCount % 5) * 0.035;
  return clampCanvasFrame({
    x: 0.08 + offset,
    y: 0.08 + offset,
    width,
    height,
    rotation: itemCount % 2 === 0 ? -2 : 2,
    zIndex,
  });
}

export function nudgeCanvasFrame(
  frame: CanvasFrame,
  action:
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'grow'
    | 'shrink'
    | 'rotate-left'
    | 'rotate-right',
): CanvasFrame {
  const next = { ...frame };
  if (action === 'left') next.x -= 0.02;
  if (action === 'right') next.x += 0.02;
  if (action === 'up') next.y -= 0.02;
  if (action === 'down') next.y += 0.02;
  if (action === 'grow') {
    next.width *= 1.05;
    next.height *= 1.05;
  }
  if (action === 'shrink') {
    next.width *= 0.95;
    next.height *= 0.95;
  }
  if (action === 'rotate-left') next.rotation -= 5;
  if (action === 'rotate-right') next.rotation += 5;
  return clampCanvasFrame(next);
}
