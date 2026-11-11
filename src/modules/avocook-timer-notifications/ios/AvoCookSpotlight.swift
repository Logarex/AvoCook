import CoreSpotlight
import Foundation
import UniformTypeIdentifiers

/// Indexes saved recipes on the device so they can be found from the iPhone search.
enum AvoCookSpotlight {
  static let domain = "org.epimac.avocook.recipes"
  private struct Entry: Decodable {
    let id: String
    let title: String
    let summary: String
    let keywords: [String]
  }

  static func replace(json: String, completion: @escaping (Bool) -> Void) {
    guard CSSearchableIndex.isIndexingAvailable(),
          let data = json.data(using: .utf8),
          let entries = try? JSONDecoder().decode([Entry].self, from: data) else {
      completion(false)
      return
    }
    let items = entries.map { entry -> CSSearchableItem in
      let attributes = CSSearchableItemAttributeSet(contentType: UTType.content)
      attributes.title = entry.title
      attributes.contentDescription = entry.summary
      attributes.keywords = entry.keywords
      return CSSearchableItem(uniqueIdentifier: entry.id, domainIdentifier: domain, attributeSet: attributes)
    }
    let index = CSSearchableIndex.default()
    index.deleteSearchableItems(withDomainIdentifiers: [domain]) { _ in
      guard !items.isEmpty else { completion(true); return }
      index.indexSearchableItems(items) { error in completion(error == nil) }
    }
  }

  static func clear(completion: @escaping (Bool) -> Void) {
    CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: [domain]) { error in
      completion(error == nil)
    }
  }

  /// Turns a Spotlight tap into the same avocook://recipe/<id> link the app already understands.
  static func open(_ activity: NSUserActivity) -> Bool {
    guard activity.activityType == CSSearchableItemActionType,
          let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String else { return false }
    var components = URLComponents()
    components.scheme = "avocook"
    components.host = "recipe"
    components.path = "/" + id
    guard let url = components.url else { return false }
    AvoCookKitchenModule.openLink(url.absoluteString)
    return true
  }
}
