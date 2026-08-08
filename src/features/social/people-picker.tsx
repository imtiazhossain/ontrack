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
  GlassPlate,
  IconButton,
  useScreenAtmosphereChrome,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  type FriendProfile,
} from '@/services/friends';
import { useFriends } from '@/store/friends';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

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

  const searchAgent = useAgentUiTarget(AgentUiIds.peoplePicker.search, {
    label: 'Search name or email',
  });
  useScreenAtmosphereChrome(visible);

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
            testID={AgentUiIds.peoplePicker.close}
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </View>

        <GlassPlate
          airy
          style={[
            styles.search,
            {
              minHeight: Math.max(44, s(48)),
              paddingHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}>
          <TextInput
            ref={searchAgent.ref as never}
            testID={searchAgent.testID}
            onLayout={searchAgent.onLayout}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or email"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.searchInput,
              {
                color: theme.textPrimary,
                fontSize: typography.callout.fontSize,
              },
            ]}
          />
        </GlassPlate>

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
            available.map((friend) => (
              <PeoplePickerFriendRow
                key={friend.userId}
                friend={friend}
                selected={selected.has(friend.userId)}
                accentBorder={theme.accentPrimary}
                idleBorder={theme.separator}
                minHeight={Math.max(52, s(56))}
                paddingHorizontal={spacing.md}
                marginBottom={spacing.sm}
                gap={spacing.md}
                onPress={() => toggle(friend.userId)}
              />
            ))
          )}
        </ScrollView>

        <Button
          testID={AgentUiIds.peoplePicker.confirm}
          disabled={selected.size === 0}
          onPress={confirm}
          style={{ marginTop: spacing.md }}>
          {`${confirmLabel}${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </Button>
      </View>
    </Modal>
  );
}

function PeoplePickerFriendRow({
  friend,
  selected,
  accentBorder,
  idleBorder,
  minHeight,
  paddingHorizontal,
  marginBottom,
  gap,
  onPress,
}: {
  friend: FriendProfile;
  selected: boolean;
  accentBorder: string;
  idleBorder: string;
  minHeight: number;
  paddingHorizontal: number;
  marginBottom: number;
  gap: number;
  onPress: () => void;
}) {
  const agent = useAgentUiTarget(AgentUiIds.peoplePicker.friend(friend.userId), {
    label: friend.displayName,
    onPress,
  });
  return (
    <Pressable
      ref={agent.ref}
      testID={agent.testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={friend.displayName}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.rowWrap,
        {
          marginBottom,
        },
      ]}>
      <GlassPlate
        airy
        style={[
          styles.row,
          {
            minHeight,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? accentBorder : idleBorder,
            paddingHorizontal,
            gap,
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
      <AppText variant="caption" color={selected ? 'accent' : 'tertiary'} fit>
        {selected ? 'Selected' : 'Select'}
      </AppText>
      </GlassPlate>
    </Pressable>
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
    borderRadius: radii.md,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
  },
  list: { flex: 1 },
  rowWrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  rowCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
});
