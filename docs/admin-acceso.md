# Administración de SigmaBet

- `/admin/`: portal de acceso con el logo oficial y herramientas internas.
- `/admin/apuestas/`: previsualización y descarga de apuestas pendientes.
- `/admin/analizador/`: analizador.
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
