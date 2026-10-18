import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Share as ShareIcon,
  ShoppingCart,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/AppText";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { EmptyState } from "../components/EmptyState";
import { IconButton } from "../components/IconButton";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { Screen } from "../components/Screen";
import { ShoppingModeButton } from "../components/ShoppingModeButton";
import { TextField } from "../components/TextField";
import { selectionFeedback } from "../features/accessibility/haptics";
import { PantryError, type PantryItem } from "../features/pantry/pantryClient";
import { pantryPermissions } from "../features/pantry/pantrySession";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { getTabBarContentInset } from "../utils/safeArea";
import { PantryItemEditorModal } from "./PantryItemEditorModal";
import { ShoppingListActionsModal } from "./ShoppingListActionsModal";
import { ShoppingModeModal } from "./ShoppingModeModal";

type Props = NativeStackScreenProps<RootStackParamList, "ShoppingList">;

export function ShoppingListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const {
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
    sharedList,
    mode,
    switching,
    pantry,
    refreshItems,
  } = useShoppingList();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [pantryEditing, setPantryEditing] = useState<PantryItem | null>(null);
  const [mutating, setMutating] = useState(false);
  const mutationPending = useRef(false);
  const [newItem, setNewItem] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<ShoppingListItem>>(null);
  const remainingCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items],
  );
  const checkedCount = items.length - remainingCount;

  const wasInBackground = useRef(false);
  const backendKey =
    mode.kind === "firebase"
      ? `firebase-${mode.code}`
      : mode.kind === "pantry"
        ? `pantry-${mode.accountKey}-${mode.selection.house.id}-${mode.selection.list.id}`
        : "local";
  const backendRef = useRef(backendKey);
  const switchingRef = useRef(switching);
  backendRef.current = backendKey;
  switchingRef.current = switching;

  const refreshCurrent = useCallback(async () => {
    if (!switchingRef.current) await refreshItems();
  }, [refreshItems]);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCurrent();
    } catch {
      /* The Pantry session exposes refresh errors with the cached list. */
    } finally {
      setRefreshing(false);
    }
  }, [refreshCurrent]);
  const typingRef = useRef(false);
  typingRef.current = Boolean(
    newItem || pantryEditing || mutating || showModes || showActionsMenu,
  );
  useEffect(() => {
    setEditingItemId(null);
    setPantryEditing(null);
    setNewItem("");
    setShowActionsMenu(false);
  }, [backendKey]);
  useFocusEffect(
    useCallback(() => {
      if (!backendKey.startsWith("pantry-")) return;
      const timer = setInterval(() => {
        if (!typingRef.current && AppState.currentState === "active")
          void refreshCurrent().catch(() => undefined);
      }, 30000);
      return () => clearInterval(timer);
    }, [backendKey, refreshCurrent]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        wasInBackground.current = true;
      } else if (next === "active" && wasInBackground.current) {
        wasInBackground.current = false;
        if (backendRef.current.startsWith("pantry-") && typingRef.current)
          return;
        void refreshCurrent().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [refreshCurrent]);

  useFocusEffect(
    useCallback(() => {
      if (backendRef.current !== backendKey) return;
      void refreshCurrent().catch(() => undefined);
    }, [refreshCurrent, backendKey]),
  );

  const permissions = pantryPermissions(
    mode.kind === "pantry" ? (pantry?.selection ?? mode.selection) : null,
  );
  const writable =
    !switching &&
    !mutating &&
    (mode.kind !== "pantry" || Boolean(pantry?.fresh && !pantry.busy));
  const canAdd = writable && (mode.kind !== "pantry" || permissions.add);
  const canCheck = writable && (mode.kind !== "pantry" || permissions.check);
  const canEdit = writable && (mode.kind !== "pantry" || permissions.edit);
  const canDelete = writable && (mode.kind !== "pantry" || permissions.delete);
  const perform = useCallback(
    async (action: () => Promise<unknown>) => {
      if (mutationPending.current) return false;
      mutationPending.current = true;
      setMutating(true);
      try {
        await action();
        return true;
      } catch (error) {
        Alert.alert(
          t("common.error"),
          error instanceof PantryError
            ? t(`pantry.errors.${error.code}`)
            : t("shoppingModes.editError"),
        );
        return false;
      } finally {
        mutationPending.current = false;
        setMutating(false);
      }
    },
    [t],
  );
  const handleToggleItem = useCallback(
    async (id: string) => {
      await perform(() => toggleItem(id));
    },
    [perform, toggleItem],
  );
  const handleRemoveItem = useCallback(
    async (id: string) => {
      await perform(() => removeItem(id));
    },
    [perform, removeItem],
  );
  const handleUpdateItem = useCallback(
    async (id: string, label: string) => {
      await perform(() => updateItem(id, label));
    },
    [perform, updateItem],
  );
  const handleStartEditing = useCallback(
    (id: string) => {
      if (mode.kind === "pantry") {
        const item = pantry?.items.find(
          (item) =>
            `pantry-${mode.selection.house.id}-${item.listId}-${item.id}` ===
            id,
        );
        if (item) setPantryEditing(item);
      } else setEditingItemId(id);
    },
    [mode, pantry?.items],
  );
  const handleStopEditing = useCallback(() => setEditingItemId(null), []);
  const handleMoveUp = useCallback(
    (id: string) => {
      void perform(() => moveItem(id, -1));
    },
    [perform, moveItem],
  );
  const handleMoveDown = useCallback(
    (id: string) => {
      void perform(() => moveItem(id, 1));
    },
    [perform, moveItem],
  );
  async function handleAddItem() {
    const label = newItem.trim();
    if (!label || !canAdd) return;
    await perform(async () => {
      const result = await addItem(label);
      if (result.added.length) setNewItem("");
    });
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
      message += remaining
        .map((i) => `• ${i.label}${i.recipeName ? ` (${i.recipeName})` : ""}`)
        .join("\n");
      message += "\n\n";
    }

    if (checked.length > 0) {
      message += checked
        .map((i) => `✓ ${i.label}${i.recipeName ? ` (${i.recipeName})` : ""}`)
        .join("\n");
      message += "\n";
    }

    try {
      await Share.share({
        message: message.trim(),
      });
    } catch (error) {
      console.error("Error sharing shopping list:", error);
    }
  }

  const renderItem = useCallback(
    ({ item, index }: { item: ShoppingListItem; index: number }) => (
      <MemoizedShoppingListRow
        canMoveDown={canEdit && index < items.length - 1}
        canMoveUp={canEdit && index > 0}
        canCheck={canCheck}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteOnly={
          mode.kind === "pantry" && !permissions.edit && permissions.delete
        }
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
    ),
    [
      mode.kind,
      permissions.edit,
      permissions.delete,
      canCheck,
      canEdit,
      canDelete,
      editingItemId,
      items.length,
      handleMoveDown,
      handleMoveUp,
      handleRemoveItem,
      handleStartEditing,
      handleStopEditing,
      handleToggleItem,
      handleUpdateItem,
    ],
  );

  return (
    <PageSwipeGesture
      onSwipeRight={() =>
        navigation.navigate("Community", { tabTransition: "slide_from_left" })
      }
    >
      <Screen
        scroll={false}
        contentWidth={760}
        contentStyle={styles.screenContent}
      >
        <View
          style={[
            styles.header,
            fontScale > 1.3 || width < 360
              ? { flexDirection: "column", alignItems: "stretch" }
              : undefined,
          ]}
        >
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <AppText
                variant="title"
                style={styles.title}
                numberOfLines={fontScale > 1.3 ? undefined : 1}
                adjustsFontSizeToFit={fontScale <= 1.3}
              >
                {t("shoppingList.title")}
              </AppText>
            </View>
            {mode.kind === "pantry" || sync.linked || sharedList.active ? (
              <ConnectionStatus
                connected={
                  mode.kind === "pantry"
                    ? Boolean(pantry?.fresh)
                    : sharedList.active ||
                      (Platform.OS === "ios" && sync.linked)
                }
                label={
                  mode.kind === "pantry"
                    ? t(
                        pantry?.fresh
                          ? "pantry.upToDate"
                          : "pantry.cachedStatus",
                      )
                    : sharedList.active ||
                        (Platform.OS === "ios" && sync.linked)
                      ? t("shoppingList.syncActiveInfo")
                      : t("shoppingList.syncEnable")
                }
                loading={sync.syncing || pantry?.busy}
              />
            ) : null}
          </View>
          {items.length ? (
            <View style={styles.headerActions}>
              <IconButton
                disabled={!items.length}
                icon={ShareIcon}
                label={t("shoppingList.shareList")}
                onPress={() => void handleShare()}
                style={styles.headerIcon}
              />
              <IconButton
                disabled={!items.length || !canDelete}
                icon={Trash2}
                label={t("common.delete")}
                onPress={handleDeleteOptions}
                tone="danger"
                style={styles.headerIcon}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.modeRow}>
          <View style={styles.modeControl}>
            <ShoppingModeButton
              compact
              disabled={mutating}
              onPress={() => setShowModes(true)}
            />
          </View>
          {mode.kind === "pantry" ? (
            <AppText
              muted
              variant="caption"
              numberOfLines={1}
              style={styles.activeListName}
            >
              {mode.selection.list.name}
            </AppText>
          ) : null}
          {mode.kind === "pantry" ? (
            <IconButton
              icon={RefreshCw}
              spinning={pantry?.busy}
              label={t("pantry.refresh")}
              disabled={switching || mutating || pantry?.busy}
              onPress={() => void handleRefresh()}
            />
          ) : null}
        </View>
        {mode.kind === "pantry" && pantry?.error ? (
          <View style={styles.feedback}>
            <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
              {t(`pantry.errors.${pantry.error}`)}
            </AppText>
            <AppText muted variant="caption">
              {t("pantry.cachedBody")}
            </AppText>
          </View>
        ) : null}
        {mode.kind === "pantry" && !Object.values(permissions).some(Boolean) ? (
          <AppText muted variant="caption">
            {t("pantry.readOnly")}
          </AppText>
        ) : null}
        {pantry?.cacheWarning ? (
          <AppText muted variant="caption">
            {t("pantry.cacheWarning")}
          </AppText>
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
            editable={canAdd}
            autoCorrect={false}
          />
          <IconButton
            disabled={!newItem.trim() || !canAdd}
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
            {items.length ? (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: spacing.sm,
                    marginHorizontal: spacing.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    flexWrap: "wrap",
                  }}
                >
                  <AppText
                    muted
                    variant="caption"
                    style={{ fontWeight: "600" }}
                  >
                    {t("shoppingList.remainingCount", {
                      count: remainingCount,
                    })}
                    {checkedCount > 0
                      ? ` • ${t("shoppingList.checkedCount", { count: checkedCount })}`
                      : ""}
                  </AppText>
                  {sharedList.active && sharedList.participantCount ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: colors.chip,
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 2,
                        borderRadius: radius.sm,
                      }}
                    >
                      <Users
                        color={colors.primary}
                        size={13}
                        strokeWidth={2.5}
                      />
                      <AppText
                        variant="caption"
                        style={{ color: colors.primary, fontWeight: "600" }}
                      >
                        {t("shoppingList.participantCount", {
                          count: sharedList.participantCount,
                        })}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
            <View style={{ flex: 1 }}>
              <FlatList
                ref={listRef}
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.listContent,
                  {
                    paddingBottom: getTabBarContentInset(
                      insets.bottom,
                      fontScale,
                    ),
                  },
                ]}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={7}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <EmptyState
                    icon={ShoppingCart}
                    title={t("shoppingList.emptyTitle")}
                    body={t("shoppingList.emptyBody")}
                  />
                }
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  sync.linked || mode.kind === "pantry" ? (
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => void handleRefresh()}
                      tintColor={colors.primary}
                    />
                  ) : undefined
                }
              />
            </View>
          </>
        )}

        <ShoppingListActionsModal
          visible={showActionsMenu}
          onClose={() => setShowActionsMenu(false)}
          checkedCount={checkedCount}
          onClearChecked={() => {
            void perform(clearChecked);
          }}
          onClearAll={() => {
            void perform(clearAll);
          }}
        />
        <ShoppingModeModal
          visible={showModes}
          onClose={() => setShowModes(false)}
        />
        {pantryEditing && mode.kind === "pantry" ? (
          <PantryItemEditorModal
            key={`${backendKey}-${pantryEditing.id}`}
            item={pantryEditing}
            onClose={() => setPantryEditing(null)}
          />
        ) : null}
      </Screen>
    </PageSwipeGesture>
  );
}

function ShoppingListRow({
  canCheck,
  canEdit,
  canDelete,
  deleteOnly,
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
  onUpdate,
}: {
  canCheck: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleteOnly: boolean;
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

  function deleteItem() {
    Alert.alert(
      t("pantry.deleteTitle"),
      t("pantry.deleteBody", { name: item.label }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void onRemove(item.id);
          },
        },
      ],
    );
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
          backgroundColor: colors.backgroundElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={item.label}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: item.checked,
          disabled: editing || !canCheck,
        }}
        disabled={editing || !canCheck}
        onPress={() => {
          selectionFeedback();
          void onToggle(item.id);
        }}
        style={({ pressed }) => [
          styles.itemToggle,
          { opacity: editing ? 0.5 : pressed ? 0.72 : 1 },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: item.checked ? colors.primary : "transparent",
              borderColor: item.checked ? colors.primary : colors.border,
            },
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
                color: colors.text,
              },
            ]}
            value={draftLabel}
            autoCorrect={false}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shoppingList.editItem")}
            disabled={!canEdit}
            onPress={() => void onStartEditing(item.id)}
            style={({ pressed }) => [
              styles.itemLabelButton,
              { opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <AppText
              markdown
              style={item.checked ? styles.checkedText : undefined}
              variant="body"
              numberOfLines={2}
            >
              {item.label}
            </AppText>
          </Pressable>
        )}
        {item.recipeName ? (
          <AppText markdown muted variant="caption" numberOfLines={1}>
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
            disabled={!canDelete}
            icon={Trash2}
            label={t("shoppingList.deleteItem")}
            onPress={() => void onRemove(item.id)}
            tone="danger"
            style={styles.itemAction}
          />
        </View>
      ) : deleteOnly ? (
        <IconButton
          icon={Trash2}
          label={t("shoppingList.deleteItem")}
          disabled={!canDelete}
          tone="danger"
          onPress={deleteItem}
        />
      ) : (
        <View style={styles.itemActions}>
          <View
            style={[
              styles.reorderActions,
              { backgroundColor: colors.input, borderColor: colors.border },
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
                { opacity: !canMoveUp ? 0.28 : pressed ? 0.62 : 1 },
              ]}
            >
              <ChevronUp color={colors.text} size={19} strokeWidth={2.5} />
            </Pressable>
            <View
              style={[
                styles.reorderDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <Pressable
              accessibilityLabel={t("shoppingList.moveItemDown")}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canMoveDown }}
              disabled={!canMoveDown}
              onPress={() => onMoveDown(item.id)}
              style={({ pressed }) => [
                styles.reorderAction,
                { opacity: !canMoveDown ? 0.28 : pressed ? 0.62 : 1 },
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
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modeControl: { flexShrink: 1 },
  activeListName: { flex: 1, minWidth: 0 },
  feedback: { gap: spacing.xs, paddingHorizontal: spacing.md },
  addButton: {
    marginTop: 25,
  },
  addField: {
    flex: 1,
    minWidth: 0,
  },
  addRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  checkedText: {
    opacity: 0.62,
    textDecorationLine: "line-through",
  },
  checkbox: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1.4,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
  headerIcon: {
    height: 40,
    width: 40,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
  itemAction: {
    height: 36,
    width: 36,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.xxs,
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
    paddingVertical: spacing.xs,
  },
  itemRow: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 60,
    padding: spacing.sm,
  },
  itemText: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  itemToggle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  reorderAction: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  reorderActions: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden",
  },
  reorderDivider: {
    height: 22,
    width: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    lineHeight: 36,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
