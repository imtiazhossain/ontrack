import { applyTimePenalty, getLevelConfig } from '../balloon-pop/levels';

describe('balloon pop levels', () => {
  it('starts without fans and unlocks edges as levels climb', () => {
    expect(getLevelConfig(1).fans).toEqual([]);
    expect(getLevelConfig(2).fans.map((fan) => fan.side)).toEqual(['left']);
    expect(getLevelConfig(3).fans.map((fan) => fan.side)).toEqual(['left', 'right']);
    expect(getLevelConfig(4).fans.map((fan) => fan.side)).toEqual(['left', 'right', 'top']);
    expect(getLevelConfig(5).fans.map((fan) => fan.side)).toEqual([
      'left',
      'right',
      'top',
      'bottom',
    ]);
  });

  it('raises wrong-pop penalties and keeps a positive timer', () => {
    expect(getLevelConfig(1).wrongPopPenaltySec).toBe(2);
    expect(getLevelConfig(3).wrongPopPenaltySec).toBe(3);
    expect(getLevelConfig(5).wrongPopPenaltySec).toBe(4);
    expect(getLevelConfig(8).durationSec).toBeGreaterThan(0);
  });

  it('always includes the target color in the pool', () => {
    for (let level = 1; level <= 8; level += 1) {
      const config = getLevelConfig(level);
      expect(config.colorPool).toContain(config.targetColorId);
      expect(config.targetCount).toBeGreaterThan(0);
    }
  });
});

describe('applyTimePenalty', () => {
  it('subtracts seconds without going below zero', () => {
    expect(applyTimePenalty(10, 3)).toBe(7);
    expect(applyTimePenalty(2, 4)).toBe(0);
    expect(applyTimePenalty(0, 2)).toBe(0);
  });
});
