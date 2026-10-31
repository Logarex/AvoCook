import { ChevronDown, Cloud, Smartphone, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import {
  NativeGlassButton,
  useNativeGlassControls,
} from "./NativeGlassControls";

export function ShoppingModeButton({
  onPress,
  compact = false,
  disabled = false,
}: {
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { mode, switching } = useShoppingList();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const nativeUI = useNativeGlassControls();
  const Icon =
    mode.kind === "pantry"
      ? Cloud
      : mode.kind === "firebase"
        ? Users
        : Smartphone;
  if (nativeUI && !compact) {
    return (
      <NativeGlassButton
        ui={nativeUI}
        fitContent={compact}
        onPress={onPress}
        disabled={switching || disabled}
        label={`${t("shoppingModes.choose")}: ${compact && mode.kind === "pantry"
                ? `${t(`shoppingModes.${mode.kind}`)} · ${mode.selection.list.name}`
                : t(`shoppingModes.${mode.kind}`)}`}
        style={{
          minHeight: compact ? 44 : 60,
          alignSelf: compact ? "flex-start" : "stretch",
        }}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.nativeContent}
        >
          <Icon size={compact ? 16 : 22} color={colors.primary} />
          <View style={compact ? styles.compactText : styles.text}>
            <AppText
              variant={compact ? "caption" : "label"}
              numberOfLines={compact ? 1 : undefined}
            >
              {compact && mode.kind === "pantry"
                ? `${t(`shoppingModes.${mode.kind}`)} · ${mode.selection.list.name}`
                : t(`shoppingModes.${mode.kind}`)}
            </AppText>
            {!compact ? (
              <AppText muted variant="caption">
                {switching
                  ? t("shoppingModes.switching")
                  : t("shoppingModes.choose")}
              </AppText>
            ) : null}
          </View>
          <ChevronDown size={compact ? 14 : 18} color={colors.primary} />
        </View>
      </NativeGlassButton>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("shoppingModes.choose")}
      accessibilityValue={{ text: mode.kind === "pantry" ? `${t(`shoppingModes.${mode.kind}`)} · ${mode.selection.list.name}` : t(`shoppingModes.${mode.kind}`) }}
      accessibilityState={{ disabled: switching || disabled }}
      disabled={switching || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compact : null,
        { opacity: switching ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {!compact ? (
        <GlassSurface
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
        />
      ) : null}
      <Icon size={compact ? 16 : 22} color={colors.primary} />
      <View style={compact ? styles.compactText : styles.text}>
        <AppText
          variant={compact ? "caption" : "label"}
          numberOfLines={compact ? 1 : undefined}
        >
          {compact && mode.kind === "pantry"
                ? `${t(`shoppingModes.${mode.kind}`)} · ${mode.selection.list.name}`
                : t(`shoppingModes.${mode.kind}`)}
        </AppText>
        {!compact ? (
          <AppText muted variant="caption">
            {switching
              ? t("shoppingModes.switching")
              : t("shoppingModes.choose")}
          </AppText>
        ) : null}
      </View>
      <ChevronDown size={compact ? 14 : 18} color={colors.primary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  nativeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  text: { flex: 1, gap: spacing.xxs },
  compact: {
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  compactText: { flexShrink: 1 },
});
