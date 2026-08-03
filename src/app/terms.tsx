import { Stack } from 'expo-router';

import { LegalDocumentScreen } from '@/features/account/legal-document-screen';
import {
  TERMS_OF_USE_INTRO,
  TERMS_OF_USE_SECTIONS,
} from '@/features/account/terms-of-use-content';
import { TERMS_OF_USE_UPDATED } from '@/constants/legal';

export default function TermsOfUseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Use' }} />
      <LegalDocumentScreen
        title="Terms of Use"
        updated={TERMS_OF_USE_UPDATED}
        intro={TERMS_OF_USE_INTRO}
        sections={TERMS_OF_USE_SECTIONS}
      />
    </>
  );
}
