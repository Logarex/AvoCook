import {
  newKitchenId,
  emptyKitchen,
  parseKitchenData,
  type KitchenData,
} from "./kitchen";

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
export function kitchenStorageKey(account: string) {
  return `kitchen.v1:${encodeURIComponent(account)}`;
}
export function createKitchenStore(storage: Storage, account: string) {
  let snapshot = {
    data: emptyKitchen(),
    ready: false,
    error: false,
    reminderError: false,
  };
  let pending: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  function serialize<T>(task: () => Promise<T>) {
    const next = pending.then(task);
    pending = next.catch(() => undefined);
    return next;
  }
  return {
    account,
    setReminderError: (reminderError: boolean) => {
      if (snapshot.reminderError !== reminderError)
        publish({ ...snapshot, reminderError });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    load: () =>
      serialize(async () => {
        try {
          const raw = await storage.getItem(kitchenStorageKey(account));
          const loaded =
            raw === null ? emptyKitchen() : parseKitchenData(JSON.parse(raw));
          const data = {
            ...loaded,
            shoppingGroupId: loaded.shoppingGroupId ?? newKitchenId(),
          };
          // The public shopping namespace must survive a restart even when the
          // user generates groceries before making another kitchen edit.
          if (!loaded.shoppingGroupId) {
            await storage.setItem(
              kitchenStorageKey(account),
              JSON.stringify(data),
            );
          }
          publish({
            reminderError: snapshot.reminderError,
            data,
            ready: true,
            error: false,
          });
        } catch (error) {
          publish({ ...snapshot, ready: false, error: true });
          throw error;
        }
      }),
    update: (change: (data: KitchenData) => KitchenData) =>
      serialize(async () => {
        if (!snapshot.ready) throw new Error("Kitchen storage unavailable");
        const data = parseKitchenData(change(snapshot.data));
        // Commit before publishing. Failed writes leave the current data intact.
        await storage.setItem(kitchenStorageKey(account), JSON.stringify(data));
        publish({
          reminderError: snapshot.reminderError,
          data,
          ready: true,
          error: false,
        });
      }),
  };
}
