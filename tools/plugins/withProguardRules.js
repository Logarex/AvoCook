const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withProguardRules(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const proguardPath = path.join(config.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
      
      const rulesToAdd = `
# Added by withProguardRules
-dontwarn expo.modules.kotlin.runtime.MainRuntime
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.OptimizedRecord
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
`;

      if (fs.existsSync(proguardPath)) {
        let contents = fs.readFileSync(proguardPath, "utf-8");
        if (!contents.includes("-dontwarn expo.modules.kotlin.runtime.MainRuntime")) {
          contents += rulesToAdd;
          fs.writeFileSync(proguardPath, contents);
        }
      }

      return config;
    },
  ]);
}

module.exports = withProguardRules;
