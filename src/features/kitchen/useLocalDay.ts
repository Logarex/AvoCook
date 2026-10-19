import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { localDate } from "./kitchen";

/** Refresh after midnight or resuming the app, including local timezone changes. */
export function useLocalDay() {
  const [day, setDay] = useState(localDate);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
    };
    const refresh = () => {
      clear();
      setDay(localDate());
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 100);
      timeout = setTimeout(refresh, midnight.getTime() - now.getTime());
    };
    if (AppState.currentState === "active") refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
      else clear();
    });
    return () => {
      clear();
      subscription.remove();
    };
  }, []);
  return day;
}
