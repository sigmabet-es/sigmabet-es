# SigmaBet

Web oficial de SigmaBet.

Apuestas de futbol con datos, analisis, stake recomendado y registro publico.

## Estructura publicada

- `index.html`
- `registro.html`
- `senal-sigma.html`
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
