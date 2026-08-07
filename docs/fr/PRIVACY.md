# Politique de confidentialité

AvoCook ne collecte aucune donnée et n'inclut ni publicité ni outil d'analyse.

## Mode local

En mode local — le mode par défaut — les recettes, images et paramètres sont stockés uniquement sur l'appareil via SQLite et le système de fichiers local. Rien n'est envoyé nulle part.

## Synchronisation Nextcloud (optionnelle)

Si vous choisissez de connecter un serveur Nextcloud, les recettes sont synchronisées directement entre l'application et ce serveur. Aucun service tiers n'est impliqué.

Vos identifiants (URL du serveur, nom d'utilisateur et mot de passe d'application) sont stockés sur l'appareil via Expo SecureStore, qui repose sur l'enclave sécurisée du système (Keychain sur iOS, Keystore sur Android).

## Import de recette depuis une URL

Lorsque vous importez une recette en entrant une URL, l'application télécharge cette page pour lire les données de recette disponibles publiquement. Aucune autre donnée n'est envoyée, et la requête est effectuée directement depuis votre appareil.

## Caméra et photothèque

L'accès à la caméra et à la photothèque est utilisé uniquement pour ajouter des photos à une recette ou pour scanner une recette depuis une photo. Les images sont stockées localement.

## Génération de recettes par IA (optionnelle)

Si vous configurez une clé API IA dans les paramètres, cette clé est stockée localement dans SecureStore. Les données de photo sont envoyées au fournisseur d'API que vous avez configuré. Cette fonctionnalité est entièrement optionnelle et nécessite que vous fournissiez votre propre clé.

## Rappels iOS (optionnel)

Si vous choisissez d'exporter une liste de courses vers les Rappels iOS, l'application écrit des données dans votre base de Rappels locale. Cela nécessite l'autorisation Rappels. Aucune donnée ne quitte votre appareil par cette fonctionnalité.

## Contact

Pour toute question ou problème, ouvrez un fil sur le [dépôt GitHub](https://github.com/Logarex/AvoCook).
