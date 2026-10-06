import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import Constants from "expo-constants";

const INTRO_DONE_KEY = "onboarding.introDone";
const TOUR_DONE_KEY = "onboarding.tourDone";
const LAST_SEEN_VERSION_KEY = "onboarding.lastSeenVersion";

type OnboardingState = {
  introDone: boolean;
  tourDone: boolean;
  onboardingHydrated: boolean;
  showUpdateScreen: boolean;
  markIntroDone: () => Promise<void>;
  markTourDone: () => Promise<void>;
  markUpdateSeen: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

export function useOnboarding(): OnboardingState {
  const [introDone, setIntroDone] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  const [showUpdateScreen, setShowUpdateScreen] = useState(false);
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(INTRO_DONE_KEY),
      AsyncStorage.getItem(TOUR_DONE_KEY),
      AsyncStorage.getItem(LAST_SEEN_VERSION_KEY),
    ]).then(([intro, tour, lastVersion]) => {
      const isIntroDone = intro === "true";
      const currentVersion = Constants.expoConfig?.version || "4.0.1";

      setIntroDone(isIntroDone);
      setTourDone(tour === "true");

      if (isIntroDone && lastVersion && lastVersion !== currentVersion) {
        setShowUpdateScreen(true);
      } else if (!lastVersion) {
        void AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
      }

      setOnboardingHydrated(true);
    });
  }, []);

  const markIntroDone = useCallback(async () => {
    setIntroDone(true);
    await AsyncStorage.setItem(INTRO_DONE_KEY, "true");
  }, []);

  const markTourDone = useCallback(async () => {
    setTourDone(true);
    await AsyncStorage.setItem(TOUR_DONE_KEY, "true");
  }, []);

  const markUpdateSeen = useCallback(async () => {
    const currentVersion = Constants.expoConfig?.version || "4.0.1";
    setShowUpdateScreen(false);
    await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  }, []);

  const resetOnboarding = useCallback(async () => {
    setIntroDone(false);
    setTourDone(false);
    setShowUpdateScreen(false);
    // Keep the version marker so resetting the tour does not reopen the update screen.
    const currentVersion = Constants.expoConfig?.version || "4.0.1";
    await AsyncStorage.multiRemove([INTRO_DONE_KEY, TOUR_DONE_KEY]);
    await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  }, []);

  return {
    introDone,
    tourDone,
    showUpdateScreen,
    onboardingHydrated,
    markIntroDone,
    markTourDone,
    markUpdateSeen,
    resetOnboarding,
  };
}
