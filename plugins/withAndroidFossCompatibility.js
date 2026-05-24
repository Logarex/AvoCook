const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const GMS_MODULE_DEPENDENCIES_SERVICE =
  "com.google.android.gms.metadata.ModuleDependencies";

function withAndroidFossCompatibility(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest;
    manifest.$ = manifest.$ ?? {};
    manifest.$["xmlns:tools"] =
      manifest.$["xmlns:tools"] ?? "http://schemas.android.com/tools";

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      nextConfig.modResults
    );
    application.service = application.service ?? [];

    const existingService = application.service.find(
      (service) => service.$?.["android:name"] === GMS_MODULE_DEPENDENCIES_SERVICE
    );

    if (existingService) {
      existingService.$["tools:node"] = "remove";
    } else {
      application.service.push({
        $: {
          "android:name": GMS_MODULE_DEPENDENCIES_SERVICE,
          "tools:node": "remove"
        }
      });
    }

    return nextConfig;
  });
}

module.exports = withAndroidFossCompatibility;
