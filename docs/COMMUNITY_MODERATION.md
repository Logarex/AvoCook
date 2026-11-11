# Community moderation and Firestore rules

The app only does part of the moderation work. This page lists what the client does and what must be enforced on the Firebase side before an App Store submission (guideline 1.2, user-generated content, and 5.1.1(v), account deletion).

## What the app does

- **Reporting** writes `communityRecipes/{id}/reports/{uid}`, increments `reportCount` and adds a `communityReports` entry for review. The confirmation is shown only after Firestore accepted the writes; a failure shows an error and the user stays on the recipe.
- **Automatic hiding**: at three reports the reporting client also sets `approved: false`. Hidden recipes are filtered out of lists, detail and caches.
- **Blocking** an author is stored only on the device (`community.blockedAuthors.v1`). Their recipes disappear from the community list and detail. Blocks are managed in Settings > Account.
- **Deleting community data** (Settings > Account) deletes the user's recipes and uploaded Storage images, their `pseudonyms` reservation, then the anonymous Firebase Auth user. Ratings (`ratings/{uid}`) and reports keep the old UID, which no longer maps to any account.

## What must be enforced on the server

The repository does not contain the deployed rules, which also cover shared shopping lists. Merge the community part below into the live rules rather than replacing them, then test with the Firebase emulator.

```
match /communityRecipes/{recipeId} {
  allow read: if resource.data.approved != false
    || (request.auth != null && resource.data.authorUid == request.auth.uid);

  allow create: if request.auth != null
    && request.resource.data.authorUid == request.auth.uid
    && request.resource.data.avgRating == 0
    && request.resource.data.ratingCount == 0
    && request.resource.data.reportCount == 0
    && request.resource.data.approved == true;

  // Authors edit their content but never counters or moderation state.
  allow update: if request.auth != null && (
    (resource.data.authorUid == request.auth.uid
      && !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['authorUid', 'avgRating', 'ratingCount', 'reportCount', 'approved']))
    // Votes: only the aggregate fields, with a matching rating document.
    || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['avgRating', 'ratingCount'])
      && existsAfter(/databases/$(database)/documents/communityRecipes/$(recipeId)/ratings/$(request.auth.uid)))
    // Reports: +1 per reporter, hiding allowed from the third report.
    || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reportCount', 'approved'])
      && request.resource.data.reportCount == resource.data.reportCount + 1
      && exists(/databases/$(database)/documents/communityRecipes/$(recipeId)/reports/$(request.auth.uid))
      && (request.resource.data.get('approved', true) == resource.data.get('approved', true)
        || (request.resource.data.approved == false && request.resource.data.reportCount >= 3)))
  );

  allow delete: if request.auth != null && resource.data.authorUid == request.auth.uid;

  match /ratings/{uid} {
    allow read: if request.auth != null && request.auth.uid == uid;
    allow write: if request.auth != null && request.auth.uid == uid
      && request.resource.data.stars is int
      && request.resource.data.stars >= 1 && request.resource.data.stars <= 5;
  }
  match /reports/{uid} {
    allow read: if request.auth != null && request.auth.uid == uid;
    allow create: if request.auth != null && request.auth.uid == uid;
  }
}

match /communityReports/{reportId} {
  allow create: if request.auth != null && request.resource.data.reportedByUid == request.auth.uid;
  allow read, update, delete: if false; // Console or Admin SDK only.
}

match /pseudonyms/{key} {
  allow read: if true;
  allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid
    && (resource == null || resource.data.uid == request.auth.uid);
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

The report rule above trusts the third reporter to hide a recipe. A Cloud Function triggered on `reports/{uid}` creation is a stronger alternative: it can count reports server-side and set `approved: false` with the Admin SDK, so clients never write `approved`.

Storage rules should allow `community_images/*` uploads only from signed-in users, limit size and content type (`image/jpeg`), and allow deletion by the uploader. Store the uploader UID in the object metadata if you want to enforce it.

## Review process

- Check `communityReports` with `status == "pending_review"` at least daily; Apple expects reported content to be acted on within 24 hours.
- To remove content, set `approved: false` or delete the recipe from the console. To ban a UID, add it to a server-side denylist checked by the rules (`!exists(/databases/$(database)/documents/bannedUsers/$(request.auth.uid))`).
- The in-app contact address (`avocook@nephoos.com`) must stay monitored for objections and removal requests.
