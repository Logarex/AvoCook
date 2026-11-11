import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

// Must stay identical (name and fields) to targets/widgets/AvoCookTimerAttributes.swift:
// ActivityKit matches the widget's configuration to this type by its name and Codable layout.
#if canImport(ActivityKit)
@available(iOS 16.2, *)
public struct AvoCookTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var endsAt: Date
    public var label: String
  }
  public var recipeName: String
  public var recipeId: String
}
#endif

/// Mirrors each scheduled cooking-timer notification with a Live Activity so the
/// countdown stays visible on the Lock Screen and in the Dynamic Island.
enum AvoCookLiveActivities {
  static func start(notificationId: String, recipeName: String, label: String, recipeId: String, seconds: Double) {
    #if canImport(ActivityKit)
    guard #available(iOS 16.2, *) else { return }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    let endsAt = Date().addingTimeInterval(max(1, seconds))
    let attributes = AvoCookTimerAttributes(recipeName: recipeName, recipeId: recipeId)
    let content = ActivityContent(
      state: AvoCookTimerAttributes.ContentState(endsAt: endsAt, label: label),
      // Shortly after the end the system shows the activity as finished, then removes it.
      staleDate: endsAt.addingTimeInterval(60)
    )
    do {
      let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
      store(activity.id, for: notificationId)
    } catch {
      NSLog("[AvoCookTimers] Live Activity unavailable: %@", error.localizedDescription)
    }
    #endif
  }

  static func end(notificationId: String) {
    #if canImport(ActivityKit)
    guard #available(iOS 16.2, *) else { return }
    guard let activityId = take(notificationId) else { return }
    Task {
      for activity in Activity<AvoCookTimerAttributes>.activities where activity.id == activityId {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
    #endif
  }

  /// Ends activities whose timers already elapsed or whose notification is gone (e.g. after a crash).
  static func endExpired() {
    #if canImport(ActivityKit)
    guard #available(iOS 16.2, *) else { return }
    Task {
      for activity in Activity<AvoCookTimerAttributes>.activities
      where activity.content.state.endsAt.addingTimeInterval(15 * 60) < Date() {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
    #endif
  }

  private static let key = "AvoCookTimerLiveActivities"
  private static let lock = NSLock()

  private static func store(_ activityId: String, for notificationId: String) {
    lock.lock(); defer { lock.unlock() }
    var map = UserDefaults.standard.dictionary(forKey: key) as? [String: String] ?? [:]
    map[notificationId] = activityId
    UserDefaults.standard.set(map, forKey: key)
  }

  private static func take(_ notificationId: String) -> String? {
    lock.lock(); defer { lock.unlock() }
    var map = UserDefaults.standard.dictionary(forKey: key) as? [String: String] ?? [:]
    let value = map.removeValue(forKey: notificationId)
    UserDefaults.standard.set(map, forKey: key)
    return value
  }
}
