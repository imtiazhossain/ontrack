import type { LegalSection } from './legal-document-screen';

export const PRIVACY_POLICY_INTRO =
  'onTrack (“we”, “us”) provides a local-first daily life app for schedules, food, fitness, plants, travel, checklists, and related tools. This Privacy Policy explains what information we collect, how we use it, and the choices you have.';

export const PRIVACY_POLICY_SECTIONS: readonly LegalSection[] = [
  {
    title: 'Information you provide',
    paragraphs: [
      'Account information when you sign in with Apple or Google (such as a name and email address provided by that provider).',
      'Content you create in the app, including activities, meals, workouts, plant profiles, travel plans, checklists, vehicles, vision-board items, notes, and photos you attach.',
      'Optional profile details such as a display name, home location for weather, nutrition preferences, and a profile photo or icon.',
    ],
  },
  {
    title: 'Information collected automatically',
    paragraphs: [
      'Approximate location when you allow it, used for local weather and travel departure suggestions.',
      'Device and app diagnostics needed to operate sync, notifications, and crash recovery. We do not sell personal information.',
      'On signed-in devices, cloud sync stores your account data so it can follow you across devices you authorize.',
    ],
  },
  {
    title: 'Photos, camera, and media',
    paragraphs: [
      'Camera and photo library access are used only when you choose to capture or attach images (for example meals, plants, vision board, or avatars).',
      'App-owned copies of images may be stored on your device and, when you are signed in, in private cloud storage tied to your account. System photo-library originals are not deleted when you sign out or reset local data.',
    ],
  },
  {
    title: 'AI features',
    paragraphs: [
      'Optional AI features (such as meal analysis, plant identification, recipe import, or daily summaries) send only the content you explicitly submit for analysis to our processing providers.',
      'AI results are informational estimates, not medical, nutritional, horticultural, or professional advice. You can turn AI summaries off in Profile.',
    ],
  },
  {
    title: 'Collaboration and sharing',
    paragraphs: [
      'When you share a trip, checklist, vehicle, or invite link, recipients you authorize can see the shared content needed to collaborate.',
      'Invitation landing pages on our hosting domain help friends open or install the app; they do not grant access to your private account data without the invite capability.',
    ],
  },
  {
    title: 'Third-party services',
    paragraphs: [
      'We use service providers to operate the app, including authentication and database hosting (Supabase), sign-in providers (Apple, Google), hosting (Expo), and optional analysis or search providers (for example OpenAI, USDA FoodData Central, TMDB, Amadeus) when those features are enabled.',
      'Those providers process data only to provide their services to us under their own terms and privacy policies.',
    ],
  },
  {
    title: 'Guest mode',
    paragraphs: [
      'Guest mode keeps data on the device until you sign in. Guest data is not synced to your cloud account unless you choose to create or sign in to an account and resolve how local and cloud data should combine.',
    ],
  },
  {
    title: 'Retention and deletion',
    paragraphs: [
      'You can reset local data on a device from Profile. Signing out of a device removes account-owned local copies on that device; it does not delete your cloud account.',
      'Signed-in users can permanently delete their account from Profile. Account deletion removes your cloud account, synced app data, and app-owned cloud media associated with that account, subject to short-term backups and legal retention where required.',
      'Shared resources you own (such as a checklist or trip you host) are removed or become unavailable to collaborators when your account is deleted.',
    ],
  },
  {
    title: 'Children',
    paragraphs: [
      'onTrack is not directed to children under 13, and we do not knowingly collect personal information from children under 13.',
    ],
  },
  {
    title: 'Changes',
    paragraphs: [
      'We may update this Privacy Policy as the product changes. The “Last updated” date at the top will change when we do. Continued use after an update means you accept the revised policy.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'For privacy questions or deletion requests, contact imtihoss@gmail.com.',
    ],
  },
];
