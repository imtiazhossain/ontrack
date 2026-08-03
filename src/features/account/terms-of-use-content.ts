import type { LegalSection } from './legal-document-screen';

export const TERMS_OF_USE_INTRO =
  'These Terms of Use govern your use of the onTrack mobile application and related websites (together, the “Service”). By using the Service you agree to these terms.';

export const TERMS_OF_USE_SECTIONS: readonly LegalSection[] = [
  {
    title: 'The Service',
    paragraphs: [
      'onTrack helps you organize daily plans and optional add-ons such as food tracking, fitness, plant care, travel planning, checklists, vehicles, games, and a vision board.',
      'Features may change over time. Some capabilities require an internet connection, a signed-in account, or third-party services.',
    ],
  },
  {
    title: 'Accounts and guest use',
    paragraphs: [
      'You may use guest mode on a single device or sign in with Apple or Google. You are responsible for activity under your account and for keeping your sign-in provider secure.',
      'You may delete your account from Profile. Deletion is permanent and removes cloud account data as described in the Privacy Policy.',
    ],
  },
  {
    title: 'Your content',
    paragraphs: [
      'You retain ownership of content you create. You grant us a limited license to host, sync, and display that content solely to operate the Service you request (including collaboration you enable).',
      'Do not upload unlawful, infringing, or abusive content, or content you do not have the right to share.',
    ],
  },
  {
    title: 'AI and informational tools',
    paragraphs: [
      'Meal, plant, recipe, workout, and similar AI or reference features provide estimates and general information only. They are not medical, dietary, veterinary, horticultural, legal, or other professional advice.',
      'Always use your own judgment and consult a qualified professional when needed. Exercise and nutrition features are for general education; stop any activity that causes pain or concern.',
    ],
  },
  {
    title: 'Travel, bookings, and third parties',
    paragraphs: [
      'Flight, stay, and similar search results may come from third-party providers and can include test or limited data depending on configuration. Prices and availability are not guaranteed.',
      'Bookings and payments completed on third-party sites are between you and that provider. onTrack does not process travel card payments inside the app for those checkouts.',
    ],
  },
  {
    title: 'Acceptable use',
    paragraphs: [
      'Do not misuse the Service, attempt to disrupt it, scrape it unreasonably, reverse engineer it except where allowed by law, or use it to violate others’ rights.',
    ],
  },
  {
    title: 'Disclaimers',
    paragraphs: [
      'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.',
    ],
  },
  {
    title: 'Limitation of liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, ONTRACK AND ITS SUPPLIERS ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.',
    ],
  },
  {
    title: 'Termination',
    paragraphs: [
      'You may stop using the Service at any time and may delete your account. We may suspend or terminate access if you violate these terms or if we discontinue the Service.',
    ],
  },
  {
    title: 'Changes',
    paragraphs: [
      'We may update these Terms of Use. The “Last updated” date will change when we do. Continued use after an update means you accept the revised terms.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Questions about these terms: imtihoss@gmail.com.',
    ],
  },
];
