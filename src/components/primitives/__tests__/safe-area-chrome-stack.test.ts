import { pickRankedEntry } from '@/components/primitives/safe-area-chrome-stack';

describe('pickRankedEntry', () => {
  it('returns undefined for an empty stack', () => {
    expect(pickRankedEntry([])).toBeUndefined();
  });

  it('lets a higher-priority leaf beat a later layout registration', () => {
    const layout = { id: 'layout', priority: 0, seq: 2, color: '#000000' };
    const hero = { id: 'hero', priority: 1, seq: 1, color: '#0C1423' };
    // Child focus effects run before parents, so layout gets the higher seq.
    expect(pickRankedEntry([hero, layout])?.color).toBe('#0C1423');
  });

  it('breaks equal priority ties with later seq', () => {
    const first = { id: 'a', priority: 0, seq: 1, color: '#111111' };
    const second = { id: 'b', priority: 0, seq: 2, color: '#222222' };
    expect(pickRankedEntry([first, second])?.color).toBe('#222222');
  });
});
