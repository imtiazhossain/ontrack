import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  GlassIconWell,
  GlassPlate,
  IconButton,
  LoadingBlock,
  Symbol,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import { socialActionTones, socialChrome, socialShadow } from '@/features/social/social-chrome';
import { SocialPressable } from '@/features/social/social-pressable';
import { sharedUpcomingTrips } from '@/features/social/social-trip-membership';
import {
  SOCIAL_QUICK_ACTIONS,
  type SocialQuickActionId,
} from '@/features/social/social-types';
import { TravelTripCover } from '@/features/travel/travel-trip-cover';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { FriendProfile } from '@/services/friends';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDateLong, fromDateKey } from '@/utils/date';

export function SocialHeader({
  pendingCount,
  onAddFriend,
  onMessages,
}: {
  pendingCount: number;
  onAddFriend: () => void;
  onMessages: () => void;
}) {
  const theme = useTheme();
  const chrome = socialChrome(theme);
  const { spacing, s } = useResponsive();
  const buttonSize = Math.max(46, s(50));

  return (
    <View style={[styles.header, { gap: spacing.md }]}>
      <View style={[styles.headerCopy, { gap: spacing.xs }]}>
        <View style={styles.titleRow}>
          <AppText variant="display" style={{ color: chrome.ink }} fit>
            Social
          </AppText>
          <View
            accessibilityElementsHidden
            style={[
              styles.titleDot,
              {
                width: Math.max(9, s(10)),
                height: Math.max(9, s(10)),
                borderRadius: Math.max(5, s(5)),
                backgroundColor: chrome.primary,
              },
            ]}
          />
        </View>
        <AppText variant="body" style={{ color: chrome.secondaryInk }} fit>
          Connect. Share. Do more together.
        </AppText>
      </View>
      <View style={[styles.headerActions, { gap: spacing.sm }]}>
        <View style={[styles.iconShadow, socialShadow(chrome.shadow)]}>
          <IconButton
            testID={AgentUiIds.social.header.addFriend}
            icon="invite"
            size={buttonSize}
            iconSize="md"
            background={chrome.surface}
            borderColor={chrome.border}
            color={chrome.ink}
            accessibilityLabel={
              pendingCount > 0
                ? `Add friends, ${pendingCount} pending requests`
                : 'Add a friend'
            }
            onPress={onAddFriend}
          />
          {pendingCount > 0 ? (
            <View
              style={[
                styles.notificationBadge,
                { backgroundColor: chrome.primary, borderColor: chrome.background },
              ]}>
              <AppText variant="caption" color="onAccent" bold fit>
                {pendingCount > 9 ? '9+' : pendingCount}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={[styles.iconShadow, socialShadow(chrome.shadow)]}>
          <IconButton
            testID={AgentUiIds.social.header.messages}
            icon="chat"
            size={buttonSize}
            iconSize="md"
            background={chrome.surface}
            borderColor={chrome.border}
            color={chrome.ink}
            accessibilityLabel="Open messages"
            onPress={onMessages}
          />
        </View>
      </View>
    </View>
  );
}

export function SocialFriendsCard({
  friends,
  loading,
  onAddFriend,
  onSeeAll,
  onOpenFriend,
}: {
  friends: FriendProfile[];
  loading: boolean;
  onAddFriend: () => void;
  onSeeAll: () => void;
  onOpenFriend: (friend: FriendProfile) => void;
}) {
  const theme = useTheme();
  const chrome = socialChrome(theme);
  const { spacing, s } = useResponsive();
  const avatarSize = Math.max(54, s(58));

  return (
    <GlassPlate
      style={[
        styles.friendsCard,
        {
          paddingVertical: spacing.lg,
          ...socialShadow(chrome.shadow, 'overlay'),
        },
      ]}>
      <View
        style={[
          styles.friendsSummary,
          {
            width: Math.max(76, s(82)),
            paddingLeft: spacing.lg,
            paddingRight: spacing.sm,
          },
        ]}>
        <AppText variant="callout" bold fit>
          Friends
        </AppText>
        <AppText variant="metric" style={{ color: chrome.primary }} fit>
          {friends.length}
        </AppText>
        <SocialPressable
          testID={AgentUiIds.social.friends.seeAll}
          accessibilityLabel="See all friends"
          onPress={onSeeAll}
          style={styles.textAction}>
          <AppText variant="caption" style={{ color: chrome.primary }} fit>
            See all
          </AppText>
          <Symbol name="chevron-right" size={12} color={chrome.primary} />
        </SocialPressable>
      </View>

      {loading && friends.length === 0 ? (
        <View style={styles.friendsLoading}>
          <LoadingBlock label="Loading friends…" compact />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingRight: spacing.lg,
            gap: spacing.sm,
          }}>
          <SocialPressable
            testID={AgentUiIds.social.friends.add}
            accessibilityLabel="Add a friend"
            onPress={onAddFriend}
            style={[styles.friendItem, { width: Math.max(64, s(68)), gap: spacing.xs }]}>
            <View
              style={[
                styles.addFriendCircle,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: chrome.mint,
                },
              ]}>
              <Symbol name="add" size="md" color={chrome.primary} />
            </View>
            <AppText variant="caption" fit>
              Add
            </AppText>
          </SocialPressable>

          {friends.map((friend) => (
            <SocialPressable
              key={friend.userId}
              testID={AgentUiIds.social.friends.friend(friend.userId)}
              accessibilityLabel={`Open ${friend.displayName}`}
              onPress={() => onOpenFriend(friend)}
              style={[styles.friendItem, { width: Math.max(64, s(68)), gap: spacing.xs }]}>
              <View
                style={[
                  styles.friendAvatarRing,
                  {
                    width: avatarSize + 6,
                    height: avatarSize + 6,
                    borderRadius: (avatarSize + 6) / 2,
                    borderColor: chrome.primary,
                  },
                ]}>
                <ProfileAvatar
                  displayName={friend.displayName}
                  userId={friend.userId}
                  size={avatarSize}
                />
                <View
                  accessibilityLabel="Connected"
                  style={[
                    styles.presence,
                    {
                      backgroundColor: chrome.primary,
                      borderColor: chrome.surface,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" fit>
                {friend.displayName.split(' ')[0]}
              </AppText>
            </SocialPressable>
          ))}

          {friends.length === 0 ? (
            <View style={[styles.noFriendsCopy, { paddingHorizontal: spacing.sm }]}>
              <AppText variant="caption" color="secondary">
                Your people will stay right here.
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      )}
    </GlassPlate>
  );
}

const QUICK_ACTION_COLUMNS = 5;

export function SocialQuickActions({
  onAction,
}: {
  onAction: (action: SocialQuickActionId) => void;
}) {
  const theme = useTheme();
  const chrome = socialChrome(theme);
  const { spacing, width, layout, s } = useResponsive();
  const gap = spacing.xs;
  const [gridWidth, setGridWidth] = useState(0);
  // Prefer measured row width so tiles fill the content area edge-to-edge.
  const rowWidth = gridWidth > 0 ? gridWidth : width - layout.screenPadding * 2;
  const tileWidth = Math.max(
    52,
    Math.floor((rowWidth - gap * (QUICK_ACTION_COLUMNS - 1)) / QUICK_ACTION_COLUMNS),
  );
  const labelPadX = Math.max(2, spacing.xs - 1);
  // Shared size for every tile — sized so the longest single word still fits.
  const labelFontSize = Math.max(10, Math.min(11.5, Math.floor((tileWidth - labelPadX * 2) / 5.6)));
  const labelLineHeight = Math.round(labelFontSize * 1.28);
  const labelBlockHeight = labelLineHeight * 2;

  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="heading" style={{ color: chrome.ink }} bold fit>
        Quick Actions
      </AppText>
      <View
        style={[styles.quickGrid, { rowGap: gap }]}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          setGridWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
        }}>
        {SOCIAL_QUICK_ACTIONS.map((action) => {
          const tone = socialActionTones[action.tone];
          const a11yLabel = action.label.replace(/\n/g, ' ');
          return (
            <SocialPressable
              key={action.id}
              testID={AgentUiIds.social.quickAction(action.id)}
              accessibilityLabel={a11yLabel}
              onPress={() => onAction(action.id)}
              style={[
                styles.quickTileWrap,
                {
                  width: tileWidth,
                  minHeight: Math.max(88, s(96)),
                },
              ]}>
              <GlassPlate
                style={[
                  styles.quickTile,
                  {
                    paddingHorizontal: labelPadX,
                    paddingVertical: spacing.sm,
                    gap: spacing.xs,
                    ...socialShadow(chrome.shadow),
                  },
                ]}>
              <View
                style={[
                  styles.quickIcon,
                  {
                    width: Math.max(36, s(40)),
                    height: Math.max(36, s(40)),
                    borderRadius: Math.max(12, s(14)),
                    backgroundColor: tone.background,
                  },
                ]}>
                <Symbol name={action.icon} size="md" color={tone.foreground} />
              </View>
              <View style={[styles.quickLabelSlot, { height: labelBlockHeight }]}>
                <AppText
                  variant="caption"
                  align="center"
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.1}
                  style={[
                    styles.quickLabel,
                    {
                      color: chrome.ink,
                      fontSize: labelFontSize,
                      lineHeight: labelLineHeight,
                    },
                  ]}>
                  {action.label}
                </AppText>
              </View>
              </GlassPlate>
            </SocialPressable>
          );
        })}
      </View>
    </View>
  );
}

export function SocialUpcomingTogether({
  plans,
  friends,
  selfName,
  onSeeAll,
  onOpenPlan,
}: {
  plans: TravelPlan[];
  friends: FriendProfile[];
  selfName: string;
  onSeeAll: () => void;
  onOpenPlan: (plan: TravelPlan) => void;
}) {
  const theme = useTheme();
  const chrome = socialChrome(theme);
  const { spacing, width, layout, s } = useResponsive();
  const cardWidth = Math.min(Math.max(246, width - layout.screenPadding * 2 - 48), 310);
  const upcoming = sharedUpcomingTrips(plans);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" style={{ color: chrome.ink }} bold fit>
          Upcoming Together
        </AppText>
        <SocialPressable
          testID={AgentUiIds.social.upcoming.seeAll}
          accessibilityLabel="See all shared trips"
          onPress={onSeeAll}
          style={styles.textAction}>
          <AppText variant="callout" style={{ color: chrome.primary }} fit>
            See all
          </AppText>
          <Symbol name="chevron-right" size="sm" color={chrome.primary} />
        </SocialPressable>
      </View>

      {upcoming.length === 0 ? (
        <SocialPressable
          testID={AgentUiIds.social.upcoming.empty}
          accessibilityLabel="Create a shared trip"
          onPress={onSeeAll}
          style={styles.upcomingEmptyWrap}>
          <GlassPlate
            style={[
              styles.upcomingEmpty,
              {
                minHeight: Math.max(132, s(140)),
                padding: spacing.lg,
                gap: spacing.md,
              },
            ]}>
          <GlassIconWell size={52} borderRadius={18} style={styles.emptyIcon}>
            <Symbol name="flight" size="md" color={chrome.primary} />
          </GlassIconWell>
          <View style={styles.emptyCopy}>
            <AppText variant="subheading" bold fit>
              Plan something together
            </AppText>
            <AppText variant="caption" color="secondary">
              Shared trips with friends will appear here.
            </AppText>
          </View>
          <Symbol name="chevron-right" size="sm" color={chrome.primary} />
          </GlassPlate>
        </SocialPressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
          {upcoming.map((plan) => (
            <UpcomingCard
              key={plan.id}
              plan={plan}
              friends={friends}
              selfName={selfName}
              width={cardWidth}
              onPress={() => onOpenPlan(plan)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function UpcomingCard({
  plan,
  friends,
  selfName,
  width,
  onPress,
}: {
  plan: TravelPlan;
  friends: FriendProfile[];
  selfName: string;
  width: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const chrome = socialChrome(theme);
  const { spacing, s } = useResponsive();
  const start = fromDateKey(plan.startDate);
  const month = start.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const people = [
    { id: 'self', name: selfName, isSelf: true, userId: undefined as string | undefined },
    ...plan.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      isSelf: false,
      userId: friends.find(
        (friend) => friend.email.toLowerCase() === participant.email?.toLowerCase(),
      )?.userId,
    })),
  ];
  const visible = people.slice(0, 3);
  const extra = Math.max(0, people.length - visible.length);
  const avatarSize = Math.max(25, s(28));

  return (
    <SocialPressable
      testID={AgentUiIds.social.upcoming.trip(plan.id)}
      accessibilityLabel={`Open ${plan.title}, ${formatDateLong(plan.startDate)} to ${formatDateLong(plan.endDate)}`}
      onPress={onPress}
      style={{ width }}>
      <GlassPlate
        style={[
          styles.upcomingCard,
          {
            ...socialShadow(chrome.shadow, 'raised'),
          },
        ]}>
      <View style={[styles.coverWrap, { height: Math.max(108, s(116)) }]}>
        <TravelTripCover plan={plan} width="100%" height="100%" borderRadius={0} expandable={false} />
        <View style={[styles.avatarStack, { left: spacing.md, bottom: spacing.sm }]}>
          {visible.map((person, index) => (
            <View
              key={person.id}
              style={[
                styles.stackedAvatar,
                {
                  left: index * (avatarSize - 8),
                  width: avatarSize + 4,
                  height: avatarSize + 4,
                  borderRadius: (avatarSize + 4) / 2,
                  borderColor: chrome.surface,
                },
              ]}>
              <ProfileAvatar
                displayName={person.name}
                userId={person.userId}
                isSelf={person.isSelf}
                size={avatarSize}
              />
            </View>
          ))}
          {extra > 0 ? (
            <View
              style={[
                styles.extraPeople,
                {
                  left: visible.length * (avatarSize - 8),
                  width: avatarSize + 7,
                  height: avatarSize + 7,
                  borderRadius: (avatarSize + 7) / 2,
                  backgroundColor: chrome.primaryDeep,
                  borderColor: chrome.surface,
                },
              ]}>
              <AppText variant="caption" color="onAccent" bold fit>
                +{extra}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.tripInfo, { padding: spacing.md, gap: spacing.sm }]}>
        <View style={[styles.dateBadge, { backgroundColor: chrome.mint }]}>
          <AppText variant="overline" style={{ color: chrome.primary }} fit>
            {month}
          </AppText>
          <AppText variant="subheading" bold fit>
            {start.getDate()}
          </AppText>
        </View>
        <View style={styles.tripCopy}>
          <AppText variant="callout" bold fit>
            {plan.title}
          </AppText>
          <AppText variant="caption" color="secondary" fit>
            {formatDateLong(plan.startDate)} – {formatDateLong(plan.endDate)}
          </AppText>
        </View>
        <View style={styles.peopleCount}>
          <Symbol name="people" size={13} color={chrome.secondaryInk} />
          <AppText variant="caption" color="secondary" fit>
            {people.length}
          </AppText>
        </View>
      </View>
      </GlassPlate>
    </SocialPressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleDot: {
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconShadow: {
    borderRadius: radii.pill,
  },
  notificationBadge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsCard: {
    minHeight: 132,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  friendsSummary: {
    justifyContent: 'center',
    gap: 2,
  },
  textAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendItem: {
    minHeight: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  presence: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  noFriendsCopy: {
    width: 150,
    justifyContent: 'center',
  },
  quickGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickTileWrap: {
    flexGrow: 0,
  },
  quickTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  quickIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  quickLabelSlot: {
    alignSelf: 'stretch',
    width: '100%',
    justifyContent: 'center',
  },
  quickLabel: {
    width: '100%',
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  upcomingEmptyWrap: {
    alignSelf: 'stretch',
  },
  upcomingEmpty: {
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  upcomingCard: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  coverWrap: {
    overflow: 'hidden',
  },
  avatarStack: {
    position: 'absolute',
    height: 36,
  },
  stackedAvatar: {
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    overflow: 'hidden',
  },
  extraPeople: {
    position: 'absolute',
    top: -1,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfo: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    width: 44,
    minHeight: 48,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  peopleCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
