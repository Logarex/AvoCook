export function getRecipeCardHeight(fontScale: number) {
  // Title, two description lines, metadata, two gaps and vertical padding.
  return Math.max(116, Math.ceil(72 * fontScale + 40));
}
