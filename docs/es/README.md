# AvoCook

[English](../../README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Español](README.md) · [Italiano](../it/README.md) · [Dansk](../da/README.md)

AvoCook es una aplicación gratuita y de código abierto para iOS y Android. La desarrollo mientras estudio para guardar mis recetas, planificar comidas y facilitarme un poco la cocina de cada día.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

## Usar AvoCook

### Todas tus recetas en un sitio

Escribe recetas, añade fotos y categorías y ajusta las cantidades a las raciones. Los ingredientes y pasos admiten Markdown opcional. Pega un enlace o compártelo desde el navegador para importar una receta y comprueba el resultado antes de guardar. También puedes imprimir o compartir una receta individual.

### Controla tus alimentos

Organiza la nevera, la despensa y el congelador con cantidades y fechas. Añade alimentos por código de barras, consulta las puntuaciones disponibles de Open Food Facts y activa avisos de caducidad.

Introduce la fecha del envase. La búsqueda por código de barras necesita Internet; pueden faltar fichas y puntuaciones. Los alimentos y el plan siguen disponibles sin conexión.

### Planifica hoy y la semana

Añade recetas, comidas sencillas, sobras o salidas. Ajusta raciones, mueve comidas entre días y elige ingredientes para la lista de la compra. Guarda menús y consulta las comidas anteriores en el historial.

### Cocina paso a paso

Sigue recetas con temporizadores que se recuperan al volver. Los dispositivos compatibles ofrecen comandos de voz locales. Guarda notas en un diario privado y prepara varias recetas juntas.

### Ideas para cada día

Busca recetas con tus ingredientes, consulta productos de temporada en 11 calendarios regionales o usa conversiones y sustituciones de repostería. Guarda recetas y datos privados de tu cocina en una misma copia de seguridad.

Hay calendarios para Francia metropolitana, Valonia, Suiza, Alemania, España, Italia, Reino Unido, Dinamarca, Ontario, el estado de Nueva York y Sídney. La cobertura y el significado de disponibilidad dependen de cada fuente.

### Asistente de nevera opcional

Escribe ingredientes o empieza con una foto de la nevera, revisa la lista y pide un borrador de receta editable. Requiere tu proveedor, clave API y un modelo compatible; puede haber cargos.

### Tu recetario ilustrado

Elige recetas y un título para crear un libro PDF con portada, índice, fotos, ingredientes y pasos. Se incluyen las imágenes de tu biblioteca local y de Nextcloud cuando están disponibles.

Las notas del diario privado no se incluyen en el libro. El PDF se crea en el dispositivo; puede ser necesario descargar imágenes de Nextcloud.

### La compra, a solas o en compañía

Usa una lista local, invita a otras personas a una lista AvoCook con un código de seis caracteres o conecta una lista del hogar de Nextcloud Pantry. Elige qué ingredientes añadir desde las recetas y el plan. En iOS, Recordatorios puede sincronizarse con el modo activo. Las listas compartidas AvoCook ofrecen notificaciones cuando otros participantes añaden o eliminan productos.

### Recetas de la comunidad

Descubre, valora e importa recetas de otros usuarios. Puedes leerlas traducidas o consultar el original. Un perfil de comunidad permite publicar tus propias recetas. Las recetas cargadas y las traducciones completadas permanecen en la caché del dispositivo.

### En móviles y tabletas

Las cinco pestañas son Recetas, Mi cocina, Plan, Comunidad y Compra. Las pantallas grandes pueden usar navegación lateral y vistas en columnas, teniendo en cuenta el tamaño del texto. Los iPhone compatibles usan controles Liquid Glass nativos.

### Tus datos y conexiones

Las recetas funcionan localmente sin crear una cuenta. Conecta Nextcloud Cookbook para sincronizarlas con tu servidor. El plan, los alimentos y las notas privadas se guardan en el dispositivo, separados por cuenta de recetas; Cookbook no los sincroniza. Exporta solo las recetas o crea una copia completa con las fotos disponibles y los datos privados de tu cocina.

La comunidad y las listas compartidas usan Firebase, con una sesión anónima al iniciar. Los enlaces web, la búsqueda de productos y el asistente opcional usan sus respectivos servicios. La voz utiliza un motor local compatible, sin recurrir a la nube.

## Idiomas disponibles

Español · Inglés · Francés · Alemán · Italiano · Danés

## Guías

- [Guía de cocina](GUIDE.md)
- [Tus datos y conexiones](PRIVACY.md)
- [Documentación técnica](../LOCAL_KITCHEN.md) · [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md) · [Seasonal catalog](../SEASONAL_CATALOG.md)

## Configuración de desarrollo

El proyecto utiliza Expo SDK 57, React Native 0.86 y TypeScript. Se requiere Node.js >=22.13 y <27. Las compilaciones locales de iOS utilizan Xcode 27 y Device Hub; la versión mínima de iOS compatible es 16.4.

```bash
npm ci
npm run ios      # Simulador iOS
npm run android  # Emulador Android
```

Tras cambiar dependencias nativas, ejecuta `npx expo prebuild --clean` y recompila. La voz local y los recordatorios de alimentos requieren los módulos nativos locales; Expo Go no basta.

En el primer inicio se compila una build de desarrollo con módulos nativos. Después, la app se abre directamente.

Los proyectos `ios/` y `android/` se generan a partir de `app.json`, `tools/plugins/` y los módulos locales de `src/modules/`. Después de actualizar el SDK o las dependencias nativas, vuelve a generarlos con `npx expo prebuild --clean` antes de compilar. El plugin `expo-build-properties` activa el ciclo de vida de UIKit basado en escenas que requiere Xcode 27.

Comandos útiles:

```bash
npm run typecheck                      # Verificaciones TypeScript
npm test                               # Tests unitarios (Vitest)
npm run lint                           # ESLint
npm run import:check -- <url-receta>   # Probar la importación desde una URL
```

---

## Estructura del proyecto

```
src/
├── App.tsx                              # Punto de entrada, navegación
├── screens/                             # Pantallas (lista, detalle, editor, ajustes…)
├── components/                          # Componentes de UI reutilizables
├── features/
│   ├── kitchen/                         # Mi cocina — comidas diarias, en local
│   ├── community/                       # Firebase
│   ├── recipes/                         # Almacenamiento local (SQLite), lógica recetas, backup
│   ├── nextcloud/                       # Cliente HTTP para Nextcloud Cookbook
│   ├── import/                          # Importación por URL y foto
│   ├── shopping/                        # Lista de la compra y sync con Recordatorios iOS
│   ├── timers/                          # Temporizadores de cocina
│   ├── preferences/                     # Configuración de la aplicación
│   └── auth/                            # Autenticación Nextcloud
├── i18n/                                # Internacionalización (i18next, 6 idiomas)
├── modules/
│   └── avocook-timer-notifications/     # Módulo nativo para notificaciones de temporizador
└── theme/                               # Colores, tipografía, estilos compartidos
tools/                                   # Plugins de build, verificador de importación, assets
docs/                                    # Documentación en otros idiomas (fr, de, es, it, da)
```

---

## Nextcloud Cookbook

Para probar la sincronización:

1. Instala la [aplicación Cookbook](https://apps.nextcloud.com/apps/cookbook) en una instancia de Nextcloud.
2. Crea una **contraseña de aplicación** en la configuración de seguridad (Ajustes → Seguridad → Dispositivos y sesiones).
3. En AvoCook (Ajustes), introduce la URL del servidor, el nombre de usuario y esa contraseña.

Se usa HTTPS por defecto si no se indica un protocolo. Para un servidor Nextcloud en tu red local de confianza, introduce una dirección HTTP explícita, como `http://192.168.1.50:8080/nextcloud` o `http://nextcloud.local`. HTTP envía tu contraseña de aplicación y tus recetas sin cifrar; úsalo solo en una red de confianza. Las credenciales siguen cifradas en el llavero del dispositivo.

---

## Android

Los APK se publican en las [releases de GitHub](https://github.com/Logarex/AvoCook/releases). Descarga `avocook.apk` e instálalo directamente.

---

## Contribuir

Las pull requests son bienvenidas. Consulta [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) para las pautas y la plantilla de PR.

---

## Apoyar el proyecto ☕

Si AvoCook te resulta útil, puedes ayudar a cubrir los costes:

**[→ Donar vía Revolut](https://revolut.me/logarex)** · **[→ Donar vía PayPal](https://paypal.me/logarex31)**

---

## Sitio web

La web está en `site/`, con textos en seis idiomas en `site/main.js`. El comando siguiente prepara los mismos archivos que GitHub Pages, incluidas las capturas. Se publica en `gh-pages` al enviar cambios a `main` o mediante el workflow manual Deploy site; enviar solo esta rama no publica la web.

```bash
node tools/scripts/build-site.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/site
```

[http://127.0.0.1:8765/](http://127.0.0.1:8765/)

---

## Licencia

Este proyecto está bajo la licencia [GPLv3](../../LICENSE).
