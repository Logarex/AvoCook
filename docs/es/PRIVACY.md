# Política de privacidad

AvoCook no recopila ningún dato y no incluye publicidad ni herramientas de análisis de ningún tipo.

## Modo local

En modo local — el modo predeterminado — las recetas, imágenes y ajustes se almacenan únicamente en tu dispositivo mediante SQLite y el sistema de archivos local. No se envía nada a ningún sitio.

## Sincronización con Nextcloud (opcional)

Si eliges conectar un servidor Nextcloud, las recetas se sincronizan directamente entre la app y ese servidor. No interviene ningún servicio de terceros.

Tus credenciales (URL del servidor, nombre de usuario y contraseña de aplicación) se almacenan en el dispositivo mediante Expo SecureStore, que se apoya en el enclave seguro del sistema (Keychain en iOS, Keystore en Android).

## Importación de recetas desde una URL

Cuando importas una receta introduciendo una URL, la app descarga esa página para leer los datos de receta disponibles públicamente. No se envía ningún otro dato, y la solicitud se realiza directamente desde tu dispositivo.

## Cámara y fototeca

El acceso a la cámara y la fototeca se usa únicamente para añadir fotos a una receta o escanear una receta desde una foto. Las imágenes se almacenan localmente.

## Generación de recetas con IA (opcional)

Si configuras una clave de API de IA en los ajustes, esa clave se almacena localmente en SecureStore. Los datos de la foto se envían al proveedor de API que hayas configurado. Esta función es completamente opcional y requiere que proporciones tu propia clave.

## Recordatorios de iOS (opcional)

Si eliges exportar una lista de la compra a Recordatorios de iOS, la app escribe datos en tu base de datos local de Recordatorios. Esto requiere el permiso de Recordatorios. Ningún dato sale de tu dispositivo a través de esta función.

## Contacto

Para preguntas o problemas, abre un hilo en el [repositorio de GitHub](https://github.com/Logarex/AvoCook).
