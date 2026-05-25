package app.avocook.timernotifications

import android.Manifest
import android.content.Context
import android.os.Build
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AvoCookTimerNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AvoCookTimerNotifications")

    Events("timerStop")

    OnCreate {
      emitStopEventFromCurrentIntent()
    }

    OnNewIntent { intent ->
      stopEventFromIntent(intent)?.let { sendEvent("timerStop", it) }
    }

    AsyncFunction("configureTimerNotifications") { stopActionTitle: String, channelName: String ->
      TimerNotificationScheduler.configure(context, stopActionTitle, channelName)
      true
    }

    AsyncFunction("getTimerNotificationState") {
      TimerNotificationScheduler.getState(context)
    }

    AsyncFunction("requestTimerNotificationPermission") { promise: Promise ->
      requestPermission(promise)
    }

    AsyncFunction("scheduleTimerNotification") {
      title: String,
      body: String,
      recipeId: String,
      timerId: String,
      seconds: Double ->
      try {
        TimerNotificationScheduler.schedule(
          context,
          title,
          body,
          recipeId,
          timerId,
          seconds
        )
      } catch (error: SecurityException) {
        throw CodedException("ERR_TIMER_EXACT_ALARM_DENIED", error.message, error)
      }
    }

    AsyncFunction("cancelTimerNotification") { notificationId: String ->
      TimerNotificationScheduler.cancel(context, notificationId)
    }
  }

  private fun requestPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      TimerNotificationScheduler.requestExactAlarmSettingsIfNeeded(context)
      promise.resolve(TimerNotificationScheduler.getState(context))
      return
    }

    val permissions = appContext.permissions ?: run {
      promise.resolve("unavailable")
      return
    }

    permissions.askForPermissions(
      PermissionsResponseListener { permissionsMap ->
        val status = permissionsMap[Manifest.permission.POST_NOTIFICATIONS]?.status
        if (status != PermissionsStatus.GRANTED) {
          promise.resolve("denied")
          return@PermissionsResponseListener
        }

        TimerNotificationScheduler.requestExactAlarmSettingsIfNeeded(context)
        promise.resolve(TimerNotificationScheduler.getState(context))
      },
      Manifest.permission.POST_NOTIFICATIONS
    )
  }

  private fun emitStopEventFromCurrentIntent() {
    val intent = appContext.currentActivity?.intent
    stopEventFromIntent(intent)?.let { sendEvent("timerStop", it) }
  }
}
