import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { usePreferences } from "../preferences/PreferencesProvider";

const LAST_BACKUP_REMINDER_COUNT_KEY = "milestones.lastBackupReminderCount";
const LAST_STORE_REVIEW_COUNT_KEY = "milestones.lastStoreReviewCount";

function getNextBackupMilestone(lastAcknowledgedCount: number): number {
  const nextMultiple = Math.floor(Math.max(0, lastAcknowledgedCount) / 30) + 1;
  return nextMultiple * 30;
}

// Request store reviews at launch, then after 2, 4, 8, 16... recipes.
function getNextReviewMilestone(lastRequestedCount: number): number {
  if (lastRequestedCount < 0) return 0;
  if (lastRequestedCount === 0) return 2;
  
  let next = 2;
  while (next <= lastRequestedCount) {
    next *= 2;
  }
  return next;
}

export function useMilestoneReminders(recipesCount: number, isLocalMode: boolean) {
  const { enableBackupReminders } = usePreferences();
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkMilestones() {
      if (recipesCount > 0 && enableBackupReminders && isLocalMode) {
        const storedBackupStr = await AsyncStorage.getItem(LAST_BACKUP_REMINDER_COUNT_KEY);
        const lastBackupAckCount = storedBackupStr ? parseInt(storedBackupStr, 10) : 0;
        
        const nextBackupMilestone = getNextBackupMilestone(lastBackupAckCount);
        if (recipesCount >= nextBackupMilestone && mounted) {
          setShowBackupReminder(true);
        } else if (mounted) {
          setShowBackupReminder(false);
        }
      } else if (mounted) {
        setShowBackupReminder(false);
      }

      const storedReviewStr = await AsyncStorage.getItem(LAST_STORE_REVIEW_COUNT_KEY);
      const lastReviewReqCount = storedReviewStr !== null ? parseInt(storedReviewStr, 10) : -1;
      
      const nextReviewMilestone = getNextReviewMilestone(lastReviewReqCount);
      if (recipesCount >= nextReviewMilestone) {
        // Wait for the screen to render before requesting a review.
        setTimeout(() => {
          if (mounted) {
            let currentMilestone = nextReviewMilestone;
            while (getNextReviewMilestone(currentMilestone) <= recipesCount) {
              currentMilestone = getNextReviewMilestone(currentMilestone);
            }
            void triggerStoreReview(currentMilestone);
          }
        }, 1500);
      }
    }

    void checkMilestones();

    return () => {
      mounted = false;
    };
  }, [recipesCount, enableBackupReminders, isLocalMode]);

  const dismissBackupReminder = useCallback(async () => {
    setShowBackupReminder(false);
    await AsyncStorage.setItem(LAST_BACKUP_REMINDER_COUNT_KEY, recipesCount.toString());
  }, [recipesCount]);

  const recordBackupDone = useCallback(async () => {
    setShowBackupReminder(false);
    await AsyncStorage.setItem(LAST_BACKUP_REMINDER_COUNT_KEY, recipesCount.toString());
  }, [recipesCount]);

  async function triggerStoreReview(milestone: number) {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
      // Count denied or failed requests to avoid repeating the prompt.
      await AsyncStorage.setItem(LAST_STORE_REVIEW_COUNT_KEY, milestone.toString());
    } catch {
    }
  }

  const manualTriggerStoreReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch {
    }
  }, []);

  return {
    showBackupReminder,
    dismissBackupReminder,
    recordBackupDone,
    manualTriggerStoreReview
  };
}
