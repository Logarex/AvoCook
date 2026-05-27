import { Check } from 'lucide-react-native';
import React from "react";
import { Pressable, View } from "react-native";
import { AppText } from "../../components/AppText";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeListStyles";

export function CategoryChip({
  count,
  label,
  selected,
  onPress,
}: {
  count: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={`${label}, ${count}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          backgroundColor: selected
            ? colors.primary
            : colors.surfaceGlassStrong,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      {selected ? (
        <Check color={colors.textInverted} size={16} strokeWidth={3} />
      ) : null}
      <AppText
        variant="label"
        style={{ color: selected ? colors.textInverted : colors.text }}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.categoryBadge,
          {
            backgroundColor: selected ? "rgba(255,255,255,0.22)" : colors.chip,
          },
        ]}
      >
        <AppText
          variant="caption"
          style={{ color: selected ? colors.textInverted : colors.textMuted }}
        >
          {count}
        </AppText>
      </View>
    </Pressable>
  );
}
