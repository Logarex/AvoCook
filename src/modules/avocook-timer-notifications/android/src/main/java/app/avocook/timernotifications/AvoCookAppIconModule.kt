package app.avocook.timernotifications

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Switches the launcher icon by enabling one of the activity-aliases that
 * tools/plugins/withAlternateAppIcons.js declares. The switch is applied when
 * the app goes to the background: toggling the launcher component of the
 * running task while it is in front can make some launchers close the app.
 */
class AvoCookAppIconModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val preferences
    get() = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("AvoCookAppIcon")

    AsyncFunction("supportsAlternateIcons") { true }

    AsyncFunction("getAppIcon") {
      if (preferences.contains(PENDING_KEY)) {
        return@AsyncFunction preferences.getString(PENDING_KEY, null)?.takeIf { it in ICONS }
      }
      ICONS.firstOrNull { icon ->
        context.packageManager.getComponentEnabledSetting(component(icon)) ==
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED
      }
    }

    AsyncFunction("setAppIcon") { icon: String? ->
      if (icon != null && icon !in ICONS) {
        throw CodedException("ERR_UNKNOWN_ICON", "Unknown app icon: $icon", null)
      }
      preferences.edit().putString(PENDING_KEY, icon ?: DEFAULT).apply()
      true
    }

    OnActivityEntersBackground {
      applyPendingIcon()
    }
  }

  private fun applyPendingIcon() {
    val pending = preferences.getString(PENDING_KEY, null) ?: return
    val selected = pending.takeIf { it in ICONS }
    val packageManager = context.packageManager
    // Enable the new launcher entry before disabling the others so the app
    // always has one.
    packageManager.setComponentEnabledSetting(
      component(selected),
      if (selected == null) PackageManager.COMPONENT_ENABLED_STATE_DEFAULT
      else PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
      PackageManager.DONT_KILL_APP,
    )
    (listOf<String?>(null) + ICONS).filter { it != selected }.forEach { icon ->
      packageManager.setComponentEnabledSetting(
        component(icon),
        if (icon == null) PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        else PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,
        PackageManager.DONT_KILL_APP,
      )
    }
    preferences.edit().remove(PENDING_KEY).apply()
  }

  private fun component(icon: String?): ComponentName {
    val suffix = icon?.replaceFirstChar { it.uppercase() } ?: "Default"
    return ComponentName(context.packageName, "${context.packageName}.MainActivity$suffix")
  }

  companion object {
    private const val PREFERENCES = "avocook.appIcon"
    private const val PENDING_KEY = "pending"
    private const val DEFAULT = "default"
    private val ICONS = listOf("carrot", "cookbook", "plate")
  }
}
