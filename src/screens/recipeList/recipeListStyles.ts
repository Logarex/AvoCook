import { StyleSheet } from "react-native";
import { radius, spacing } from "../../theme/colors";

export const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    flexShrink: 0,
    gap: spacing.xxs,
    justifyContent: "flex-end",
    maxWidth: 172,
  },
  categoryList: {
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
    paddingRight: spacing.md,
  },
  categoryScroller: {
    flexGrow: 0,
    height: 40,
    overflow: "visible",
  },
  categoryBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    minWidth: 26,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  categoryChip: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  categoryGridItem: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 58,
    padding: spacing.xs,
    width: "48%",
  },
  categoryGridSelect: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    minWidth: 0,
  },
  categoryActionButton: {
    height: 38,
    width: 38,
  },
  categoryGridActions: {
    gap: spacing.xxs,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  headerIcon: {
    height: 40,
    width: 40,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  listTitle: {
    lineHeight: 36,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  inlineEditor: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
  inlineEditorActionButton: {
    flex: 1,
  },
  inlineEditorActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  organizerActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xxs,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  modalSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
    maxHeight: "72%",
  },
  recipeList: {
    flex: 1,
  },
  recipeActionButton: {
    width: "100%",
    minHeight: 52,
  },
  recipeActionGrid: {
    gap: spacing.xs,
  },
  recipeActionSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
  },
  recipeActionTitle: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingTop: spacing.sm,
  },
  scrollTopButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 104,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 42,
    elevation: 4,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  updateBanner: {
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  updateBannerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  updateBannerTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    flex: 1,
  },
  updateIconWrapper: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  closeIcon: {
    height: 32,
    width: 32,
  },
  updateWarningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: "rgba(219, 68, 85, 0.08)",
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  updateWarningText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  updateActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  updateActionButton: {
    flex: 1,
    minHeight: 38,
  },
});
