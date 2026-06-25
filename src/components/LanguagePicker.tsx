import { Check, ChevronDown, Globe, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle
} from "react-native";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "../features/preferences/PreferencesProvider";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassPanel } from "./GlassPanel";
import { IconButton } from "./IconButton";

type LanguageOption = {
  value: AppLanguage;
  nativeName: string;
  shortLabel: string;
};

type Props = {
  value: AppLanguage;
  options?: readonly LanguageOption[];
  onChange: (value: AppLanguage) => void;
  style?: StyleProp<ViewStyle>;
};

export function LanguagePicker({
  value,
  options = SUPPORTED_LANGUAGES,
  onChange,
  style
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  function handleSelect(lang: AppLanguage) {
    onChange(lang);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        style={[
          styles.trigger,
          { backgroundColor: colors.input, borderColor: colors.border },
          style
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={[styles.triggerIcon, { backgroundColor: colors.chip }]}>
          <Globe color={colors.primary} size={18} />
        </View>
        <View style={styles.triggerText}>
          <AppText muted variant="caption">
            {t("settings.language")}
          </AppText>
          <AppText variant="label" numberOfLines={1}>
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

      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <View accessibilityViewIsModal style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={styles.modalScrim}
            onPress={() => setOpen(false)}
          />
          <GlassPanel style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Globe color={colors.primary} size={22} />
                <AppText variant="subtitle">{t("settings.language")}</AppText>
              </View>
              <IconButton icon={X} label={t("common.close")} onPress={() => setOpen(false)} />
            </View>
            <ScrollView
              contentContainerStyle={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.input,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: pressed ? 0.78 : 1
                      }
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <View style={styles.optionText}>
                      <AppText
                        variant="label"
                        numberOfLines={1}
                        style={{ color: isSelected ? colors.textInverted : colors.text }}
                      >
                        {option.nativeName}
                      </AppText>
                      <AppText
                        variant="caption"
                        style={{
                          color: isSelected ? colors.textInverted : colors.textMuted
                        }}
                      >
                        {option.shortLabel}
                      </AppText>
                    </View>
                    {isSelected ? (
                      <Check color={colors.textInverted} size={19} strokeWidth={3} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassPanel>
        </View>
      </Modal>
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
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: "100%"
  },
  triggerIcon: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  triggerText: {
    flex: 1
  },
  codeBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    minWidth: 38,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.24)"
  },
  modalSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
    maxHeight: "70%"
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalTitleGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  optionList: {
    gap: spacing.xs,
    paddingBottom: spacing.md
  },
  optionRow: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  optionText: {
    flex: 1
  }
});
