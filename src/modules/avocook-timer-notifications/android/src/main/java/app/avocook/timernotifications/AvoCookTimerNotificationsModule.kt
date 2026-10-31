package app.avocook.timernotifications

import android.Manifest
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AvoCookTimerNotificationsModule : Module() {
  private companion object {
    private const val TAG = "AvoCookTimers"
  }

  private var observing = false
  private val pendingStops = mutableListOf<Bundle>()
  private var permissionPromise: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AvoCookTimerNotifications")

    Events("timerStop")

    OnStartObserving {
      observing = true
      emitStopEventFromCurrentIntent()
      pendingStops.forEach { sendEvent("timerStop", it) }
      pendingStops.clear()
    }
    OnStopObserving { observing = false }

    OnActivityEntersForeground {
      permissionPromise?.let { promise ->
        permissionPromise = null
        promise.resolve(TimerNotificationScheduler.getState(context))
      }
    }

    OnDestroy {
      permissionPromise?.resolve("unavailable")
      permissionPromise = null
    }

    OnNewIntent { intent ->
      stopEventFromIntent(intent)?.let { if (observing) sendEvent("timerStop", it) else pendingStops.add(it) }
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
      finishPermissionRequest(promise)
      return
    }

    val permissions = appContext.permissions ?: run {
      Log.w(TAG, "Expo permissions service is unavailable.")
      finishPermissionRequest(promise)
      return
    }

    permissions.askForPermissions(
      PermissionsResponseListener { permissionsMap ->
        val status = permissionsMap[Manifest.permission.POST_NOTIFICATIONS]?.status
        if (status != PermissionsStatus.GRANTED) {
          promise.resolve("denied")
          return@PermissionsResponseListener
        }

        finishPermissionRequest(promise)
      },
      Manifest.permission.POST_NOTIFICATIONS
    )
  }

  private fun finishPermissionRequest(promise: Promise) {
    if (permissionPromise != null) { promise.resolve("denied"); return }
    permissionPromise = promise
    if (!TimerNotificationScheduler.requestExactAlarmSettingsIfNeeded(context)) {
      permissionPromise = null
      promise.resolve(TimerNotificationScheduler.getState(context))
    }
  }

  private fun emitStopEventFromCurrentIntent() {
    val intent = appContext.currentActivity?.intent
    stopEventFromIntent(intent)?.let { if (observing) sendEvent("timerStop", it) else pendingStops.add(it) }
  }
}
