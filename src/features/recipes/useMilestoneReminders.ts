import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { usePreferences } from "../preferences/PreferencesProvider";

const LAST_BACKUP_REMINDER_COUNT_KEY = "milestones.lastBackupReminderCount";
const LAST_STORE_REVIEW_COUNT_KEY = "milestones.lastStoreReviewCount";

// Backup reminders at: 10, 30, 50, 80, 100, and every 30 thereafter.
function getNextBackupMilestone(lastAcknowledgedCount: number): number {
  const earlyMilestones = [10, 30, 50, 80, 100];
  for (const milestone of earlyMilestones) {
    if (lastAcknowledgedCount < milestone) {
      return milestone;
    }
  }
  // After 100, every 30 (130, 160, 190...)
  const diff = lastAcknowledgedCount - 100;
  const nextMultiple = Math.floor(Math.max(0, diff) / 30) + 1;
  return 100 + nextMultiple * 30;
}

// Store review milestones: 5, 20, 50, 100, 200.
function getNextReviewMilestone(lastRequestedCount: number): number {
  const milestones = [5, 20, 50, 100, 200];
  for (const milestone of milestones) {
    if (lastRequestedCount < milestone) {
      return milestone;
    }
  }
  return Infinity;
}

export function useMilestoneReminders(recipesCount: number) {
  const { enableBackupReminders } = usePreferences();
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [currentBackupMilestone, setCurrentBackupMilestone] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function checkMilestones() {
      if (recipesCount === 0) return;

      // 1. Check Backup Reminders
      if (enableBackupReminders) {
        const storedBackupStr = await AsyncStorage.getItem(LAST_BACKUP_REMINDER_COUNT_KEY);
        const lastBackupAckCount = storedBackupStr ? parseInt(storedBackupStr, 10) : 0;
        
        const nextBackupMilestone = getNextBackupMilestone(lastBackupAckCount);
        if (recipesCount >= nextBackupMilestone && mounted) {
          setCurrentBackupMilestone(nextBackupMilestone);
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
  }, [recipesCount, enableBackupReminders]);

  const dismissBackupReminder = useCallback(async () => {
    setShowBackupReminder(false);
    await AsyncStorage.setItem(LAST_BACKUP_REMINDER_COUNT_KEY, currentBackupMilestone.toString());
  }, [currentBackupMilestone]);

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
