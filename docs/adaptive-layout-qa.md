# Adaptive iPhone layout verification

Layouts follow the live app window and safe areas, without relying on a device name.
Recipe grids use two columns when each card has at least 320 points at the current
text scale. Recipe details and cooking use two panes when each pane has at least
360 points. Content is capped at 1120 points for readability.

## Device / simulator checks before release

- Open a recipe and start cooking in a compact window (320–390 points).
- Widen the window (760–900 points), then narrow it again while on a later step.
  The recipe, ingredient checks, step, and timers must remain intact.
- In wide cooking mode, ingredients appear alongside the current step and timers.
  In compact mode, the ingredients disclosure remains available.
- Repeat with large accessibility text, landscape safe areas, and Split View.
  Narrow panes should return to a single column, without clipped controls.
- Verify recipe and community grids before and after resizing; open a card,
  search, scroll, and refresh in each size.
- Test keyboard entry for timer minutes and confirm navigation remains reachable.

Automated layout checks do not replace a native iPhone Duo hardware / simulator run.
No hinge-angle or tabletop posture detection is implemented.
