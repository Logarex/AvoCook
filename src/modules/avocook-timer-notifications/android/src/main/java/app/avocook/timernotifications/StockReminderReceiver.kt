package app.avocook.timernotifications

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class StockReminderReceiver : BroadcastReceiver() {
  companion object {
    private const val CHANNEL = "avocook-stock-reminders"
    private const val PREFS = "avocook_stock_reminders"
    private fun parseDate(value: String): Long = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
      isLenient = false
    }.parse(value)?.time ?: throw IllegalArgumentException("Invalid reminder date")
    private fun pending(context: Context, entry: JSONObject): PendingIntent = PendingIntent.getBroadcast(
      context, entry.getString("id").hashCode(), Intent(context, StockReminderReceiver::class.java).apply {
        action = "app.avocook.STOCK_REMINDER"
        data = android.net.Uri.parse("avocook://stock/" + entry.getString("id"))
        putExtra("id", entry.getString("id"))
      }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    @Synchronized fun replace(context: Context, json: String) {
      val requested = JSONArray(json)
      val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val old = JSONArray(preferences.getString("entries", "[]"))
      val entries = JSONArray()
      for (index in 0 until requested.length()) {
        val entry = requested.getJSONObject(index)
        val id = entry.getString("id")
        if (preferences.getBoolean("delivered:$id", false)) continue
        val previous = (0 until old.length()).map { old.getJSONObject(it) }.find { it.getString("id") == id }
        if (previous != null && parseDate(previous.getString("date")) < parseDate(entry.getString("date"))) {
          entry.put("date", previous.getString("date"))
        }
        entries.put(entry)
      }
      require(entries.length() <= 20)
      if (entries.length() > 0) {
        require(Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
        require((context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled())
      }
      for (index in 0 until entries.length()) {
        val entry = entries.getJSONObject(index)
        require(entry.getString("id").isNotEmpty())
        entry.getString("title"); entry.getString("body")
        parseDate(entry.getString("date"))
      }
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      for (index in 0 until old.length()) alarms.cancel(pending(context, old.getJSONObject(index)))
      check(preferences.edit().putString("entries", entries.toString()).commit())
      schedule(context, entries)
    }
    private fun schedule(context: Context, entries: JSONArray) {
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      for (index in 0 until entries.length()) {
        val entry = entries.getJSONObject(index)
        val time = parseDate(entry.getString("date"))
        val triggerAt = time.coerceAtLeast(System.currentTimeMillis() + 1000)
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
          try { alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending(context, entry)) }
          catch (_: SecurityException) { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending(context, entry)) }
        } else {
          alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending(context, entry))
        }
      }
    }
  }
  override fun onReceive(context: Context, intent: Intent) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val entries = JSONArray(preferences.getString("entries", "[]"))
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      schedule(context, entries); return
    }
    val id = intent.getStringExtra("id") ?: return
    val entry = (0 until entries.length()).map { entries.getJSONObject(it) }.find { it.getString("id") == id } ?: return
    val remaining = JSONArray()
    for (index in 0 until entries.length()) if (entries.getJSONObject(index).getString("id") != id) remaining.put(entries.getJSONObject(index))
    if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(CHANNEL, "AvoCook", NotificationManager.IMPORTANCE_DEFAULT))
    if (!manager.areNotificationsEnabled() || (Build.VERSION.SDK_INT >= 26 && manager.getNotificationChannel(CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE)) return
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply { putExtra("avocook.stockReminder", true) }
    val contentIntent = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
    manager.notify("stock:$id", 0, builder.setSmallIcon(R.drawable.avocook_timer_notification)
      .setContentTitle(entry.getString("title")).setContentText(entry.getString("body"))
      .setStyle(Notification.BigTextStyle().bigText(entry.getString("body"))).setContentIntent(contentIntent).setAutoCancel(true).build())
    preferences.edit().putString("entries", remaining.toString()).putBoolean("delivered:$id", true).apply()
  }
}
