import { useFocusEffect } from "@react-navigation/native";
import { BookOpen, Check, ChevronDown, ListChecks, Pencil, Plus, RefreshCw, Repeat, Share2, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, FlatList, Pressable, RefreshControl, Share, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ShoppingModeButton } from "../components/ShoppingModeButton";
import { TextField } from "../components/TextField";
import { PantryError, type PantryItem } from "../features/pantry/pantryClient";
import { pantryItemLabel, pantryPermissions } from "../features/pantry/pantrySession";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import type { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";
import { PantryItemEditorModal } from "./PantryItemEditorModal";
import { ShoppingModeModal } from "./ShoppingModeModal";
import { ShoppingListShareModal } from "./ShoppingListShareModal";

export function PantryShoppingList({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList, "ShoppingList"> }) {
  const { t } = useTranslation(); const { colors } = useAppTheme();
  const { pantry, mode, items, addItem, toggleItem, removeItem, clearChecked, clearAll, refreshItems, switching } = useShoppingList();
  const [draft, setDraft] = useState(""); const [editing, setEditing] = useState<PantryItem | null>(null);
  const [showModes, setShowModes] = useState(false); const [showSharing, setShowSharing] = useState(false);
  const typing = useRef(false); typing.current = Boolean(draft || editing);
  const selection = pantry?.selection ?? (mode.kind === "pantry" ? mode.selection : null);
  const permissions = pantryPermissions(selection);
  const writable = Boolean(pantry?.fresh && !pantry.busy && !switching);
  const data = pantry?.items ?? [];
  const id = (item: PantryItem) => `pantry-${mode.kind === "pantry" ? mode.selection.house.id : 0}-${item.listId}-${item.id}`;
  async function act(action: () => Promise<unknown>) {
    try { await action(); return true; }
    catch (error) { Alert.alert(t("common.error"), error instanceof PantryError ? t(`pantry.errors.${error.code}`) : t("shoppingModes.editError")); return false; }
  }
  useFocusEffect(useCallback(() => {
    const refresh = () => { if (!typing.current && AppState.currentState === "active") void refreshItems(); };
    refresh(); const timer = setInterval(refresh, 30000);
    const sub = AppState.addEventListener("change", (next) => { if (next === "active") refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refreshItems]));
  const selectedListId = mode.kind === "pantry" ? mode.selection.list.id : null;
  useEffect(() => { setEditing(null); setDraft(""); }, [selectedListId]);
  function deleteItem(item: PantryItem) {
    Alert.alert(t("pantry.deleteTitle"), t("pantry.deleteBody", { name: item.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => { void act(() => removeItem(id(item))); } }
    ]);
  }
  function clear() {
    const checked = data.filter((item) => item.done).length;
    Alert.alert(t("shoppingList.title"), t("pantry.clearBody"), [
      { text: t("common.cancel"), style: "cancel" },
      ...(checked ? [{ text: t("shoppingList.clearChecked"), onPress: () => { void act(clearChecked); } }] : []),
      { text: t("shoppingList.clearAll"), style: "destructive", onPress: () => { void act(clearAll); } }
    ]);
  }
  return <Screen scroll={false}>
    <View style={styles.row}>
      <ShoppingCart color={colors.primary} size={25} />
      <AppText variant="subtitle" style={styles.flex}>{t("shoppingList.title")}</AppText>
      {items.length ? <IconButton icon={Share2} label={t("shoppingList.shareList")} onPress={() => { void act(() => Share.share({ message: items.map((item) => `${item.checked ? "✓" : "•"} ${item.label}`).join("\n") })); }} /> : null}
      {permissions.delete && data.length ? <IconButton icon={Trash2} label={t("common.delete")} tone="danger" disabled={!writable || !data.length} onPress={clear} /> : null}
    </View>
    <View style={[styles.row, styles.modeRow]}>
      <ShoppingModeButton compact onPress={() => setShowModes(true)} />
      <View style={styles.statusRow}>
        <AppText muted variant="caption">{pantry?.busy ? t("common.loading") : pantry?.fresh ? t("pantry.upToDate") : t("pantry.cachedStatus")}</AppText>
        <IconButton style={styles.refreshButton} icon={RefreshCw} label={t("pantry.refresh")} disabled={switching || pantry?.busy} onPress={() => { void refreshItems(); }} />
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t("pantry.chooseActiveList")} disabled={switching}
      onPress={() => navigation.navigate("Pantry")} style={({ pressed }) => [styles.listSelector, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
      <View style={[styles.listBadge, { backgroundColor: colors.chip }]}><ListChecks color={colors.primary} size={22} /></View>
      <View style={styles.flex}><AppText variant="label" style={styles.listTitle}>{selection?.list.name}</AppText><AppText muted variant="caption">{selection?.house.name}</AppText></View>
      <ChevronDown color={colors.textMuted} size={18} />
    </Pressable>
    {selection && !Object.values(permissions).some(Boolean) ? <AppText muted variant="caption">{t("pantry.readOnly")}</AppText> : null}
    {pantry?.error ? <View style={styles.feedback}>
      <AppText accessibilityRole="alert" style={{ color: colors.danger }}>{t(`pantry.errors.${pantry.error}`)}</AppText>
      <AppText muted variant="caption">{t("pantry.cachedBody")}</AppText>
      <PrimaryButton label={t("common.retry")} variant="ghost" disabled={pantry.busy} onPress={() => { void refreshItems(); }} />
    </View> : null}
    {pantry?.cacheWarning ? <AppText muted variant="caption">{t("pantry.cacheWarning")}</AppText> : null}
    {permissions.add ? <View style={[styles.row, { alignItems: "flex-end" }]}>
      <TextField label="" accessibilityLabel={t("shoppingList.manualItemLabel")} containerStyle={styles.flex} value={draft} onChangeText={setDraft} editable={writable}
        placeholder={t("pantry.addPlaceholder")} returnKeyType="done" onSubmitEditing={() => { if (writable && draft.trim()) void act(() => addItem(draft)).then((ok) => { if (ok) setDraft(""); }); }} />
      <IconButton icon={Plus} label={t("shoppingList.addItem")} disabled={!writable || !draft.trim()} onPress={() => { void act(() => addItem(draft)).then((ok) => { if (ok) setDraft(""); }); }} />
    </View> : null}
    {data.length ? <AppText muted variant="caption">{t("shoppingList.remainingCount", { count: data.filter((item) => !item.done).length })}{data.some((item) => item.done) ? ` · ${t("shoppingList.checkedCount", { count: data.filter((item) => item.done).length })}` : ""}</AppText> : null}
    <FlatList data={data} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={Boolean(pantry?.busy)} onRefresh={() => { void refreshItems(); }} tintColor={colors.primary} />}
      ListEmptyComponent={!pantry?.ready || pantry?.busy ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View> : <View style={styles.empty}>
        <View style={[styles.emptyBadge, { backgroundColor: colors.chip }]}><ShoppingBag color={colors.primary} size={30} strokeWidth={1.7} /></View>
        <AppText variant="label" style={styles.emptyTitle}>{t(pantry?.error ? "pantry.emptyCache" : "pantry.emptyList")}</AppText>
        <AppText muted style={styles.emptyBody}>{t(pantry?.error ? "pantry.cachedBody" : "pantry.emptyListBody")}</AppText>
        {!pantry?.error ? <PrimaryButton icon={BookOpen} label={t("pantry.browseRecipes")} variant="ghost" onPress={() => navigation.navigate("Recipes")} /> : null}
      </View>}
      renderItem={({ item }) => <View style={[styles.item, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.border }]}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={pantryItemLabel(item)} accessibilityState={{ checked: item.done, disabled: !writable || !permissions.check }}
          disabled={!writable || !permissions.check} onPress={() => { void act(() => toggleItem(id(item))); }} style={[styles.row, styles.flex, styles.toggle]}>
          <View style={[styles.checkbox, { backgroundColor: item.done ? colors.primary : "transparent", borderColor: item.done ? colors.primary : colors.border }]}>{item.done ? <Check color={colors.textInverted} size={16} /> : null}</View>
          <View style={styles.flex}><AppText variant="label" style={item.done ? styles.checked : undefined}>{pantryItemLabel(item)}</AppText>
            {item.description ? <AppText muted variant="caption" numberOfLines={2}>{item.description}</AppText> : null}
            {item.rrule ? <View style={styles.row}><Repeat size={12} color={colors.textMuted} /><AppText muted variant="caption">{t("pantry.recurring")}</AppText></View> : null}
          </View>
        </Pressable>
        {permissions.edit ? <IconButton icon={Pencil} label={t("shoppingList.editItem")} disabled={!writable} onPress={() => setEditing(item)} /> : null}
        {permissions.delete ? <IconButton icon={Trash2} label={t("shoppingList.deleteItem")} disabled={!writable} tone="danger" onPress={() => deleteItem(item)} /> : null}
      </View>} />
    <BottomNavigation current="shoppingList" onNavigate={(tab) => { if (tab === "recipes") navigation.navigate("Recipes"); else if (tab === "community") navigation.navigate("Community"); }} />
    <PantryItemEditorModal item={editing} onClose={() => setEditing(null)} />
    <ShoppingModeModal visible={showModes} onClose={() => setShowModes(false)} onPantry={() => navigation.navigate("Pantry")} onFirebase={() => setShowSharing(true)} />
    <ShoppingListShareModal visible={showSharing} onClose={() => setShowSharing(false)} />
  </Screen>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", gap: spacing.xs }, feedback: { gap: spacing.xs }, list: { gap: spacing.sm, paddingBottom: spacing.md, flexGrow: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  toggle: { minHeight: 48 }, checkbox: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  checked: { textDecorationLine: "line-through", opacity: 0.5 },
  modeRow: { justifyContent: "space-between", flexWrap: "wrap", gap: spacing.xs }, statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  refreshButton: { width: 36, height: 36 },
  listSelector: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  listBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" }, listTitle: { fontSize: 17, lineHeight: 22 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyBadge: { width: 64, height: 64, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 19, lineHeight: 24, textAlign: "center" }, emptyBody: { textAlign: "center", fontSize: 15, lineHeight: 21 }
});
