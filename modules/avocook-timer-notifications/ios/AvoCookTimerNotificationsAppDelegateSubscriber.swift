import ExpoModulesCore
import Foundation
import UserNotifications

public class AvoCookTimerNotificationsAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func subscriberDidRegister() {
    AvoCookTimerNotificationCenter.shared.installDelegate()
  }

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    AvoCookTimerNotificationCenter.shared.installDelegate()
    return true
  }
}
