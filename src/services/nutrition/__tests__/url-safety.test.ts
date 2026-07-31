import {
    isPrivateHostname,
    isPrivateIpAddress,
    normalizeIpAddress,
    sanitizeMealUrl,
} from '@/services/nutrition/url-safety';

describe('sanitizeMealUrl', () => {
  it('requires https and blocks private hosts', () => {
    expect(() => sanitizeMealUrl('http://example.com/meal')).toThrow('HTTPS');
    expect(() => sanitizeMealUrl('https://127.0.0.1/meal')).toThrow('Private');
    expect(() => sanitizeMealUrl('https://192.168.1.5/meal')).toThrow('Private');
    expect(() => sanitizeMealUrl('https://100.64.1.2/meal')).toThrow('Private');
    expect(() => sanitizeMealUrl('https://[::ffff:127.0.0.1]/meal')).toThrow('Private');
  });

  it('removes personalized and tracking values', () => {
    expect(sanitizeMealUrl('https://example.com/meal?orderId=secret&utm_source=x&item=salad'))
      .toBe('https://example.com/meal?item=salad');
  });
});

describe('isPrivateIpAddress', () => {
  it('classifies loopback, RFC1918, CGNAT, and mapped IPv6', () => {
    expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('10.1.2.3')).toBe(true);
    expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateIpAddress('192.168.0.1')).toBe(true);
    expect(isPrivateIpAddress('100.64.0.1')).toBe(true);
    expect(isPrivateIpAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('::1')).toBe(true);
    expect(isPrivateIpAddress('fc00::1')).toBe(true);
    expect(isPrivateIpAddress('fe80::1')).toBe(true);
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
    expect(isPrivateIpAddress('2001:4860:4860::8888')).toBe(false);
  });

  it('normalizes mapped addresses before classification', () => {
    expect(normalizeIpAddress('::ffff:10.0.0.1')).toBe('10.0.0.1');
    expect(normalizeIpAddress('::ffff:7f00:1')).toBe('127.0.0.1');
    expect(isPrivateHostname('localhost')).toBe(true);
    expect(isPrivateHostname('[::ffff:7f00:1]')).toBe(true);
    expect(isPrivateHostname('example.com')).toBe(false);
  });
});
