# Privacidad y datos

Actualizado: 19 de octubre de 2026. AvoCook no incluye publicidad ni herramientas de análisis. Algunas funciones usan los servicios de red descritos a continuación.

## Mi cocina, voz y avisos locales

Planes, existencias, fechas, notas personales, etiquetas alimentarias, menús e historial se guardan localmente y separados por cuenta de recetas. Las notas privadas no se publican ni se incluyen en libros PDF. La copia completa de Mi cocina incluye estos datos y recetas; la copia habitual de recetas no incluye datos de Mi cocina.

Los comandos de cocina opcionales solicitan permisos de micrófono y reconocimiento de voz. Solo se usa un reconocedor local compatible, sin alternativa en red. AvoCook no guarda audio ni transcripciones. La escucha se detiene al salir del modo cocina o pasar a segundo plano.

Los avisos de existencias opcionales se programan en el dispositivo. Los nombres de productos pueden mostrarse en la pantalla bloqueada según los ajustes. Los ingredientes generados usan el modo de compra elegido, incluido el uso compartido o la sincronización con Recordatorios de Apple activados.

## Recetas, Nextcloud y copias de seguridad

Las recetas y fotos locales se guardan en tu dispositivo. Se transmiten cuando eliges sincronizarlas, compartirlas, exportarlas o publicarlas. Nextcloud Cookbook y Pantry intercambian datos directamente con el servidor elegido. Las copias de Pantry y los traslados pendientes se guardan por separado para cada cuenta de Nextcloud. Cerrar sesión no copia automáticamente los productos de Pantry a la lista local.

Las credenciales de Nextcloud y las claves API de IA se guardan en el almacenamiento seguro del sistema mediante Expo SecureStore. Las recetas, fotos y preferencias normales usan SQLite, archivos o el almacenamiento de la app. iOS puede conservar datos seguros tras una reinstalación; las copias del dispositivo también pueden restaurar datos. Exporta tus recetas antes de desinstalar.

HTTPS es la opción predeterminada. Un servidor configurado expresamente con HTTP transmite credenciales, recetas e imágenes sin cifrado de transporte. La app muestra un aviso al conectar. Los archivos exportados pueden contener fotos y datos personales: elige dónde compartirlos.

## Firebase, comunidad y listas compartidas

AvoCook inicia una sesión anónima de Firebase al abrirse, también en modo local. Firebase recibe el identificador y la información de red necesaria para la conexión. No se pide correo ni contraseña para esta sesión.

Las recetas de la comunidad, nombres de autor, perfiles, valoraciones, avisos y listas compartidas usan Firebase. Las recetas publicadas son visibles para otros usuarios. Cualquier persona con el código de una lista puede unirse. Evita publicar información privada. Las reglas de acceso y conservación de Firebase se administran por separado de la app. Cerrar sesión o borrar datos locales no elimina el contenido remoto.

## Importación, IA y traducción

La importación por URL descarga la página elegida directamente del sitio. Este recibe la información habitual de una solicitud de red.

La importación y generación con IA son opcionales y envían la foto seleccionada o el texto introducido al proveedor configurado en Ajustes, usando tu clave API. La cámara y la galería también permiten añadir imágenes locales. Las imágenes de recetas sincronizadas, compartidas o publicadas pueden salir del dispositivo.

La traducción automática de recetas de la comunidad envía su texto a Google Translate y, si falla, a MyMemory. No usa tu clave API de IA. Las recetas cargadas y las traducciones se guardan para leerlas sin conexión. Los proveedores procesan las solicitudes según sus propias condiciones y políticas de privacidad.

El asistente opcional del frigorífico envía una foto solo al elegir Analizar y los ingredientes confirmados y las preferencias visibles solo al elegir Generar. AvoCook no adjunta la foto a la receta ni la guarda en los datos de Mi cocina. Guardar el borrador editable es una acción separada que sigue los ajustes habituales de almacenamiento y sincronización. Tu proveedor puede cobrar estas solicitudes.

## Recordatorios de Apple, actualizaciones y diagnóstico

Si la activas, la sincronización de compras lee y escribe en Recordatorios. Apple puede sincronizar los productos a través de tu cuenta, incluidas listas compartidas de iCloud, según tus ajustes.

Las instalaciones Android mediante APK consultan las versiones en GitHub. Las instalaciones de una tienda reciben sus actualizaciones por esa tienda. Abrir enlaces de recetas, ayuda o proveedores contacta con el destino elegido.

Los registros de diagnóstico son locales. Las claves y contraseñas se ocultan, pero pueden quedar datos personales. Revisa los informes antes de copiarlos o compartirlos. No se envían automáticamente.

## Contacto

Usa [el repositorio de GitHub](https://github.com/Logarex/AvoCook) o el botón de contacto de la app.
