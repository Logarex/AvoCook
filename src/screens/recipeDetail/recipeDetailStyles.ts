import { StyleSheet } from "react-native";
import { radius, spacing } from "../../theme/colors";

export const styles = StyleSheet.create({
  heroImage: {
    alignItems: "center",
    aspectRatio: 1.25,
    borderRadius: radius.lg,
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  healthCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  healthFact: {
    minWidth: "30%",
  },
  healthFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  healthHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  ingredientAction: {
    height: 40,
    width: 40,
  },
  checkCircle: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1.6,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  checkedItemText: {
    opacity: 0.68,
    textDecorationLine: "line-through",
  },
  ingredientCheckTarget: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    minWidth: 0,
  },
  ingredientHeaderActions: {
    alignItems: "center",
    flexBasis: "100%",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  ingredientHeaderButton: {
    flexBasis: 190,
    flexGrow: 1,
    minWidth: 190,
  },
  ingredientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  metric: {
    alignItems: "flex-start",
    flex: 1,
    gap: spacing.xxs,
    minWidth: 104,
    padding: spacing.sm,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nutritionItem: {
    minWidth: "44%",
  },
  nutriBadge: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  nutriScale: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
  nutriScaleItem: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    height: 28,
    justifyContent: "center",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  recommendationDot: {
    borderRadius: radius.pill,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  recommendationRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  recommendationText: {
    flex: 1,
  },
  recommendations: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rowIndex: {
    width: 24,
    marginTop: 3,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexWrap: "wrap",
    flexDirection: "row",
    gap: spacing.xs,
  },
  sectionItems: {
    gap: spacing.sm,
  },
  sectionTitleBlock: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 150,
  },
  servingFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  servingValue: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xxs,
  },
  servingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  stepCheckRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 11,
  },
  stepHeaderActions: {
    alignItems: "center",
    flexBasis: "100%",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  stepHeaderButton: {
    flexBasis: 190,
    flexGrow: 1,
    minWidth: 190,
  },
  timerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  timerCard: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  timerInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  timerList: {
    gap: spacing.sm,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  toolbar: {
    alignItems: "flex-start",
    gap: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toolbarActions: {
    alignItems: "stretch",
    gap: spacing.xs,
  },
  toolbarActionRow: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
});
