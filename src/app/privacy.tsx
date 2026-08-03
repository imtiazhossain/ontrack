import { Stack } from 'expo-router';

import { LegalDocumentScreen } from '@/features/account/legal-document-screen';
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_SECTIONS,
} from '@/features/account/privacy-policy-content';
import { PRIVACY_POLICY_UPDATED } from '@/constants/legal';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <LegalDocumentScreen
        title="Privacy Policy"
        updated={PRIVACY_POLICY_UPDATED}
        intro={PRIVACY_POLICY_INTRO}
        sections={PRIVACY_POLICY_SECTIONS}
      />
    </>
  );
}
