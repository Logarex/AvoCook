import { requireOptionalNativeModule } from "expo-modules-core";
import type { ImageSourcePropType } from "react-native";

// Keep in sync with tools/plugins/withAlternateAppIcons.js and the native
// AvoCookAppIcon modules.
export const ALTERNATE_APP_ICONS = ["carrot", "cookbook", "plate"] as const;
export type AlternateAppIcon = (typeof ALTERNATE_APP_ICONS)[number];
/** `null` is the default AvoCook icon, which always stays the main icon. */
export type AppIconChoice = AlternateAppIcon | null;

export const APP_ICON_CHOICES: readonly AppIconChoice[] = [
  null,
  ...ALTERNATE_APP_ICONS,
];

const PREVIEWS: Record<
  "default" | AlternateAppIcon,
  { light: ImageSourcePropType; dark: ImageSourcePropType }
> = {
  default: {
    light: require("../../../assets/alternate-icons/preview/icon-default.png"),
    dark: require("../../../assets/alternate-icons/preview/icon-default-dark.png"),
  },
  carrot: {
    light: require("../../../assets/alternate-icons/preview/icon-carrot.png"),
    dark: require("../../../assets/alternate-icons/preview/icon-carrot-dark.png"),
  },
  cookbook: {
    light: require("../../../assets/alternate-icons/preview/icon-cookbook.png"),
    dark: require("../../../assets/alternate-icons/preview/icon-cookbook-dark.png"),
  },
  plate: {
    light: require("../../../assets/alternate-icons/preview/icon-plate.png"),
    dark: require("../../../assets/alternate-icons/preview/icon-plate-dark.png"),
  },
};

export function getAppIconPreview(icon: AppIconChoice, dark: boolean) {
  const preview = PREVIEWS[icon ?? "default"];
  return dark ? preview.dark : preview.light;
}

type AppIconNative = {
  supportsAlternateIcons: () => Promise<boolean>;
  getAppIcon: () => Promise<string | null>;
  setAppIcon: (icon: string | null) => Promise<boolean>;
};

function getNative() {
  try {
    return requireOptionalNativeModule<AppIconNative>("AvoCookAppIcon");
  } catch {
    return null;
  }
}

export function isAlternateAppIcon(value: unknown): value is AlternateAppIcon {
  return ALTERNATE_APP_ICONS.includes(value as AlternateAppIcon);
}

export async function supportsAlternateAppIcons() {
  const native = getNative();
  if (!native) return false;
  return native.supportsAlternateIcons().catch(() => false);
}

export async function getAppIcon(): Promise<AppIconChoice> {
  const current = await getNative()?.getAppIcon().catch(() => null);
  return isAlternateAppIcon(current) ? current : null;
}

export async function setAppIcon(icon: AppIconChoice) {
  const native = getNative();
  if (!native) return false;
  return native.setAppIcon(icon);
}
