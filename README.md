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
