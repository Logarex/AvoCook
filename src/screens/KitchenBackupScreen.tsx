import React, { useCallback, useEffect, useState } from "react";
import { Alert, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  parseRecipeBackup,
  type RecipeBackup,
} from "../features/recipes/recipeBackup";
import {
  parseKitchenData,
  type KitchenData,
} from "../features/kitchen/kitchen";
import { remapKitchenBackup } from "../features/kitchen/kitchenBackup";
import {
  isAutoBackupEnabled,
  listAutoBackups,
  loadAutoBackupStatus,
  setAutoBackupEnabled,
  writeAutoBackup,
  type AutoBackupStatus,
  type AutoBackupVersion,
} from "../features/kitchen/autoBackup";
import { serializeKitchenBackup } from "../features/kitchen/useAutomaticBackup";
import {
  setKitchenSyncEnabled,
  syncKitchenNow,
  useKitchenSyncState,
} from "../features/kitchen/useKitchenSync";
import { useAuth } from "../features/auth/AuthProvider";
export function KitchenBackupScreen() {
  const { t, i18n } = useTranslation();
  const kitchen = useKitchen();
  const recipeStore = useRecipes();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    uri: string;
    backup: RecipeBackup;
    data: KitchenData;
  } | null>(null);
  const [previous, setPrevious] = useState<KitchenData | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [status, setStatus] = useState<AutoBackupStatus>({ lastSuccess: null, lastError: null });
  const [versions, setVersions] = useState<AutoBackupVersion[]>([]);
  const { isLocalMode, getClient } = useAuth();
  const syncState = useKitchenSyncState();
  const canSync = !isLocalMode && Boolean(getClient());
  const refreshAuto = useCallback(async () => {
    setAutoEnabled(await isAutoBackupEnabled());
    setStatus(await loadAutoBackupStatus(kitchen.account));
    setVersions(listAutoBackups(kitchen.account));
  }, [kitchen.account]);
  useEffect(() => {
    void refreshAuto();
  }, [refreshAuto]);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  async function review(uri: string, text: string) {
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== "object" || !("kitchen" in raw))
      throw new Error("Not a kitchen backup");
    const data = parseKitchenData(raw.kitchen);
    setPending({ uri, backup: parseRecipeBackup(text), data });
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (!/cancel|dismiss|NO_RECIPE_BACKUP_FILE/i.test(String(error)))
        Alert.alert(t("common.error"), t("kitchen.saveError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <AppText muted>{t("kitchen.backupHelp")}</AppText>
      <PrimaryButton
        label={t("kitchen.exportBackup")}
        disabled={busy}
        onPress={() => {
          void run(async () => {
            const { result, serialized } = await serializeKitchenBackup(
              recipeStore,
              kitchen.data,
            );
            if (await Sharing.isAvailableAsync()) {
              const file = new File(
                Paths.cache,
                `avocook-kitchen-${Date.now()}.json`,
              );
              file.create();
              file.write(serialized);
              await Sharing.shareAsync(file.uri, {
                mimeType: "application/json",
                UTI: "public.json",
              });
            } else {
              const directory = await Directory.pickDirectoryAsync();
              const file = directory.createFile(
                `avocook-kitchen-${Date.now()}.json`,
                "application/json",
              );
              file.write(serialized);
            }
            if (result.skippedImageCount)
              Alert.alert(
                t("kitchen.missingBackupImages", {
                  count: result.skippedImageCount,
                }),
              );
          });
        }}
      />
      <PrimaryButton
        label={t("kitchen.importBackup")}
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void run(async () => {
            const picked = await File.pickFileAsync(
              undefined,
              "application/json",
            );
            const file = Array.isArray(picked) ? picked[0] : picked;
            if (!file) return;
            await review(file.uri, await file.text());
          });
        }}
      />
      {canSync ? (
        <GlassPanel style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AppText variant="label" style={{ flex: 1 }}>
              {t("kitchen.syncTitle")}
            </AppText>
            <Switch
              accessibilityLabel={t("kitchen.syncTitle")}
              value={syncState.enabled}
              onValueChange={(value) => {
                void setKitchenSyncEnabled(kitchen.account, value);
              }}
            />
          </View>
          <AppText muted variant="caption">
            {t("kitchen.syncHelp")}
          </AppText>
          {syncState.enabled ? (
            <>
              <AppText accessibilityLiveRegion="polite">
                {syncState.syncing
                  ? t("kitchen.syncRunning")
                  : syncState.failed
                    ? t("kitchen.syncFailed")
                    : syncState.lastSync
                      ? t("kitchen.syncLast", { date: formatDate(syncState.lastSync) })
                      : t("kitchen.syncNever")}
              </AppText>
              <PrimaryButton
                label={t("kitchen.syncNow")}
                variant="secondary"
                disabled={syncState.syncing}
                onPress={syncKitchenNow}
              />
            </>
          ) : null}
        </GlassPanel>
      ) : null}
      <GlassPanel style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppText variant="label" style={{ flex: 1 }}>
            {t("kitchen.autoBackupTitle")}
          </AppText>
          <Switch
            accessibilityLabel={t("kitchen.autoBackupTitle")}
            value={autoEnabled}
            onValueChange={(value) => {
              setAutoEnabled(value);
              void setAutoBackupEnabled(value);
            }}
          />
        </View>
        <AppText muted variant="caption">
          {t("kitchen.autoBackupHelp")}
        </AppText>
        <AppText accessibilityLiveRegion="polite">
          {status.lastSuccess
            ? t("kitchen.autoBackupLast", { date: formatDate(status.lastSuccess) })
            : t("kitchen.autoBackupNever")}
        </AppText>
        {status.lastError &&
        (!status.lastSuccess || status.lastError > status.lastSuccess) ? (
          <AppText accessibilityRole="alert">
            {t("kitchen.autoBackupFailed", { date: formatDate(status.lastError) })}
          </AppText>
        ) : null}
        <PrimaryButton
          label={t("kitchen.autoBackupNow")}
          variant="secondary"
          disabled={busy}
          onPress={() => {
            void run(async () => {
              const { serialized } = await serializeKitchenBackup(
                recipeStore,
                kitchen.data,
                true,
              );
              await writeAutoBackup(kitchen.account, serialized).finally(refreshAuto);
            });
          }}
        />
        {versions.map((version) => (
          <View key={version.uri} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AppText style={{ flex: 1 }}>
              {`${formatDate(version.createdAt)} · ${Math.max(1, Math.round(version.size / 1024))} KB`}
            </AppText>
            <PrimaryButton
              compact
              variant="ghost"
              label={t("kitchen.autoBackupRestore")}
              disabled={busy}
              onPress={() => {
                void run(async () => {
                  await review(version.uri, await new File(version.uri).text());
                });
              }}
            />
          </View>
        ))}
      </GlassPanel>
      {pending && (
        <GlassPanel style={{ gap: 16 }}>
          <AppText>
            {t("kitchen.restoreReview", {
              recipes: pending.backup.recipes.length,
              meals: pending.data.meals.length,
              stock: pending.data.stock.length,
            })}
          </AppText>
          <AppText muted>{t("kitchen.restoreHelp")}</AppText>
          <PrimaryButton
            label={t("kitchen.restoreKitchen")}
            disabled={busy}
            onPress={() => {
              void run(async () => {
                const result = await recipeStore.importBackupFile(pending.uri);
                const mapped = remapKitchenBackup(
                  pending.data,
                  pending.backup.recipes.map((entry) => entry.recipe),
                  result.recipes,
                );
                const before = kitchen.data;
                await kitchen.update(() => ({
                  ...mapped.data,
                  shoppingGroupId: kitchen.data.shoppingGroupId,
                }));
                setPrevious(before);
                setPending(null);
                Alert.alert(
                  t("kitchen.restored"),
                  mapped.unresolved
                    ? t("kitchen.unresolvedBackup", {
                        count: mapped.unresolved,
                      })
                    : undefined,
                );
              });
            }}
          />
          <PrimaryButton
            label={t("common.cancel")}
            variant="ghost"
            disabled={busy}
            onPress={() => setPending(null)}
          />
        </GlassPanel>
      )}
      {previous && (
        <PrimaryButton
          label={t("kitchen.undoRestore")}
          variant="secondary"
          disabled={busy}
          onPress={() => {
            void run(async () => {
              await kitchen.update(() => previous);
              setPrevious(null);
            });
          }}
        />
      )}
    </View>
  );
}
