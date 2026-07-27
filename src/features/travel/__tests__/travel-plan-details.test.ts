import { validateTravelPlanDetails } from '../travel-plan-details';

describe('travel plan details', () => {
  it('trims editable details and removes empty notes', () => {
    expect(validateTravelPlanDetails({
      title: '  Iceland escape  ',
      destination: '  Reykjavík  ',
      notes: '   ',
    })).toEqual({
      ok: true,
      value: {
        title: 'Iceland escape',
        destination: 'Reykjavík',
        notes: undefined,
      },
    });
  });

  it('requires a trip name and destination', () => {
    expect(validateTravelPlanDetails({
      title: '',
      destination: 'Iceland',
      notes: '',
    })).toEqual({ ok: false, error: 'Add both a trip name and destination.' });
  });
});
