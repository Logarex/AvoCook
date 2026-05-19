import { Check, ChevronDown, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import type { AppLanguage } from "../features/preferences/PreferencesProvider";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { GlassPanel } from "./GlassPanel";
import { IconButton } from "./IconButton";

type LanguageOption = { value: AppLanguage; label: string };

type Props = {
  value: AppLanguage;
  options: LanguageOption[];
  onChange: (value: AppLanguage) => void;
};

export function LanguagePicker({ value, options, onChange }: Props) {
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
          { backgroundColor: colors.input, borderColor: colors.border }
        ]}
        onPress={() => setOpen(true)}
      >
        <AppText style={styles.triggerLabel}>{selected?.label ?? value}</AppText>
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
              <AppText variant="subtitle">Language / Langue / Sprache</AppText>
              <IconButton icon={X} label="Close" onPress={() => setOpen(false)} />
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
                        backgroundColor: isSelected ? colors.primary : colors.chip,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: pressed ? 0.78 : 1
                      }
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    {isSelected ? (
                      <Check color={colors.textInverted} size={17} strokeWidth={3} />
                    ) : null}
                    <AppText
                      variant="label"
                      style={{ color: isSelected ? colors.textInverted : colors.text }}
                    >
                      {option.label}
                    </AppText>
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
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  triggerLabel: {
    flex: 1
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)"
  },
  modalSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.md,
    maxHeight: "60%"
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
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
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  }
});
