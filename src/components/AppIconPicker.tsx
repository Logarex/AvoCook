import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { selectionFeedback } from "../features/accessibility/haptics";
import {
  APP_ICON_CHOICES,
  getAppIcon,
  getAppIconPreview,
  setAppIcon,
  supportsAlternateAppIcons,
  type AppIconChoice,
} from "../features/appIcon/appIcon";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

const LABEL_KEYS = {
  default: "settings.appIconDefault",
  carrot: "settings.appIconCarrot",
  cookbook: "settings.appIconCookbook",
  plate: "settings.appIconPlate",
} as const;

/** Lets people pick the launcher icon. The AvoCook icon stays the default. */
export function AppIconPicker() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const [supported, setSupported] = useState(false);
  const [selected, setSelected] = useState<AppIconChoice>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const isSupported = await supportsAlternateAppIcons();
      const current = isSupported ? await getAppIcon() : null;
      if (!active) return;
      setSupported(isSupported);
      setSelected(current);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!supported) return null;

  async function handleSelect(icon: AppIconChoice) {
    if (icon === selected) return;
    selectionFeedback();
    const previous = selected;
    setSelected(icon);
    try {
      await setAppIcon(icon);
    } catch (error) {
      console.warn("appIcon", "Could not change the app icon", error);
      setSelected(previous);
      Alert.alert(t("settings.appIcon"), t("settings.appIconError"));
    }
  }

  return (
    <View style={styles.container}>
      <AppText variant="label">{t("settings.appIcon")}</AppText>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {APP_ICON_CHOICES.map((icon) => {
          const isSelected = icon === selected;
          const label = t(LABEL_KEYS[icon ?? "default"]);
          return (
            <Pressable
              key={icon ?? "default"}
              accessibilityLabel={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => void handleSelect(icon)}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.frame,
                  { borderColor: isSelected ? colors.primary : "transparent" },
                ]}
              >
                <Image
                  source={getAppIconPreview(icon, isDark)}
                  style={styles.image}
                />
              </View>
              <AppText
                variant="caption"
                muted={!isSelected}
                numberOfLines={1}
                style={styles.caption}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {Platform.OS === "android" ? (
        <AppText muted variant="caption">
          {t("settings.appIconAndroidHint")}
        </AppText>
      ) : null}
    </View>
  );
}

const ICON_SIZE = 60;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  choice: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  frame: {
    borderRadius: radius.md,
    borderWidth: 3,
    padding: 3,
  },
  image: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    // iOS-like squircle approximation.
    borderRadius: ICON_SIZE * 0.225,
  },
  caption: {
    textAlign: "center",
  },
});
