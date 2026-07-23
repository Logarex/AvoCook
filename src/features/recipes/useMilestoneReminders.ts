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

// Store review milestones: first request at 5 recipes, then every 20 recipes (25, 45, 65…).
function getNextReviewMilestone(lastRequestedCount: number): number {
  if (lastRequestedCount < 5) {
    return 5;
  }
  return lastRequestedCount + 20;
}

export function useMilestoneReminders(recipesCount: number, isLocalMode: boolean) {
  const { enableBackupReminders } = usePreferences();
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkMilestones() {
      if (recipesCount === 0) return;

      // 1. Check Backup Reminders
      if (enableBackupReminders && isLocalMode) {
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

      // 2. Check Store Review Reminders
      const storedReviewStr = await AsyncStorage.getItem(LAST_STORE_REVIEW_COUNT_KEY);
      const lastReviewReqCount = storedReviewStr ? parseInt(storedReviewStr, 10) : 0;
      
      const nextReviewMilestone = getNextReviewMilestone(lastReviewReqCount);
      if (recipesCount >= nextReviewMilestone) {
        // Wait a bit so the UI has time to render before the review modal appears
        setTimeout(() => {
          if (mounted) {
            void triggerStoreReview(nextReviewMilestone);
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
    // If they exported, we advance their acknowledged milestone to the current recipe count
    await AsyncStorage.setItem(LAST_BACKUP_REMINDER_COUNT_KEY, recipesCount.toString());
  }, [recipesCount]);

  async function triggerStoreReview(milestone: number) {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
      // Record that we triggered it for this milestone, even if it failed/was denied by OS
      await AsyncStorage.setItem(LAST_STORE_REVIEW_COUNT_KEY, milestone.toString());
    } catch (e) {
      // Ignore gracefully
    }
  }

  // Allow triggering a review manually (e.g. after a successful backup)
  const manualTriggerStoreReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (e) {
      // Ignore gracefully
    }
  }, []);

  return {
    showBackupReminder,
    dismissBackupReminder,
    recordBackupDone,
    manualTriggerStoreReview
  };
}
