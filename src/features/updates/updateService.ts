import Constants from "expo-constants";

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  releaseUrl: string;
  apkUrl: string | null;
}

function isNewerVersion(current: string, latest: string): boolean {
  const cleanCurrent = current.replace(/^v/i, "").trim();
  const cleanLatest = latest.replace(/^v/i, "").trim();

  const currentParts = cleanCurrent.split(".").map((x) => parseInt(x, 10) || 0);
  const latestParts = cleanLatest.split(".").map((x) => parseInt(x, 10) || 0);

  const length = Math.max(currentParts.length, latestParts.length);
  for (let i = 0; i < length; i++) {
    const currentPart = currentParts[i] ?? 0;
    const latestPart = latestParts[i] ?? 0;
    if (latestPart > currentPart) {
      return true;
    }
    if (currentPart > latestPart) {
      return false;
    }
  }
  return false;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  const currentVersion = Constants.expoConfig?.version ?? "0.1.0";
  try {
    const response = await fetch(
      "https://api.github.com/repos/Logarex/AvoCook/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "AvoCook-Mobile"
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const latestVersion = data.tag_name;

    if (!latestVersion) {
      return null;
    }

    const updateAvailable = isNewerVersion(currentVersion, latestVersion);
    const releaseUrl = data.html_url;

    let apkUrl: string | null = null;
    if (data.assets && Array.isArray(data.assets)) {
      const apkAsset = data.assets.find(
        (asset: any) =>
          asset.name && asset.name.toLowerCase().endsWith(".apk")
      );
      if (apkAsset) {
        apkUrl = apkAsset.browser_download_url;
      }
    }

    return {
      updateAvailable,
      latestVersion,
      releaseUrl,
      apkUrl
    };
  } catch (error) {
    console.warn("Failed to check for updates:", error);
    return null;
  }
}
