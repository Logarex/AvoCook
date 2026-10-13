import React from "react";
import { View } from "react-native";
import { MarkdownText } from "../../components/MarkdownText";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { styles } from "./recipeDetailStyles";

export function RecipeSection({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <AppText variant="subtitle">{title}</AppText>
      <View style={styles.sectionItems}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.row}>
            <AppText muted variant="label" style={styles.rowIndex}>
              {ordered ? `${index + 1}` : "•"}
            </AppText>
            <MarkdownText containerStyle={styles.rowText}>{item}</MarkdownText>
          </View>
        ))}
      </View>
    </GlassPanel>
  );
}
