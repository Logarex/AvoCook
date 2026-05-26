const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

function withAndroidSplitsAndOptimizations(config) {
  config = withGradleProperties(config, (nextConfig) => {
    const setProperty = (key, value) => {
      const existingIdx = nextConfig.modResults.findIndex(p => p.key === key);
      if (existingIdx !== -1) {
        nextConfig.modResults[existingIdx].value = value;
      } else {
        nextConfig.modResults.push({ type: "property", key, value });
      }
    };

    setProperty("android.enableMinifyInReleaseBuilds", "true");
    setProperty("android.enableShrinkResourcesInReleaseBuilds", "true");
    return nextConfig;
  });

  config = withAppBuildGradle(config, (nextConfig) => {
    let buildGradle = nextConfig.modResults.contents;

    // Per-ABI splits so IzzyOnDroid can distribute a smaller arm64-only APK
    if (!buildGradle.includes("splits {")) {
      const splitsConfig = `
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86_64"
            universalApk true
        }
    }

    applicationVariants.all { variant ->
        variant.outputs.each { output ->
            def abi = output.getFilter(com.android.build.OutputFile.ABI)
            if (abi != null) {
                def versionCodes = ["armeabi-v7a": 1, "arm64-v8a": 2, "x86_64": 3]
                output.versionCodeOverride = versionCodes.get(abi) * 1048576 + defaultConfig.versionCode
            }
        }
    }

    `;
      buildGradle = buildGradle.replace("buildTypes {", splitsConfig + "buildTypes {");
    }

    // Required by IzzyOnDroid/F-Droid: removes the Google-encrypted dependency metadata blob
    if (!buildGradle.includes("dependenciesInfo {")) {
      const androidBlockMatch = buildGradle.match(/android\s*\{/);
      if (androidBlockMatch) {
        const insertPos = androidBlockMatch.index + androidBlockMatch[0].length;
        buildGradle =
          buildGradle.slice(0, insertPos) +
          `
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
` +
          buildGradle.slice(insertPos);
      }
    }

    // Guard IzzyOnDroid/F-Droid builds against accidental Firebase/GMS reintroduction.
    if (!buildGradle.includes("configurations.all")) {
      const dependenciesMatch = buildGradle.match(/dependencies\s*\{/);
      if (dependenciesMatch) {
        const insertPos = dependenciesMatch.index;
        buildGradle =
          buildGradle.slice(0, insertPos) +
          `configurations.all {
    exclude group: "com.google.firebase"
    exclude group: "com.google.android.gms", module: "play-services-base"
    exclude group: "com.google.android.gms", module: "play-services-basement"
    exclude group: "com.google.android.gms", module: "play-services-tasks"
    exclude group: "com.google.android.gms", module: "play-services-stats"
}

` +
          buildGradle.slice(insertPos);
      }
    }

    nextConfig.modResults.contents = buildGradle;
    return nextConfig;
  });

  return config;
}

module.exports = withAndroidSplitsAndOptimizations;
