const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

function withAndroidSplitsAndOptimizations(config) {
  // 1. Activer la minification Proguard/R8 et le shrink de ressources dans gradle.properties
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

  // 2. Activer la séparation des APKs (splits) et ajuster les codes de version
  config = withAppBuildGradle(config, (nextConfig) => {
    let buildGradle = nextConfig.modResults.contents;

    if (!buildGradle.includes("dependenciesInfo {")) {
      buildGradle = buildGradle.replace(
        "android {",
        `android {
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
`
      );
    }

    if (!buildGradle.includes("splits {")) {
      const targetString = "buildTypes {";
      
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
                // Version code unique par architecture pour éviter les conflits d'installation
                def versionCodes = ["armeabi-v7a": 1, "arm64-v8a": 2, "x86_64": 3]
                output.versionCodeOverride = versionCodes.get(abi) * 1048576 + defaultConfig.versionCode
            }
        }
    }

    `;

      buildGradle = buildGradle.replace(targetString, splitsConfig + targetString);
    }

    nextConfig.modResults.contents = buildGradle;
    return nextConfig;
  });

  return config;
}

module.exports = withAndroidSplitsAndOptimizations;
