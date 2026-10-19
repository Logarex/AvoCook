# Local kitchen features

All features below run on the device. Community challenges reuse the existing optional Firebase community. Source links open a browser only when requested.

## Everyday planning

The fourth bottom tab is My kitchen, between Recipes and Community. Navigation swipes follow the same order. Choose a week and a day, then add lunch or dinner. A recipe detail also offers Add to meal plan.

A meal can be a recipe, a simple meal with optional grocery lines for the whole meal, leftovers, or eating out. Leftovers and eating out never add ingredients to shopping. Mark meals as eaten to include them in history; unconfirmed plans are not treated as meals actually eaten.

Hold a recipe search result or a planned meal for 350 ms and drag it onto a visible day. A recipe drop creates dinner with its original servings. Moving an existing meal preserves its type, slot and servings. Tap offers an accessible alternative, including editing dates and portions. Dragging does not auto-scroll the calendar.

## Groceries and matching

The generated shopping preview scales recipes by servings and includes each planned occurrence. It consolidates exact ingredient identities with compatible mass or volume units. Known common ingredient names and plural forms work across the six supported languages. Different ingredients, mass versus volume, opaque units, ranges and ambiguous thousands separators are not guessed. Opaque lines show repetitions and scaling factors for manual checking.

In local shopping mode, Update this week's shopping replaces only that week's generated group in one persisted operation. Manual purchases and other weeks remain; identical lines preserve their IDs and checked states. An empty week can remove its previous generated group. Its source uses a random local namespace, not an account URL or username. Remote shopping modes offer explicit additions rather than an unsafe multi-request replacement.

Tonight accepts temporary comma-separated ingredient names as well as saved stock. Exact name matches are indicative: quantities and freshness are not verified. Past product dates are excluded. Fewer missing ingredients ranks first; use of products dated within three days breaks ties. Users can preview missing ingredients before adding them.

Tonight initially renders eight results and three missing ingredients per card; the shopping preview contains all missing lines. Further results load on request. Recipe pickers and seasonal suggestions also load progressively, with full recipe titles. Imported optional plural notation such as `Œuf(s)` and `Pomme(s) de terre` matches its ordinary food name.

Food profiles filter the personal recipe list and Tonight. Excluded words are matched against ingredient text. Vegetarian, vegan and gluten-free labels must be entered by the user in a recipe's private journal; unlabelled recipes are excluded when a label is required. None of these filters certifies allergy safety or detects cross-contamination.

## Cooking, stock and notes

Cooking mode keeps the screen awake, displays one step with a progress count, and lets the user reveal ingredients. Users assign a timer duration to a step rather than relying on extracted prose. Presets persist locally; running timers use the existing timer provider and native notification mechanism. They continue when changing steps or leaving the screen. Cooking-mode timers persist their deadline, pause state and notification identifier per account, so reopening uses the remaining time instead of scheduling a second alert. Expired timers reopen as finished. Persistence failures are visible. Backups omit active timer state on restore to avoid importing notification identifiers from another device. Verify a timer on a real device before relying on its background notification.

Speech uses only `SFSpeechRecognizer` with both support checking and `requiresOnDeviceRecognition` on iOS, or Android's `createOnDeviceSpeechRecognizer` on API 31+. There is no cloud fallback. Microphone permission is requested only on explicit activation. Whole-utterance commands support next, previous, ingredients, start timer and stop listening in all six app languages. Listening stops on backgrounding, exit or recognition error. Availability, installed language models and recognition accuracy depend on the device.

Optional stock reminders group product names by future reminder date, 9 am two days before the entered date, for at most the next 20 dates. Already-near dates stay visible in the stock list rather than being repeatedly notified. iOS uses ordinary local notifications, separate from timer alerts. Android uses inexact, idle-compatible alarms and restores future alarms after boot/app replacement. System settings and battery management can delay delivery. Tapping a reminder opens stock. Permission or scheduling failures are visible. Switching accounts cancels/reschedules this app's stock reminder group.

Journals are local and account-scoped. They store private ratings, comments, changes, difficulty, dietary labels, a manually entered cost in the user's currency, and preparation dates. Cost per serving uses the recipe's original yield. Private journal fields are not published or included in cookbooks. Unsaved notes are protected on back navigation and native back gestures.

## Catalogs, batching, menus and exports

The seasonal catalog contains 40 fruits and vegetables, for mainland France only. Users choose the country explicitly; unsupported countries are shown as unavailable rather than extrapolating French seasons. Data was checked on 18 October 2026 against [Santé publique France's calendar, printed page 13](https://www.mangerbouger.fr/content/show/2132/file/DT05-414-24B%20148-5fx210_GUIDE_40P_MANGER_BOUGER_4-11_ANS_bd_v2.pdf). Availability varies by region and harvest. Review the catalog before expanding countries.

Baking substitutions require explicit preparation context. Whole eggs in muffins and liquid unwhipped whites use proportions from [King Arthur Baking](https://www.kingarthurbaking.com/blog/2023/02/03/bake-egg-free). Flax as a binder and butter-to-oil volume ratios use the [Children's Hospital Los Angeles substitution guide](https://www.chla.org/sites/default/files/atoms/files/CHLA-Baking-Substitution-Guide.pdf). Egg calculations are limited to 1–3 eggs. Butter ratios use volume, never an assumed conversion from grams. Unsupported uses show no substitution; no recipe or shopping item is automatically rewritten. Textures can differ and substitutes can introduce other allergens.

Batch cooking selects 3–5 recipes, consolidates groceries, gathers shared ingredient quantities and equipment, and orders complete recipes by known duration, longest first. Unknown durations come last. Original cutting and cooking steps are preserved. There is no automatic parallel cooking or deduplication of unstructured cooking instructions.

Celebration menus suggest known starter/main/dessert categories, preferring occasion keywords. Missing course categories are not invented. Users choose the final menu and portions, save it, and schedule it on a selected date.

PDF cookbooks contain up to 50 selected recipes, in selection order, with a contents page, ingredients and steps. They exclude images and private notes and are generated locally. The full My kitchen JSON backup includes recipes, available local photos and private data. The standard Settings recipe backup remains recipe-only. Restore previews counts, imports recipes using existing duplicate handling, remaps references only when unambiguous, and replaces My kitchen data. Unresolved references remain unavailable. Reminders are disabled on restore. The previous My kitchen state can be restored from the same screen; recipe imports themselves are not undone.

Monthly challenges are friendly themes with public opt-in description markers, using the existing publication and moderation flow. Loaded entries rank by community rating and vote count. This is not a separately audited competition or prize system; rankings may change as further entries load.

## Development validation

Simulator visual checks on 19 October 2026 covered week navigation, returning to the current week, meal and recipe selection sheets, scrolling, and live Dynamic Type changes from the default setting to an accessibility size. Week controls use a separate date heading; days keep a minimum readable width with horizontal scrolling when necessary. Scrollable screen content keeps its intrinsic height, and text recalculates native measurements when the system font scale changes. The simulator text setting was restored after these checks.

Run `npm run typecheck`, `npm run lint`, and `npm test` (integration tests bind localhost). Rebuild native iOS and Android after prebuild/pod installation: the optional kitchen module is registered in the existing local native package.

A release still needs device testing of microphone consent/denial, unavailable offline languages, recognition with airplane mode enabled, background/locked-device notifications, Android reboot, accessibility text sizes, PDF export, backup round trips, and drag/drop with VoiceOver's tap alternatives. No claim of successful device permission/delivery testing should be inferred from passing unit tests or native compilation.
