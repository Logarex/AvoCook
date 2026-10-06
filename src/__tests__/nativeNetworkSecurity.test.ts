import {
  compileModsAsync,
  withInfoPlist,
  type ConfigPlugin
} from "@expo/config-plugins";
import type { ExpoConfig } from "@expo/config-types";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const withAndroidNetworkSecurity = require(
  "../../tools/plugins/withAndroidNetworkSecurity"
) as ConfigPlugin;
const appConfig = require("../../app.json") as { expo: ExpoConfig };
const temporaryProjects: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryProjects.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

async function createTemporaryProject() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "avocook-network-security-"));
  temporaryProjects.push(projectRoot);
  return projectRoot;
}

describe("native HTTP support", () => {
  it("generates an Android manifest linked to a config allowing HTTP and retaining certificate trust", async () => {
    const projectRoot = await createTemporaryProject();
    const mainDirectory = path.join(projectRoot, "android/app/src/main");
    await mkdir(mainDirectory, { recursive: true });
    await writeFile(path.join(mainDirectory, "AndroidManifest.xml"), `
      <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.avocook.mobile">
        <application android:name=".MainApplication" />
      </manifest>
    `);

    await compileModsAsync(
      withAndroidNetworkSecurity({ name: "AvoCook", slug: "avocook" }),
      { projectRoot, platforms: ["android"] }
    );

    const manifest = await readFile(
      path.join(mainDirectory, "AndroidManifest.xml"), "utf8"
    );
    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
    const networkSecurity = await readFile(
      path.join(mainDirectory, "res/xml/network_security_config.xml"), "utf8"
    );
    expect(networkSecurity).toContain('cleartextTrafficPermitted="true"');
    expect(networkSecurity).toContain('<certificates src="system" />');
    expect(networkSecurity).toContain('<certificates src="user" />');
  });

  it("generates iOS ATS settings that allow user-supplied HTTP hosts without a conflicting local-only override", async () => {
    const projectRoot = await createTemporaryProject();
    const config = withInfoPlist(
      {
        name: "AvoCook",
        slug: "avocook",
        ios: { infoPlist: appConfig.expo.ios?.infoPlist }
      },
      (nextConfig) => nextConfig
    );
    const compiled = await compileModsAsync(config, {
      projectRoot,
      platforms: ["ios"],
      introspect: true,
      ignoreExistingNativeFiles: true
    });

    // NSAllowsLocalNetworking would cause iOS to ignore NSAllowsArbitraryLoads.
    expect(compiled.ios?.infoPlist?.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: true
    });
    expect(compiled.ios?.infoPlist?.NSLocalNetworkUsageDescription).toBeTruthy();
  });
});
