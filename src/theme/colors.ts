export type AppColorScheme = {
  background: string;
  backgroundElevated: string;
  text: string;
  textMuted: string;
  textInverted: string;
  border: string;
  primary: string;
  primaryStrong: string;
  secondary: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  chip: string;
  input: string;
  shadow: string;
};

export const lightColors: AppColorScheme = {
  // maybe we should use Tailwind instead of hardcoding everything...
  background: "#F7F3EA",
  backgroundElevated: "#FFFFFF",
  text: "#1D1A16",
  textMuted: "#6C6258",
  textInverted: "#FFF9F0",
  border: "rgba(56, 47, 37, 0.14)",
  primary: "#2F6F64",
  primaryStrong: "#164C45",
  secondary: "#C15C3B",
  accent: "#E5B85E",
  danger: "#B93939",
  success: "#2D7D4F",
  warning: "#B86A1D",
  surfaceGlass: "rgba(255, 255, 255, 0.72)",
  surfaceGlassStrong: "rgba(255, 255, 255, 0.9)",
  chip: "rgba(47, 111, 100, 0.1)",
  input: "rgba(255, 255, 255, 0.88)",
  shadow: "rgba(43, 31, 18, 0.16)"
};

export const darkColors: AppColorScheme = {
  background: "#14120F",
  backgroundElevated: "#211E19",
  text: "#F8EFE3",
  textMuted: "#B9AB9A",
  textInverted: "#16120D",
  border: "rgba(255, 243, 224, 0.14)",
  primary: "#83CFC1",
  primaryStrong: "#B6EFE4",
  secondary: "#F09871",
  accent: "#F0C977",
  danger: "#F07B7B",
  success: "#78D39A",
  warning: "#F4AE61",
  surfaceGlass: "rgba(31, 28, 23, 0.72)",
  surfaceGlassStrong: "rgba(41, 36, 29, 0.92)",
  chip: "rgba(131, 207, 193, 0.14)",
  input: "rgba(42, 37, 31, 0.92)",
  shadow: "rgba(0, 0, 0, 0.38)"
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999
};
