import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing, type AppIconName } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

interface MoreMenuItem {
  label: string;
  icon: AppIconName;
  href: '/profile' | '/plants' | '/travel';
}

const MENU_ITEMS: MoreMenuItem[] = [
  { label: 'Profile', icon: 'personal', href: '/profile' },
  { label: 'Plants', icon: 'plant', href: '/plants' },
  { label: 'Travel', icon: 'flight', href: '/travel' },
];

export default function MoreScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={[styles.title, { fontFamily: fontFamilies.sans }]}>More</AppText>
          <AppText style={styles.subtitle} color="secondary">
            Explore and personalize your experience
          </AppText>
        </View>

        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.backgroundElevated,
              boxShadow:
                theme.name === 'light'
                  ? '0 7px 24px rgba(61, 50, 32, 0.10)'
                  : '0 7px 24px rgba(0, 0, 0, 0.28)',
            },
          ]}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.href}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${item.label}`}
                onPress={() => {
                  haptics.select();
                  router.push(item.href);
                }}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.62 }]}>
                <View style={[styles.iconTile, { backgroundColor: theme.accentFaint }]}>
                  <Symbol name={item.icon} size={25} color={theme.accentPrimary} />
                </View>
                <AppText style={styles.rowLabel}>{item.label}</AppText>
                <Symbol name="chevron-right" size={18} color={theme.textTertiary} />
              </Pressable>
              {index < MENU_ITEMS.length - 1 ? (
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.xl,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  menu: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 79,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: spacing.lg,
  },
  iconTile: {
    width: 47,
    height: 47,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
});
