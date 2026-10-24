# Local kitchen features

The planning, stock, matching and cooking tools run on the device. The optional fridge AI assistant contacts the provider configured by the user, only on explicit request. Barcode lookup contacts Open Food Facts on request. Source links open a browser only when requested.

## Everyday planning

Five tabs: Recipes, My kitchen, Meal plan, Community and Shopping. My kitchen brings together supplies and meal ideas; Meal plan opens on Today and also covers the week and meal history. Optional tools are grouped under each tab’s wrench button. Meal history is directly accessible in Planning. Choose a week and a day to add lunch or dinner. Recipe details link directly to Meal plan.

A simple meal needs only a name to save; grocery lines and date/serving controls are optional. Today offers editable meal combinations even with an empty recipe library, and can reuse previously recorded simple meals. Stock with upcoming dates has direct idea, leftover planning and consumption actions, including undo.

The daily date refreshes at local midnight and when the app returns to the foreground; it does not poll in the background. Explicit ingredient searches only show recipes using at least one entered ingredient. Stock consumption can also be undone from the food list. The new Today screen, one-field meal editor and ingredient search were checked in the iOS simulator; draft test entries were closed without saving.

A meal can be a recipe, a simple meal with optional grocery lines for the whole meal, leftovers, or eating out. Leftovers and eating out never add ingredients to shopping. Mark meals as eaten to include them in history; unconfirmed plans are not treated as meals actually eaten.

Hold a recipe search result or a planned meal for 350 ms and drag it onto a visible day. A recipe drop creates dinner with its original servings. Moving an existing meal preserves its type, slot and servings. Tap offers an accessible alternative, including editing dates and portions. Dragging does not auto-scroll the calendar.

## Groceries and matching

The generated shopping preview scales recipes by servings and includes each future, uncompleted planned occurrence. Users select which lines to buy before confirming. Exact stock matches are marked; an explicit action can deselect them, with a reminder to check quantities. It consolidates exact ingredient identities with compatible mass or volume units. Known common ingredient names and plural forms work across the six supported languages. Different ingredients, mass versus volume, opaque units, ranges and ambiguous thousands separators are not guessed. Opaque lines show repetitions and scaling factors for manual checking.

In local shopping mode, Update this week's shopping replaces only that week's generated group in one persisted operation. Manual purchases and other weeks remain; identical lines preserve their IDs and checked states. An empty week can remove its previous generated group. Its source uses a random local namespace, not an account URL or username. Remote shopping modes offer explicit additions rather than an unsafe multi-request replacement.

Tonight accepts temporary comma-separated ingredient names as well as saved stock. Exact name matches are indicative: quantities and freshness are not verified. Past product dates are excluded. Fewer missing ingredients ranks first; use of products dated within three days breaks ties. Users can preview missing ingredients before adding them.

Tonight initially renders eight results and three missing ingredients per card; the shopping preview contains all missing lines. Further results load on request. Recipe pickers and seasonal suggestions also load progressively, with full recipe titles. Imported optional plural notation such as `Œuf(s)` and `Pomme(s) de terre` matches its ordinary food name.

Food profiles filter the personal recipe list and Tonight. Excluded words are matched against ingredient text. Vegetarian, vegan and gluten-free labels must be entered by the user in a recipe's private journal; unlabelled recipes are excluded when a label is required. None of these filters certifies allergy safety or detects cross-contamination.

## Optional fridge AI assistant

The optional tools in Meal ideas offer a recipe draft from entered ingredients or a fridge/leftovers photo. It reuses the Assistant API key, provider and model. Without a key, the screen links to Assistant settings. Provider charges may apply; the local kitchen tools remain available without AI.

Selecting a photo does not upload it. Analyze sends the chosen JPEG to the configured vision-capable model. Recognized food names become editable text; uncertain names stay separate. Users check this list before explicitly generating a recipe, with portions, target time and visible editable preferences. Stock is imported only on request, excluding past dates. Photo data is cleared from screen state after analysis and is not attached to the recipe or saved in My kitchen data.

Generation sends the confirmed text and constraints, then displays a draft. Edit and save opens the existing recipe editor; saving is explicit and follows the normal recipe storage/sync settings. Neither groceries nor stock is modified automatically. Model output cannot supply recipe IDs, images or source URLs. Ingredient quantities, cooking guidance and dietary compatibility still need user review; image recognition cannot verify freshness or allergens.

Requests have a 60-second limit, cancellation, no automatic paid retries and no provider fallback. Changing account or assistant configuration cancels pending work; late responses are ignored. Provider failures preserve input and show translated recovery guidance. The full photo is preserved by disabling square cropping; JPEG payloads above approximately 4.5 MB are rejected before upload. Image requests use the existing provider adapters; see [OpenAI image input documentation](https://developers.openai.com/api/docs/guides/images-vision).

Automated tests mock providers and cover all six app languages, provider request formats, rejected keys, quotas, malformed responses, timeout/cancellation, photo review, draft handoff and explicit saving. The iOS simulator check covered entry and the no-key setup state. No live paid provider request or real-device camera test was performed.

## Cooking, stock and notes

Cooking mode keeps the screen awake, displays one step with a progress count, and lets the user reveal ingredients. Users assign a timer duration to a step rather than relying on extracted prose. Presets persist locally; running timers use the existing timer provider and native notification mechanism. They continue when changing steps or leaving the screen. Cooking-mode timers persist their deadline, pause state and notification identifier per account, so reopening uses the remaining time instead of scheduling a second alert. Expired timers reopen as finished. Persistence failures are visible. Backups omit active timer state on restore to avoid importing notification identifiers from another device. Verify a timer on a real device before relying on its background notification.

Speech uses only `SFSpeechRecognizer` with both support checking and `requiresOnDeviceRecognition` on iOS, or Android's `createOnDeviceSpeechRecognizer` on API 31+. There is no cloud fallback. Microphone permission is requested only on explicit activation. Whole-utterance commands support next, previous, ingredients, start timer and stop listening in all six app languages. Listening stops on backgrounding, exit or recognition error. Availability, installed language models and recognition accuracy depend on the device.

Optional stock reminders group product names by future reminder date, 9 am two days before the entered date, for at most the next 20 dates. Already-near dates stay visible in the stock list rather than being repeatedly notified. iOS uses ordinary local notifications, separate from timer alerts. Android uses inexact, idle-compatible alarms and restores future alarms after boot/app replacement. System settings and battery management can delay delivery. Tapping a reminder opens stock. Permission or scheduling failures are visible. Switching accounts cancels/reschedules this app's stock reminder group.

Journals are local and account-scoped. They store private ratings, comments, changes, difficulty, dietary labels, a manually entered cost in the user's currency, and preparation dates. Cost per serving uses the recipe's original yield. Private journal fields are not published or included in cookbooks. Unsaved notes are protected on back navigation and native back gestures.

## Catalogs, batching, menus and exports

The offline seasonal catalog contains 67 produce identities and independently sourced selections for 11 countries. The available areas are mainland France, Wallonia (Belgium), Switzerland, Germany, Spain, Italy, the UK, Denmark, Ontario (Canada), New York State (USA), and Sydney (Australia). These regional calendars must not be presented as national coverage. Other areas show an explicit unavailable state. No location permission, language-based country inference, external API or hemisphere shifting is used. See [catalog sources and maintenance](SEASONAL_CATALOG.md).

Choose an area and month, search or filter fruit/vegetables, then tick products. Recipe suggestions match at least one selected product, or any product for the month when nothing is selected. Matches use recognized ingredient names, with longest names first and conservative exclusion of known processed-food terms; they never certify that a whole recipe is seasonal. Shopping additions require a separate button and use the existing mode's duplicate handling. No quantities are invented. Changing the month or area clears selection; account changes reset private form state. The current month follows local midnight/app foreground updates when no other month is selected. Sources and scope are available in the screen. The linked calendars distinguish harvest, storage, main local supply, or market availability in different ways; the interface states the source's basis rather than treating all calendars as identical.

Baking substitutions require explicit preparation context. Whole eggs in muffins and liquid unwhipped whites use proportions from [King Arthur Baking](https://www.kingarthurbaking.com/blog/2023/02/03/bake-egg-free). Flax as a binder and butter-to-oil volume ratios use the [Children's Hospital Los Angeles substitution guide](https://www.chla.org/sites/default/files/atoms/files/CHLA-Baking-Substitution-Guide.pdf). Egg calculations are limited to 1–3 eggs. Butter ratios use volume, never an assumed conversion from grams. Unsupported uses show no substitution; no recipe or shopping item is automatically rewritten. Textures can differ and substitutes can introduce other allergens.

Batch cooking selects 3–5 recipes, consolidates groceries, gathers shared ingredient quantities and equipment, and orders complete recipes by known duration, longest first. Unknown durations come last. Original cutting and cooking steps are preserved. There is no automatic parallel cooking or deduplication of unstructured cooking instructions.

Celebration menus suggest known starter/main/dessert categories, preferring occasion keywords. Missing course categories are not invented. Users choose the final menu and portions, save it, and schedule it on a selected date.

PDF cookbooks contain up to 50 selected recipes, in selection order, with a contents page, ingredients and steps. They exclude images and private notes and are generated locally. The full My kitchen JSON backup includes recipes, available local photos and private data. The standard Settings recipe backup remains recipe-only. Restore previews counts, imports recipes using existing duplicate handling, remaps references only when unambiguous, and replaces My kitchen data. Unresolved references remain unavailable. Reminders are disabled on restore. The previous My kitchen state can be restored from the same screen; recipe imports themselves are not undone.

The monthly challenge interface was removed to keep the community focused on finding and sharing recipes. Existing published descriptions are preserved.

## Development validation

Simulator visual checks on 19 October 2026 covered week navigation, returning to the current week, meal and recipe selection sheets, scrolling, and live Dynamic Type changes from the default setting to an accessibility size. Week controls use a separate date heading; days keep a minimum readable width with horizontal scrolling when necessary. Scrollable screen content keeps its intrinsic height, and text recalculates native measurements when the system font scale changes. The simulator text setting was restored after these checks.

Run `npm run typecheck`, `npm run lint`, and `npm test` (integration tests bind localhost). Rebuild native iOS and Android after prebuild/pod installation: the optional kitchen module is registered in the existing local native package.

A release still needs device testing of microphone consent/denial, unavailable offline languages, recognition with airplane mode enabled, background/locked-device notifications, Android reboot, accessibility text sizes, PDF export, backup round trips, and drag/drop with VoiceOver's tap alternatives. No claim of successful device permission/delivery testing should be inferred from passing unit tests or native compilation.

## Food supplies in 5.0.0

Fridge, pantry and freezer, with search, quantities and dates. Scan a barcode or enter food manually. Nutri-Score and Green-Score from Open Food Facts when available; optional local reminders. Enter the date printed on the pack yourself. Product records and scores may be missing and do not constitute a complete product analysis. Product lookup needs Internet; supplies and planning stay local. Notifications depend on device permissions.

Foods are grouped by fridge, pantry and freezer, sorted by date, then by name. Search ignores case and accents. Each row opens details and actions; marking food as used supports undo. Barcode lookup only fills the name, quantity and available grades, never the date. Camera frames are processed on the device. The barcode and app language are sent to Open Food Facts; inventory and dates are not sent. Unknown products can be entered manually. Product metadata is preserved in full kitchen backups.

## Everyday audit, 24 October 2026

See [the detailed audit](KITCHEN_AUDIT.md). Inventory supports bulk name entry, duplicate-batch warnings, and Save and next. Shopping can inspect stock or look up a barcode and hand off an unsaved product draft to My kitchen. Product nutrition details are saved with available grades; missing data remains absent.

Planning history supports a private note per meal, optional recipe links for simple meals, leftovers and outings, and repetition without copying old memories. Journal entry exposes the date and lunch/dinner directly. Search understands exact dates and meal names in all six app languages, with optional date and slot filters. Dates are day/month/year (or ISO); invalid dates never roll into another month. Every entry displays its year. Optional recipe links never change shopping generation. Future meals cannot be confirmed as eaten through editing, confirmation buttons or dragging an eaten meal.
