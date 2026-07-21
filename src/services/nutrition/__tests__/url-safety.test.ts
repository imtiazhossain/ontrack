import { sanitizeMealUrl } from '@/services/nutrition/url-safety';

describe('sanitizeMealUrl', () => {
  it('requires https and blocks private hosts', () => {
    expect(() => sanitizeMealUrl('http://example.com/meal')).toThrow('HTTPS');
    expect(() => sanitizeMealUrl('https://127.0.0.1/meal')).toThrow('Private');
    expect(() => sanitizeMealUrl('https://192.168.1.5/meal')).toThrow('Private');
  });

  it('removes personalized and tracking values', () => {
    expect(sanitizeMealUrl('https://example.com/meal?orderId=secret&utm_source=x&item=salad'))
      .toBe('https://example.com/meal?item=salad');
  });
});
