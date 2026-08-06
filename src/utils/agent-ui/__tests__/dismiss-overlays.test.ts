import {
  dismissAgentUiOverlays,
  isAgentUiDismissTargetId,
} from '../dismiss-overlays';
import {
  registerAgentUiTarget,
  resetAgentUiRegistry,
  unregisterAgentUiTarget,
} from '../registry';

describe('dismiss overlays', () => {
  beforeEach(() => {
    resetAgentUiRegistry();
  });

  it('matches close/cancel and travel sheet done ids', () => {
    expect(isAgentUiDismissTargetId('ontrack.travel.currency.close')).toBe(true);
    expect(isAgentUiDismissTargetId('ontrack.travel.weather.done')).toBe(true);
    expect(isAgentUiDismissTargetId('ontrack.prompt.cancel')).toBe(true);
    expect(isAgentUiDismissTargetId('ontrack.travel.list.currency.trip-1')).toBe(
      false,
    );
    expect(isAgentUiDismissTargetId('ontrack.travel.currency.done')).toBe(true);
  });

  it('taps registered dismiss targets under a prefix', () => {
    const keep = jest.fn();
    registerAgentUiTarget('ontrack.travel.expenses.close', {
      label: 'Close',
      press: () => unregisterAgentUiTarget('ontrack.travel.expenses.close'),
    });
    registerAgentUiTarget('ontrack.travel.list.currency.trip-1', {
      label: 'Currency',
      press: keep,
    });
    registerAgentUiTarget('ontrack.todos.settings.close', {
      label: 'Other',
      press: jest.fn(),
    });

    const result = dismissAgentUiOverlays('ontrack.travel.');
    expect(result.tapped).toEqual(['ontrack.travel.expenses.close']);
    expect(result.rounds).toBe(2);
    expect(keep).not.toHaveBeenCalled();
  });

  it('returns nothing open when no dismiss targets exist', () => {
    registerAgentUiTarget('ontrack.travel.list.itinerary.trip-1', {
      label: 'Itinerary',
      press: jest.fn(),
    });
    expect(dismissAgentUiOverlays('ontrack.travel.')).toEqual({
      tapped: [],
      rounds: 1,
    });
  });

  it('caps rounds when a dismiss target stays registered', () => {
    const stubborn = jest.fn();
    registerAgentUiTarget('ontrack.travel.currency.close', {
      label: 'Close',
      press: stubborn,
    });
    const result = dismissAgentUiOverlays('ontrack.travel.');
    expect(result.rounds).toBe(4);
    expect(result.tapped).toHaveLength(4);
    expect(stubborn).toHaveBeenCalledTimes(4);
  });
});
