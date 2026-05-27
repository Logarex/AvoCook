import { Pause, Play, RotateCcw, Square, Timer } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../../components/AppText";
import { GlassPanel } from "../../components/GlassPanel";
import { IconButton } from "../../components/IconButton";
import type {
  TimerPreset,
  TimerState,
  TimerNotificationStatus,
} from "../../features/timers/TimersProvider";
import { useAppTheme } from "../../theme/ThemeProvider";
import { styles } from "./recipeDetailStyles";
import { formatTimerSeconds } from "./recipeDetailHelpers";

export function TimerSection({
  presets,
  timers,
  notificationStatus,
  onReset,
  onToggle,
}: {
  presets: TimerPreset[];
  timers: Record<string, TimerState>;
  notificationStatus: TimerNotificationStatus;
  onReset: (timerId: string) => void;
  onToggle: (timerId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  if (!presets.length) {
    return null;
  }

  return (
    <GlassPanel style={styles.section}>
      <View style={styles.sectionHeader}>
        <Timer color={colors.primary} size={21} />
        <AppText variant="subtitle">{t("recipes.timers.title")}</AppText>
      </View>
      <AppText
        muted={
          notificationStatus !== "denied" &&
          notificationStatus !== "unavailable"
        }
        variant="caption"
        style={
          notificationStatus === "denied" ||
          notificationStatus === "unavailable"
            ? { color: colors.danger }
            : undefined
        }
      >
        {notificationStatus === "unavailable"
          ? t("recipes.timers.notificationsUnavailable")
          : notificationStatus === "denied"
            ? t("recipes.timers.notificationsOff")
            : t("recipes.timers.notificationHint")}
      </AppText>
      <View style={styles.timerList}>
        {presets.map((preset) => {
          const timer = timers[preset.id];
          const running = Boolean(timer?.running);
          const finished = Boolean(timer && timer.remainingSeconds === 0);
          return (
            <View
              key={preset.id}
              style={[
                styles.timerCard,
                {
                  backgroundColor: colors.chip,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.timerInfo}>
                <AppText variant="label">{preset.label}</AppText>
                <AppText variant="subtitle">
                  {formatTimerSeconds(
                    timer?.remainingSeconds ?? preset.minutes * 60,
                  )}
                </AppText>
                {finished ? (
                  <AppText muted variant="caption">
                    {t("recipes.timers.done")}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.timerActions}>
                <IconButton
                  icon={running ? Pause : Play}
                  label={
                    running
                      ? `${preset.label}, ${t("recipes.timers.pause")}`
                      : `${preset.label}, ${t("recipes.timers.start")}`
                  }
                  onPress={() => onToggle(preset.id)}
                  tone="primary"
                />
                <IconButton
                  icon={running || finished ? Square : RotateCcw}
                  label={
                    running || finished
                      ? `${preset.label}, ${t("recipes.timers.stop")}`
                      : `${preset.label}, ${t("recipes.timers.reset")}`
                  }
                  onPress={() => onReset(preset.id)}
                />
              </View>
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}
