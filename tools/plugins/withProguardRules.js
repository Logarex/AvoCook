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
-keep class expo.modules.kotlin.runtime.MainRuntime { *; }
-keep class expo.modules.kotlin.types.AnyTypeCache { *; }
-keep class expo.modules.kotlin.types.OptimizedRecord { *; }
-keep class expo.modules.kotlin.types.descriptors.RawTypeDescriptor { *; }
-keep class expo.modules.kotlin.types.descriptors.TypeDescriptor { *; }
-keep class expo.modules.kotlin.types.descriptors.TypeDescriptorKt { *; }
-keep class expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt { *; }
-keep class app.avocook.timernotifications.** { *; }
`;

      if (fs.existsSync(proguardPath)) {
        let contents = fs.readFileSync(proguardPath, "utf-8");
        if (!contents.includes("-keep class expo.modules.kotlin.runtime.MainRuntime")) {
          // Replace old dontwarn rules if they exist
          contents = contents.replace(
            /# Added by withProguardRules[\s\S]*?(?=-keep|-dontwarn|$)/g, 
            ""
          );
          // Remove specific dontwarns if they were already added
          contents = contents.replace(/-dontwarn expo\.modules\.kotlin\..*\n/g, "");
          contents += rulesToAdd;
          fs.writeFileSync(proguardPath, contents);
        }
      }

      return config;
    },
  ]);
}

module.exports = withProguardRules;
