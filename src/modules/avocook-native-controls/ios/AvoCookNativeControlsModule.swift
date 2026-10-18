import ExpoModulesCore
import UIKit

struct TabItemRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var symbol: String = ""
}

public final class AvoCookNativeControlsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AvoCookNativeControls")
    View(NativeTabBarView.self) {
      Events("onSelect")
      Prop("items") { (view, items: [TabItemRecord]) in view.setItems(items) }
      Prop("selected") { (view, selected: String) in view.select(selected) }
      Prop("tintColor") { (view, color: UIColor) in view.tabBar.tintColor = color }
      Prop("unselectedTintColor") { (view, color: UIColor) in view.tabBar.unselectedItemTintColor = color }
      Prop("colorScheme") { (view, scheme: String) in
        view.overrideUserInterfaceStyle = scheme == "dark" ? .dark : .light
      }
    }
  }
}

final class NativeTabBarView: ExpoView, UITabBarControllerDelegate {
  private let controller = UITabBarController()
  var tabBar: UITabBar { controller.tabBar }
  let onSelect = EventDispatcher()
  private var items: [TabItemRecord] = []
  private var selected = ""

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    controller.view.backgroundColor = .clear
    tabBar.backgroundColor = .clear
    tabBar.isTranslucent = true
    controller.delegate = self
    addSubview(controller.view)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    controller.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      controller.willMove(toParent: nil)
      controller.removeFromParent()
    } else if controller.parent == nil {
      var responder = next
      while let current = responder {
        if let parent = current as? UIViewController {
          parent.addChild(controller)
          controller.didMove(toParent: parent)
          break
        }
        responder = current.next
      }
    }
  }

  func setItems(_ items: [TabItemRecord]) {
    self.items = items
    controller.setViewControllers(items.enumerated().map { index, item in
      let image = UIImage(systemName: item.symbol)
      let tab = UITabBarItem(title: item.title, image: image, tag: index)
      tab.selectedImage = UIImage(systemName: item.symbol + ".fill") ?? image
      tab.accessibilityIdentifier = item.id
      let page = UIViewController()
      page.view.backgroundColor = .clear
      page.tabBarItem = tab
      return page
    }, animated: false)
    select(selected)
  }

  func select(_ id: String) {
    selected = id
    if let index = items.firstIndex(where: { $0.id == id }) {
      controller.selectedIndex = index
    }
  }

  func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
    let index = tabBarController.selectedIndex
    guard items.indices.contains(index) else { return }
    onSelect(["id": items[index].id])
  }
}
