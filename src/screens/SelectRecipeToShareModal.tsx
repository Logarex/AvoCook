import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View, FlatList, Alert, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { TextField } from "../components/TextField";
import { getScreenBottomPadding } from "../utils/safeArea";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { useRecipes } from "../features/recipes/RecipesProvider";
import {
  submitCommunityRecipe,
  updateCommunityRecipe,
  findUserCommunityRecipe,
  checkCommunityRecipeDuplicate,
  sanitizeIsoDuration,
  isRemoteUrl,
  type RecipeLanguage
} from "../features/community/communityClient";
import { usePreferences } from "../features/preferences/PreferencesProvider";
import { getAnonymousUid } from "../features/firebase/firebaseClient";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function SelectRecipeToShareModal({
  visible,
  onClose,
  onSuccess
}: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { recipes } = useRecipes();
  const { communityPseudonym, setCommunityPseudonym } = usePreferences();

  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localPseudonym, setLocalPseudonym] = useState(communityPseudonym || "");

  const filteredRecipes = React.useMemo(() => {
    return recipes.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, searchQuery]);

  const handleSelectRecipe = React.useCallback((recipe: typeof recipes[number]) => {
    const language = (i18n.language.slice(0, 2) as RecipeLanguage) || "en";
    Alert.alert(
      t("community.shareConfirmTitle"),
      t("community.shareConfirmBody") + `\n\n${recipe.name}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.share"),
          onPress: () => {
            void (async () => {
              setSubmitting(true);
            try {
              const finalPseudonym = localPseudonym.trim() || t("community.anonymousAuthor");
              if (!communityPseudonym && localPseudonym.trim()) {
                await setCommunityPseudonym(localPseudonym.trim());
              }
              
              const uid = getAnonymousUid();

              // Check if user already published a recipe with this title
              const existingId = uid
                ? await findUserCommunityRecipe(uid, recipe.name)
                : null;

              const payload = {
                title: recipe.name || "",
                description: recipe.description || "",
                ingredients: recipe.recipeIngredient || [],
                steps: recipe.recipeInstructions || [],
                language,
                authorName: finalPseudonym,
                // Sanitize durations: null out zero/empty ISO durations
                prepTime: sanitizeIsoDuration(recipe.prepTime),
                cookTime: sanitizeIsoDuration(recipe.cookTime),
                servings: recipe.recipeYield ? Number(recipe.recipeYield) : null,
                nutriScore: (recipe.localMeta?.nutriScoreOverride && recipe.localMeta.nutriScoreOverride !== "?") ? recipe.localMeta.nutriScoreOverride as "A" | "B" | "C" | "D" | "E" : null,
                ...(recipe.url ? { sourceUrl: recipe.url } : {}),
                ...((() => {
                  // Only include remote http(s) URLs as imageUrl — never local file:// paths
                  const rawImg = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
                  const remoteUrl = isRemoteUrl(rawImg) ? rawImg
                    : isRemoteUrl(recipe.imageUrl) ? recipe.imageUrl
                    : null;
                  return remoteUrl ? { imageUrl: remoteUrl } : {};
                })()),
              };

              if (existingId) {
                // Ask whether to update or create new
                setSubmitting(false);
                Alert.alert(
                  t("community.updateOrNewTitle"),
                  t("community.updateOrNewBody"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("community.updateExisting"),
                      onPress: () => void (async () => {
                        setSubmitting(true);
                        try {
                          await updateCommunityRecipe(existingId, payload, uid!);
                          Alert.alert(t("community.updateSuccessTitle"), t("community.updateSuccessBody"));
                          if (onSuccess) onSuccess(); else onClose();
                        } catch (err) {
                          console.warn("community", "Update recipe failed", err);
                          Alert.alert(t("common.error"), t("community.submitFailedBody"));
                        } finally {
                          setSubmitting(false);
                        }
                      })()
                    },
                    {
                      text: t("community.publishAsNew"),
                      onPress: () => void (async () => {
                        setSubmitting(true);
                        try {
                          await submitCommunityRecipe(payload);
                          Alert.alert(t("community.submitSuccessTitle"), t("community.submitSuccessBody", { defaultValue: "Merci pour votre contribution ! La recette est en ligne." }));
                          if (onSuccess) onSuccess(); else onClose();
                        } catch (err) {
                          console.warn("community", "Submit recipe failed", err);
                          Alert.alert(t("common.error"), t("community.submitFailedBody"));
                        } finally {
                          setSubmitting(false);
                        }
                      })()
                    }
                  ]
                );
                return;
              }

              // Check global duplicate (same title + same steps from any user)
              const isDuplicate = await checkCommunityRecipeDuplicate(
                recipe.name,
                finalPseudonym,
                recipe.recipeInstructions || [],
                uid
              );
              if (isDuplicate) {
                Alert.alert(t("community.duplicateTitle"), t("community.duplicateBody"));
                setSubmitting(false);
                return;
              }

              await submitCommunityRecipe(payload);
              Alert.alert(
                t("community.submitSuccessTitle"),
                t("community.submitSuccessBody", { defaultValue: "Merci pour votre contribution ! La recette est en ligne." })
              );
              if (onSuccess) {
                onSuccess();
              } else {
                onClose();
              }
            } catch (err) {
              console.warn("community", "Submit recipe failed", err);
              Alert.alert(t("common.error"), t("community.submitFailedBody"));
            } finally {
              setSubmitting(false);
            }
            })();
          }
        }
      ]
    );
  }, [t, localPseudonym, communityPseudonym, setCommunityPseudonym, i18n.language, onSuccess, onClose]);

  React.useEffect(() => {
    if (visible) {
      setLocalPseudonym(communityPseudonym || "");
    }
  }, [visible, communityPseudonym]);

  const renderItem = React.useCallback(({ item }: { item: typeof recipes[number] }) => (
    <Pressable
      onPress={() => handleSelectRecipe(item)}
      disabled={submitting}
      style={({ pressed }) => [
        styles.recipeItem,
        {
          backgroundColor: pressed ? colors.chip : "transparent",
          borderColor: colors.border
        }
      ]}
    >
      <AppText variant="label" numberOfLines={1} adjustsFontSizeToFit={false}>{item.name}</AppText>
    </Pressable>
  ), [handleSelectRecipe, submitting, colors]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalScrim}
          disabled={submitting}
        />
        <GlassPanel
          style={[
            styles.panel,
            { paddingBottom: getScreenBottomPadding(insets.bottom) }
          ]}
        >
          <View style={styles.header}>
            <AppText variant="subtitle" numberOfLines={1}>
              {t("community.selectRecipeToShare", { defaultValue: "Partager une recette" })}
            </AppText>
            <IconButton icon={X} label={t("common.close")} onPress={onClose} disabled={submitting} />
          </View>

          <TextField
            label=""
            placeholder={t("common.search")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.search}
            editable={!submitting}
          />

          {!communityPseudonym ? (
            <View style={styles.pseudoContainer}>
              <AppText muted variant="caption">
                {t("settings.communityPseudonymHint")}
              </AppText>
              <TextField
                label={t("settings.communityPseudonym")}
                placeholder={t("settings.communityPseudonymPlaceholder")}
                value={localPseudonym}
                onChangeText={setLocalPseudonym}
                editable={!submitting}
              />
            </View>
          ) : null}

          {submitting ? (
             <View style={styles.loading}>
               <ActivityIndicator color={colors.primary} size="large" />
             </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id ?? ""}
              contentContainerStyle={styles.listContent}
              style={{ maxHeight: 400 }}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              renderItem={renderItem}
              ListEmptyComponent={
                <AppText muted style={styles.emptyText}>
                  {t("recipes.emptyTitle")}
                </AppText>
              }
            />
          )}
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)"
  },
  panel: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: "80%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  search: {
    marginBottom: spacing.xs
  },
  pseudoContainer: {
    marginBottom: spacing.sm,
    gap: spacing.xs
  },
  listContent: {
    paddingBottom: spacing.md
  },
  recipeItem: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  emptyText: {
    textAlign: "center",
    padding: spacing.xl
  },
  loading: {
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center"
  }
});
