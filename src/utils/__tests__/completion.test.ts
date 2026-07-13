import { dayCompletion, dayIndicator, streak } from '@/utils/completion';
import type { Activity } from '@/types/models';

function activity(status: Activity['status']): Activity {
  return {
    id: '1',
    date: '2026-07-10',
    title: 'Test',
    categoryId: 'habit',
    startMinutes: 480,
    durationMinutes: 30,
    status,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };
}

describe('dayCompletion', () => {
  it('returns 0 for empty list', () => {
    expect(dayCompletion([])).toBe(0);
  });

  it('excludes skipped activities from denominator', () => {
    const result = dayCompletion([
      activity('completed'),
      activity('skipped'),
      activity('upcoming'),
    ]);
    expect(result).toBe(0.5);
  });

  it('counts partial as half credit', () => {
    const result = dayCompletion([activity('partial'), activity('completed')]);
    expect(result).toBe(0.75);
  });
});

describe('dayIndicator', () => {
  it('returns empty when no activities', () => {
    expect(dayIndicator([])).toBe('empty');
  });

  it('returns full when all counted activities complete', () => {
    expect(dayIndicator([activity('completed'), activity('completed')])).toBe('full');
  });
});

describe('streak', () => {
  it('counts consecutive days above threshold', () => {
    const byDate = {
      '2026-07-08': [activity('completed')],
      '2026-07-09': [activity('completed')],
      '2026-07-10': [activity('completed')],
    };
    const addDays = (key: string, days: number) => {
      const d = new Date(`${key}T12:00:00`);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    expect(streak(byDate, '2026-07-10', addDays)).toBe(3);
  });
});
