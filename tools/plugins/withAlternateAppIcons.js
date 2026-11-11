const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withXcodeProject,
} = require("@expo/config-plugins");

// Keep in sync with src/features/appIcon/appIcon.ts.
const ICONS = ["carrot", "cookbook", "plate"];
const ICON_DIR = path.join("assets", "alternate-icons");

const iosIconSetName = (icon) =>
  `AppIcon-${icon.charAt(0).toUpperCase()}${icon.slice(1)}`;
const androidAliasName = (icon) =>
  `.MainActivity${icon.charAt(0).toUpperCase()}${icon.slice(1)}`;
const DEFAULT_ALIAS = ".MainActivityDefault";

function iosContents(icon) {
  return {
    images: [
      {
        filename: `icon-${icon}.png`,
        idiom: "universal",
        platform: "ios",
        size: "1024x1024",
      },
      {
        filename: `icon-${icon}-dark.png`,
        idiom: "universal",
        platform: "ios",
        size: "1024x1024",
        appearances: [{ appearance: "luminosity", value: "dark" }],
      },
    ],
    info: { version: 1, author: "expo" },
  };
}

function withIosAlternateIcons(config) {
  config = withDangerousMod(config, [
    "ios",
    async (nextConfig) => {
      const { projectRoot, platformProjectRoot, projectName } =
        nextConfig.modRequest;
      const catalog = path.join(
        platformProjectRoot,
        projectName,
        "Images.xcassets",
      );
      for (const icon of ICONS) {
        const iconSet = path.join(catalog, `${iosIconSetName(icon)}.appiconset`);
        await fs.promises.mkdir(iconSet, { recursive: true });
        for (const file of [`icon-${icon}.png`, `icon-${icon}-dark.png`]) {
          await fs.promises.copyFile(
            path.join(projectRoot, ICON_DIR, file),
            path.join(iconSet, file),
          );
        }
        await fs.promises.writeFile(
          path.join(iconSet, "Contents.json"),
          `${JSON.stringify(iosContents(icon), null, 2)}\n`,
        );
      }
      return nextConfig;
    },
  ]);

  return withXcodeProject(config, (nextConfig) => {
    const project = nextConfig.modResults;
    const names = ICONS.map(iosIconSetName).join(" ");
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key].buildSettings;
      // Only the app target has an app icon; leave extensions untouched.
      if (!settings || settings.ASSETCATALOG_COMPILER_APPICON_NAME !== "AppIcon")
        continue;
      settings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = `"${names}"`;
      settings.ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = "YES";
    }
    return nextConfig;
  });
}

function launcherFilter() {
  return {
    action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
    category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }],
  };
}

function isLauncherFilter(filter) {
  return (
    filter.action?.some(
      (action) => action.$["android:name"] === "android.intent.action.MAIN",
    ) &&
    filter.category?.some(
      (category) =>
        category.$["android:name"] === "android.intent.category.LAUNCHER",
    )
  );
}

function withAndroidAlternateIcons(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      nextConfig.modResults,
    );
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      nextConfig.modResults,
    );
    // The launcher entry moves to activity-aliases so it can be swapped.
    // Deep links and share intents stay on MainActivity.
    mainActivity["intent-filter"] = (mainActivity["intent-filter"] ?? []).filter(
      (filter) => !isLauncherFilter(filter),
    );

    const managed = new Set([DEFAULT_ALIAS, ...ICONS.map(androidAliasName)]);
    const aliases = (application["activity-alias"] ?? []).filter(
      (alias) => !managed.has(alias.$["android:name"]),
    );
    const alias = (name, icon, roundIcon, enabled) => ({
      $: {
        "android:name": name,
        "android:enabled": String(enabled),
        "android:exported": "true",
        "android:icon": icon,
        "android:roundIcon": roundIcon,
        "android:targetActivity": ".MainActivity",
      },
      "intent-filter": [launcherFilter()],
    });
    aliases.push(
      alias(DEFAULT_ALIAS, "@mipmap/ic_launcher", "@mipmap/ic_launcher_round", true),
      ...ICONS.map((icon) =>
        alias(
          androidAliasName(icon),
          `@mipmap/avocook_icon_${icon}`,
          `@mipmap/avocook_icon_${icon}`,
          false,
        ),
      ),
    );
    application["activity-alias"] = aliases;
    return nextConfig;
  });
}

module.exports = function withAlternateAppIcons(config) {
  return withAndroidAlternateIcons(withIosAlternateIcons(config));
};
