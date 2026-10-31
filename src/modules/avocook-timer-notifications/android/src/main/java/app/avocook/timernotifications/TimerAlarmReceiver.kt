package app.avocook.timernotifications

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TimerAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED,
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED -> TimerNotificationScheduler.restore(context)
      ACTION_FIRE_TIMER -> TimerNotificationScheduler.showNotification(context, intent)
      ACTION_STOP_TIMER -> TimerNotificationScheduler.stop(context, intent)
    }
  }
}
