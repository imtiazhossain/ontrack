import {
    emptyStayDetailsDraft,
    normalizeStayDetails,
    validateStayDetails,
} from '../stay-details';

describe('stay reservation email', () => {
  it('normalizes and lowercases reservation email', () => {
    expect(
      normalizeStayDetails({
        confirmationCode: '13460175',
        reservationEmail: '  Alex.Rivera@Example.COM ',
      }),
    ).toEqual({
      confirmationCode: '13460175',
      reservationEmail: 'alex.rivera@example.com',
    });
  });

  it('rejects invalid reservation emails on validate', () => {
    const result = validateStayDetails({
      ...emptyStayDetailsDraft(),
      confirmationCode: '13460175',
      reservationEmail: 'not-an-email',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/valid reservation email/i);
    }
  });

  it('defaults reservation email in empty drafts', () => {
    expect(
      emptyStayDetailsDraft({ reservationEmail: 'a@b.com' }).reservationEmail,
    ).toBe('a@b.com');
  });
});
