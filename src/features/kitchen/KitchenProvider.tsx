import { useTranslation } from "react-i18next";
import { replaceStockReminders } from "./kitchenNative";
import { stockReminderPlan } from "./stockReminders";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import { createKitchenStore } from "./kitchenStore";

const Context = createContext<ReturnType<typeof createKitchenStore> | null>(
  null,
);
export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const { getClient, isLocalMode, hydrated } = useAuth();
  const account = hydrated
    ? (getClient()?.getAccountKey() ?? (isLocalMode ? "local" : "signed-out"))
    : "loading";
  const store = useMemo(
    () => createKitchenStore(AsyncStorage, account),
    [account],
  );
  useEffect(() => {
    if (hydrated) void store.load().catch(() => undefined);
  }, [store, hydrated]);
  return (
    <Context.Provider value={store}>
      <StockReminderSync />
      {children}
    </Context.Provider>
  );
}
function StockReminderSync() {
  const { data, ready, account, setReminderError } = useKitchen();
  const { t } = useTranslation();
  useEffect(() => {
    if (account === "loading" || (!ready && account !== "signed-out")) return;
    const plan =
      ready &&
      data.remindersEnabled &&
      !["signed-out", "loading"].includes(account)
        ? stockReminderPlan(
            data.stock,
            new Date(),
            t("kitchen.reminderTitle"),
            (names) => t("kitchen.reminderBody", { names }),
          )
        : [];
    let current = true;
    void replaceStockReminders(plan)
      .then((result) => {
        if (current)
          setReminderError(Boolean(data.remindersEnabled) && !result);
      })
      .catch(() => {
        if (current) setReminderError(Boolean(data.remindersEnabled));
      });
    return () => {
      current = false;
    };
  }, [data.stock, data.remindersEnabled, ready, account, t, setReminderError]);
  return null;
}
export function useKitchen() {
  const store = useContext(Context);
  if (!store) throw new Error("KitchenProvider missing");
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return {
    ...state,
    account: store.account,
    setReminderError: store.setReminderError,
    setTimerPersistenceError: store.setTimerPersistenceError,
    update: store.update,
    reload: store.load,
  };
}
