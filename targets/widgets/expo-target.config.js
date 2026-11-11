/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "AvoCookWidgets",
  displayName: "AvoCook",
  bundleIdentifier: ".widgets",
  deploymentTarget: "16.4",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
  colors: {
    $accent: { color: "#2F6F64", darkColor: "#7CC4B5" },
    $widgetBackground: { color: "#F2F2F7", darkColor: "#1C1C1E" },
    avocookPrimary: { color: "#2F6F64", darkColor: "#7CC4B5" },
  },
  entitlements: {
    // Same group as the app and the share extension, used for the "Today" widget snapshot.
    "com.apple.security.application-groups": [`group.${config.ios.bundleIdentifier}`],
  },
});
