import { parseMoodSuggestionInput } from '../action-suggestions';

describe('mood suggestion privacy boundary', () => {
  it('accepts only the narrow labels-only payload', () => {
    expect(parseMoodSuggestionInput({ emotions: [{ label: 'Sad', intensity: 4 }], factorNames: ['Rain'], desiredEmotions: ['Calm'] })).toEqual({ emotions: [{ label: 'Sad', intensity: 4 }], factorNames: ['Rain'], desiredEmotions: ['Calm'] });
  });

  it.each(['note', 'healthMetrics', 'history', 'userId', 'entryId'])(
    'rejects forbidden top-level field %s',
    (field) => {
      expect(parseMoodSuggestionInput({ emotions: [{ label: 'Sad', intensity: 4 }], factorNames: [], desiredEmotions: [], [field]: 'private' })).toBeUndefined();
    },
  );
});
