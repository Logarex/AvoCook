import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { createDiagnosticsReport } from "./appLogger";

export async function shareDiagnosticsReport({
  anonymize
}: {
  anonymize: boolean;
}) {
  const text = await createDiagnosticsReport({ anonymize });
  const directory = new Directory(Paths.cache, "avocook-diagnostics");
  directory.create({ idempotent: true, intermediates: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File(
    directory,
    `avocook-logs-${anonymize ? "anonymized" : "raw"}-${timestamp}.txt`
  );

  if (file.exists) {
    file.delete();
  }

  file.create({ intermediates: true });
  file.write(text);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      UTI: "public.plain-text",
      dialogTitle: "AvoCook diagnostics",
      mimeType: "text/plain"
    });
  }

  return file.uri;
}
