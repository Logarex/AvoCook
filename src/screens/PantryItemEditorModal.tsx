import { Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppSheet } from "../components/AppSheet";
import { AppText } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../features/auth/AuthProvider";
import {
  PantryClient,
  type PantryCategory,
  type PantryItem,
  type PantryItemPatch,
} from "../features/pantry/pantryClient";
import { pantryPermissions } from "../features/pantry/pantrySession";
import { useShoppingList } from "../features/shopping/ShoppingListProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/colors";

export function PantryItemEditorModal({
  item,
  onClose,
}: {
  item: PantryItem | null;
  onClose: () => void;
}) {
  return item ? <Editor key={item.id} item={item} onClose={onClose} /> : null;
}
function Editor({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { credentials } = useAuth();
  const { mode, pantry, moveItem, updatePantryItem, removeItem, switching } =
    useShoppingList();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [categoryId, setCategoryId] = useState(item.categoryId ?? 0);
  const [recurrence, setRecurrence] = useState(item.rrule ?? "");
  const [deleteOnDone, setDeleteOnDone] = useState(item.deleteOnDone ?? false);
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!credentials || mode.kind !== "pantry") return;
    let active = true;
    const client = new PantryClient(credentials);
    void client
      .categories(mode.selection.house.id)
      .then((categories) => {
        if (active)
          setCategories(
            categories.filter(
              (category) => !category.listId || category.listId === item.listId,
            ),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
      client.dispose();
    };
  }, [credentials, mode, item.listId]);
  const writable = !switching && Boolean(pantry?.fresh && !pantry.busy);
  const permissions = pantryPermissions(
    mode.kind === "pantry" ? (pantry?.selection ?? mode.selection) : null,
  );
  const disabled = saving || !writable || !permissions.edit;
  const index =
    pantry?.items.findIndex((current) => current.id === item.id) ?? -1;
  async function reorder(direction: -1 | 1) {
    if (disabled || !permissions.edit || mode.kind !== "pantry") return;
    setSaving(true);
    setError(false);
    try {
      await moveItem(
        `pantry-${mode.selection.house.id}-${item.listId}-${item.id}`,
        direction,
      );
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  async function save() {
    if (disabled || !permissions.edit || !name.trim()) return;
    setSaving(true);
    setError(false);
    const patch: PantryItemPatch = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (quantity !== (item.quantity ?? "")) patch.quantity = quantity;
    if (description !== (item.description ?? ""))
      patch.description = description;
    if (categoryId !== (item.categoryId ?? 0)) patch.categoryId = categoryId;
    if (recurrence !== (item.rrule ?? "")) patch.rrule = recurrence;
    if (deleteOnDone !== (item.deleteOnDone ?? false))
      patch.deleteOnDone = deleteOnDone;
    try {
      if (Object.keys(patch).length) await updatePantryItem(item, patch);
      onClose();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  function confirmDelete() {
    if (disabled || !permissions.delete || mode.kind !== "pantry") return;
    const id = `pantry-${mode.selection.house.id}-${item.listId}-${item.id}`;
    Alert.alert(
      t("pantry.deleteTitle"),
      t("pantry.deleteBody", { name: item.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setSaving(true);
            setError(false);
            void removeItem(id)
              .then(onClose)
              .catch(() => setError(true))
              .finally(() => setSaving(false));
          },
        },
      ],
    );
  }
  return (
    <AppSheet
      title={t("shoppingList.editItem")}
      visible
      onClose={onClose}
      busy={saving}
    >
      <TextField
        label={t("shoppingList.manualItemLabel")}
        value={name}
        onChangeText={setName}
        editable={!disabled}
      />
      <TextField
        label={t("pantry.quantity")}
        value={quantity}
        onChangeText={setQuantity}
        editable={!disabled}
        placeholder={t("pantry.quantityPlaceholder")}
      />
      <PrimaryButton
        label={t("settings.advanced")}
        icon={advanced ? ChevronUp : ChevronDown}
        variant="ghost"
        disabled={disabled}
        onPress={() => setAdvanced((previous) => !previous)}
      />
      {advanced ? (
        <>
          <TextField
            label={t("pantry.description")}
            value={description}
            onChangeText={setDescription}
            editable={!disabled}
            multiline
          />
          {categories.length ? (
            <>
              <AppText variant="label">{t("pantry.category")}</AppText>
              <View style={styles.chips}>
                {[{ id: 0, name: t("pantry.noCategory") }, ...categories].map(
                  (category) => (
                    <Pressable
                      key={category.id}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: categoryId === category.id,
                      }}
                      disabled={disabled}
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            categoryId === category.id
                              ? colors.chip
                              : colors.input,
                          borderColor:
                            categoryId === category.id
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    >
                      <AppText variant="caption">{category.name}</AppText>
                    </Pressable>
                  ),
                )}
              </View>
            </>
          ) : null}
          <AppText variant="label">{t("pantry.recurrence")}</AppText>
          <View style={styles.chips}>
            {[
              { value: "", key: "never" },
              { value: "FREQ=DAILY", key: "daily" },
              { value: "FREQ=WEEKLY", key: "weekly" },
              { value: "FREQ=MONTHLY", key: "monthly" },
            ].map(({ value, key }) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: recurrence === value }}
                disabled={disabled}
                onPress={() => setRecurrence(value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      recurrence === value ? colors.chip : colors.input,
                    borderColor:
                      recurrence === value ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText variant="caption">{t(`pantry.${key}`)}</AppText>
              </Pressable>
            ))}
          </View>
          {recurrence &&
          !["FREQ=DAILY", "FREQ=WEEKLY", "FREQ=MONTHLY"].includes(
            recurrence,
          ) ? (
            <AppText muted variant="caption">
              {t("pantry.customRecurrence")}
            </AppText>
          ) : null}
          <View style={styles.row}>
            <AppText style={styles.flex}>{t("pantry.deleteOnDone")}</AppText>
            <Switch
              value={deleteOnDone}
              onValueChange={setDeleteOnDone}
              disabled={disabled}
              accessibilityLabel={t("pantry.deleteOnDone")}
            />
          </View>
          <View style={styles.row}>
            <PrimaryButton
              style={styles.flex}
              numberOfLines={2}
              icon={ChevronUp}
              label={t("shoppingList.moveItemUp")}
              variant="ghost"
              disabled={disabled || index <= 0}
              onPress={() => {
                void reorder(-1);
              }}
            />
            <PrimaryButton
              style={styles.flex}
              numberOfLines={2}
              icon={ChevronDown}
              label={t("shoppingList.moveItemDown")}
              variant="ghost"
              disabled={
                disabled ||
                index < 0 ||
                index >= (pantry?.items.length ?? 0) - 1
              }
              onPress={() => {
                void reorder(1);
              }}
            />
          </View>
        </>
      ) : null}
      {error ? (
        <AppText accessibilityRole="alert" style={{ color: colors.danger }}>
          {t("shoppingModes.editError")}
        </AppText>
      ) : null}
      {permissions.delete ? (
        <PrimaryButton
          icon={Trash2}
          label={t("shoppingList.deleteItem")}
          variant="danger"
          disabled={disabled}
          onPress={confirmDelete}
        />
      ) : null}
      <PrimaryButton
        icon={Check}
        label={t("common.save")}
        disabled={disabled || !name.trim()}
        onPress={() => {
          void save();
        }}
      />
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
