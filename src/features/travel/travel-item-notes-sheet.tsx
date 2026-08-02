import { useEffect, useState } from 'react';
import {
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

import { AppText, Button, IconButton, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing, type Theme } from '@/design-system';
import {
  noteAuthorColor,
  noteAuthorTint,
} from '@/features/travel/travel-item-note-colors';
import {
  TRAVEL_EXPENSE_SELF_ID,
  type TravelItemNote,
  type TravelItineraryItem,
  type TravelPlan,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { newId } from '@/utils/id';

function formatNoteTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function NoteCard({
  note,
  theme,
  avatarSize,
  actionSize,
  gap,
  padH,
  padV,
  isEditing,
  onEdit,
  onDelete,
}: {
  note: TravelItemNote;
  theme: Theme;
  avatarSize: number;
  actionSize: number;
  gap: number;
  padH: number;
  padV: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = noteAuthorColor(note.authorId, theme);
  const tint = noteAuthorTint(note.authorId, theme);
  const initial = note.authorName.trim().charAt(0).toUpperCase() || '?';
  const isSelf = note.authorId === TRAVEL_EXPENSE_SELF_ID;
  const displayName =
    isSelf && note.authorName.trim().toLowerCase() !== 'you'
      ? `${note.authorName} (You)`
      : isSelf
        ? 'You'
        : note.authorName;
  const timeLabel = note.updatedAt
    ? `Edited ${formatNoteTime(note.updatedAt)}`
    : formatNoteTime(note.createdAt);

  return (
    <View
      style={[
        styles.noteCard,
        {
          backgroundColor: isEditing
            ? theme.backgroundSunken
            : theme.backgroundElevated,
          gap,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
      ]}>
      <View style={[styles.noteHeader, { gap }]}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: tint,
              width: avatarSize,
              height: avatarSize,
            },
          ]}>
          <AppText style={[styles.avatarLetter, { color: accent }]} fit>
            {initial}
          </AppText>
        </View>
        <AppText
          variant="callout"
          fit
          style={[styles.authorName, { color: accent }]}
          numberOfLines={1}>
          {displayName}
        </AppText>
        <AppText variant="caption" color="tertiary" fit numberOfLines={1}>
          {timeLabel}
        </AppText>
      </View>
      <AppText variant="body">{note.body}</AppText>
      {isSelf ? (
        <View style={[styles.noteActions, { gap: gap }]}>
          <IconButton
            icon="edit"
            size={actionSize}
            background={theme.backgroundSunken}
            accessibilityLabel={isEditing ? 'Cancel edit' : 'Edit note'}
            onPress={onEdit}
          />
          <IconButton
            icon="delete"
            size={actionSize}
            background={theme.backgroundSunken}
            color={theme.danger}
            accessibilityLabel="Delete note"
            onPress={onDelete}
          />
        </View>
      ) : null}
    </View>
  );
}

export function TravelItemNotesSheet({
  item,
  visible,
  onClose,
  onSaveNotes,
}: {
  plan: TravelPlan;
  item: TravelItineraryItem;
  visible: boolean;
  onClose: () => void;
  onSaveNotes: (notes: TravelItemNote[]) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { s, spacing: rs } = useResponsive();
  const preferenceName = usePreferences((state) => state.name).trim();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const notes = item.notes ?? [];
  const authorName = preferenceName || 'You';
  const authorId = TRAVEL_EXPENSE_SELF_ID;
  const closeSize = Math.max(32, s(32));
  const avatarSize = Math.max(26, s(26));
  const actionSize = Math.max(28, s(28));
  const listPad = {
    gap: rs.sm,
    paddingHorizontal: rs.md,
    paddingTop: rs.sm,
    paddingBottom: rs.sm,
  };
  const isEditing = editingId != null;
  const deletingNote = deletingId
    ? notes.find((note) => note.id === deletingId)
    : undefined;

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setEditingId(null);
      setDeletingId(null);
    }
  }, [visible]);

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const beginEdit = (note: TravelItemNote) => {
    if (deletingId) setDeletingId(null);
    if (editingId === note.id) {
      cancelEdit();
      return;
    }
    setEditingId(note.id);
    setDraft(note.body);
  };

  const requestDelete = (note: TravelItemNote) => {
    // Confirm inside this Modal. Root appPrompt sits behind RN Modal windows.
    cancelEdit();
    setDeletingId(note.id);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    const next = notes.filter((entry) => entry.id !== deletingId);
    setDeletingId(null);
    onSaveNotes(next);
  };

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    if (editingId) {
      onSaveNotes(
        notes.map((note) =>
          note.id === editingId
            ? { ...note, body, updatedAt: new Date().toISOString() }
            : note,
        ),
      );
      cancelEdit();
      return;
    }
    const next: TravelItemNote = {
      id: newId('note'),
      body,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
    };
    onSaveNotes([...notes, next]);
    setDraft('');
  };

  const noteCards = notes.map((note) => (
    <NoteCard
      key={note.id}
      note={note}
      theme={theme}
      avatarSize={avatarSize}
      actionSize={actionSize}
      gap={rs.xs}
      padH={rs.md}
      padV={rs.sm}
      isEditing={editingId === note.id}
      onEdit={() => beginEdit(note)}
      onDelete={() => requestDelete(note)}
    />
  ));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.overlayScrim, paddingTop: insets.top },
        ]}>
        <Pressable
          accessibilityLabel="Close notes"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundPrimary,
                paddingBottom: Math.max(insets.bottom, rs.sm),
              },
            ]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: theme.separator }]} />
            </View>

            <View
              style={[
                styles.header,
                {
                  paddingHorizontal: rs.md,
                  paddingBottom: rs.sm,
                  borderBottomColor: theme.separator,
                },
              ]}>
              <View style={[styles.headerRow, { gap: rs.sm }]}>
                <View style={styles.headerCopy}>
                  <AppText style={styles.title} fit numberOfLines={1}>
                    Notes
                  </AppText>
                  <AppText
                    variant="caption"
                    color="secondary"
                    style={styles.serif}
                    fit
                    numberOfLines={1}>
                    {item.title}
                  </AppText>
                </View>
                <IconButton
                  icon="close"
                  size={closeSize}
                  background={theme.backgroundSunken}
                  accessibilityLabel="Close Notes"
                  onPress={onClose}
                />
              </View>
            </View>

            {deletingNote ? (
              <View
                style={[
                  styles.deleteConfirm,
                  {
                    gap: rs.md,
                    paddingHorizontal: rs.md,
                    paddingVertical: rs.lg,
                  },
                ]}
                accessibilityLabel="Confirm delete note">
                <Symbol name="delete" size="lg" color={theme.danger} />
                <AppText style={styles.deleteTitle}>Delete note?</AppText>
                <AppText
                  variant="body"
                  color="secondary"
                  style={styles.deleteCopy}
                  numberOfLines={3}>
                  Remove “{deletingNote.body}”? This can’t be undone.
                </AppText>
                <Button
                  variant="danger"
                  accessibilityLabel="Confirm delete note"
                  onPress={confirmDelete}>
                  Delete note
                </Button>
                <Button
                  variant="ghost"
                  accessibilityLabel="Keep note"
                  onPress={() => setDeletingId(null)}>
                  Keep note
                </Button>
              </View>
            ) : notes.length === 0 ? (
              <View
                style={[
                  styles.empty,
                  {
                    gap: rs.xs,
                    paddingHorizontal: rs.md,
                    paddingVertical: rs.md,
                  },
                ]}>
                <Symbol name="note" size="md" color={theme.textTertiary} />
                <AppText style={styles.emptyTitle} color="secondary">
                  No notes yet
                </AppText>
                <AppText variant="caption" color="tertiary" style={styles.emptyCopy}>
                  Share a quick thought with the group.
                </AppText>
              </View>
            ) : notes.length <= 4 ? (
              <View style={[styles.content, listPad]}>{noteCards}</View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                style={[styles.list, { maxHeight: Math.max(240, s(280)) }]}
                contentContainerStyle={[styles.content, listPad]}>
                {noteCards}
              </ScrollView>
            )}

            {deletingNote ? null : (
              <View
                style={[
                  styles.composer,
                  {
                    borderTopColor: theme.separator,
                    gap: rs.sm,
                    paddingHorizontal: rs.md,
                    paddingTop: rs.sm,
                  },
                ]}>
                {isEditing ? (
                  <IconButton
                    icon="close"
                    size={Math.max(36, s(36))}
                    background={theme.backgroundSunken}
                    accessibilityLabel="Cancel edit"
                    onPress={cancelEdit}
                  />
                ) : null}
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={isEditing ? 'Edit note…' : 'Add a note…'}
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  maxLength={500}
                  accessibilityLabel={isEditing ? 'Edit trip note' : 'Trip note'}
                  underlineColorAndroid="transparent"
                  style={[
                    styles.input,
                    {
                      color: theme.textPrimary,
                      backgroundColor: theme.backgroundSunken,
                      minHeight: Math.max(40, s(40)),
                      maxHeight: Math.max(88, s(88)),
                      paddingHorizontal: rs.md,
                      paddingVertical: rs.sm,
                    },
                  ]}
                />
                <IconButton
                  icon={isEditing ? 'check' : 'send'}
                  size={Math.max(36, s(36))}
                  background={
                    draft.trim() ? theme.accentPrimary : theme.backgroundSunken
                  }
                  color={draft.trim() ? theme.textOnAccent : theme.textTertiary}
                  disabled={!draft.trim()}
                  accessibilityLabel={isEditing ? 'Save note' : 'Post note'}
                  onPress={submit}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Compact notes action used in itinerary card toolbars. */
export function TravelItemNotesButton({
  hasNotes,
  size,
  onPress,
}: {
  hasNotes: boolean;
  size: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View>
      <IconButton
        icon="note"
        size={size}
        background={theme.backgroundSunken}
        accessibilityLabel={hasNotes ? 'View notes' : 'Add notes'}
        onPress={onPress}
      />
      {hasNotes ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: theme.accentPrimary,
              borderColor: theme.backgroundElevated,
            },
          ]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    width: '100%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    flexGrow: 0,
  },
  empty: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  emptyCopy: {
    textAlign: 'center',
    maxWidth: 220,
  },
  deleteConfirm: {
    alignItems: 'center',
  },
  deleteTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  deleteCopy: {
    textAlign: 'center',
    maxWidth: 280,
  },
  noteCard: {
    borderRadius: 12,
    borderCurve: 'continuous',
    flexGrow: 0,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: fontFamilies.serif,
    fontSize: 12,
    fontWeight: '600',
  },
  authorName: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    borderRadius: 12,
    borderCurve: 'continuous',
    fontFamily: fontFamilies.serif,
    fontSize: 16,
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
