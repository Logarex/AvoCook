import ExpoModulesCore
import Foundation
import UserNotifications

let timerCategoryIdentifier = "avocook.timer"
private let stopActionIdentifier = "avocook.timer.stop"
private let timerNotificationPrefix = "timer:"

public final class AvoCookTimerNotificationCenter: NSObject, UNUserNotificationCenterDelegate {
  public static let shared = AvoCookTimerNotificationCenter()

  weak var module: AvoCookTimerNotificationsModule?
  private var pendingStopEvents: [[String: Any?]] = []

  private override init() {
    super.init()
  }

  func installDelegate() {
    let center = UNUserNotificationCenter.current()
    if center.delegate == nil || center.delegate === self {
      center.delegate = self
    } else {
      NSLog("[AvoCook] UNUserNotificationCenter already has a delegate; timer notifications may not emit stop events.")
    }
  }

  func configureCategory(stopActionTitle: String) {
    installDelegate()

    let stopAction = UNNotificationAction(
      identifier: stopActionIdentifier,
      title: stopActionTitle,
      options: [.foreground]
    )
    let category = UNNotificationCategory(
      identifier: timerCategoryIdentifier,
      actions: [stopAction],
      intentIdentifiers: [],
      options: []
    )

    UNUserNotificationCenter.current().setNotificationCategories([category])
  }

  func emitPendingStopEvents() {
    guard let module else {
      return
    }

    pendingStopEvents.forEach { module.sendEvent("timerStop", $0) }
    pendingStopEvents.removeAll()
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    guard notification.request.identifier.hasPrefix(timerNotificationPrefix) else {
      completionHandler([])
      return
    }

    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound])
    } else {
      completionHandler([.alert, .sound])
    }
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    defer { completionHandler() }

    guard response.actionIdentifier == stopActionIdentifier else {
      return
    }

    let content = response.notification.request.content
    guard
      let recipeId = content.userInfo["recipeId"] as? String,
      let timerId = content.userInfo["timerId"] as? String
    else {
      return
    }

    let event: [String: Any?] = [
      "notificationId": response.notification.request.identifier,
      "recipeId": recipeId,
      "timerId": timerId
    ]

    if let module {
      module.sendEvent("timerStop", event)
    } else {
      pendingStopEvents.append(event)
    }
  }
}
