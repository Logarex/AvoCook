import ExpoModulesCore
import Foundation
import UserNotifications

public class AvoCookTimerNotificationsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AvoCookTimerNotifications")

    Events("timerStop")

    OnCreate {
      AvoCookTimerNotificationCenter.shared.module = self
      AvoCookTimerNotificationCenter.shared.installDelegate()
      AvoCookTimerNotificationCenter.shared.emitPendingStopEvents()
    }

    OnDestroy {
      if AvoCookTimerNotificationCenter.shared.module === self {
        AvoCookTimerNotificationCenter.shared.module = nil
      }
    }

    AsyncFunction("configureTimerNotifications") { (stopActionTitle: String, _: String) -> Bool in
      AvoCookTimerNotificationCenter.shared.configureCategory(stopActionTitle: stopActionTitle)
      return true
    }

    AsyncFunction("getTimerNotificationState") { (promise: Promise) in
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        promise.resolve(Self.state(from: settings))
      }
    }

    AsyncFunction("requestTimerNotificationPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
        if let error {
          promise.reject("ERR_TIMER_NOTIFICATION_PERMISSION", error.localizedDescription)
          return
        }

        promise.resolve(granted ? "ready" : "denied")
      }
    }

    AsyncFunction("scheduleTimerNotification") {
      (
        title: String,
        body: String,
        recipeId: String,
        timerId: String,
        seconds: Double,
        promise: Promise
      ) in
      let notificationId = "timer:\(recipeId):\(timerId):\(Int(Date().timeIntervalSince1970 * 1000))"
      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body
      content.sound = .default
      content.categoryIdentifier = timerCategoryIdentifier
      content.userInfo = [
        "recipeId": recipeId,
        "timerId": timerId
      ]

      if #available(iOS 15.0, *) {
        content.interruptionLevel = .timeSensitive
      }

      let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: max(1, seconds),
        repeats: false
      )
      let request = UNNotificationRequest(
        identifier: notificationId,
        content: content,
        trigger: trigger
      )

      UNUserNotificationCenter.current().add(request) { error in
        if let error {
          promise.reject("ERR_TIMER_NOTIFICATION_SCHEDULE", error.localizedDescription)
          return
        }

        promise.resolve(notificationId)
      }
    }

    AsyncFunction("cancelTimerNotification") { (notificationId: String) in
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationId])
      UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notificationId])
    }
  }

  private static func state(from settings: UNNotificationSettings) -> String {
    switch settings.authorizationStatus {
    case .authorized, .provisional, .ephemeral:
      return "ready"
    case .denied:
      return "denied"
    case .notDetermined:
      return "denied"
    @unknown default:
      return "unavailable"
    }
  }
}
