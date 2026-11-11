import ExpoModulesCore
import UIKit

/// Switches between the default app icon and the alternate icons that
/// tools/plugins/withAlternateAppIcons.js adds to the asset catalog.
public class AvoCookAppIconModule: Module {
  private static let iconSets = [
    "carrot": "AppIcon-Carrot",
    "cookbook": "AppIcon-Cookbook",
    "plate": "AppIcon-Plate",
  ]

  public func definition() -> ModuleDefinition {
    Name("AvoCookAppIcon")

    AsyncFunction("supportsAlternateIcons") { () -> Bool in
      UIApplication.shared.supportsAlternateIcons
    }.runOnQueue(.main)

    AsyncFunction("getAppIcon") { () -> String? in
      guard let current = UIApplication.shared.alternateIconName else { return nil }
      return Self.iconSets.first { $0.value == current }?.key
    }.runOnQueue(.main)

    AsyncFunction("setAppIcon") { (icon: String?, promise: Promise) in
      let iconSet: String?
      if let icon {
        guard let name = Self.iconSets[icon] else {
          promise.reject("ERR_UNKNOWN_ICON", "Unknown app icon: \(icon)")
          return
        }
        iconSet = name
      } else {
        iconSet = nil
      }
      guard UIApplication.shared.supportsAlternateIcons else {
        promise.reject("ERR_UNSUPPORTED", "Alternate icons are not supported")
        return
      }
      if UIApplication.shared.alternateIconName == iconSet {
        promise.resolve(true)
        return
      }
      UIApplication.shared.setAlternateIconName(iconSet) { error in
        if let error {
          promise.reject("ERR_SET_ICON", error.localizedDescription)
        } else {
          promise.resolve(true)
        }
      }
    }.runOnQueue(.main)
  }
}
