import { isHttpsUrl } from '@/utils/safe-url';

import type { TravelItineraryItem } from './types';

export type StayBookingOpen =
  | { mode: 'browser'; url: string }
  | {
      mode: 'webview';
      url: string;
      email: string;
      bookingNumber: string;
    };

const TRIVAGO_MY_TRIPS =
  /^https:\/\/(?:www\.)?trivago\.deals\/my-trips\/[^?\s#]+/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isTrivagoDealsMyTripsUrl(url: string): boolean {
  return TRIVAGO_MY_TRIPS.test(url.trim());
}

export function resolveStayBookingOpen(
  item: Pick<TravelItineraryItem, 'bookingUrl' | 'stay'>,
  options?: { fallbackEmail?: string },
): StayBookingOpen | undefined {
  const url = item.bookingUrl?.trim();
  if (!url || !isHttpsUrl(url)) return undefined;

  const bookingNumber = item.stay?.confirmationCode?.trim();
  const email = (
    item.stay?.reservationEmail?.trim() ||
    options?.fallbackEmail?.trim() ||
    ''
  ).toLowerCase();

  if (
    isTrivagoDealsMyTripsUrl(url) &&
    bookingNumber &&
    email &&
    EMAIL_PATTERN.test(email)
  ) {
    return { mode: 'webview', url, email, bookingNumber };
  }

  return { mode: 'browser', url };
}

/** Injected into the trivago find-booking page to submit weak-auth credentials. */
export function trivagoFindBookingInjectScript(
  email: string,
  bookingNumber: string,
): string {
  const emailJson = JSON.stringify(email);
  const bookingJson = JSON.stringify(bookingNumber);
  return `(function(){
  if (window.__onTrackTrivagoSubmitted) return true;
  var email = ${emailJson};
  var bookingNumber = ${bookingJson};

  function setValue(el, value) {
    if (!el) return;
    var proto = window.HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findEmailInput() {
    return (
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name="email"]') ||
      Array.prototype.find.call(document.querySelectorAll('input'), function (el) {
        var ph = (el.getAttribute('placeholder') || '').toLowerCase();
        var label = (el.getAttribute('aria-label') || '').toLowerCase();
        return ph.indexOf('email') >= 0 || label.indexOf('email') >= 0;
      })
    );
  }

  function findBookingInput() {
    return Array.prototype.find.call(document.querySelectorAll('input'), function (el) {
      var ph = (el.getAttribute('placeholder') || '').toLowerCase();
      var name = (el.getAttribute('name') || '').toLowerCase();
      var label = (el.getAttribute('aria-label') || '').toLowerCase();
      return (
        ph.indexOf('booking') >= 0 ||
        name.indexOf('booking') >= 0 ||
        label.indexOf('booking') >= 0
      );
    });
  }

  function findSubmit() {
    return Array.prototype.find.call(document.querySelectorAll('button'), function (el) {
      var text = (el.textContent || '').trim().toLowerCase();
      return text.indexOf('find my booking') >= 0 || text.indexOf('find booking') >= 0;
    });
  }

  var emailInput = findEmailInput();
  var bookingInput = findBookingInput();
  var submit = findSubmit();
  if (!emailInput || !bookingInput || !submit) return false;
  setValue(emailInput, email);
  setValue(bookingInput, bookingNumber);
  window.__onTrackTrivagoSubmitted = true;
  setTimeout(function () {
    try { submit.click(); } catch (e) {}
  }, 80);
  true;
})();`;
}
