import SwiftUI
import WidgetKit

/// Snapshot written by the app (src/features/kitchen/widgetSnapshot.ts) into the shared App Group.
struct TodaySnapshot: Codable {
  struct Meal: Codable, Hashable { let slot: String; let title: String; let recipeId: String? }
  struct Food: Codable, Hashable { let name: String; let days: Int }
  let date: String
  let meals: [Meal]
  let expiring: [Food]
  let shopping: Int
  let labels: Labels
  struct Labels: Codable {
    let title: String
    let noMeal: String
    let expiring: String
    let shopping: String
    let lunch: String
    let dinner: String
    let empty: String
  }
}

private let appGroup = "group.org.epimac.avocook"
private let snapshotKey = "todaySnapshot"

struct TodayEntry: TimelineEntry {
  let date: Date
  let snapshot: TodaySnapshot?
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry { TodayEntry(date: Date(), snapshot: nil) }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: Date(), snapshot: load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let entry = TodayEntry(date: Date(), snapshot: load())
    // The app reloads the widget after each change; refresh after midnight so "today" stays true.
    let tomorrow = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400)).addingTimeInterval(60)
    completion(Timeline(entries: [entry], policy: .after(tomorrow)))
  }

  private func load() -> TodaySnapshot? {
    guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(TodaySnapshot.self, from: data)
  }
}

struct TodayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "AvoCookToday", provider: TodayProvider()) { entry in
      TodayView(entry: entry)
        .widgetURL(URL(string: "avocook://today"))
        .modifier(WidgetBackground())
    }
    .configurationDisplayName("AvoCook")
    .description("Today's meals, food to use soon and your shopping list.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

private struct WidgetBackground: ViewModifier {
  func body(content: Content) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(Color("$widgetBackground"), for: .widget)
    } else {
      content.padding().background(Color("$widgetBackground"))
    }
  }
}

private struct TodayView: View {
  @Environment(\.widgetFamily) private var family
  let entry: TodayEntry

  private var isToday: Bool {
    guard let snapshot = entry.snapshot else { return false }
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.dateFormat = "yyyy-MM-dd"
    return snapshot.date == formatter.string(from: entry.date)
  }

  var body: some View {
    if let snapshot = entry.snapshot {
      VStack(alignment: .leading, spacing: 6) {
        Label(snapshot.labels.title, systemImage: "fork.knife")
          .font(.caption.weight(.semibold))
          .foregroundStyle(Color("avocookPrimary"))
        let meals = isToday ? snapshot.meals : []
        if meals.isEmpty {
          Text(snapshot.labels.noMeal).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
        } else {
          ForEach(meals.prefix(family == .systemSmall ? 2 : 3), id: \.self) { meal in
            VStack(alignment: .leading, spacing: 0) {
              Text(meal.slot == "lunch" ? snapshot.labels.lunch : snapshot.labels.dinner)
                .font(.caption2).foregroundStyle(.secondary)
              Text(meal.title).font(.subheadline.weight(.medium)).lineLimit(1)
            }
          }
        }
        Spacer(minLength: 0)
        if family != .systemSmall, !snapshot.expiring.isEmpty {
          Text("\(snapshot.labels.expiring) \(snapshot.expiring.prefix(3).map(\.name).joined(separator: ", "))")
            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
        }
        Label("\(snapshot.shopping) \(snapshot.labels.shopping)", systemImage: "cart")
          .font(.caption).foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    } else {
      VStack(alignment: .leading, spacing: 6) {
        Image(systemName: "fork.knife").foregroundStyle(Color("avocookPrimary"))
        Text("AvoCook").font(.headline)
        Text("Open AvoCook to show today's meals.").font(.caption).foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }
}
