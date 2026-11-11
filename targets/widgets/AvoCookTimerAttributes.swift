import ActivityKit
import Foundation

// Must stay identical (name and fields) to
// src/modules/avocook-timer-notifications/ios/AvoCookLiveActivities.swift.
public struct AvoCookTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var endsAt: Date
    public var label: String
  }
  public var recipeName: String
  public var recipeId: String
}
