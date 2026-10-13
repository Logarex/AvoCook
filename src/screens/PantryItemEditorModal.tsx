import { Check, ChevronDown, ChevronUp, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import { PantryClient, type PantryCategory, type PantryItem, type PantryItemPatch } from "../features/pantry/pantryClient";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { getScreenBottomPadding } from "../utils/safeArea";

export function PantryItemEditorModal({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  return item ? <Editor key={item.id} item={item} onClose={onClose} /> : null;
}
function Editor({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const { t } = useTranslation(); const { colors } = useAppTheme(); const insets = useSafeAreaInsets();
  const { credentials } = useAuth(); const { mode, pantry, moveItem, updatePantryItem } = useShoppingList();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [categoryId, setCategoryId] = useState(item.categoryId ?? 0);
  const [recurrence, setRecurrence] = useState(item.rrule ?? "");
  const [deleteOnDone, setDeleteOnDone] = useState(item.deleteOnDone ?? false);
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(false);
  useEffect(() => {
    if (!credentials || mode.kind !== "pantry") return;
    let active = true;
    const client = new PantryClient(credentials);
    void client.categories(mode.selection.house.id).then((categories) => {
      if (active) setCategories(categories.filter((category) => !category.listId || category.listId === item.listId));
    }).catch(() => undefined);
    return () => { active = false; client.dispose(); };
  }, [credentials, mode, item.listId]);
  const index = pantry?.items.findIndex((current) => current.id === item.id) ?? -1;
  async function reorder(direction: -1 | 1) {
    if (saving || mode.kind !== "pantry") return;
    setSaving(true); setError(false);
    try { await moveItem(`pantry-${mode.selection.house.id}-${item.listId}-${item.id}`, direction); }
    catch { setError(true); } finally { setSaving(false); }
  }
  async function save() {
    if (saving || !name.trim()) return;
    setSaving(true); setError(false);
    const patch: PantryItemPatch = {};
    // A narrow patch preserves images, prices, custom fields, stores and labels.
    if (name.trim() !== item.name) patch.name = name.trim();
    if (quantity !== (item.quantity ?? "")) patch.quantity = quantity;
    if (description !== (item.description ?? "")) patch.description = description;
    if (categoryId !== (item.categoryId ?? 0)) patch.categoryId = categoryId;
    if (recurrence !== (item.rrule ?? "")) patch.rrule = recurrence;
    if (deleteOnDone !== (item.deleteOnDone ?? false)) patch.deleteOnDone = deleteOnDone;
    try { if (Object.keys(patch).length) await updatePantryItem(item, patch); onClose(); }
    catch { setError(true); } finally { setSaving(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
    <View style={styles.root}>
      <Pressable style={styles.scrim} onPress={onClose} disabled={saving} accessibilityLabel={t("common.close")} accessibilityRole="button" />
      <GlassPanel style={[styles.panel, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}>
        <View style={styles.row}><AppText variant="subtitle" style={styles.flex}>{t("shoppingList.editItem")}</AppText><IconButton icon={X} label={t("common.close")} disabled={saving} onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
          <TextField label={t("shoppingList.manualItemLabel")} value={name} onChangeText={setName} editable={!saving} />
          <TextField label={t("pantry.quantity")} value={quantity} onChangeText={setQuantity} editable={!saving} placeholder={t("pantry.quantityPlaceholder")} />
          <TextField label={t("pantry.description")} value={description} onChangeText={setDescription} editable={!saving} multiline />
          {categories.length ? <>
            <AppText variant="label">{t("pantry.category")}</AppText>
            <View style={styles.chips}>
              {[{ id: 0, name: t("pantry.noCategory") }, ...categories].map((category) => <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked: categoryId === category.id }} disabled={saving}
                onPress={() => setCategoryId(category.id)} style={[styles.chip, { backgroundColor: categoryId === category.id ? colors.chip : colors.input, borderColor: categoryId === category.id ? colors.primary : colors.border }]}>
                <AppText variant="caption">{category.name}</AppText>
              </Pressable>)}
            </View>
          </> : null}
          <AppText variant="label">{t("pantry.recurrence")}</AppText>
          <View style={styles.chips}>
            {[{ value: "", key: "never" }, { value: "FREQ=DAILY", key: "daily" }, { value: "FREQ=WEEKLY", key: "weekly" }, { value: "FREQ=MONTHLY", key: "monthly" }].map(({ value, key }) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: recurrence === value }} disabled={saving} onPress={() => setRecurrence(value)}
              style={[styles.chip, { backgroundColor: recurrence === value ? colors.chip : colors.input, borderColor: recurrence === value ? colors.primary : colors.border }]}><AppText variant="caption">{t(`pantry.${key}`)}</AppText></Pressable>)}
          </View>
          {recurrence && !["FREQ=DAILY", "FREQ=WEEKLY", "FREQ=MONTHLY"].includes(recurrence) ? <AppText muted variant="caption">{t("pantry.customRecurrence")}</AppText> : null}
          <View style={styles.row}><AppText style={styles.flex}>{t("pantry.deleteOnDone")}</AppText><Switch value={deleteOnDone} onValueChange={setDeleteOnDone} disabled={saving} accessibilityLabel={t("pantry.deleteOnDone")} /></View>
          <View style={styles.row}>
            <PrimaryButton style={styles.flex} numberOfLines={2} icon={ChevronUp} label={t("shoppingList.moveItemUp")} variant="ghost" disabled={saving || index <= 0} onPress={() => { void reorder(-1); }} />
            <PrimaryButton style={styles.flex} numberOfLines={2} icon={ChevronDown} label={t("shoppingList.moveItemDown")} variant="ghost" disabled={saving || index < 0 || index >= (pantry?.items.length ?? 0) - 1} onPress={() => { void reorder(1); }} />
          </View>
          {error ? <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t("shoppingModes.editError")}</AppText> : null}
          <PrimaryButton icon={Check} label={t("common.save")} disabled={saving || !name.trim()} onPress={() => { void save(); }} />
        </ScrollView>
      </GlassPanel>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { maxHeight: "92%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: spacing.md },
  flex: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, fields: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1 }
});
