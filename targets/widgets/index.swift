import SwiftUI
import WidgetKit

@main
struct AvoCookWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    TimerLiveActivity()
  }
}
