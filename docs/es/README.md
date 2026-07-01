# AvoCook

AvoCook es una aplicación móvil de recetas que estoy creando para uso personal y para aprender a ejecutar un proyecto completo de React Native de principio a fin.

La idea es simple: mantén tus recetas en un solo lugar, úsalas sin conexión y sincronízalas con Nextcloud Cookbook si ya tienes un servidor.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [APK de Android](https://github.com/Logarex/AvoCook/releases/latest) · [![Descargas de APK](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<p align="center">
  <img src="../../assets/screenshots/login.png" width="280" alt="Inicio de sesión de AvoCook" />
  <img src="../../assets/screenshots/recipe.png" width="280" alt="Detalle de la receta" />
</p>

## Qué puede hacer la aplicación

- crear y editar recetas localmente;
- organizar recetas por categoría;
- añadir fotos;
- escanear recetas a partir de fotos o generar recetas a partir de fotos de platos usando IA (requiere una clave API);
- importar una receta desde una URL cuando el sitio expone datos `schema.org/Recipe`;
- recibir URLs compartidas desde otras aplicaciones (como navegadores web) para importar recetas rápidamente;
- ajustar las cantidades según el número de porciones;
- copiar los ingredientes al portapapeles;
- iniciar temporizadores de cocina;
- exportar una receta como PDF o imprimirla;
- hacer copias de seguridad / restaurar recetas a un archivo JSON;
- sincronizar con Nextcloud Cookbook, si el usuario lo desea;
- sincronizar con la aplicación Recordatorios de iOS para aprovechar las funciones de uso compartido de Apple.

El modo local no requiere una cuenta. Los datos permanecen en el dispositivo.

## Configuración de desarrollo

El proyecto utiliza Expo, React Native y TypeScript.

```bash
npm install
npm run start
```

Luego abre la aplicación con Expo Go o una compilación de desarrollo.

Comandos útiles:

```bash
npm run typecheck
npm test
npm run lint
npm run import:check -- <url-receta>
```

## Nextcloud Cookbook

Para probar la sincronización:

1. Instala la aplicación Cookbook en una instancia de Nextcloud.
2. Crea una contraseña de aplicación en la configuración de seguridad.
3. Introduce la URL del servidor, el nombre de usuario y esa contraseña en AvoCook.

La aplicación rechaza los servidores remotos a través de HTTP. HTTP se acepta para `localhost` durante el desarrollo.

## Android

Los APK se publican en las versiones de GitHub. El archivo principal que se debe instalar es `avocook.apk`.

## Estructura del proyecto

- `src/screens`: pantallas de la aplicación;
- `src/components`: componentes reutilizables;
- `src/features/recipes`: almacenamiento local, sincronización y lógica de recetas;
- `src/features/nextcloud`: cliente HTTP para Cookbook;
- `src/features/import`: importación de recetas desde páginas web;
- `src/modules/avocook-timer-notifications`: pequeño módulo nativo para las notificaciones del temporizador.

## Apoyar el proyecto ☕

Si aprecias AvoCook y deseas ayudarme a financiar los gastos, puedes hacer una donación:

- [Donar vía Revolut](https://revolut.me/logarex)
- [Donar vía PayPal](https://paypal.me/logarex31)

## Licencia

Este proyecto tiene la licencia [GPLv3](../../LICENSE).
