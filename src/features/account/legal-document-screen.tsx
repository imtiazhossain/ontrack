import { StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/primitives';
import { ONTRACK_SUPPORT_EMAIL } from '@/constants/legal';
import { spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

/** Shared scrollable legal document for Privacy Policy and Terms of Use. */
export function LegalDocumentScreen({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: readonly LegalSection[];
}) {
  const { spacing: rs } = useResponsive();

  return (
    <Screen refresh={false} contentStyle={{ paddingBottom: rs.xxl, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
      <AgentTestId testID={AgentUiIds.legal.document} label="Legal document">
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginBottom: rs.lg }}>
          Last updated {updated}
        </AppText>
        <AppText variant="body" color="secondary" style={{ marginBottom: rs.xl }}>
          {intro}
        </AppText>
        {sections.map((section) => (
          <View key={section.title} style={[styles.section, { marginBottom: rs.xl, gap: rs.sm }]}>
            <AppText variant="heading">{section.title}</AppText>
            {section.paragraphs.map((paragraph) => (
              <AppText key={paragraph.slice(0, 48)} variant="body" color="secondary">
                {paragraph}
              </AppText>
            ))}
          </View>
        ))}
        <AppText variant="caption" color="tertiary">
          Questions: {ONTRACK_SUPPORT_EMAIL}
        </AppText>
      </AgentTestId>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  section: {},
});
