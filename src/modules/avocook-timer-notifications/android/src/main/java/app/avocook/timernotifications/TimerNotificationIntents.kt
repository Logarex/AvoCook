package app.avocook.timernotifications

import android.content.Intent
import android.os.Bundle

internal const val ACTION_FIRE_TIMER =
  "app.avocook.timernotifications.action.FIRE_TIMER"
internal const val ACTION_STOP_TIMER =
  "app.avocook.timernotifications.action.STOP_TIMER"
internal const val ACTION_STOP_TIMER_IN_APP =
  "app.avocook.timernotifications.action.STOP_TIMER_IN_APP"

internal const val EXTRA_NOTIFICATION_ID = "notificationId"
internal const val EXTRA_RECIPE_ID = "recipeId"
internal const val EXTRA_TIMER_ID = "timerId"
internal const val EXTRA_TITLE = "title"
internal const val EXTRA_BODY = "body"

internal fun notificationIntId(notificationId: String): Int {
  val hash = notificationId.hashCode()
  return if (hash == Int.MIN_VALUE) 0 else kotlin.math.abs(hash)
}

internal fun stopEventFromIntent(intent: Intent?): Bundle? {
  if (intent?.action != ACTION_STOP_TIMER_IN_APP) {
    return null
  }

  val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return null
  val recipeId = intent.getStringExtra(EXTRA_RECIPE_ID) ?: return null
  val timerId = intent.getStringExtra(EXTRA_TIMER_ID) ?: return null
  intent.action = null
  intent.removeExtra(EXTRA_NOTIFICATION_ID)
  intent.removeExtra(EXTRA_RECIPE_ID)
  intent.removeExtra(EXTRA_TIMER_ID)

  return Bundle().apply {
    putString(EXTRA_NOTIFICATION_ID, notificationId)
    putString(EXTRA_RECIPE_ID, recipeId)
    putString(EXTRA_TIMER_ID, timerId)
  }
}
