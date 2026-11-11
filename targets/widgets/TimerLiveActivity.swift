import ActivityKit
import SwiftUI
import WidgetKit

struct TimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AvoCookTimerAttributes.self) { context in
      TimerLockScreenView(context: context)
        .padding(16)
        .activityBackgroundTint(Color("$widgetBackground"))
        .activitySystemActionForegroundColor(Color("avocookPrimary"))
        .widgetURL(recipeURL(context.attributes.recipeId))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "timer").foregroundStyle(Color("avocookPrimary")).font(.title2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Countdown(state: context.state, stale: context.isStale)
            .font(.title2.monospacedDigit().weight(.semibold))
            .frame(maxWidth: 110, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.recipeName).font(.headline).lineLimit(1)
            Text(context.state.label).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      } compactLeading: {
        Image(systemName: "timer").foregroundStyle(Color("avocookPrimary"))
      } compactTrailing: {
        Countdown(state: context.state, stale: context.isStale)
          .monospacedDigit()
          .frame(maxWidth: 56)
      } minimal: {
        Image(systemName: "timer").foregroundStyle(Color("avocookPrimary"))
      }
      .widgetURL(recipeURL(context.attributes.recipeId))
      .keylineTint(Color("avocookPrimary"))
    }
  }
}

private struct TimerLockScreenView: View {
  let context: ActivityViewContext<AvoCookTimerAttributes>
  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: "timer")
        .font(.title)
        .foregroundStyle(Color("avocookPrimary"))
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        Text(context.attributes.recipeName).font(.headline).lineLimit(1)
        Text(context.state.label).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
      }
      Spacer(minLength: 8)
      Countdown(state: context.state, stale: context.isStale)
        .font(.title.monospacedDigit().weight(.semibold))
        .multilineTextAlignment(.trailing)
    }
  }
}

private struct Countdown: View {
  let state: AvoCookTimerAttributes.ContentState
  let stale: Bool
  var body: some View {
    if stale || state.endsAt <= Date() {
      Image(systemName: "checkmark.circle.fill")
        .foregroundStyle(Color("avocookPrimary"))
        .accessibilityLabel(Text("Done"))
    } else {
      Text(timerInterval: Date()...state.endsAt, countsDown: true)
    }
  }
}

func recipeURL(_ recipeId: String) -> URL? {
  var components = URLComponents()
  components.scheme = "avocook"
  components.host = "recipe"
  components.path = "/" + recipeId
  return components.url
}
