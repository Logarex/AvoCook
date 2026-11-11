import AppIntents
internal import AvoCookTimerNotifications
import Foundation

// Siri and Shortcuts actions. Each one opens AvoCook on an avocook:// link
// handled in src/features/linking/appLinks.ts, so the app stays the single
// place where recipes, meals and shopping lists are changed.

@available(iOS 16.0, *)
private func openAvoCook(_ path: String, query: [URLQueryItem] = []) async {
  var components = URLComponents()
  components.scheme = "avocook"
  components.host = path
  components.queryItems = query.isEmpty ? nil : query
  guard let url = components.url else { return }
  AvoCookKitchenModule.openLink(url.absoluteString)
}

@available(iOS 16.0, *)
struct AddToShoppingListIntent: AppIntent {
  static var title: LocalizedStringResource = "Add to shopping list"
  static var description = IntentDescription("Adds an item to the AvoCook shopping list.")
  static var openAppWhenRun = true

  @Parameter(title: "Item")
  var item: String

  static var parameterSummary: some ParameterSummary {
    Summary("Add \(\.$item) to the shopping list")
  }

  func perform() async throws -> some IntentResult {
    await openAvoCook("shopping", query: [URLQueryItem(name: "add", value: item)])
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenTodayIntent: AppIntent {
  static var title: LocalizedStringResource = "Open today's meals"
  static var description = IntentDescription("Shows what is planned today in AvoCook.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await openAvoCook("today")
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenShoppingListIntent: AppIntent {
  static var title: LocalizedStringResource = "Open shopping list"
  static var description = IntentDescription("Opens the AvoCook shopping list.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await openAvoCook("shopping")
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenStockIntent: AppIntent {
  static var title: LocalizedStringResource = "Open food stock"
  static var description = IntentDescription("Shows the fridge, cupboard and freezer in AvoCook.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await openAvoCook("stock")
    return .result()
  }
}

@available(iOS 16.0, *)
struct AvoCookShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddToShoppingListIntent(),
      phrases: ["Add to my \(.applicationName) shopping list", "Add an item in \(.applicationName)"]
    )
    AppShortcut(
      intent: OpenTodayIntent(),
      phrases: ["What's for dinner in \(.applicationName)", "Open today's meals in \(.applicationName)"]
    )
    AppShortcut(
      intent: OpenShoppingListIntent(),
      phrases: ["Open my \(.applicationName) shopping list"]
    )
    AppShortcut(
      intent: OpenStockIntent(),
      phrases: ["What's in my fridge in \(.applicationName)"]
    )
  }
}
