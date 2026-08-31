import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Share as ShareIcon,
  ShoppingCart,
  Trash2,
  Users,
  X
} from "lucide-react-native";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { EmptyState } from "../components/EmptyState";
import { GlassPanel } from "../components/GlassPanel";
import { IconButton } from "../components/IconButton";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { ShoppingListActionsModal } from "./ShoppingListActionsModal";
import { ShoppingListShareModal } from "./ShoppingListShareModal";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { registerReminderMappings } from "../features/shopping/remindersSync";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ShoppingList">;

export function ShoppingListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const {
    addIngredients,
    addItem,
    clearAll,
    clearChecked,
    items,
    loading,
    moveItem,
    removeItem,
    toggleItem,
    updateItem,
    sync,
    sharedList
  } = useShoppingList();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<ShoppingListItem>>(null);
  const remainingCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items]
  );
  const checkedCount = items.length - remainingCount;

  // Track whether we came from background to trigger a pull
  const wasInBackground = useRef(false);

  // Keep a stable ref of items for use inside callbacks
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);



  // ── Pull helper ───────────────────────────────────────────────────────────────
  //
  // Key design: pullFromSystem is stored in a ref so that doPull never depends
  // on the `sync` object (which changes on every render). This prevents
  // useFocusEffect from re-firing on every render, which would create a
  // tight loop of pull → state update → re-render → pull → ...
  const pullFromSystemRef = useRef(sync.pullFromSystem);
  useEffect(() => {
    pullFromSystemRef.current = sync.pullFromSystem;
  }, [sync.pullFromSystem]);

  const doPull = useCallback(async () => {
    const result = await pullFromSystemRef.current(itemsRef.current);
    if (!result) return;

    // Apply updates to existing items (user changed them in Rappels)
    for (const item of result.updatedItems) {
      const original = itemsRef.current.find((i) => i.id === item.id);
      if (!original) continue;
      if (original.checked !== item.checked) await toggleItem(item.id, { skipSync: true });
      if (original.label !== item.label) await updateItem(item.id, item.label, { skipSync: true });
    }

    // Add items that were created directly in the Rappels app
    if (result.newReminderItems.length > 0) {
      const addResult = await addIngredients(
        result.newReminderItems.map((r) => r.label),
        {},
        { allowDuplicates: true, skipSync: true }
      );
      // Register the reminderId ↔ avocookId mapping so the next push
      // updates (not re-creates) these reminders.
      const mappings = result.newReminderItems
        .map((r, idx) => {
          const added = addResult.added[idx];
          return added ? { avocookId: added.id, reminderId: r.reminderId } : null;
        })
        .filter((m): m is { avocookId: string; reminderId: string } => m !== null);
      if (mappings.length > 0) await registerReminderMappings(mappings);

      // If any of the new reminders were already completed, mark them checked in AvoCook
      for (let i = 0; i < result.newReminderItems.length; i++) {
        const added = addResult.added[i];
        const r = result.newReminderItems[i];
        if (added && r.checked) {
          await toggleItem(added.id, { skipSync: true });
        }
      }
    }

    // Remove items that were deleted in Rappels
    if (result.deletedItemIds.length > 0) {
      for (const id of result.deletedItemIds) {
        await removeItem(id, { skipSync: true });
      }
    }
  }, [toggleItem, updateItem, addIngredients, removeItem]); // ← no `sync` dependency: stable!

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await doPull();
    setRefreshing(false);
  }, [doPull]);

  // ── AppState listener: pull on app foreground ───────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        wasInBackground.current = true;
      } else if (next === "active" && wasInBackground.current) {
        wasInBackground.current = false;
        void doPull();
      }
    });
    return () => sub.remove();
  }, [doPull]);

  // ── Focus pull: pull when screen gains focus ────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      void doPull();
    }, [doPull])
  );

  // ── Handlers: compute next state before push for correct timing ──────────────
  //
  // React state (and itemsRef) updates AFTER the current render cycle.
  // By computing the expected next state locally, we can push immediately
  // with accurate data — no stale reads, no need to wait for a re-render.
  const handleToggleItem = useCallback(async (id: string) => {
    await toggleItem(id);
  }, [toggleItem]);
  const handleRemoveItem = useCallback(async (id: string) => {
    await removeItem(id);
  }, [removeItem]);
  const handleUpdateItem = useCallback(async (id: string, label: string) => {
    await updateItem(id, label);
  }, [updateItem]);

  const handleStartEditing = useCallback((id: string) => {
    setEditingItemId(id);
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingItemId(null);
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    void moveItem(id, -1);
  }, [moveItem]);

  const handleMoveDown = useCallback((id: string) => {
    void moveItem(id, 1);
  }, [moveItem]);

  async function handleAddItem() {
    const label = newItem.trim();
    if (!label) return;
    const result = await addItem(label);
    if (result.added.length) {
      setNewItem("");
    }
  }

  function handleDeleteOptions() {
    if (items.length === 0) return;
    setShowActionsMenu(true);
  }

  async function handleShare() {
    if (items.length === 0) {
      return;
    }

    const remaining = items.filter((i) => !i.checked);
    const checked = items.filter((i) => i.checked);

    let message = t("shoppingList.title") + "\n\n";

    if (remaining.length > 0) {
      message += remaining.map((i) => `• ${i.label}${i.recipeName ? ` (${i.recipeName})` : ''}`).join("\n");
      message += "\n\n";
    }

    if (checked.length > 0) {
      message += checked.map((i) => `✓ ${i.label}${i.recipeName ? ` (${i.recipeName})` : ''}`).join("\n");
      message += "\n";
    }

    try {
      await Share.share({
        message: message.trim()
      });
    } catch (error) {
      console.error("Error sharing shopping list:", error);
    }
  }

  const renderItem = useCallback(({ item, index }: { item: ShoppingListItem; index: number }) => (
    <MemoizedShoppingListRow
      canMoveDown={index < items.length - 1}
      canMoveUp={index > 0}
      editing={editingItemId === item.id}
      item={item}
      onMoveDown={handleMoveDown}
      onMoveUp={handleMoveUp}
      onRemove={handleRemoveItem}
      onStartEditing={handleStartEditing}
      onStopEditing={handleStopEditing}
      onToggle={handleToggleItem}
      onUpdate={handleUpdateItem}
    />
  ), [editingItemId, items.length, handleMoveDown, handleMoveUp, handleRemoveItem, handleStartEditing, handleStopEditing, handleToggleItem, handleUpdateItem]);

  return (
    <PageSwipeGesture onSwipeRight={() => navigation.navigate("Community", { tabTransition: "slide_from_left" })}>
      <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <ShoppingCart color={colors.primary} size={25} strokeWidth={2.5} />
            <AppText variant="title" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {t("shoppingList.title")}
            </AppText>
          </View>
          {sync.available || sharedList.active ? (
            <ConnectionStatus
              connected={sharedList.active || (Platform.OS === 'ios' && sync.linked)}
              label={
                sharedList.active || (Platform.OS === 'ios' && sync.linked)
                  ? t("shoppingList.syncActiveInfo")
                  : t("shoppingList.syncEnable")
              }
              loading={sync.syncing}
            />
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon={Users}
            label={t("shoppingList.sharedTitle")}
            onPress={() => setShowShareModal(true)}
            tone={sharedList.active ? "primary" : "default"}
            style={[
              styles.headerIcon,
              sharedList.active
                ? {
                    backgroundColor: colors.chip,
                    borderColor: colors.primary
                  }
                : null
            ]}
          />

          <IconButton
            disabled={!items.length}
            icon={ShareIcon}
            label={t("shoppingList.shareList")}
            onPress={() => void handleShare()}
            style={styles.headerIcon}
          />
          <IconButton
            disabled={!items.length}
            icon={Trash2}
            label={t("common.delete")}
            onPress={handleDeleteOptions}
            tone="danger"
            style={styles.headerIcon}
          />
        </View>
      </View>


      {sync.available && !sync.linked && !sync.dismissed ? (
        <GlassPanel style={styles.syncBanner}>
          <View style={styles.syncBannerHeader}>
            <View style={styles.syncBannerText}>
              <AppText variant="label">{t("shoppingList.syncBannerTitle")}</AppText>
              <AppText muted variant="caption" style={styles.syncBannerBody}>
                {t("shoppingList.syncBannerBody")}
              </AppText>
            </View>
            <IconButton
              icon={X}
              onPress={() => void sync.dismissSyncBanner()}
              style={styles.syncBannerDismiss}
              label={t("common.cancel")}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void sync.enableSync(itemsRef.current)}
            style={({ pressed }) => [
              styles.syncBannerButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Bell color="#fff" size={14} strokeWidth={2.5} />
            <AppText style={styles.syncBannerButtonText}>
              {t("shoppingList.syncEnable")}
            </AppText>
          </Pressable>
        </GlassPanel>
      ) : null}

      <View style={styles.addRow}>
        <TextField
          containerStyle={styles.addField}
          label={t("shoppingList.manualItemLabel")}
          onChangeText={setNewItem}
          onSubmitEditing={() => void handleAddItem()}
          placeholder={t("shoppingList.itemPlaceholder")}
          returnKeyType="done"
          value={newItem}
          autoCorrect={false}
        />
        <IconButton
          disabled={!newItem.trim()}
          icon={Plus}
          label={t("shoppingList.addItem")}
          onPress={() => void handleAddItem()}
          tone="primary"
          style={styles.addButton}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginHorizontal: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceGlass, borderRadius: radius.md, flexWrap: "wrap" }}>
            <AppText muted variant="caption" style={{ fontWeight: "600" }}>
              {t("shoppingList.remainingCount", { count: remainingCount })}
              {checkedCount > 0
                ? ` • ${t("shoppingList.checkedCount", { count: checkedCount })}`
                : ""}
            </AppText>
            {sharedList.active && sharedList.participantCount ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.chip, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm }}>
                <Users color={colors.primary} size={13} strokeWidth={2.5} />
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: "600" }}>
                  {t("shoppingList.participantCount", { count: sharedList.participantCount })}
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={7}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={true}
              ListEmptyComponent={
                <EmptyState
                  title={t("shoppingList.emptyTitle")}
                  body={t("shoppingList.emptyBody")}
                />
              }
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                sync.linked ? (
                  <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />
                ) : undefined
              }
            />

          </View>
        </>
      )}

      <BottomNavigation
        current="shoppingList"
        onNavigate={(tab) => {
          if (tab === "recipes") {
            navigation.navigate("Recipes", { tabTransition: "slide_from_left" });
          } else if (tab === "community") {
            navigation.navigate("Community", { tabTransition: "slide_from_left" });
          }
        }}
      />
      
      <ShoppingListActionsModal
        visible={showActionsMenu}
        onClose={() => setShowActionsMenu(false)}
        checkedCount={checkedCount}
        onClearChecked={() => void clearChecked()}
        onClearAll={() => void clearAll()}
      />
      <ShoppingListShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      </Screen>
    </PageSwipeGesture>
  );
}

function ShoppingListRow({
  canMoveDown,
  canMoveUp,
  editing,
  item,
  onMoveDown,
  onMoveUp,
  onRemove,
  onStartEditing,
  onStopEditing,
  onToggle,
  onUpdate
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  editing: boolean;
  item: ShoppingListItem;
  onMoveDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onRemove: (id: string) => Promise<void> | void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onToggle: (id: string) => Promise<void> | void;
  onUpdate: (id: string, label: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [draftLabel, setDraftLabel] = useState(item.label);
  const inputRef = React.useRef<TextInput>(null);


  React.useEffect(() => {
    setDraftLabel(item.label);
  }, [item.label]);

  function commitLabel() {
    const label = draftLabel.trim();
    if (!label) {
      setDraftLabel(item.label);
      onStopEditing();
      return;
    }
    if (label !== item.label) {
      void onUpdate(item.id, label);
    }
    onStopEditing();
  }

  function cancelEdit() {
    setDraftLabel(item.label);
    onStopEditing();
  }

  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor: colors.surfaceGlassStrong,
          borderColor: colors.border
        }
      ]}
    >
        <Pressable
          accessibilityLabel={item.label}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          disabled={editing}
          onPress={() => void onToggle(item.id)}
          style={({ pressed }) => [
            styles.itemToggle,
            { opacity: editing ? 0.5 : pressed ? 0.72 : 1 }
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: item.checked ? colors.primary : "transparent",
                borderColor: item.checked ? colors.primary : colors.border
              }
            ]}
          >
            {item.checked ? (
              <Check color={colors.textInverted} size={15} strokeWidth={3} />
            ) : null}
          </View>
        </Pressable>
      <View style={styles.itemText}>
        {editing ? (
          <TextInput
            accessibilityLabel={t("shoppingList.editItem")}
            autoFocus
            onChangeText={setDraftLabel}
            onSubmitEditing={commitLabel}
            placeholderTextColor={colors.textMuted}
            ref={inputRef}
            returnKeyType="done"
            selectionColor={colors.primary}
            style={[
              styles.itemInput,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
                color: colors.text
              }
            ]}
            value={draftLabel}
            autoCorrect={false}
          />
        ) : (
          <Pressable
            onPress={() => void onStartEditing(item.id)}
            style={({ pressed }) => [
              styles.itemLabelButton,
              { opacity: pressed ? 0.72 : 1 }
            ]}
          >
            <AppText
              style={item.checked ? styles.checkedText : undefined}
              variant="label"
              numberOfLines={1}
            >
              {item.label}
            </AppText>
          </Pressable>
        )}
        {item.recipeName ? (
          <AppText muted variant="caption" numberOfLines={1}>
            {item.recipeName}
          </AppText>
        ) : null}
      </View>
      {editing ? (
        <View style={styles.editActions}>
          <IconButton
            icon={Check}
            label={t("common.save")}
            onPress={commitLabel}
            tone="primary"
            style={styles.itemAction}
          />
          <IconButton
            icon={X}
            label={t("common.cancel")}
            onPress={cancelEdit}
            style={styles.itemAction}
          />
          <IconButton
            icon={Trash2}
            label={t("shoppingList.deleteItem")}
            onPress={() => void onRemove(item.id)}
            tone="danger"
            style={styles.itemAction}
          />
        </View>
      ) : (
        <View style={styles.itemActions}>
          <View
            style={[
              styles.reorderActions,
              { backgroundColor: colors.input, borderColor: colors.border }
            ]}
          >
            <Pressable
              accessibilityLabel={t("shoppingList.moveItemUp")}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canMoveUp }}
              disabled={!canMoveUp}
              onPress={() => onMoveUp(item.id)}
              style={({ pressed }) => [
                styles.reorderAction,
                { opacity: !canMoveUp ? 0.28 : pressed ? 0.62 : 1 }
              ]}
            >
              <ChevronUp color={colors.text} size={19} strokeWidth={2.5} />
            </Pressable>
            <View style={[styles.reorderDivider, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityLabel={t("shoppingList.moveItemDown")}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canMoveDown }}
              disabled={!canMoveDown}
              onPress={() => onMoveDown(item.id)}
              style={({ pressed }) => [
                styles.reorderAction,
                { opacity: !canMoveDown ? 0.28 : pressed ? 0.62 : 1 }
              ]}
            >
              <ChevronDown color={colors.text} size={19} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const MemoizedShoppingListRow = React.memo(ShoppingListRow);

const styles = StyleSheet.create({
  addButton: {
    marginTop: 25
  },
  addField: {
    flex: 1,
    minWidth: 0
  },
  addRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md
  },
  checkedText: {
    opacity: 0.62,
    textDecorationLine: "line-through"
  },
  checkbox: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1.4,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xxs
  },
  headerIcon: {
    height: 40,
    width: 40
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.xxs
  },
  itemAction: {
    height: 36,
    width: 36
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.xxs
  },
  itemLabelButton: {
    justifyContent: "center",
  },
  itemInput: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  itemRow: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 60,
    padding: spacing.sm
  },
  itemText: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0
  },
  itemToggle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: spacing.sm
  },
  syncBanner: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  syncBannerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  syncBannerText: {
    flex: 1,
    gap: spacing.xxs
  },
  syncBannerDismiss: {
    height: 32,
    marginRight: -spacing.xs,
    marginTop: -spacing.xs,
    width: 32
  },
  syncBannerBody: {
    lineHeight: 18
  },
  syncBannerButton: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  syncBannerButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  reorderAction: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  reorderActions: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden"
  },
  reorderDivider: {
    height: 22,
    width: StyleSheet.hairlineWidth
  },
  reorderHandle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    width: 24
  },
  title: {
    flex: 1,
    lineHeight: 36
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  }
});
