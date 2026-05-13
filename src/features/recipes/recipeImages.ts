import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

const IMAGE_DIR = new Directory(Paths.document, "recipe-images");

export async function persistRecipeImage(uri: string): Promise<string> {
  if (!uri) {
    return uri;
  }

  if (uri.startsWith(IMAGE_DIR.uri)) {
    return uri;
  }

  IMAGE_DIR.create({ idempotent: true, intermediates: true });
  const extension = getImageExtension(uri);
  const filename = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${uri}-${Date.now()}`
  );
  const destination = new File(IMAGE_DIR, `${filename}.${extension}`);

  if (/^https?:\/\//i.test(uri)) {
    const file = await File.downloadFileAsync(uri, destination, {
      idempotent: true
    });
    return file.uri;
  }

  new File(uri).copy(destination);
  return destination.uri;
}

function getImageExtension(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const extension = withoutQuery.split(".").pop()?.toLowerCase();
  if (extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}
