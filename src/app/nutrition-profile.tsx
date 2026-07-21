import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Input, Screen, SectionHeader } from '@/components/primitives';
import { featureFlags } from '@/constants/feature-flags';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useNutrition } from '@/store/nutrition';
import type { ActivityLevel, EquationSex, NutritionGoal, NutritionProfile, NutritionTargets } from '@/types/models';
import { ageInYears, calculateNutritionTargets, createTargetVersion, NutritionTargetError } from '@/utils/nutrition';

const ACTIVITIES: ActivityLevel[] = ['inactive', 'low-active', 'active', 'very-active'];
const GOALS: NutritionGoal[] = ['maintain', 'lose', 'gain'];

export default function NutritionProfileScreen() {
  const theme = useTheme();
  const profiles = useNutrition((state) => state.profiles);
  const activeProfileId = useNutrition((state) => state.activeProfileId);
  const setActiveProfile = useNutrition((state) => state.setActiveProfile);
  const upsertProfile = useNutrition((state) => state.upsertProfile);
  const saveTargetVersion = useNutrition((state) => state.saveTargetVersion);
  const versions = useNutrition((state) => state.targetVersions);
  const active = profiles.find((profile) => profile.id === activeProfileId);

  const [displayName, setDisplayName] = useState(active?.displayName ?? 'Me');
  const [dateOfBirth, setDateOfBirth] = useState(active?.dateOfBirth ?? '1990-01-01');
  const [equationSex, setEquationSex] = useState<EquationSex>(active?.equationSex ?? 'female');
  const [heightCm, setHeightCm] = useState(String(active?.heightCm ?? ''));
  const [weightKg, setWeightKg] = useState(String(active?.weightKg ?? ''));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(active?.activityLevel ?? 'low-active');
  const [goal, setGoal] = useState<NutritionGoal>(active?.goal ?? 'maintain');
  const [allergies, setAllergies] = useState(active?.allergies.join(', ') ?? '');
  const [preferences, setPreferences] = useState(active?.dietaryPreferences.join(', ') ?? '');
  const [guardianAcknowledged, setGuardianAcknowledged] = useState(Boolean(active?.guardianAcknowledgedAt));
  const [targets, setTargets] = useState<NutritionTargets>();
  const [error, setError] = useState<string>();

  const age = useMemo(() => ageInYears(dateOfBirth), [dateOfBirth]);
  const latest = versions.filter((item) => item.profileId === activeProfileId).sort((a, b) => b.version - a.version)[0];

  const profileFromForm = (): NutritionProfile => ({
    id: active?.id ?? `profile-${Date.now().toString(36)}`,
    displayName: displayName.trim() || 'Profile',
    dateOfBirth,
    equationSex,
    heightCm: Number(heightCm) || undefined,
    weightKg: Number(weightKg) || undefined,
    activityLevel,
    goal,
    unitSystem: 'metric',
    allergies: allergies.split(',').map((value) => value.trim()).filter(Boolean),
    dietaryPreferences: preferences.split(',').map((value) => value.trim()).filter(Boolean),
    guardianAcknowledgedAt: guardianAcknowledged ? new Date().toISOString() : undefined,
  });

  const calculate = () => {
    setError(undefined);
    const profile = profileFromForm();
    if (age < 18 && age >= 2 && !featureFlags.youthNutrition) return setError('Youth nutrition is disabled until its release review is complete.');
    if (age < 2 && !featureFlags.infantClinical) return setError('Infant clinical nutrition is disabled until clinician, legal, security, and BAA gates are complete.');
    try {
      upsertProfile(profile);
      setTargets(calculateNutritionTargets(profile));
    } catch (caught) {
      setError(caught instanceof NutritionTargetError ? caught.message : 'Targets could not be calculated.');
    }
  };

  const saveTargets = () => {
    if (!targets) return;
    const profile = profileFromForm();
    upsertProfile(profile);
    saveTargetVersion(createTargetVersion(profile, targets, {}, (latest?.version ?? 0) + 1));
    setError(age < 2 ? 'Draft saved. A verified pediatric clinician must approve it.' : 'Targets saved.');
  };

  const addDependent = () => {
    const profile: NutritionProfile = {
      id: `profile-${Date.now().toString(36)}`, displayName: 'Dependent', dateOfBirth: '2015-01-01',
      equationSex: 'female', activityLevel: 'low-active', goal: 'maintain', unitSystem: 'metric',
      dietaryPreferences: [], allergies: [],
    };
    upsertProfile(profile);
    setActiveProfile(profile.id);
    setError('Dependent created. Reopen this screen to edit the new profile.');
  };

  return (
    <Screen>
      <BackButton />
      <AppText variant="title">Nutrition profiles</AppText>
      <AppText variant="body" color="secondary">Targets are wellness estimates. Clinical profiles remain memory-only until the approved cloud is configured.</AppText>

      {profiles.length ? <SectionHeader title="Profiles" actionLabel="Add dependent" onAction={addDependent} /> : null}
      <View style={styles.profileRow}>
        {profiles.map((profile) => (
          <Pressable key={profile.id} onPress={() => setActiveProfile(profile.id)} style={[styles.profileChip, { backgroundColor: profile.id === activeProfileId ? theme.accentFaint : theme.backgroundSunken }]}>
            <AppText variant="caption">{profile.displayName}</AppText>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Profile details" />
      <Input label="Name" value={displayName} onChangeText={setDisplayName} />
      <Input label="Date of birth (YYYY-MM-DD)" value={dateOfBirth} onChangeText={setDateOfBirth} autoCapitalize="none" />
      <ChoiceRow label="Sex used by equation" values={['female', 'male']} value={equationSex} onChange={(value) => setEquationSex(value as EquationSex)} />
      <View style={styles.twoColumns}>
        <View style={styles.flex}><Input label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" /></View>
        <View style={styles.flex}><Input label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" /></View>
      </View>
      <ChoiceRow label="Activity" values={ACTIVITIES} value={activityLevel} onChange={(value) => setActivityLevel(value as ActivityLevel)} />
      <ChoiceRow label="Goal" values={GOALS} value={goal} onChange={(value) => setGoal(value as NutritionGoal)} />
      <Input label="Dietary preferences" value={preferences} onChangeText={setPreferences} placeholder="vegetarian, halal" />
      <Input label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="peanuts, shellfish" />
      {age >= 2 && age < 18 ? (
        <Button variant={guardianAcknowledged ? 'secondary' : 'danger'} onPress={() => setGuardianAcknowledged((value) => !value)}>
          {guardianAcknowledged ? 'Guardian acknowledged' : 'Guardian acknowledgment required'}
        </Button>
      ) : null}
      {age < 2 ? <AppText variant="caption" color="danger">Infant targets can only be activated by a verified pediatric clinician.</AppText> : null}
      <Button onPress={calculate}>Calculate starting targets</Button>

      {targets ? (
        <>
          <SectionHeader title="Editable targets" />
          <View style={styles.twoColumns}>
            {(['calories', 'proteinG', 'carbsG', 'fatG'] as const).map((key) => (
              <View key={key} style={styles.flex}><Input label={key} value={String(targets[key])} keyboardType="decimal-pad" onChangeText={(value) => setTargets({ ...targets, [key]: Number(value) || 0 })} /></View>
            ))}
          </View>
          <Button onPress={saveTargets}>Save target version</Button>
        </>
      ) : null}
      {latest ? <AppText variant="caption" color="secondary">Latest version: v{latest.version} · {latest.status}</AppText> : null}
      {error ? <AppText variant="callout" color={error.includes('saved') ? 'secondary' : 'danger'}>{error}</AppText> : null}
    </Screen>
  );
}

function ChoiceRow({ label, values, value, onChange }: { label: string; values: readonly string[]; value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return <View style={styles.choiceBlock}><AppText variant="overline" color="tertiary">{label}</AppText><View style={styles.profileRow}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.profileChip, { backgroundColor: item === value ? theme.accentFaint : theme.backgroundSunken }]}><AppText variant="caption">{item.replace('-', ' ')}</AppText></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  profileChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  flex: { flex: 1, minWidth: 140 },
  choiceBlock: { gap: spacing.sm, marginVertical: spacing.sm },
});
