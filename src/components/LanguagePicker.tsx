import { Check, ChevronDown, Globe } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { selectionFeedback } from "../features/accessibility/haptics";
import type { AppLanguage } from "../features/preferences/PreferencesProvider";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppSheet } from "./AppSheet";
import { AppText } from "./AppText";
import { GlassSurface } from "./GlassSurface";
import {
  NativeGlassButton,
  useNativeGlassControls,
} from "./NativeGlassControls";

type LanguageOption<Language extends string> = {
  value: Language;
  nativeName: string;
  shortLabel: string;
};

type Props<Language extends string> = {
  value: Language;
  options?: readonly LanguageOption<Language>[];
  onChange: (value: Language) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "minimal" | "compact";
};

export function LanguagePicker<Language extends string = AppLanguage>({
  value,
  options,
  onChange,
  style,
  variant = "default",
  label,
}: Props<Language>) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const nativeUI = useNativeGlassControls();

  const languageOptions =
    options ??
    (SUPPORTED_LANGUAGES as unknown as readonly LanguageOption<Language>[]);
  const pickerLabel = label ?? t("settings.language");
  const selected = languageOptions.find((o) => o.value === value);

  function handleSelect(lang: Language) {
    if (lang !== value) selectionFeedback();
    onChange(lang);
    setOpen(false);
  }

  return (
    <>
      {variant !== "default" && nativeUI ? (
        <NativeGlassButton
          ui={nativeUI}
          fitContent
          label={`${pickerLabel}: ${selected?.nativeName ?? value}`}
          onPress={() => setOpen(true)}
          style={[{ minHeight: 44 }, style]}
        >
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <Globe color={colors.textMuted} size={16} />
            <AppText muted variant="label">
              {variant === "compact"
                ? (selected?.nativeName ?? value)
                : (selected?.shortLabel ?? value.toUpperCase())}
            </AppText>
          </View>
        </NativeGlassButton>
      ) : variant !== "default" ? (
        <Pressable
          accessibilityRole="combobox"
          accessibilityLabel={`${pickerLabel}: ${selected?.nativeName ?? value}`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [
            styles.minimalTrigger,
            { opacity: pressed ? 0.7 : 1 },
            style,
          ]}
          onPress={() => setOpen(true)}
        >
          <GlassSurface
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          <Globe color={colors.textMuted} size={16} />
          <AppText muted variant="label">
            {variant === "compact"
              ? (selected?.nativeName ?? value)
              : (selected?.shortLabel ?? value.toUpperCase())}
          </AppText>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="combobox"
          accessibilityLabel={`${pickerLabel}: ${selected?.nativeName ?? value}`}
          accessibilityState={{ expanded: open }}
          style={[
            styles.trigger,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: "transparent",
            },
            style,
          ]}
          onPress={() => setOpen(true)}
        >
          <View style={[styles.triggerIcon, { backgroundColor: colors.chip }]}>
            <Globe color={colors.primary} size={18} />
          </View>
          <View style={styles.triggerText}>
            <AppText muted variant="caption" style={styles.triggerCaption}>
              {pickerLabel}
            </AppText>
            <AppText
              variant="body"
              numberOfLines={2}
              style={styles.triggerValue}
            >
              {selected?.nativeName ?? value.toUpperCase()}
            </AppText>
          </View>
          <View style={[styles.codeBadge, { backgroundColor: colors.chip }]}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              {selected?.shortLabel ?? value.toUpperCase()}
            </AppText>
          </View>
          <ChevronDown color={colors.textMuted} size={18} />
        </Pressable>
      )}

      <AppSheet
        title={pickerLabel}
        visible={open}
        onClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {languageOptions.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <View key={option.value}>
                {index > 0 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionText}>
                    <AppText
                      variant="label"
                      numberOfLines={2}
                      style={{
                        color: isSelected ? colors.primaryStrong : colors.text,
                      }}
                    >
                      {option.nativeName}
                    </AppText>
                  </View>
                  {isSelected ? (
                    <Check color={colors.primary} size={19} strokeWidth={3} />
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  minimalTrigger: {
    minHeight: 44,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  triggerIcon: {
    flexShrink: 0,
    alignItems: "center",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  triggerText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  triggerCaption: {
    flexShrink: 0,
  },
  triggerValue: {
    flexShrink: 0,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
  },
  codeBadge: {
    flexShrink: 0,
    alignItems: "center",
    borderRadius: radius.pill,
    minWidth: 38,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  optionsCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.sm,
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  optionText: {
    flex: 1,
  },
});
