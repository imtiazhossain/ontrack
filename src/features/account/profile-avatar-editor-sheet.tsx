import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  ErrorMessage,
  IconButton,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { AvatarColorPicker } from '@/features/account/avatar-color-picker';
import { IconifyIcon } from '@/features/account/iconify-icon';
import { iconifyLabel, searchIconifyIcons } from '@/features/account/iconify-search';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import {
  persistAvatarPhoto,
  uploadProfileAvatarPhoto,
} from '@/features/account/profile-avatar-media';
import {
  DEFAULT_AVATAR_COLOR,
  normalizeAvatarColor,
  normalizeAvatarMeta,
  resolveAvatarColor,
  type ProfileAvatarKind,
  type ProfileAvatarMeta,
} from '@/features/account/profile-avatar-model';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { setProfileAvatar } from '@/services/friends';
import { usePreferences } from '@/store/preferences';
import { haptics } from '@/utils/haptics';
import { pickCameraImage, pickLibraryImage } from '@/utils/pick-image';

type Mode = ProfileAvatarKind;

const MODES: { value: Mode; label: string }[] = [
  { value: 'initials', label: 'Initials' },
  { value: 'icon', label: 'Icon' },
  { value: 'photo', label: 'Photo' },
];

export function ProfileAvatarEditorSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, s } = useResponsive();
  const { user } = useAuthSession();
  const name = usePreferences((state) => state.name);
  const setAvatar = usePreferences((state) => state.setAvatar);

  const [draft, setDraft] = useState<ProfileAvatarMeta>(() =>
    normalizeAvatarMeta(usePreferences.getState().avatar),
  );
  const [query, setQuery] = useState('');
  const [icons, setIcons] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (!visible) return;
    // Seed once when the sheet opens — keep any saved tint; default to app accent.
    const next = normalizeAvatarMeta(usePreferences.getState().avatar);
    setDraft({
      ...next,
      color:
        next.color ??
        normalizeAvatarColor(theme.accentPrimary) ??
        DEFAULT_AVATAR_COLOR,
    });
    setQuery('');
    setError(undefined);
    setSaving(false);
    setScrollEnabled(true);
  }, [theme.accentPrimary, visible]);

  useEffect(() => {
    if (!visible || draft.kind !== 'icon') return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      void searchIconifyIcons(query)
        .then((results) => {
          if (!cancelled) setIcons(results);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, query.trim() ? 280 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [draft.kind, query, visible]);

  const previewName = resolveSelfDisplayName({ preferencesName: name, user });
  const titleName = previewName.split(/\s+/)[0] || previewName;
  const color = resolveAvatarColor(draft, theme.accentPrimary);
  const previewSize = Math.max(88, s(96));
  const iconCell = Math.max(52, s(56));

  const mode = draft.kind;
  const subtitle = useMemo(() => {
    if (mode === 'photo') return 'Upload a square photo friends will recognize.';
    if (mode === 'icon') return null;
    return 'Colored initials from your name.';
  }, [mode]);

  const setMode = (next: Mode) => {
    haptics.tap();
    setDraft((current) => {
      if (next === 'initials') {
        return { kind: 'initials', color: current.color };
      }
      if (next === 'icon') {
        return {
          kind: 'icon',
          color: current.color,
          iconId: current.iconId ?? 'mdi:account',
        };
      }
      return {
        kind: 'photo',
        color: current.color,
        photoPath: current.photoPath,
        localPhotoUri: current.localPhotoUri,
      };
    });
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    setError(undefined);
    const uri =
      source === 'camera'
        ? await pickCameraImage({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          })
        : await pickLibraryImage({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          });
    if (!uri) return;
    try {
      const localUri = await persistAvatarPhoto(uri);
      setDraft((current) => ({
        kind: 'photo',
        color: current.color,
        localPhotoUri: localUri,
        photoPath: current.photoPath,
      }));
      haptics.success();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That photo could not be saved.',
      );
    }
  };

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      let next = normalizeAvatarMeta({
        ...draft,
        // Always persist the resolved tint the user is looking at.
        color: resolveAvatarColor(draft, theme.accentPrimary),
      });
      if (next.kind === 'icon' && !next.iconId) {
        setError('Pick an icon to continue.');
        setSaving(false);
        return;
      }
      if (next.kind === 'photo') {
        if (!next.localPhotoUri && !next.photoPath) {
          setError('Choose a photo to continue.');
          setSaving(false);
          return;
        }
        if (user?.id && next.localPhotoUri) {
          const photoPath = await uploadProfileAvatarPhoto(user.id, next.localPhotoUri);
          next = { ...next, photoPath };
        }
      }

      setAvatar(next);

      if (user) {
        const synced = await setProfileAvatar(next);
        setAvatar({
          ...synced,
          color: synced.color ?? next.color,
          ...(next.localPhotoUri ? { localPhotoUri: next.localPhotoUri } : {}),
        });
      }

      haptics.success();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Your avatar could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, spacing.md),
              paddingHorizontal: spacing.lg,
              borderBottomColor: theme.separator,
            },
          ]}>
          <View style={styles.headerCopy}>
            <AppText variant="overline" color="accent" fit>
              Profile
            </AppText>
            <AppText variant="heading" fit numberOfLines={1}>
              {`${titleName}’s Icon`}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" color="secondary" numberOfLines={2}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close avatar editor"
            onPress={onClose}
          />
        </View>

        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            gap: spacing.lg,
            paddingTop: spacing.lg,
          }}>
          <View style={styles.previewBlock}>
            <ProfileAvatar
              displayName={previewName}
              size={previewSize}
              avatar={draft}
              isSelf
            />
            <AppText variant="callout" color="secondary" fit>
              {previewName}
            </AppText>
          </View>

          <View style={styles.segment}>
            {MODES.map((item) => {
              const active = mode === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label} avatar`}
                  onPress={() => setMode(item.value)}
                  style={[
                    styles.segmentItem,
                    {
                      minHeight: Math.max(44, s(44)),
                      backgroundColor: active ? theme.accentFaint : theme.backgroundSunken,
                      borderColor: active ? theme.accentPrimary : theme.separator,
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    fit
                    color={active ? 'accent' : 'primary'}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {mode === 'icon' ? (
            <View style={{ gap: spacing.md }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search icons"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search icons"
                style={[
                  styles.search,
                  {
                    minHeight: Math.max(44, s(48)),
                    color: theme.textPrimary,
                    backgroundColor: theme.backgroundSunken,
                    borderColor: theme.separator,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.md,
                  },
                ]}
              />
              {searching ? (
                <ActivityIndicator color={theme.accentPrimary} />
              ) : (
                <View style={styles.iconGrid}>
                  {icons.map((iconId) => {
                    const selected = draft.iconId === iconId;
                    return (
                      <Pressable
                        key={iconId}
                        accessibilityRole="button"
                        accessibilityLabel={iconifyLabel(iconId)}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          haptics.tap();
                          setDraft((current) => ({
                            ...current,
                            kind: 'icon',
                            iconId,
                          }));
                        }}
                        style={[
                          styles.iconCell,
                          {
                            width: iconCell,
                            height: iconCell,
                            borderRadius: radii.md,
                            backgroundColor: selected
                              ? theme.accentFaint
                              : theme.backgroundSunken,
                            borderColor: selected
                              ? theme.accentPrimary
                              : theme.separator,
                          },
                        ]}>
                        <IconifyIcon
                          iconId={iconId}
                          color={color}
                          size={Math.round(iconCell * 0.5)}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {mode === 'photo' ? (
            <View style={{ gap: spacing.sm }}>
              <Button
                variant="secondary"
                icon="camera"
                onPress={() => void pickPhoto('camera')}
                accessibilityLabel="Take avatar photo">
                Take photo
              </Button>
              <Button
                variant="secondary"
                icon="photo"
                onPress={() => void pickPhoto('library')}
                accessibilityLabel="Choose avatar photo">
                Choose from library
              </Button>
              {!user ? (
                <AppText variant="caption" color="secondary">
                  Photo stays on this device until you sign in. Then it syncs for friends.
                </AppText>
              ) : null}
            </View>
          ) : null}

          {mode !== 'photo' ? (
            <AvatarColorPicker
              key={visible ? `avatar-color-${mode}` : 'closed'}
              color={color}
              onChange={(hex) => {
                setDraft((current) => ({ ...current, color: hex }));
              }}
              onDragStart={() => setScrollEnabled(false)}
              onDragEnd={() => setScrollEnabled(true)}
            />
          ) : null}

          {error ? <ErrorMessage message={error} /> : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              borderTopColor: theme.separator,
              backgroundColor: theme.backgroundPrimary,
            },
          ]}>
          <Button
            onPress={() => void save()}
            disabled={saving}
            accessibilityLabel="Save avatar">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  previewBlock: { alignItems: 'center', gap: 10 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  search: {
    borderWidth: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
