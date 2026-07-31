import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, DragHandle, Symbol } from '@/components/primitives';
import { layout, radii, spacing, typography } from '@/design-system';
import {
  collaboratorInitial,
  todoListIcon,
} from '@/features/todos/list-icon';
import { useTheme } from '@/hooks/use-theme';
import type { TodoList } from '@/store/todos';

export function TodoListCard({
  editMode,
  list,
  nameDraft,
  collaboratorNames,
  open,
  total,
  onPress,
  onDragStart,
  onNameChange,
  onNameSubmit,
  onMoveDown,
  onMoveUp,
  onRemove,
  canMoveDown,
  canMoveUp,
  isActive,
}: {
  editMode: boolean;
  list: TodoList;
  nameDraft: string;
  collaboratorNames?: string[];
  open: number;
  total: number;
  onPress: () => void;
  onDragStart: () => void;
  onNameChange: (name: string) => void;
  onNameSubmit: (name: string) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
}) {
  const theme = useTheme();
  const nameInputRef = useRef<TextInput>(null);
  const icon = todoListIcon(list.name, list.kind);
  const collaboratorLabel = collaboratorNames?.join(', ');
  const leaving = list.mode === 'shared' && list.role === 'member';
  const canRename = editMode && list.role === 'owner';
  const cardContents = (
    <>
      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor: theme.backgroundSunken,
          },
        ]}>
        <Symbol name={icon} size={22} color={theme.textSecondary} />
      </View>
      <View style={styles.cardCopy}>
        {canRename ? (
          <View style={styles.nameEditor}>
            <TextInput
              ref={nameInputRef}
              accessibilityLabel="Checklist name"
              maxLength={80}
              onChangeText={onNameChange}
              onSubmitEditing={() => onNameSubmit(nameDraft)}
              placeholder="Checklist name"
              placeholderTextColor={theme.textTertiary}
              returnKeyType="done"
              selectTextOnFocus
              selectionColor={theme.accentPrimary}
              underlineColorAndroid="transparent"
              style={[styles.nameInput, { color: theme.textPrimary }]}
              value={nameDraft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${list.name} name`}
              onPress={() => nameInputRef.current?.focus()}
              style={({ pressed }) => [
                styles.nameEditButton,
                pressed && styles.pressed,
              ]}>
              <Symbol name="edit" size={16} color={theme.accentPrimary} />
            </Pressable>
          </View>
        ) : (
          <>
            <AppText variant="subheading" numberOfLines={1}>
              {list.name}
            </AppText>
            {list.kind === 'grocery' ? (
              <AppText variant="caption" color="accent">
                Grocery
              </AppText>
            ) : null}
          </>
        )}
        {collaboratorNames ? (
          <View style={styles.collaborators}>
            <View style={styles.collaboratorAvatars}>
              {collaboratorNames.slice(0, 2).map((name, index) => (
                <View
                  key={`${name}-${index}`}
                  style={[
                    styles.collaboratorAvatar,
                    {
                      backgroundColor: theme.accentFaint,
                      borderColor: theme.backgroundElevated,
                    },
                    index > 0 && styles.collaboratorAvatarOverlap,
                  ]}>
                  <AppText
                    style={[
                      styles.collaboratorInitial,
                      { color: theme.accentPrimary },
                    ]}>
                    {collaboratorInitial(name)}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {collaboratorNames.length > 2
                ? `${collaboratorNames.slice(0, 2).join(', ')} +${collaboratorNames.length - 2}`
                : collaboratorLabel}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.count}>
        <AppText variant="heading" color={open ? 'accent' : 'success'}>
          {open}
        </AppText>
        <AppText variant="caption" color="tertiary">
          open
        </AppText>
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: isActive ? theme.accentPrimary : theme.separator,
        },
        isActive && styles.activeCard,
      ]}>
      {editMode ? (
        <View style={styles.cardMain}>{cardContents}</View>
      ) : (
        <Pressable
          accessibilityHint="Tap to open."
          accessibilityRole="button"
          accessibilityLabel={`${list.name}, ${open} open of ${total}${
            collaboratorLabel ? `, shared with ${collaboratorLabel}` : ''
          }`}
          onPress={onPress}
          style={({ pressed }) => [
            styles.cardMain,
            { opacity: pressed && !isActive ? 0.72 : 1 },
          ]}>
          {cardContents}
        </Pressable>
      )}
      {editMode ? (
        <View style={styles.cardEditActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${leaving ? 'Leave' : 'Delete'} ${list.name}`}
            accessibilityHint={`${leaving ? 'Leaves' : 'Deletes'} after confirmation`}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.cardActionButton,
              { backgroundColor: `${theme.danger}18` },
              pressed && styles.pressed,
            ]}>
            <Symbol
              name={leaving ? 'minus-circle' : 'delete'}
              size={18}
              color={theme.danger}
            />
          </Pressable>
          <Pressable
            accessibilityActions={[
              ...(canMoveUp ? [{ name: 'moveUp', label: 'Move Up' }] : []),
              ...(canMoveDown ? [{ name: 'moveDown', label: 'Move Down' }] : []),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Drag to reorder ${list.name}`}
            accessibilityHint="Long press and drag, or use the move actions"
            delayLongPress={180}
            disabled={isActive}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
              if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
            }}
            onLongPress={onDragStart}
            style={({ pressed }) => [
              styles.cardActionButton,
              (pressed || isActive) && styles.pressed,
            ]}>
            <DragHandle
              size={20}
              color={
                theme.name === 'dark'
                  ? theme.textOnAccent
                  : theme.textSecondary
              }
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  cardMain: {
    minHeight: 86,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  activeCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  cardCopy: { flex: 1, gap: spacing.xs },
  nameEditor: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  nameInput: {
    ...typography.subheading,
    flex: 1,
    minWidth: 0,
    minHeight: layout.minTapTarget,
    paddingVertical: 0,
  },
  nameEditButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  collaborators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collaboratorAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collaboratorAvatar: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.pill,
  },
  collaboratorAvatarOverlap: { marginLeft: -5 },
  collaboratorInitial: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  count: { alignItems: 'center', minWidth: 44 },
  cardEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  cardActionButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.62 },
});
