# SigmaBet

Web oficial de SigmaBet.

Apuestas de futbol con datos, analisis, stake recomendado y registro publico.

## Estructura publicada

- `index.html`
- `registro.html`
- `senal-sigma.html` (aviso de sección no disponible; sin oferta comercial)
- `normas.html`
- `juego-responsable.html`
- `legal.html`
- `privacidad.html`
- `assets/`
- `api/registro.js`
- `robots.txt`
- `sitemap.xml`

## Plataforma prepartido

La primera capa de inteligencia prepartido está preparada sin publicar partidos inventados:

- `partidos/` hub público de partidos.
- `competiciones/laliga/` hub de LaLiga.
- `partidos/plantilla/` plantilla no indexable de ficha de partido.
- `admin/` panel técnico no indexable para cálculos de value betting.
- `data/prepartido/` modelo estructurado inicial.
- `tools/build-prepartido.js` generador estático de páginas de partido.
- `docs/prepartido.md` documentación operativa.

Para generar páginas reales, carga calendario confirmado en `data/prepartido/laliga.json` y ejecuta `node tools/build-prepartido.js`.

## Registro y cache

El frontend consulta primero `/api/registro`. Ese endpoint:

- consulta la fuente CSV del registro;
- valida las filas;
- calcula las metricas principales;
- guarda la ultima respuesta valida en cache de servidor/CDN;
- devuelve la ultima version disponible si la fuente falla.

La URL del CSV puede configurarse con `SIGMABET_REGISTRY_CSV_URL`. Si el hosting no ejecuta funciones serverless, el frontend conserva el CSV publico como respaldo.

## Publicacion

Repositorio preparado para publicar desde la cuenta `sigmabet-es`.

## Calendario automático gratuito

LaLiga se sincroniza desde football-data.org con una base SQLite privada y una copia pública sin claves. Consulta [configuración y activación](docs/football-data.md). El workflow requiere el secreto `FOOTBALL_DATA_TOKEN`; la actualización de la web publicada depende del despliegue del proyecto.

## Privacidad y publicación del proyecto gratuito

- El registro público conserva su respaldo en memoria de la página, sin caché persistente en `localStorage`. La nueva versión elimina las antiguas claves `sigmabet:registry:*` y `sigmabet:home:*`; no toca borradores ni sesiones de administración.
- Los borradores de Señal Sigma y del material gráfico se conservan en `admin/senal-sigma.html` y `admin/material-grafico.html`, bajo la protección de la Edge Function. No publicar copias comerciales fuera de `/admin/`.
- El despliegue debe aplicar `netlify.toml`: comprobar sin sesión que ambas rutas privadas redirigen al acceso y no entregan el documento. Un servidor estático local no reproduce esta protección.

Pendiente de verificación por el titular antes de dar por cerrada la revisión legal:

1. Confirmar el nombre y apellidos o razón social del responsable y añadirlos a `legal.html` y `privacidad.html`. La marca y el correo no sustituyen esa identificación. No se han supuesto un NIF ni un domicilio.
2. Comprobar en la cuenta real de Netlify los registros de acceso, sus plazos de conservación, los ajustes de Identity, el acuerdo de tratamiento y las garantías de transferencias internacionales. Actualizar la política con esos datos verificados. Hacer lo mismo con el proveedor de correo cuando corresponda.
3. Verificar en producción las solicitudes y el almacenamiento del navegador, incluidas las funciones activadas desde el panel del alojamiento. Si se activa analítica o seguimiento no necesario, bloquearlo hasta obtener el consentimiento aplicable.
4. Revisar los permisos y licencias de los datos, escudos e imágenes de terceros; la atribución no sustituye una licencia.
5. Si se añaden ingresos, afiliación, publicidad de operadores o pagos, revisar de nuevo las obligaciones antes de activarlos. La revisión actual parte de un proyecto gratuito sin ingresos y no certifica la ausencia de sanciones.
