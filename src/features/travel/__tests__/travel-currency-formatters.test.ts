import {
  formatAmountInput,
  formatRateInput,
  parseAmountText,
} from '../travel-currency-formatters';

describe('travel currency formatters', () => {
  it('keeps money amounts at two decimal places', () => {
    expect(formatAmountInput(86.678)).toBe('86.68');
  });

  it('keeps FX unit rates precise enough that amount × rate matches money rounding', () => {
    const marketRate = 0.8668;
    const displayed = formatRateInput(marketRate);
    expect(displayed).toBe('0.8668');
    const amount = 100;
    const received = Math.round(amount * Number(displayed) * 100) / 100;
    expect(received).toBe(86.68);
    expect(parseAmountText(formatAmountInput(received))).toBe(86.68);
  });

  it('does not collapse a live rate to two decimals like money amounts', () => {
    expect(formatAmountInput(0.8668)).toBe('0.87');
    expect(formatRateInput(0.8668)).not.toBe('0.87');
  });
});
