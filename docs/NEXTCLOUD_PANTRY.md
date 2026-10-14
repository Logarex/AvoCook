# Shopping modes and Nextcloud Pantry

AvoCook has one active shopping list, with one backend at a time:

- **Local only** (the default): existing on-device behavior, including the optional iOS Reminders integration.
- **AvoCook sharing**: the existing Firebase sharing system and six-character invitation code.
- **Nextcloud Pantry**: a household list on the connected Nextcloud server. Pantry replaces the list displayed in the Shopping tab; additions from recipes and list edits go directly there. Firebase sharing does not receive Pantry updates. On Apple devices, the optional Apple Reminders sync works with all three modes.

Open **Shopping → Shopping list mode**, or the same control in Settings. The mode button has the same appearance and action in all modes; the Pantry list name sits beside it. The separate people shortcut has been removed: AvoCook sharing is configured by choosing that mode, and Apple Reminders controls are available directly in the common mode menu. Existing Firebase connections are restored when upgrading. An old standalone Pantry cache does not silently activate Pantry.

## Switching modes

All modes use the same Shopping screen, rows, item input and navigation. Choose a mode in a single sheet; Pantry lists load immediately, grouped by household, and selecting a list carries the current courses over. Creating a list is optional; the household choice is only shown when creating a list in an account with multiple households. Back returns to the mode choices inside the same sheet; closing cancels configuration. No Pantry screen is added to the navigation stack.

All current items are carried over, **including checked items**. Destination articles are preserved. Matching uses normalized label (including quantity), checked state and multiplicity, so intentional repeated entries are retained. Pantry descriptions receive recipe names. Moving back to local or into a Firebase share carries the active Pantry list, with quantities included in the labels.

The source stays active until destination data and the new mode have both been saved. A local migration journal records accepted IDs and pending writes so that retries reconcile POST/toggle responses lost after server acceptance. A failed migration can leave copied articles in the destination, but keeps the source mode and list available. The source list is never deleted from Pantry by switching away. Firebase membership is left after a successful switch, using the existing participant behavior.

Only one subscription is active. Pending Firebase pushes are flushed when possible; stale callbacks are ignored after switching. If the old Firebase server is unavailable, its on-device list can still move into local mode. A failed switch does not allow an old Firebase snapshot to replace unsent source edits.

## Pantry features

The main Shopping tab supports adding, checking, deleting and sharing articles as text. The item editor supports name, quantity, description, category, daily/weekly/monthly recurrence and deletion on completion. Reordering is available in the editor. Existing custom recurrence rules, images, prices, stores, labels and custom fields are preserved by narrow patches. The dedicated Pantry completion endpoint applies its native recurrence/deletion rules.

Apple Reminders is an optional companion to the active backend: app/server changes are exported, and native additions, names, completion and deletions are imported into local, Firebase or Pantry. Carried items retain their native reminder IDs across backend/list changes. Native requests finishing after a switch are discarded, and imported Firebase changes still propagate to the shared list. Pantry quantities and metadata are preserved when a reminder rename retains the quantity prefix; changing the whole title replaces that combined label without duplicating the old quantity. Read-only/check-only Pantry permissions also apply to imports from Reminders. Offline Pantry caches never overwrite the Apple list.

Granular household permissions and view-only shares control available actions. Lists refresh on focus, when returning to the foreground, every 30 seconds while visible, and on pull-to-refresh. Periodic refresh pauses while typing or editing.

The latest successful Pantry contents are cached per Nextcloud server/account. Offline copies are read-only; switching back to local carries that available copy. Logging out or changing Nextcloud accounts does not copy private Pantry contents into the global local list. Caches remain available to the owning account for later use.

## API and validation

Uses existing Nextcloud credentials with Basic authentication, `OCS-APIRequest: true`, JSON negotiation and `/ocs/v2.php/apps/pantry/api`. Requests time out after 15 seconds. App passwords are never stored in the Pantry cache or migration journal. Pantry data only reaches another backend when the user explicitly switches to it.

The implementation follows the [official OpenAPI contract](https://github.com/chenasraf/nextcloud-pantry/blob/master/openapi.json) and [permission middleware](https://github.com/chenasraf/nextcloud-pantry/blob/master/lib/Middleware/PermissionMiddleware.php). Mutation replay is never automatic. Journals reduce duplicates after lost responses; simultaneous migrations from different devices remain subject to the server's lack of idempotency keys.

Validation: client contract/error tests, mode-controller and rollback tests, provider and screen interaction tests, account/cache isolation, transactional Firebase joining and local HTTP OCS transport tests. Run `npm test`, `npm run typecheck`, `npm run lint`, and `CI=1 npx expo export --platform ios --platform android --output-dir /tmp/avocook-shopping-modes-export`.

HTTP tests use a controlled fixture rather than an installed Nextcloud instance. Release checks on a real instance should include an admin, a check-only member, a read-only share, Pantry absent, airplane mode and a server subdirectory. Visual checks cover the mobile layout; native device checks should also include large text and keyboard entry.
