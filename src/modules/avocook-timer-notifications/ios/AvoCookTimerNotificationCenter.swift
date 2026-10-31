import ExpoModulesCore
import ExpoNotifications
import Foundation
import UserNotifications

let timerCategoryIdentifier = "avocook.timer"
private let stopActionIdentifier = "avocook.timer.stop"
private let timerNotificationPrefix = "timer:"

public final class AvoCookTimerNotificationCenter: NSObject, UNUserNotificationCenterDelegate {
  public static let shared = AvoCookTimerNotificationCenter()

  weak var module: AvoCookTimerNotificationsModule?
  private weak var previousDelegate: UNUserNotificationCenterDelegate?
  var observing = false
  private var pendingStopEvents: [[String: Any?]] = []

  private override init() {
    super.init()
  }

  func installDelegate() {
    let manager = NotificationCenterManager.shared
    let center = UNUserNotificationCenter.current()
    if center.delegate !== self {
      previousDelegate = center.delegate ?? manager
      center.delegate = self
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

    let center = UNUserNotificationCenter.current()
    center.getNotificationCategories { categories in
      var merged = categories.filter { $0.identifier != timerCategoryIdentifier }
      merged.insert(category)
      center.setNotificationCategories(merged)
    }
  }

  func emitPendingStopEvents() {
    guard observing, let module else {
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
    guard notification.request.identifier.hasPrefix(timerNotificationPrefix) || notification.request.identifier.hasPrefix("avocook-stock:") else {
      if let delegate = previousDelegate,
        delegate.responds(to: #selector(userNotificationCenter(_:willPresent:withCompletionHandler:))) {
        delegate.userNotificationCenter?(center, willPresent: notification, withCompletionHandler: completionHandler)
      } else { completionHandler([]) }
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
    if !response.notification.request.identifier.hasPrefix(timerNotificationPrefix) &&
       !response.notification.request.identifier.hasPrefix("avocook-stock:") {
      if let delegate = previousDelegate,
        delegate.responds(to: #selector(userNotificationCenter(_:didReceive:withCompletionHandler:))) {
        delegate.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
      } else { completionHandler() }
      return
    }
    defer { completionHandler() }

    if response.notification.request.identifier.hasPrefix("avocook-stock:") {
      AvoCookKitchenModule.openStockReminder()
      return
    }

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

    if observing, let module {
      module.sendEvent("timerStop", event)
    } else {
      pendingStopEvents.append(event)
    }
  }
}
