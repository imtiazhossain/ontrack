import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Input } from '@/components/primitives';
import { layout, spacing, timeOfDayGradient } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = usePreferences((s) => s.completeOnboarding);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const finish = () => {
    completeOnboarding({ name: name.trim() || 'You', goal: goal.trim() || 'Live intentionally' });
    router.replace('/(tabs)');
  };

  const gradient = timeOfDayGradient(theme, new Date().getHours());

  return (
    <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.fill}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={gradient}
            style={[styles.hero, { paddingTop: insets.top + spacing.xxl, paddingBottom: spacing.xxl }]}> 
            <AppText variant="overline" color="tertiary">
              onTrack
            </AppText>
            <AppText variant="display" style={styles.headline}>
              Your day,{'\n'}one place.
            </AppText>
            <AppText variant="body" color="secondary">
              Schedule, track meals, workouts, and focus — without juggling five different apps.
            </AppText>
          </LinearGradient>

          <View style={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}> 
            <Input label="What should we call you?" value={name} onChangeText={setName} placeholder="Your name" />
            <Input
              label="Primary goal"
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Build strength, stay consistent"
            />
            <Button size="lg" onPress={finish} accessibilityLabel="Get started">
              Get started
            </Button>
            <Button variant="ghost" onPress={finish} accessibilityLabel="Skip onboarding">
              Skip for now
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  headline: {
    marginTop: spacing.sm,
  },
  form: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'flex-end',
  },
});
