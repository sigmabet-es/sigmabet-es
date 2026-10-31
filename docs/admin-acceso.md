# Administración de SigmaBet

- `/admin/`: portal de acceso con el logo oficial y herramientas internas.
- `/admin/apuestas/`: previsualización y descarga de apuestas pendientes.
- `/admin/analizador/`: analizador.
- `/admin/redes/`: creador de publicaciones diarias para redes.
- `/admin/prepartido.html`: panel prepartido anterior.
- Las antiguas rutas `/privado/` redirigen a sus equivalentes en `/admin/`.

## Acceso en Netlify

Activar Netlify Identity, seleccionar registro **Invite only**, invitar al administrador y asignarle el rol **admin** en Identity (app_metadata.roles). Publicar y entrar por `/admin/`. Los correos de invitación y recuperación que vuelvan a la raíz se redirigen al portal.

Se ha eliminado Decap CMS y su configuración. Git Gateway no es necesario para entrar en este panel. PROTECTED_ANALYZER_PASSWORD tampoco se utiliza.

La Edge Function valida cada petición interna contra Identity y exige el rol admin. La sesión usa cookie HttpOnly, Secure y SameSite=Strict, con alcance /admin/ y duración máxima de una hora. Tras cambiar de ruta desde /privado/, es necesario volver a entrar para generar la cookie con el nuevo alcance.

La raíz /admin/ es el portal de inicio de sesión; las herramientas requieren autenticación en servidor. Comprobar en Netlify o Netlify Dev, no con un servidor estático. La configuración remota de Identity y los usuarios no se modifican desde estos archivos.

El registro sigue usando Excel/CSV; proteger el panel no vuelve privada la URL del CSV publicado.

## Verificación

Ejecutar `node tools/test-private-access.cjs`. Tras desplegar, comprobar acceso, rechazo de usuarios sin admin, recuperación de contraseña, descarga de PNG y cierre de sesión. Las páginas internas deben devolver al portal si no hay sesión.

## Publicaciones del día

En /admin/redes/ se pueden escribir recomendaciones o añadir pendientes de la fecha elegida desde el CSV del registro. La importación no modifica la hoja y no añade datos de ejemplo. El editor permite ordenar, eliminar, ajustar hora y elegir qué métricas mostrar.

Los formatos son 1080 × 1350, 1080 × 1080 y 1080 × 1920. El texto se mide antes de paginar: las recomendaciones completas se reparten entre imágenes sin reducir la tipografía. Si una sola recomendación supera la capacidad, se pide acortar o cambiar de formato. Cada página se descarga individualmente con las flechas de la vista previa.

El borrador se conserva solo en localStorage del navegador; no se sincroniza con otros equipos ni publica en redes. Los PNG contienen la fecha elegida y las recomendaciones, sin inventar cuotas, horarios o resultados.
