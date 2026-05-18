const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod
} = require("@expo/config-plugins");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function withAndroidNetworkSecurity(config) {
  config = withAndroidManifest(config, (nextConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      nextConfig.modResults
    );
    application.$["android:networkSecurityConfig"] =
      "@xml/network_security_config";
    return nextConfig;
  });

  return withDangerousMod(config, [
    "android",
    async (nextConfig) => {
      const xmlDir = path.join(
        nextConfig.modRequest.platformProjectRoot,
        "app/src/main/res/xml"
      );
      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(xmlDir, "network_security_config.xml"),
        NETWORK_SECURITY_XML
      );
      return nextConfig;
    }
  ]);
}

module.exports = withAndroidNetworkSecurity;
