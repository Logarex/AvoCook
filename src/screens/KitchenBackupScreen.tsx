import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import { useKitchen } from "../features/kitchen/KitchenProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  createRecipeBackup,
  parseRecipeBackup,
  type RecipeBackup,
} from "../features/recipes/recipeBackup";
import {
  parseKitchenData,
  type KitchenData,
} from "../features/kitchen/kitchen";
import { remapKitchenBackup } from "../features/kitchen/kitchenBackup";
export function KitchenBackupScreen() {
  const { t } = useTranslation();
  const kitchen = useKitchen();
  const recipeStore = useRecipes();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    uri: string;
    backup: RecipeBackup;
    data: KitchenData;
  } | null>(null);
  const [previous, setPrevious] = useState<KitchenData | null>(null);
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
            const result = await createRecipeBackup({
              recipes: recipeStore.recipes,
              customCategories: recipeStore.customCategories,
              favoriteCategories: recipeStore.favoriteCategories,
              source: "local",
              client: null,
            });
            const serialized = JSON.stringify({
              ...result.backup,
              kitchen: kitchen.data,
            });
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
            const text = await file.text();
            const raw: unknown = JSON.parse(text);
            if (!raw || typeof raw !== "object" || !("kitchen" in raw))
              throw new Error("Not a kitchen backup");
            const data = parseKitchenData(raw.kitchen);
            setPending({
              uri: file.uri,
              backup: parseRecipeBackup(text),
              data,
            });
          });
        }}
      />
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
