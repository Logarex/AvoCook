package app.avocook.timers

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

private const val ACTION_TRIGGER = "app.avocook.timers.TRIGGER"
private const val ACTION_CANCEL = "app.avocook.timers.CANCEL"
private const val DEFAULT_CHANNEL_ID = "recipe-timers"
private const val DEFAULT_CHANNEL_NAME = "Minuteurs"
private const val EXTRA_NOTIFICATION_ID = "notificationId"
private const val EXTRA_RECIPE_ID = "recipeId"
private const val EXTRA_TIMER_ID = "timerId"
private const val PREFS_NAME = "app.avocook.timers.notifications"
private const val PREFS_SCHEDULED = "scheduled"

class AvoCookTimerNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val permissions: Permissions?
    get() = appContext.permissions

  override fun definition() = ModuleDefinition {
    Name("AvoCookTimerNotifications")

    AsyncFunction("configureAsync") {
      TimerNotificationStore.ensureChannel(context, DEFAULT_CHANNEL_ID, DEFAULT_CHANNEL_NAME)
      true
    }

    AsyncFunction("getPermissionStateAsync") {
      getPermissionState()
    }

    AsyncFunction("requestPermissionAsync") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= 33 && context.applicationInfo.targetSdkVersion >= 33) {
        val permissionModule = permissions
        if (permissionModule == null) {
          promise.resolve(getPermissionState())
          return@AsyncFunction
        }

        permissionModule.askForPermissions(
          {
            promise.resolve(getPermissionState())
          },
          Manifest.permission.POST_NOTIFICATIONS
        )
      } else {
        promise.resolve(getPermissionState())
      }
    }

    AsyncFunction("scheduleAsync") {
      notificationId: String,
      title: String,
      body: String,
      triggerAtMillis: Double,
      channelId: String,
      recipeId: String,
      timerId: String ->
      val payload = TimerNotificationPayload(
        id = notificationId,
        title = title,
        body = body,
        triggerAtMillis = triggerAtMillis.toLong(),
        channelId = channelId.ifBlank { DEFAULT_CHANNEL_ID },
        recipeId = recipeId,
        timerId = timerId
      )
      TimerNotificationStore.save(context, payload)
      TimerNotificationStore.scheduleAlarm(context, payload)
      notificationId
    }

    AsyncFunction("cancelAsync") { notificationId: String ->
      TimerNotificationStore.cancel(context, notificationId)
    }

    AsyncFunction("dismissAsync") { notificationId: String ->
      NotificationManagerCompat.from(context).cancel(notificationId.hashCode())
    }
  }

  private fun getPermissionState(): String {
    val notificationsEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
    val runtimePermissionGranted =
      Build.VERSION.SDK_INT < 33 ||
        context.applicationInfo.targetSdkVersion < 33 ||
        ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED

    return if (notificationsEnabled && runtimePermissionGranted) "ready" else "denied"
  }
}

class AvoCookTimerNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    when (intent?.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> TimerNotificationStore.rescheduleAll(context)

      ACTION_TRIGGER -> {
        val id = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return
        TimerNotificationStore.show(context, id)
      }

      ACTION_CANCEL -> {
        val id = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return
        TimerNotificationStore.cancel(context, id)
      }
    }
  }
}

private data class TimerNotificationPayload(
  val id: String,
  val title: String,
  val body: String,
  val triggerAtMillis: Long,
  val channelId: String,
  val recipeId: String,
  val timerId: String
)

private object TimerNotificationStore {
  fun save(context: Context, payload: TimerNotificationPayload) {
    val scheduled = getScheduledJson(context)
    scheduled.put(payload.id, payload.toJson())
    setScheduledJson(context, scheduled)
  }

  fun cancel(context: Context, id: String) {
    val payload = get(context, id)
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(createTriggerPendingIntent(context, id))
    NotificationManagerCompat.from(context).cancel(id.hashCode())

    val scheduled = getScheduledJson(context)
    scheduled.remove(payload?.id ?: id)
    setScheduledJson(context, scheduled)
  }

  fun scheduleAlarm(context: Context, payload: TimerNotificationPayload) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = createTriggerPendingIntent(context, payload.id)
    val triggerAtMillis = payload.triggerAtMillis.coerceAtLeast(System.currentTimeMillis() + 1000)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
      return
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }
  }

  fun rescheduleAll(context: Context) {
    val now = System.currentTimeMillis()
    val scheduled = getScheduledJson(context)
    val idsToRemove = mutableListOf<String>()

    scheduled.keys().forEach { id ->
      val payload = scheduled.optJSONObject(id)?.toPayload(id)
      if (payload == null || payload.triggerAtMillis <= now) {
        idsToRemove.add(id)
      } else {
        scheduleAlarm(context, payload)
      }
    }

    idsToRemove.forEach(scheduled::remove)
    if (idsToRemove.isNotEmpty()) {
      setScheduledJson(context, scheduled)
    }
  }

  fun show(context: Context, id: String) {
    val payload = get(context, id) ?: return
    ensureChannel(context, payload.channelId, DEFAULT_CHANNEL_NAME)

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?.apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        putExtra(EXTRA_NOTIFICATION_ID, payload.id)
        putExtra(EXTRA_RECIPE_ID, payload.recipeId)
        putExtra(EXTRA_TIMER_ID, payload.timerId)
      }
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        payload.id.hashCode(),
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
      )
    }
    val cancelIntent = PendingIntent.getBroadcast(
      context,
      payload.id.hashCode(),
      Intent(context, AvoCookTimerNotificationReceiver::class.java).apply {
        action = ACTION_CANCEL
        putExtra(EXTRA_NOTIFICATION_ID, payload.id)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
    )

    val notification = NotificationCompat.Builder(context, payload.channelId)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(payload.title)
      .setContentText(payload.body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(payload.body))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setAutoCancel(true)
      .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
      .setVibrate(longArrayOf(0, 500, 250, 500))
      .addAction(0, "Stop", cancelIntent)
      .apply {
        if (contentIntent != null) {
          setContentIntent(contentIntent)
        }
      }
      .build()

    NotificationManagerCompat.from(context).notify(payload.id.hashCode(), notification)
    remove(context, payload.id)
  }

  fun ensureChannel(context: Context, channelId: String, channelName: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      channelId.ifBlank { DEFAULT_CHANNEL_ID },
      channelName.ifBlank { DEFAULT_CHANNEL_NAME },
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 250, 500)
      setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        null
      )
    }
    manager.createNotificationChannel(channel)
  }

  private fun get(context: Context, id: String): TimerNotificationPayload? =
    getScheduledJson(context).optJSONObject(id)?.toPayload(id)

  private fun remove(context: Context, id: String) {
    val scheduled = getScheduledJson(context)
    scheduled.remove(id)
    setScheduledJson(context, scheduled)
  }

  private fun createTriggerPendingIntent(context: Context, id: String): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      Intent(context, AvoCookTimerNotificationReceiver::class.java).apply {
        action = ACTION_TRIGGER
        putExtra(EXTRA_NOTIFICATION_ID, id)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
    )

  private fun getScheduledJson(context: Context): JSONObject {
    val raw = context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PREFS_SCHEDULED, "{}")
    return runCatching { JSONObject(raw ?: "{}") }.getOrElse { JSONObject() }
  }

  private fun setScheduledJson(context: Context, scheduled: JSONObject) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PREFS_SCHEDULED, scheduled.toString())
      .apply()
  }
}

private fun TimerNotificationPayload.toJson(): JSONObject =
  JSONObject()
    .put("title", title)
    .put("body", body)
    .put("triggerAtMillis", triggerAtMillis)
    .put("channelId", channelId)
    .put("recipeId", recipeId)
    .put("timerId", timerId)

private fun JSONObject.toPayload(id: String): TimerNotificationPayload? {
  val title = optString("title", "")
  val body = optString("body", "")
  val triggerAtMillis = optLong("triggerAtMillis", 0)
  val channelId = optString("channelId", DEFAULT_CHANNEL_ID)
  val recipeId = optString("recipeId", "")
  val timerId = optString("timerId", "")

  if (title.isBlank() || triggerAtMillis <= 0) {
    return null
  }

  return TimerNotificationPayload(
    id = id,
    title = title,
    body = body,
    triggerAtMillis = triggerAtMillis,
    channelId = channelId,
    recipeId = recipeId,
    timerId = timerId
  )
}

private fun immutableFlag(): Int =
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
