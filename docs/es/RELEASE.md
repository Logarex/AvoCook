# Lanzamiento (Release)

Breve lista de verificación para evitar descuidos antes de publicar una versión.

## Antes de compilar

- Actualizar la versión en `app.json`.
- Comprobar que los iconos y la pantalla de inicio sean correctos.
- Volver a leer `PRIVACY.md` si ha cambiado alguna función de red o almacenamiento.
- Probar el modo local sin cuenta.
- Probar una conexión Nextcloud con una contraseña de aplicación.
- Probar la importación de recetas de al menos Marmiton, 750g o BBC Good Food.
- Probar la creación, edición y eliminación de una receta en modo avión.
- Probar los temporizadores en un dispositivo real.
- Comprobar el modo claro/oscuro y al menos francés/inglés.

## Comprobaciones locales

```bash
npm run typecheck
npm test
npm run lint
```

Para una comprobación de importación precisa:

```bash
npm run import:check -- <url>
```

## Compilaciones EAS

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## iOS

La aplicación está configurada para iPhone y iPad. No utiliza notificaciones push remotas, servicios de ubicación ni Bluetooth.

El permiso de red local se utiliza solo para servidores Nextcloud en la misma red, o para el cliente de Expo durante el desarrollo.

## Android

La configuración principal de Android se encuentra en `app.json`.

## Envío

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook es un cliente independiente compatible con Nextcloud Cookbook. No debe presentarse como una aplicación oficial de Nextcloud.
