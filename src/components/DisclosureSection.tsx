import { ChevronDown } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

export function DisclosureSection({
  title,
  children,
  initiallyExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <AppText variant="subtitle" style={styles.title}>
          {title}
        </AppText>
        <ChevronDown
          color={colors.textMuted}
          size={20}
          style={expanded ? { transform: [{ rotate: "180deg" }] } : undefined}
        />
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
  },
  title: { flex: 1 },
  content: { gap: spacing.md },
});
