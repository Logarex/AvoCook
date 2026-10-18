import { Check } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { selectionFeedback } from "../features/accessibility/haptics";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppSheet } from "./AppSheet";
import { AppText } from "./AppText";
import { GlassPanel } from "./GlassPanel";
import { SearchField } from "./SearchField";
import { SettingsRow } from "./SettingsRow";

export function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visible = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <View style={styles.field}>
        <SettingsRow
          title={label}
          value={
            options.find((option) => option.value === value)?.label ?? value
          }
          disabled={disabled}
          onPress={() => {
            setQuery("");
            setOpen(true);
          }}
        />
      </View>
      <AppSheet title={label} visible={open} onClose={() => setOpen(false)}>
        {options.length > 10 ? (
          <SearchField
            placeholder={t("common.search")}
            value={query}
            onChangeText={setQuery}
          />
        ) : null}
        <GlassPanel style={styles.group}>
          {visible.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: option.value === value }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? colors.chip : "transparent" },
              ]}
              onPress={() => {
                if (option.value !== value) {
                  selectionFeedback();
                  onChange(option.value);
                }
                setOpen(false);
              }}
            >
              <AppText style={styles.copy}>{option.label}</AppText>
              {option.value === value ? (
                <Check color={colors.primary} size={22} />
              ) : null}
            </Pressable>
          ))}
        </GlassPanel>
        {!visible.length ? <AppText muted>{t("ui.noResults")}</AppText> : null}
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: -spacing.md },
  group: { padding: 0 },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  copy: { flex: 1 },
});
