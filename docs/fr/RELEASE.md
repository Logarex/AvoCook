# Checklist de version

Une liste à parcourir avant de publier une nouvelle version. Suivez chaque étape dans l'ordre.

---

## 1 — Préparer

- [ ] Mettre à jour le numéro de version dans [`app.json`](../../app.json) et [`package.json`](../../package.json).
- [ ] Mettre à jour le numéro de build (`buildNumber`) dans `app.json` pour iOS si nécessaire.
- [ ] Relire [`PRIVACY.md`](../../PRIVACY.md) et vérifier si une nouvelle fonctionnalité réseau ou de stockage doit être documentée.
- [ ] Vérifier que les icônes et l'écran de démarrage sont corrects et s'affichent bien en mode clair et sombre.

---

## 2 — Vérifications locales

```bash
npm run typecheck   # Aucune erreur TypeScript
npm test            # Tous les tests passent
npm run lint        # Aucun avertissement ESLint
```

Tester un import d'URL en particulier :

```bash
npm run import:check -- <url>
```

Essayer au moins Marmiton, 750g ou BBC Good Food.

---

## 3 — Tests manuels

À effectuer sur un vrai appareil, pas uniquement sur un simulateur.

**Mode local (sans compte)**
- [ ] Créer une recette de zéro.
- [ ] La modifier, ajouter une photo, ajuster le nombre de portions.
- [ ] La supprimer.
- [ ] Refaire ces trois étapes avec l'appareil en mode avion.

**Import**
- [ ] Importer une recette depuis une URL (au moins un site francophone + un site anglophone).
- [ ] Partager une URL depuis un navigateur vers AvoCook.
- [ ] Scanner ou générer une recette depuis une photo si la clé API est configurée.

**Synchronisation Nextcloud**
- [ ] Se connecter à une instance Nextcloud avec un mot de passe d'application.
- [ ] Créer une recette dans AvoCook et vérifier qu'elle apparaît dans Nextcloud Cookbook.
- [ ] Modifier une recette dans Nextcloud Cookbook et vérifier la synchro dans AvoCook.

**Minuteurs**
- [ ] Lancer un minuteur et mettre l'app en arrière-plan — la notification doit se déclencher à l'heure.
- [ ] Lancer plusieurs minuteurs simultanément.

**Liste de courses**
- [ ] Copier des ingrédients dans le presse-papiers.
- [ ] Exporter une liste de courses vers les Rappels iOS (iOS uniquement).

**Sauvegarde**
- [ ] Exporter une sauvegarde dans un fichier JSON.
- [ ] La réimporter et vérifier que les recettes sont bien restaurées.

**Interface**
- [ ] Vérifier le mode clair et le mode sombre.
- [ ] Vérifier au moins le français et l'anglais ; vérifier rapidement l'allemand, l'espagnol et l'italien.
- [ ] Vérifier sur iPhone et iPad (ou un petit Android + une tablette).

---

## 4 — Builds EAS

```bash
# Prévisualisation (pour les tests internes)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Production
npx eas build --platform all --profile production
```

---

## 5 — Notes par plateforme

### iOS

- L'application est configurée pour iPhone et iPad (`supportsTablet: true`).
- Elle n'utilise pas de notifications push distantes, de services de localisation ni de Bluetooth.
- L'autorisation de réseau local est utilisée uniquement pour les serveurs Nextcloud sur le même réseau, ou pour le client Expo en développement.

### Android

- La configuration Android principale se trouve dans `app.json` (package, permissions, icône adaptative).
- L'APK publié dans les releases GitHub est `avocook.apk`.

---

## 6 — Soumission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

> AvoCook est un client indépendant compatible avec Nextcloud Cookbook. Il ne doit pas être présenté comme une application Nextcloud officielle.
