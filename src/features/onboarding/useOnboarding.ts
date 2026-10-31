import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "../../version";

const TOUR_DONE_KEY = "onboarding.tourDone";
const LAST_SEEN_VERSION_KEY = "onboarding.lastSeenVersion";

type OnboardingState = {
  tourDone: boolean;
  onboardingHydrated: boolean;
  showUpdateScreen: boolean;
  markTourDone: () => Promise<void>;
  markUpdateSeen: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

export function useOnboarding(): OnboardingState {
  const [tourDone, setTourDone] = useState(false);
  const [showUpdateScreen, setShowUpdateScreen] = useState(false);
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(TOUR_DONE_KEY),
      AsyncStorage.getItem(LAST_SEEN_VERSION_KEY),
    ]).then(([tour, lastVersion]) => {
      const isTourDone = tour === "true";
      const currentVersion = APP_VERSION;

      setTourDone(isTourDone);

      if (isTourDone && lastVersion && lastVersion !== currentVersion) {
        setShowUpdateScreen(true);
      } else if (!lastVersion) {
        void AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion).catch((error) => {
          console.warn("onboarding", "Could not save the version marker", error);
        });
      }

    }).catch((error) => {
      console.warn("onboarding", "Could not load onboarding state", error);
    }).finally(() => {
      setOnboardingHydrated(true);
    });
  }, []);

  const markTourDone = useCallback(async () => {
    setTourDone(true);
    await AsyncStorage.setItem(TOUR_DONE_KEY, "true");
  }, []);

  const markUpdateSeen = useCallback(async () => {
    const currentVersion = APP_VERSION;
    setShowUpdateScreen(false);
    await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  }, []);

  const resetOnboarding = useCallback(async () => {
    setTourDone(false);
    setShowUpdateScreen(false);
    const currentVersion = APP_VERSION;
    await AsyncStorage.removeItem(TOUR_DONE_KEY);
    await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  }, []);

  return {
    tourDone,
    showUpdateScreen,
    onboardingHydrated,
    markTourDone,
    markUpdateSeen,
    resetOnboarding,
  };
}
