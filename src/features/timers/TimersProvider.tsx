import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Vibration } from "react-native";
import {
  addTimerStopListener,
  cancelTimerNotification,
  getTimerNotificationState,
  scheduleTimerNotification,
  type TimerNotificationState
} from "./timerNotifications";

export type TimerPreset = {
  id: "prep" | "cook" | "total";
  label: string;
  minutes: number;
};
export type TimerState = {
  durationSeconds: number;
  endsAt?: number;
  notificationId?: string | null;
  remainingSeconds: number;
  running: boolean;
};
export type TimerNotificationStatus = TimerNotificationState | "unknown";

type TimersByRecipe = Record<string, Record<string, TimerState>>;
type ToggleTimerOptions = {
  body: string;
  title: string;
};
type TimerContextValue = {
  ensureRecipeTimers: (recipeId: string, presets: TimerPreset[]) => void;
  notificationStatus: TimerNotificationStatus;
  resetRecipeTimer: (recipeId: string, timerId: string) => void;
  timersByRecipe: TimersByRecipe;
  toggleRecipeTimer: (
    recipeId: string,
    timerId: string,
    options: ToggleTimerOptions
  ) => Promise<TimerNotificationState>;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimersProvider({ children }: { children: React.ReactNode }) {
  const [timersByRecipe, setTimersByRecipe] = useState<TimersByRecipe>({});
  const [notificationStatus, setNotificationStatus] =
    useState<TimerNotificationStatus>("unknown");

  const hasRunningTimer = useMemo(
    () =>
      Object.values(timersByRecipe).some((recipeTimers) =>
        Object.values(recipeTimers).some(
          (timer) => timer.running && timer.remainingSeconds > 0
        )
      ),
    [timersByRecipe]
  );

  const ensureRecipeTimers = useCallback(
    (recipeId: string, presets: TimerPreset[]) => {
      setTimersByRecipe((current) => {
        const currentRecipeTimers = current[recipeId] ?? {};
        const nextRecipeTimers: Record<string, TimerState> = {};

        for (const preset of presets) {
          const durationSeconds = preset.minutes * 60;
          const existing = currentRecipeTimers[preset.id];
          nextRecipeTimers[preset.id] =
            existing && existing.durationSeconds === durationSeconds
              ? existing
              : {
                  durationSeconds,
                  remainingSeconds: durationSeconds,
                  running: false
                };
        }

        return {
          ...current,
          [recipeId]: nextRecipeTimers
        };
      });
    },
    []
  );

  const resetRecipeTimer = useCallback(
    (recipeId: string, timerId: string) => {
      const notificationId = timersByRecipe[recipeId]?.[timerId]?.notificationId;
      void cancelTimerNotification(notificationId);

      setTimersByRecipe((current) => {
        const recipeTimers = current[recipeId];
        const timer = recipeTimers?.[timerId];
        if (!recipeTimers || !timer) {
          return current;
        }

        return {
          ...current,
          [recipeId]: {
            ...recipeTimers,
            [timerId]: {
              ...timer,
              endsAt: undefined,
              notificationId: null,
              remainingSeconds: timer.durationSeconds,
              running: false
            }
          }
        };
      });
    },
    [timersByRecipe]
  );

  const toggleRecipeTimer = useCallback(
    async (
      recipeId: string,
      timerId: string,
      { body, title }: ToggleTimerOptions
    ) => {
      const timer = timersByRecipe[recipeId]?.[timerId];
      if (!timer) {
        return notificationStatus === "unknown" ? "unavailable" : notificationStatus;
      }

      if (timer.running) {
        await cancelTimerNotification(timer.notificationId);
        setTimersByRecipe((current) => {
          const recipeTimers = current[recipeId];
          const currentTimer = recipeTimers?.[timerId];
          if (!recipeTimers || !currentTimer) {
            return current;
          }

          return {
            ...current,
            [recipeId]: {
              ...recipeTimers,
              [timerId]: {
                ...currentTimer,
                endsAt: undefined,
                notificationId: null,
                remainingSeconds: Math.max(
                  0,
                  Math.ceil(
                    ((currentTimer.endsAt ?? Date.now()) - Date.now()) / 1000
                  )
                ),
                running: false
              }
            }
          };
        });
        return "ready";
      }

      const remainingSeconds =
        timer.remainingSeconds > 0 ? timer.remainingSeconds : timer.durationSeconds;
      const scheduledNotification = await scheduleTimerNotification({
        body,
        recipeId,
        seconds: remainingSeconds,
        timerId,
        title
      });
      setNotificationStatus(scheduledNotification.state);

      if (scheduledNotification.state !== "ready") {
        return scheduledNotification.state;
      }

      const endsAt = Date.now() + remainingSeconds * 1000;
      setTimersByRecipe((current) => {
        const recipeTimers = current[recipeId];
        const currentTimer = recipeTimers?.[timerId];
        if (!recipeTimers || !currentTimer) {
          return current;
        }

        return {
          ...current,
          [recipeId]: {
            ...recipeTimers,
            [timerId]: {
              ...currentTimer,
              endsAt,
              notificationId: scheduledNotification.notificationId,
              remainingSeconds:
                currentTimer.remainingSeconds > 0
                  ? currentTimer.remainingSeconds
                  : currentTimer.durationSeconds,
              running: true
            }
          }
        };
      });

      return "ready";
    },
    [notificationStatus, timersByRecipe]
  );

  useEffect(() => {
    let mounted = true;
    void getTimerNotificationState().then((status) => {
      if (mounted) {
        setNotificationStatus(status);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let removed = false;

    void addTimerStopListener((event) => {
      void cancelTimerNotification(event.notificationId);
      setTimersByRecipe((current) => {
        const recipeTimers = current[event.recipeId];
        const timer = recipeTimers?.[event.timerId];
        if (!recipeTimers || !timer) {
          return current;
        }

        return {
          ...current,
          [event.recipeId]: {
            ...recipeTimers,
            [event.timerId]: {
              ...timer,
              endsAt: undefined,
              notificationId: null,
              remainingSeconds: timer.durationSeconds,
              running: false
            }
          }
        };
      });
    }).then((nextSubscription) => {
      if (removed) {
        nextSubscription?.remove();
        return;
      }

      subscription = nextSubscription;
    });

    return () => {
      removed = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasRunningTimer) {
      return;
    }

    const interval = setInterval(() => {
      setTimersByRecipe((current) => {
        const next: TimersByRecipe = {};

        for (const [recipeId, recipeTimers] of Object.entries(current)) {
          const nextRecipeTimers: Record<string, TimerState> = {};

          for (const [timerId, timer] of Object.entries(recipeTimers)) {
            const remainingSeconds = timer.running
              ? Math.max(
                  0,
                  Math.ceil(((timer.endsAt ?? Date.now()) - Date.now()) / 1000)
                )
              : timer.remainingSeconds;

            if (
              timer.running &&
              timer.remainingSeconds > 0 &&
              remainingSeconds === 0
            ) {
              Vibration.vibrate([0, 500, 250, 500]);
            }

            nextRecipeTimers[timerId] = {
              ...timer,
              remainingSeconds,
              running: timer.running && remainingSeconds > 0,
              endsAt: remainingSeconds > 0 ? timer.endsAt : undefined
            };
          }

          next[recipeId] = nextRecipeTimers;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasRunningTimer]);

  const value = useMemo(
    () => ({
      ensureRecipeTimers,
      notificationStatus,
      resetRecipeTimer,
      timersByRecipe,
      toggleRecipeTimer
    }),
    [
      ensureRecipeTimers,
      notificationStatus,
      resetRecipeTimer,
      timersByRecipe,
      toggleRecipeTimer
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useRecipeTimers(recipeId: string, presets: TimerPreset[]) {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useRecipeTimers must be used inside TimersProvider");
  }

  const {
    ensureRecipeTimers,
    notificationStatus,
    resetRecipeTimer,
    timersByRecipe,
    toggleRecipeTimer
  } = context;

  useEffect(() => {
    ensureRecipeTimers(recipeId, presets);
  }, [ensureRecipeTimers, presets, recipeId]);

  const resetTimer = useCallback(
    (timerId: string) => resetRecipeTimer(recipeId, timerId),
    [recipeId, resetRecipeTimer]
  );
  const toggleTimer = useCallback(
    (timerId: string, options: ToggleTimerOptions) =>
      toggleRecipeTimer(recipeId, timerId, options),
    [recipeId, toggleRecipeTimer]
  );

  return {
    notificationStatus,
    resetTimer,
    timers: timersByRecipe[recipeId] ?? {},
    toggleTimer
  };
}
