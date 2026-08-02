import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
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
  IconButton,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  type FriendProfile,
} from '@/services/friends';
import { useFriends } from '@/store/friends';

export function PeoplePicker({
  visible,
  onClose,
  onConfirm,
  multi = true,
  excludeIds = [],
  title = 'Choose Friends',
  confirmLabel = 'Add',
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (friends: FriendProfile[]) => void;
  multi?: boolean;
  excludeIds?: string[];
  title?: string;
  confirmLabel?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, s, typography } = useResponsive();
  const friends = useFriends((state) => state.friends);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelected(new Set());
    }
  }, [visible]);

  const available = useMemo(() => {
    const excluded = new Set(excludeIds);
    const needle = query.trim().toLowerCase();
    return friends.filter((friend) => {
      if (excluded.has(friend.userId) || excluded.has(friend.email)) return false;
      if (!needle) return true;
      return (
        friend.displayName.toLowerCase().includes(needle) ||
        friend.email.toLowerCase().includes(needle)
      );
    });
  }, [excludeIds, friends, query]);

  const toggle = useCallback(
    (userId: string) => {
      setSelected((current) => {
        if (!multi) return new Set([userId]);
        const next = new Set(current);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    },
    [multi],
  );

  const confirm = () => {
    const picked = friends.filter((friend) => selected.has(friend.userId));
    onConfirm(picked);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.backgroundPrimary,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          },
        ]}>
        <View style={[styles.header, { marginBottom: spacing.md }]}>
          <View style={styles.headerCopy}>
            <AppText variant="heading" fit>
              {title}
            </AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or email"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.search,
            {
              minHeight: Math.max(44, s(48)),
              borderColor: theme.separator,
              backgroundColor: theme.backgroundSecondary,
              color: theme.textPrimary,
              fontSize: typography.callout.fontSize,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        />

        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {available.length === 0 ? (
            <AppText variant="body" color="secondary" style={{ marginTop: spacing.lg }}>
              {friends.length === 0
                ? 'Add friends on the Social tab first.'
                : 'No matching friends.'}
            </AppText>
          ) : (
            available.map((friend) => {
              const isOn = selected.has(friend.userId);
              return (
                <Pressable
                  key={friend.userId}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isOn }}
                  onPress={() => toggle(friend.userId)}
                  style={[
                    styles.row,
                    {
                      minHeight: Math.max(52, s(56)),
                      borderColor: isOn ? theme.accentPrimary : theme.separator,
                      backgroundColor: isOn
                        ? theme.accentFaint
                        : theme.backgroundSecondary,
                      paddingHorizontal: spacing.md,
                      marginBottom: spacing.sm,
                      gap: spacing.md,
                    },
                  ]}>
                  <View style={styles.rowCopy}>
                    <AppText variant="callout" fit>
                      {friend.displayName}
                    </AppText>
                    <AppText variant="caption" color="secondary" fit>
                      {friend.email}
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    color={isOn ? 'accent' : 'tertiary'}
                    fit>
                    {isOn ? 'Selected' : 'Select'}
                  </AppText>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Button
          disabled={selected.size === 0}
          onPress={confirm}
          style={{ marginTop: spacing.md }}>
          {`${confirmLabel}${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  rowCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
});
