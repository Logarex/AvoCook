package app.avocook.timernotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TimerAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_FIRE_TIMER -> TimerNotificationScheduler.showNotification(context, intent)
      ACTION_STOP_TIMER -> TimerNotificationScheduler.stop(context, intent)
    }
  }
}
