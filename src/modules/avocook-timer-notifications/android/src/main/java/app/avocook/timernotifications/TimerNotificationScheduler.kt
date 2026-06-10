package app.avocook.timernotifications

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings

internal object TimerNotificationScheduler {
  private const val CHANNEL_ID = "avocook-timer-alarms"
  private const val PREFS_NAME = "avocook_timer_notifications"
  private const val PREF_STOP_ACTION_TITLE = "stopActionTitle"
  private const val PREF_CHANNEL_NAME = "channelName"
  private const val DEFAULT_STOP_ACTION_TITLE = "Stop"
  private const val DEFAULT_CHANNEL_NAME = "Timers"

  fun configure(
    context: Context,
    stopActionTitle: String,
    channelName: String
  ) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PREF_STOP_ACTION_TITLE, stopActionTitle)
      .putString(PREF_CHANNEL_NAME, channelName)
      .apply()

    createNotificationChannel(context, channelName)
  }

  fun getState(context: Context): String {
    if (!hasNotificationPermission(context) || !canScheduleExactAlarms(context)) {
      return "denied"
    }

    return "ready"
  }

  fun requestExactAlarmSettingsIfNeeded(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || canScheduleExactAlarms(context)) {
      return
    }

    val intent = Intent(
      Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
      Uri.parse("package:${context.packageName}")
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    runCatching { context.startActivity(intent) }
  }

  fun schedule(
    context: Context,
    title: String,
    body: String,
    recipeId: String,
    timerId: String,
    seconds: Double
  ): String {
    val notificationId = "timer:$recipeId:$timerId:${System.currentTimeMillis()}"
    val triggerAt = System.currentTimeMillis() + (seconds.coerceAtLeast(1.0) * 1000).toLong()
    val requestCode = notificationIntId(notificationId)
    val fireIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
      action = ACTION_FIRE_TIMER
      putExtra(EXTRA_NOTIFICATION_ID, notificationId)
      putExtra(EXTRA_RECIPE_ID, recipeId)
      putExtra(EXTRA_TIMER_ID, timerId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
    }
    val firePendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode,
      fireIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val showPendingIntent = PendingIntent.getActivity(
      context,
      requestCode + 100000,
      launchIntent(context, notificationId, recipeId, timerId),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    if (!canScheduleExactAlarms(context)) {
      throw SecurityException("Exact alarm permission is not granted.")
    }

    alarmManager.setAlarmClock(
      AlarmManager.AlarmClockInfo(triggerAt, showPendingIntent),
      firePendingIntent
    )

    return notificationId
  }

  fun cancel(context: Context, notificationId: String) {
    val requestCode = notificationIntId(notificationId)
    val fireIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
      action = ACTION_FIRE_TIMER
    }
    val firePendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode,
      fireIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(firePendingIntent)

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.cancel(requestCode)
  }

  fun showNotification(context: Context, intent: Intent) {
    if (!hasNotificationPermission(context)) {
      return
    }

    val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return
    val recipeId = intent.getStringExtra(EXTRA_RECIPE_ID) ?: return
    val timerId = intent.getStringExtra(EXTRA_TIMER_ID) ?: return
    val title = intent.getStringExtra(EXTRA_TITLE) ?: return
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""
    val requestCode = notificationIntId(notificationId)
    val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val channelName = preferences.getString(PREF_CHANNEL_NAME, DEFAULT_CHANNEL_NAME)
      ?: DEFAULT_CHANNEL_NAME
    val stopActionTitle =
      preferences.getString(PREF_STOP_ACTION_TITLE, DEFAULT_STOP_ACTION_TITLE)
        ?: DEFAULT_STOP_ACTION_TITLE

    createNotificationChannel(context, channelName)

    val contentPendingIntent = PendingIntent.getActivity(
      context,
      requestCode + 100000,
      launchIntent(context, notificationId, recipeId, timerId),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val stopIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
      action = ACTION_STOP_TIMER
      putExtra(EXTRA_NOTIFICATION_ID, notificationId)
      putExtra(EXTRA_RECIPE_ID, recipeId)
      putExtra(EXTRA_TIMER_ID, timerId)
    }
    val stopPendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode + 200000,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }

    val notification = builder
      .setSmallIcon(R.drawable.avocook_timer_notification)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setContentIntent(contentPendingIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setPriority(Notification.PRIORITY_MAX)
      .setVibrate(longArrayOf(0, 500, 250, 500))
      .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
      .addAction(
        Notification.Action.Builder(
          android.R.drawable.ic_menu_close_clear_cancel,
          stopActionTitle,
          stopPendingIntent
        ).build()
      )
      .build()

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.notify(requestCode, notification)
  }

  fun stop(context: Context, intent: Intent) {
    val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return
    val recipeId = intent.getStringExtra(EXTRA_RECIPE_ID) ?: return
    val timerId = intent.getStringExtra(EXTRA_TIMER_ID) ?: return
    cancel(context, notificationId)
    context.startActivity(
      launchIntent(context, notificationId, recipeId, timerId).apply {
        action = ACTION_STOP_TIMER_IN_APP
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    )
  }

  private fun hasNotificationPermission(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun canScheduleExactAlarms(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  private fun createNotificationChannel(context: Context, channelName: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val audioAttributes = AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_ALARM)
      .build()
    val channel = NotificationChannel(
      CHANNEL_ID,
      channelName,
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = channelName
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 250, 500)
      setSound(alarmSound, audioAttributes)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }

    notificationManager.createNotificationChannel(channel)
  }

  private fun launchIntent(
    context: Context,
    notificationId: String,
    recipeId: String,
    timerId: String
  ): Intent {
    return (context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent()).apply {
      putExtra(EXTRA_NOTIFICATION_ID, notificationId)
      putExtra(EXTRA_RECIPE_ID, recipeId)
      putExtra(EXTRA_TIMER_ID, timerId)
      addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
  }
}
