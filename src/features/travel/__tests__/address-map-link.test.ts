import {
  addressMapUrl,
  appleMapsUrl,
  googleMapsUrl,
} from '../address-map-link';

describe('address map link', () => {
  const address = 'Laugavegur 120, 105 Reykjavik, Reykjavík, Iceland';
  const encodedAddress =
    'Laugavegur%20120%2C%20105%20Reykjavik%2C%20Reykjav%C3%ADk%2C%20Iceland';

  it('builds Apple Maps and Google Maps search URLs', () => {
    expect(appleMapsUrl(address)).toBe(
      `http://maps.apple.com/?q=${encodedAddress}`,
    );
    expect(googleMapsUrl(address)).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    );
  });

  it('opens Apple Maps on iOS', () => {
    expect(addressMapUrl(address, 'ios')).toBe(
      `http://maps.apple.com/?q=${encodedAddress}`,
    );
  });

  it('opens a geo intent on Android', () => {
    expect(addressMapUrl(address, 'android')).toBe(
      `geo:0,0?q=${encodedAddress}`,
    );
  });

  it('uses a browser map search on web', () => {
    expect(addressMapUrl(address, 'web')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    );
  });

  it('does not create a link for an empty address', () => {
    expect(addressMapUrl('   ', 'ios')).toBeUndefined();
    expect(appleMapsUrl('   ')).toBeUndefined();
    expect(googleMapsUrl('   ')).toBeUndefined();
  });
});
