import { useEffect, useMemo } from "react";
import { useTimerSnapshot } from "../timers/TimersProvider";
import { useKitchen } from "./KitchenProvider";
import { emptyJournal } from "./kitchen";
import {
  timerScopeRecipe,
  timerSnapshot,
  type CookingTimerSnapshot,
} from "./cookingTimerState";
export function CookingTimerPersistence() {
  const timers = useTimerSnapshot();
  const kitchen = useKitchen();
  // Running timers persist their deadline, not a disk write for every tick.
  const serialized = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(timers).flatMap(([scope, values]) => {
            const recipeId = timerScopeRecipe(scope, kitchen.account);
            return recipeId === null
              ? []
              : [
                  [
                    recipeId,
                    Object.fromEntries(
                      Object.entries(values).map(([id, timer]) => [
                        id,
                        timerSnapshot(timer),
                      ]),
                    ),
                  ],
                ];
          }),
        ),
      ),
    [timers, kitchen.account],
  );
  const { update, ready, setTimerPersistenceError } = kitchen;
  useEffect(() => {
    if (!ready || serialized === "{}") return;
    const snapshots = JSON.parse(serialized) as Record<
      string,
      Record<string, CookingTimerSnapshot>
    >;
    void update((data) => {
      const journals = { ...data.journals };
      for (const [id, stepTimerStates] of Object.entries(snapshots))
        journals[id] = { ...(journals[id] ?? emptyJournal()), stepTimerStates };
      return { ...data, journals };
    })
      .then(() => setTimerPersistenceError(false))
      .catch(() => setTimerPersistenceError(true));
  }, [serialized, update, ready, setTimerPersistenceError]);
  return null;
}
