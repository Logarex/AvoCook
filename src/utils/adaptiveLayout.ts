export function getAdaptiveLayout(width: number, fontScale: number, horizontalInsets = 0) {
  const availableWidth = Math.max(0, Math.min(width - horizontalInsets, 1120) - 32);
  const scale = Math.max(1, fontScale);
  return {
    columns: availableWidth >= 640 * scale ? 2 : 1,
    sideBySide: availableWidth >= 720 * scale,
  };
}
