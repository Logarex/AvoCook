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
  rating: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  chip: string;
  input: string;
  shadow: string;
};

export const lightColors: AppColorScheme = {
  background: "#F2F2F7",
  backgroundElevated: "#FFFFFF",
  text: "#1C1C1E",
  textMuted: "#636366",
  textInverted: "#FFFFFF",
  border: "rgba(60, 60, 67, 0.12)",
  primary: "#2F6F64",
  primaryStrong: "#164C45",
  secondary: "#C15C3B",
  accent: "#E5B85E",
  danger: "#B93939",
  success: "#2D7D4F",
  warning: "#9A5518",
  rating: "#A36A00",
  surfaceGlass: "rgba(255, 255, 255, 0.72)",
  surfaceGlassStrong: "rgba(255, 255, 255, 0.9)",
  chip: "rgba(47, 111, 100, 0.1)",
  input: "rgba(255, 255, 255, 0.88)",
  shadow: "rgba(0, 0, 0, 0.12)",
};

export const darkColors: AppColorScheme = {
  background: "#000000",
  backgroundElevated: "#1C1C1E",
  text: "#F2F2F7",
  textMuted: "#AEAEB2",
  textInverted: "#101412",
  border: "rgba(235, 235, 245, 0.16)",
  primary: "#83CFC1",
  primaryStrong: "#B6EFE4",
  secondary: "#F09871",
  accent: "#F0C977",
  danger: "#F07B7B",
  success: "#78D39A",
  warning: "#F4AE61",
  rating: "#F0C977",
  surfaceGlass: "rgba(28, 28, 30, 0.65)",
  surfaceGlassStrong: "rgba(44, 44, 46, 0.88)",
  chip: "rgba(131, 207, 193, 0.14)",
  input: "rgba(44, 44, 46, 0.96)",
  shadow: "rgba(0, 0, 0, 0.38)",
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};
