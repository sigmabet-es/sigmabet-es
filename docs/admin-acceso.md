# Administración de SigmaBet

## Entradas

- `/privado/`: inicio de sesión y accesos a las herramientas.
- `/privado/apuestas/`: previsualización y descarga de apuestas pendientes.
- `/privado/analizador/`: analizador existente.
- `/admin/`: Decap CMS. El panel prepartido anterior se conserva en `/admin/prepartido.html`.

## Configurar el sitio en Netlify

1. Activar Netlify Identity para el sitio de sigmabet.es.
2. Configurar el registro como **Invite only**. No habilitar registro abierto.
3. Invitar la cuenta del administrador y asignarle el rol **admin** en Identity. No basta con poner un rol en user_metadata.
4. Activar Git Gateway para Decap y restringir sus roles a **admin**. Confirmar que el repositorio conectado y la rama main son correctos.
5. Publicar estos cambios. Abrir el correo de invitación y establecer la contraseña. Los enlaces de invitación y recuperación se redirigen a /privado/.
6. Entrar por /privado/. Las herramientas y Decap usan la misma cuenta de Identity; Decap puede solicitar iniciar sesión al entrar por primera vez.

Git Gateway está marcado como obsoleto por Netlify. Se ha configurado por compatibilidad con la integración Decap + Identity solicitada. Si el sitio no permite activarlo, usar un backend GitHub/OAuth o Decap Turbo; requiere configurar ese servicio y sus credenciales, no sustituirlo por un acceso sin autenticación.

## Protección

La Edge Function conserva su nombre y sustituye la contraseña compartida por JWT de Identity. Valida cada acceso protegido contra /\.netlify/identity/user y exige app_metadata.roles con admin. La cookie es HttpOnly, Secure y SameSite=Strict; dura una hora como máximo y el token de Identity puede caducar antes. Volver a /privado/ renueva la sesión con Identity.

/privado/ contiene únicamente el portal de acceso público, no datos de apuestas. Sus subrutas requieren sesión en el servidor. No se debe abrir el sitio con un servidor estático para comprobar la protección: es necesario Netlify/Netlify Dev con Identity configurado. No se ha modificado la configuración remota ni invitado usuarios desde este proyecto.

PROTECTED_ANALYZER_PASSWORD deja de utilizarse. No se debe restaurar un bypass cliente para acceder a las herramientas.

Decap administra inicialmente el manual prepartido. El registro continúa usando su Excel/CSV; Decap no altera ni sincroniza la hoja. Las selecciones de la hoja publicada ya son accesibles por su URL CSV: proteger el panel no vuelve privada esa fuente.

## Comprobación tras desplegar

- Sin sesión, /privado/apuestas/ y /privado/analizador/ deben volver al portal sin entregar su HTML.
- Una cuenta sin admin no debe abrir las herramientas ni editar desde Git Gateway.
- Probar invitación, recuperación, acceso, descarga PNG y cierre de sesión.
- Tras cerrar sesión, recargar una subruta protegida debe pedir acceso otra vez.
