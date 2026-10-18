import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

export function ScreenHeader({
  title,
  onBack,
  actions,
}: {
  title?: string;
  onBack: () => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <IconButton icon={ArrowLeft} label={t("common.back")} onPress={onBack} />
      {title ? (
        <AppText
          accessibilityRole="header"
          variant="subtitle"
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </AppText>
      ) : (
        <View style={styles.title} />
      )}
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
  },
  actions: {
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
