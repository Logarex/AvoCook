import React, { lazy, Suspense, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { CalendarDays, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../components/PrimaryButton";
import { IconButton } from "../components/IconButton";
import { TextField } from "../components/TextField";
import { useNativeControls } from "../components/NativeGlassControls";
import { useAppTheme } from "../theme/ThemeProvider";
import { localDate, validDate } from "../features/kitchen/kitchen";

const AndroidDatePicker = lazy(() => import("@expo/ui/community/datetime-picker"));

export function StockExpiryField({ value, onChange, label, allowClear = true }: { value: string; onChange: (date: string) => void; label?: string; allowClear?: boolean }) {
  const ui = useNativeControls();
  const { t, i18n } = useTranslation();
  const { isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(new Date());
  const androidPicker = Platform.OS === "android" && Boolean(requireOptionalNativeModule("ExpoUI"));
  if (!ui && !androidPicker) return <TextField label={label ?? t("kitchen.expiry")} value={value} onChangeText={onChange} placeholder={localDate()} keyboardType="numbers-and-punctuation" autoCorrect={false} autoCapitalize="none" />;
  const dateControl = (
      <View style={styles.row}>
        <PrimaryButton compact variant="secondary" icon={CalendarDays} style={styles.dateButton}
          label={value && validDate(value) ? `${label ?? t("kitchen.expiryTitle")} · ${new Date(`${value}T12:00:00`).toLocaleDateString(i18n.language)}` : (label ?? t("kitchen.addExpiry"))}
          onPress={() => { setSelection(value && validDate(value) ? new Date(`${value}T12:00:00`) : new Date()); setOpen(!open); }} />
        {allowClear && !!value && <IconButton icon={X} label={t("kitchen.remove")} onPress={() => { onChange(""); setOpen(false); }} />}
      </View>
  );
  if (androidPicker) return (
    <View style={styles.content}>
      {dateControl}
      {open && <Suspense fallback={<ActivityIndicator />}>
        <AndroidDatePicker value={selection} mode="date" presentation="dialog"
          positiveButton={{ label: t("kitchen.done") }} negativeButton={{ label: t("common.cancel") }}
          onChange={(event, date) => { if (event.type === "set" && date) onChange(localDate(date)); setOpen(false); }}
          onDismiss={() => setOpen(false)} />
      </Suspense>}
    </View>
  );
  const { Host, DatePicker } = ui!.views;
  const { datePickerStyle, environment } = ui!.modifiers;
  return (
    <View style={styles.content}>
      {dateControl}
      {open && (
        <>
          <Host colorScheme={isDark ? "dark" : "light"} style={styles.calendar} ignoreSafeArea="all">
            <DatePicker selection={selection} onDateChange={setSelection} displayedComponents={["date"]} modifiers={[datePickerStyle("graphical"), environment("locale", i18n.language)]} />
          </Host>
          <PrimaryButton compact label={t("kitchen.done")} onPress={() => { onChange(localDate(selection)); setOpen(false); }} />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({ content: { gap: 8 }, row: { flexDirection: "row", alignItems: "center", gap: 8 }, dateButton: { flex: 1 }, calendar: { height: 360, width: "100%" } });
