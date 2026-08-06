import { parseEmbeddedLogoCandidates } from '../stay-provider-logo-lookup';

describe('parseEmbeddedLogoCandidates', () => {
  it('prefers dark logo marks for light UI plates', () => {
    const html = `
      <img src="https://cdn.example.com/themes/centerhotels/assets/images/logo.svg" />
      <img src="https://cdn.example.com/themes/centerhotels/assets/images/logo-black.png" />
    `;
    const urls = parseEmbeddedLogoCandidates(html, 'https://www.centerhotels.com/');
    expect(urls[0]).toContain('logo-black.png');
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('logo.svg'),
        expect.stringContaining('logo-black.png'),
      ]),
    );
  });

  it('resolves relative logo theme paths', () => {
    const html = `<img src="/themes/brand/logo-black.webp" alt="Brand" />`;
    expect(parseEmbeddedLogoCandidates(html, 'https://www.example.com/')).toEqual([
      'https://www.example.com/themes/brand/logo-black.webp',
    ]);
  });
});
