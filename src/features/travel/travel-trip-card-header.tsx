import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives";
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
  onOpenCover: () => void;
  onEdit: () => void;
  onToggleCollapsed: () => void;
  /** Optional content below the identity row (e.g. trip dates). */
  children?: ReactNode;
};

/** Compact trip identity with card actions anchored in the upper-right. */
export function TravelTripCardHeader({
  plan,
  collapsed,
  onOpenCover,
  onEdit,
  onToggleCollapsed,
  children,
}: TravelTripCardHeaderProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const showDestination =
    plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase();
  const controlSize = Math.max(28, s(24));
  const controlIconSize = Math.max(14, s(14));
  const controlsWidth = controlSize * 2 + rs.xs;

  return (
    <View style={[styles.header, { gap: rs.xs }]}>
      <View style={[styles.identityRow, { gap: rs.md }]}>
        <TravelTripCover plan={plan} onOpen={onOpenCover} />
        <View style={[styles.content, { gap: rs.xs }]}>
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
          <View style={[styles.heading, { gap: rs.xs, paddingRight: controlsWidth + rs.sm }]}>
            <TravelPlanTitle
              title={plan.title}
              fontSize={Math.max(22, s(24))}
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
        </View>
      </View>
      {children}
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
    position: "relative",
  },
  heading: {
    width: "100%",
    minWidth: 0,
    justifyContent: "center",
  },
  controls: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    zIndex: 6,
    elevation: 6,
  },
});
