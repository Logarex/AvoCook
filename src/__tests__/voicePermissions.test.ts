import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("generated voice permissions", () => {
  it("keeps microphone access after all Expo plugins and supplies every iOS translation", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const config = JSON.parse(execFileSync(process.execPath, [
      path.join(root, "node_modules/expo/bin/cli"), "config", "--type", "introspect", "--json",
    ], { cwd: root, encoding: "utf8" }));
    const ios = config._internal.modResults.ios.infoPlist;
    for (const key of ["NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription"]) {
      expect(ios[key]).toEqual(expect.any(String));
      expect(ios[key].trim().length).toBeGreaterThan(20);
      expect(Object.keys(config.locales).sort()).toEqual(["da", "de", "en", "es", "fr", "it"]);
      for (const file of Object.values(config.locales) as string[]) {
        const localized = JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
        expect(localized[key]?.trim().length).toBeGreaterThan(20);
      }
    }
    const permissions = config._internal.modResults.android.manifest.manifest["uses-permission"];
    expect(permissions.filter((permission: { $: Record<string, string> }) =>
      permission.$["android:name"] === "android.permission.RECORD_AUDIO",
    )).toEqual([{ $: { "android:name": "android.permission.RECORD_AUDIO" } }]);
  }, 30000);
});
