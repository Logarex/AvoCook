export function getAdaptiveLayout(width: number, fontScale: number, horizontalInsets = 0) {
  const availableWidth = Math.max(0, Math.min(width - horizontalInsets, 1120) - 32);
  const scale = Math.max(1, fontScale);
  return {
    columns: availableWidth >= 640 * scale ? 2 : 1,
    sideBySide: availableWidth >= 720 * scale,
  };
}

export function getNavigationLayout(width: number, fontScale: number, leftInset = 0, rightInset = 0, visible = true) {
  const scale = Math.max(1, fontScale);
  const navigationRail = visible && width - leftInset - rightInset >= 760 * scale;
  const railWidth = navigationRail ? 112 * scale + Math.max(0, leftInset) : 0;
  return { navigationRail, railWidth, contentWidth: Math.max(0, width - railWidth) };
}
