import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListOrdered,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/AppText";
import { BottomNavigation } from "../components/BottomNavigation";
import { EmptyState } from "../components/EmptyState";
import { IconButton } from "../components/IconButton";
import { PageSwipeGesture } from "../components/PageSwipeGesture";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import type { ShoppingListItem } from "../features/shopping/shoppingList";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ShoppingList">;

export function ShoppingListScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
    updateItem
  } = useShoppingList();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const remainingCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items]
  );
  const checkedCount = items.length - remainingCount;

  const openRecipes = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Recipes", { tabTransition: "fromShopping" });
  }, [navigation]);

  async function handleAddItem() {
    const label = newItem.trim();
    if (!label) {
      return;
    }
    const result = await addItem(label);
    if (result.added.length) {
      setNewItem("");
    }
  }

  function handleClearChecked() {
    if (!checkedCount) {
      return;
    }

    Alert.alert(
      t("shoppingList.clearCheckedConfirmTitle"),
      t("shoppingList.clearCheckedConfirmBody", { count: checkedCount }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("shoppingList.clearChecked"),
          style: "destructive",
          onPress: () => void clearChecked()
        }
      ]
    );
  }

  function handleClearAll() {
    if (!items.length) {
      return;
    }

    Alert.alert(
      t("shoppingList.clearAllConfirmTitle"),
      t("shoppingList.clearAllConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("shoppingList.clearAll"),
          style: "destructive",
          onPress: () => void clearAll()
        }
      ]
    );
  }

  function toggleReorderMode() {
    setEditingItemId(null);
    setReorderMode((current) => !current);
  }

  return (
    <PageSwipeGesture onSwipeRight={openRecipes}>
      <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <ShoppingCart color={colors.primary} size={25} strokeWidth={2.5} />
            <AppText variant="title" style={styles.title}>
              {t("shoppingList.title")}
            </AppText>
          </View>
          <AppText muted variant="caption">
            {t("shoppingList.remainingCount", { count: remainingCount })}
            {checkedCount > 0
              ? ` - ${t("shoppingList.checkedCount", { count: checkedCount })}`
              : ""}
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            disabled={!items.length}
            icon={ListOrdered}
            label={
              reorderMode
                ? t("shoppingList.doneReordering")
                : t("shoppingList.reorderItems")
            }
            onPress={toggleReorderMode}
            tone={reorderMode ? "primary" : "default"}
            style={[
              styles.headerIcon,
              reorderMode
                ? {
                    backgroundColor: colors.chip,
                    borderColor: colors.primary
                  }
                : null
            ]}
          />
          <IconButton
            disabled={!checkedCount}
            icon={Trash2}
            label={t("shoppingList.clearChecked")}
            onPress={handleClearChecked}
            tone="danger"
            style={styles.headerIcon}
          />
          <IconButton
            disabled={!items.length}
            icon={X}
            label={t("shoppingList.clearAll")}
            onPress={handleClearAll}
            tone="danger"
            style={styles.headerIcon}
          />
        </View>
      </View>

      <View style={styles.addRow}>
        <TextField
          containerStyle={styles.addField}
          label={t("shoppingList.manualItemLabel")}
          onChangeText={setNewItem}
          onSubmitEditing={() => void handleAddItem()}
          placeholder={t("shoppingList.itemPlaceholder")}
          returnKeyType="done"
          value={newItem}
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
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={t("shoppingList.emptyTitle")}
              body={t("shoppingList.emptyBody")}
            />
          }
          renderItem={({ item, index }) => (
            <ShoppingListRow
              canMoveDown={index < items.length - 1}
              canMoveUp={index > 0}
              editing={editingItemId === item.id}
              item={item}
              onMoveDown={() => void moveItem(item.id, 1)}
              onMoveUp={() => void moveItem(item.id, -1)}
              onRemove={() => void removeItem(item.id)}
              onStartEditing={() => {
                setReorderMode(false);
                setEditingItemId(item.id);
              }}
              onStopEditing={() => setEditingItemId(null)}
              onToggle={() => void toggleItem(item.id)}
              onUpdate={(label) => {
                void updateItem(item.id, label);
                setEditingItemId(null);
              }}
              reorderMode={reorderMode}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNavigation
        current="shoppingList"
        onNavigate={(tab) => {
          if (tab === "recipes") {
            openRecipes();
          }
        }}
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
  onUpdate,
  reorderMode
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  editing: boolean;
  item: ShoppingListItem;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onToggle: () => void;
  onUpdate: (label: string) => void;
  reorderMode: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [draftLabel, setDraftLabel] = useState(item.label);
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    setDraftLabel(item.label);
  }, [item.label]);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  function commitLabel() {
    const label = draftLabel.trim();
    if (!label) {
      setDraftLabel(item.label);
      onStopEditing();
      return;
    }
    if (label !== item.label) {
      onUpdate(label);
      return;
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
      {reorderMode ? (
        <View style={styles.reorderHandle}>
          <GripVertical color={colors.textMuted} size={19} strokeWidth={2.2} />
        </View>
      ) : (
        <Pressable
          accessibilityLabel={item.label}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          disabled={editing}
          onPress={onToggle}
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
      )}
      <View style={styles.itemText}>
        {editing ? (
          <TextInput
            accessibilityLabel={t("shoppingList.editItem")}
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
          />
        ) : (
          <Pressable
            disabled={reorderMode}
            onPress={onToggle}
            style={({ pressed }) => [
              styles.itemLabelButton,
              { opacity: pressed ? 0.72 : 1 }
            ]}
          >
            <AppText
              style={item.checked ? styles.checkedText : undefined}
              variant="label"
            >
              {item.label}
            </AppText>
          </Pressable>
        )}
        {item.recipeName ? (
          <AppText muted variant="caption">
            {item.recipeName}
          </AppText>
        ) : null}
      </View>
      {reorderMode ? (
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
            onPress={onMoveUp}
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
            onPress={onMoveDown}
            style={({ pressed }) => [
              styles.reorderAction,
              { opacity: !canMoveDown ? 0.28 : pressed ? 0.62 : 1 }
            ]}
          >
            <ChevronDown color={colors.text} size={19} strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : editing ? (
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
        </View>
      ) : (
        <View style={styles.itemActions}>
          <IconButton
            icon={Pencil}
            label={t("shoppingList.editItem")}
            onPress={onStartEditing}
            style={styles.itemAction}
          />
          <IconButton
            icon={Trash2}
            label={t("shoppingList.deleteItem")}
            onPress={onRemove}
            tone="danger"
            style={styles.itemAction}
          />
        </View>
      )}
    </View>
  );
}

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
    gap: spacing.xs
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
    justifyContent: "space-between"
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
    minHeight: 44
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
    paddingBottom: spacing.md
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  screenContent: {
    gap: spacing.sm,
    paddingBottom: 0,
    paddingTop: spacing.sm
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
