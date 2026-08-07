# Lista de verificación de versión

Una lista para repasar antes de publicar una nueva versión. Sigue cada paso en orden.

---

## 1 — Preparar

- [ ] Actualizar el número de versión en [`app.json`](../../app.json) y [`package.json`](../../package.json).
- [ ] Actualizar el número de build (`buildNumber`) en `app.json` para iOS si es necesario.
- [ ] Releer [`PRIVACY.md`](../../PRIVACY.md) y comprobar si alguna nueva función de red o almacenamiento necesita ser documentada.
- [ ] Verificar que los iconos y los assets del splash screen son correctos y se muestran bien en modo claro y oscuro.

---

## 2 — Comprobaciones locales

```bash
npm run typecheck   # Sin errores TypeScript
npm test            # Todos los tests pasan
npm run lint        # Sin advertencias ESLint
```

Probar una importación de URL concreta:

```bash
npm run import:check -- <url>
```

Probar al menos Marmiton, 750g o BBC Good Food.

---

## 3 — Tests manuales

Realizarlos en un dispositivo real, no solo en un simulador.

**Modo local (sin cuenta)**
- [ ] Crear una receta desde cero.
- [ ] Editarla, añadir una foto, ajustar el número de raciones.
- [ ] Borrarla.
- [ ] Repetir los tres pasos con el dispositivo en modo avión.

**Importación**
- [ ] Importar una receta desde una URL (al menos un sitio francés + uno inglés).
- [ ] Compartir una URL desde un navegador a AvoCook.
- [ ] Escanear o generar una receta desde una foto si hay una clave API configurada.

**Sincronización Nextcloud**
- [ ] Conectar con una instancia Nextcloud usando una contraseña de aplicación.
- [ ] Crear una receta en AvoCook y verificar que aparece en Nextcloud Cookbook.
- [ ] Editar una receta en Nextcloud Cookbook y verificar la sincronización en AvoCook.

**Temporizadores**
- [ ] Iniciar un temporizador y poner la app en segundo plano — la notificación debe dispararse a tiempo.
- [ ] Iniciar varios temporizadores simultáneamente.

**Lista de la compra**
- [ ] Copiar ingredientes al portapapeles.
- [ ] Exportar una lista de la compra a Recordatorios iOS (solo iOS).

**Copia de seguridad**
- [ ] Exportar una copia de seguridad a un archivo JSON.
- [ ] Importarla de nuevo y verificar que las recetas se restauran correctamente.

**Interfaz**
- [ ] Comprobar el modo claro y el modo oscuro.
- [ ] Comprobar al menos francés e inglés; revisar brevemente alemán, español e italiano.
- [ ] Comprobar en iPhone e iPad (o un Android pequeño + tablet).

---

## 4 — Builds EAS

```bash
# Previsualización (para pruebas internas)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Producción
npx eas build --platform all --profile production
```

---

## 5 — Notas por plataforma

### iOS

- La app está configurada para iPhone e iPad (`supportsTablet: true`).
- No usa notificaciones push remotas, servicios de localización ni Bluetooth.
- El permiso de red local solo se usa para conectarse a un servidor Nextcloud en la misma red, o para el cliente Expo durante el desarrollo.

### Android

- La configuración principal de Android está en `app.json` (paquete, permisos, icono adaptativo).
- El APK publicado en las releases de GitHub es `avocook.apk`.

---

## 6 — Envío

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

> AvoCook es un cliente independiente compatible con Nextcloud Cookbook. No debe presentarse como una aplicación oficial de Nextcloud.
