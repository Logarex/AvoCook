# Preparar una publicación

## Preparar la versión

Mantén alineados app.json, package.json, package-lock.json y store/release.json. Comprueba el número de compilación iOS y el código de versión Android. Actualiza las novedades en seis idiomas; las descripciones permanentes presentan la app sin anuncios de versión.

## Comprobaciones automáticas

```sh
npm ci
npm ci --prefix notification-relay
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm test --prefix notification-relay
npm run store:check
node tools/scripts/build-site.mjs
npx expo export --platform ios --platform android --output-dir dist/app
```

## Pruebas en dispositivos

Prueba recetas locales sin conexión, importación web, Nextcloud Cookbook e imágenes, los tres modos de compra, Recordatorios de Apple, avisos con el destinatario bloqueado, códigos de barras, caducidad, permisos de voz, recuperación de temporizadores, fotos PDF y restauración de copias. Comprueba pantallas pequeñas, tabletas, texto grande y ambos temas.

## Compilar y enviar

Vuelve a compilar tras cambiar dependencias nativas o permisos. Los textos de las tiendas se preparan por separado. Sigue la guía de las tiendas para enviar metadatos y revisa el destino y la versión.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../../store/README.md) · [Privacy](PRIVACY.md) · [Notifications](../../docs/NOTIFICATIONS.md)
