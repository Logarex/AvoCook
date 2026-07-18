import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const INTRO_DONE_KEY = "onboarding.introDone";
const TOUR_DONE_KEY = "onboarding.tourDone";

type OnboardingState = {
  /** Whether the user has seen the 2-page intro */
  introDone: boolean;
  /** Whether the user has completed (or skipped) the guided tour */
  tourDone: boolean;
  /** True while AsyncStorage is being read */
  onboardingHydrated: boolean;
  markIntroDone: () => Promise<void>;
  markTourDone: () => Promise<void>;
  /** Resets both flags so the user can re-watch everything from Settings */
  resetOnboarding: () => Promise<void>;
};

export function useOnboarding(): OnboardingState {
  const [introDone, setIntroDone] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(INTRO_DONE_KEY),
      AsyncStorage.getItem(TOUR_DONE_KEY),
    ]).then(([intro, tour]) => {
      setIntroDone(intro === "true");
      setTourDone(tour === "true");
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

  const resetOnboarding = useCallback(async () => {
    setIntroDone(false);
    setTourDone(false);
    await AsyncStorage.multiRemove([INTRO_DONE_KEY, TOUR_DONE_KEY]);
  }, []);

  return {
    introDone,
    tourDone,
    onboardingHydrated,
    markIntroDone,
    markTourDone,
    resetOnboarding,
  };
}
