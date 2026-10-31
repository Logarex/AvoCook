export type CookingTimerSnapshot = {
  durationSeconds: number;
  remainingSeconds: number;
  running: boolean;
  endsAt?: number;
  notificationId?: string | null;
};
export function cookingTimerScope(account: string, recipeId: string) {
  return JSON.stringify(["cooking", account, recipeId]);
}
export function timerScopeRecipe(
  scope: string,
  account: string,
): string | null {
  try {
    const value: unknown = JSON.parse(scope);
    return Array.isArray(value) &&
      value.length === 3 &&
      value[0] === "cooking" &&
      value[1] === account &&
      typeof value[2] === "string"
      ? value[2]
      : null;
  } catch {
    return null;
  }
}
export function timerSnapshot(
  timer: CookingTimerSnapshot,
): CookingTimerSnapshot {
  return {
    durationSeconds: timer.durationSeconds,
    remainingSeconds: timer.running
      ? timer.durationSeconds
      : timer.remainingSeconds,
    running: timer.running,
    ...(timer.endsAt !== undefined ? { endsAt: timer.endsAt } : {}),
    ...(timer.notificationId !== undefined
      ? { notificationId: timer.notificationId }
      : {}),
  };
}
export function restoreCookingTimer(
  timer: CookingTimerSnapshot,
  now: number,
): CookingTimerSnapshot {
  const remainingSeconds = timer.running
    ? Math.max(0, Math.ceil(((timer.endsAt ?? now) - now) / 1000))
    : timer.remainingSeconds;
  return {
    ...timer,
    remainingSeconds,
    running: timer.running && remainingSeconds > 0,
    endsAt: remainingSeconds > 0 ? timer.endsAt : undefined,
  };
}
export function validCookingTimer(
  timer: unknown,
): timer is CookingTimerSnapshot {
  if (!timer || typeof timer !== "object") return false;
  const value = timer as CookingTimerSnapshot;
  return (
    Number.isInteger(value.durationSeconds) &&
    value.durationSeconds > 0 &&
    value.durationSeconds <= 86400 &&
    Number.isFinite(value.remainingSeconds) &&
    value.remainingSeconds >= 0 &&
    value.remainingSeconds <= value.durationSeconds &&
    typeof value.running === "boolean" &&
    (value.endsAt === undefined || Number.isFinite(value.endsAt)) &&
    (!value.running || typeof value.endsAt === "number") &&
    (value.notificationId === undefined ||
      value.notificationId === null ||
      typeof value.notificationId === "string")
  );
}
