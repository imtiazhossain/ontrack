import {
  clampCanvasFrame,
  initialCanvasFrame,
  nudgeCanvasFrame,
} from '../canvas';

describe('vision board canvas geometry', () => {
  it('creates usable, staggered frames for each card kind', () => {
    expect(initialCanvasFrame('image', 0, 0, 1.5)).toMatchObject({
      x: 0.08,
      y: 0.08,
      width: 0.42,
      zIndex: 0,
    });
    expect(initialCanvasFrame('affirmation', 1, 1)).toMatchObject({
      width: 0.38,
      height: 0.24,
      zIndex: 1,
    });
  });

  it('clamps frames and supports accessible nudge actions', () => {
    const frame = clampCanvasFrame({
      x: 0.9,
      y: -1,
      width: 0.5,
      height: 0.2,
      rotation: 361,
      zIndex: 2.4,
    });
    expect(frame).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 0.2,
      rotation: 1,
      zIndex: 2,
    });
    expect(nudgeCanvasFrame(frame, 'down').y).toBe(0.02);
    expect(nudgeCanvasFrame(frame, 'rotate-left').rotation).toBe(-4);
  });
});
