import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives";
import { TravelCoTravelerStack } from "@/features/travel/travel-cotraveler-stack";
import { itinerarySheetChrome } from "@/features/travel/travel-itinerary-sheet-chrome";
import { TravelSheetIconControl } from "@/features/travel/travel-list-actions";
import { TravelPlanTitle } from "@/features/travel/travel-plan-title";
import { TravelTripCover } from "@/features/travel/travel-trip-cover";
import type { TravelPlan } from "@/features/travel/types";
import { useResponsive } from "@/hooks/use-responsive";
import { useTheme } from "@/hooks/use-theme";
import { AgentUiIds } from "@/utils/agent-ui";

type TravelTripCardHeaderProps = {
  plan: TravelPlan;
  collapsed: boolean;
  selfDisplayName: string;
  coTravelersExpanded: boolean;
  onOpenCover: () => void;
  onEdit: () => void;
  onToggleCollapsed: () => void;
  onCoTravelersExpandedChange: (expanded: boolean) => void;
};

/** Compact trip identity with card actions anchored in the upper-right. */
export function TravelTripCardHeader({
  plan,
  collapsed,
  selfDisplayName,
  coTravelersExpanded,
  onOpenCover,
  onEdit,
  onToggleCollapsed,
  onCoTravelersExpandedChange,
}: TravelTripCardHeaderProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, width: layoutWidth } = useResponsive();
  const showDestination =
    plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase();
  const controlSize = Math.max(28, s(24));
  const controlIconSize = Math.max(14, s(14));
  const coTravelerRowWidth = Math.max(44, layoutWidth - rs.md * 4);

  return (
    <View style={[styles.header, { gap: rs.xs }]}>
      <View style={[styles.identityRow, { gap: rs.md }]}>
        <TravelTripCover plan={plan} onOpen={onOpenCover} />
        <View style={[styles.content, { gap: rs.xs }]}>
          <View style={[styles.topRow, { gap: rs.sm }]}>
            <View style={[styles.heading, { gap: rs.xs }]}>
              <TravelPlanTitle
                title={plan.title}
                fontSize={s(32)}
                style={{ color: theme.textPrimary }}
              />
              {showDestination ? (
                <AppText
                  variant="caption"
                  style={{
                    color: chrome.subtitle,
                    fontSize: s(14),
                    lineHeight: s(18),
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                  fit
                  numberOfLines={1}
                >
                  {plan.destination}
                </AppText>
              ) : null}
            </View>
            <View style={[styles.controls, { gap: rs.xs }]}>
              <TravelSheetIconControl
                icon="edit"
                size={controlSize}
                iconSize={controlIconSize}
                testID={AgentUiIds.travel.list.editTrip(plan.id)}
                accessibilityLabel={`Edit Details for ${plan.title}`}
                onPress={onEdit}
              />
              <TravelSheetIconControl
                icon={collapsed ? "chevron-down" : "chevron-up"}
                size={controlSize}
                iconSize={controlIconSize}
                testID={AgentUiIds.travel.list.collapse(plan.id)}
                accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${plan.title}`}
                onPress={onToggleCollapsed}
              />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.coTravelerRow}>
        <TravelCoTravelerStack
          people={[
            { id: `${plan.id}-self`, name: selfDisplayName, isSelf: true },
            ...plan.participants.map((person) => ({
              id: person.id,
              name: person.name,
            })),
          ]}
          expanded={coTravelersExpanded}
          maxPackedWidth={coTravelerRowWidth}
          onExpandedChange={onCoTravelersExpandedChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 96,
    width: "100%",
    overflow: "visible",
    zIndex: 2,
  },
  identityRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    overflow: "visible",
  },
  content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heading: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    zIndex: 6,
    elevation: 6,
  },
  coTravelerRow: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
    zIndex: 4,
  },
});
