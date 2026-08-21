# Plataforma prepartido SigmaBet

Esta capa amplía SigmaBet sin sustituir el diseño actual. La web sigue siendo estática y SEO-friendly, pero queda preparada para generar páginas de partido cuando exista calendario confirmado y datos fiables.

## Auditoría

- Stack actual: HTML plano, CSS propio, JavaScript propio y endpoint serverless para el registro.
- Renderizado: estático. Google recibe HTML real en cada página.
- Diseño reutilizado: header, footer, botones, cards, paneles, `kicker`, colores, radios, sombras y estética del registro.
- SEO actual: metas básicas, `robots.txt` y `sitemap.xml`.
- Datos actuales: registro de apuestas desde CSV/cache. No hay base de datos deportiva.
- Riesgo principal: no publicar partidos, bajas, XI, cuotas o noticias sin fuente.

## Arquitectura añadida

- `data/prepartido/laliga.json`: dataset estructurado inicial para LaLiga.
- `data/prepartido/editorial.json`: capa manual para análisis, XI probable, bajas, noticias y apuestas. No se sobrescribe al reimportar calendario.
- `data/prepartido/schema.json`: contrato de entidades.
- `partidos/index.html`: hub de partidos.
- `partidos/plantilla/index.html`: plantilla visual no indexable de ficha prepartido.
- `competiciones/laliga/index.html`: hub SEO de LaLiga.
- `admin/index.html`: panel técnico no indexable para validar cálculos.
- `assets/js/prepartido-admin.js`: cálculos de cuota justa, probabilidad implícita, edge y SigmaValue.
- `tools/build-prepartido.js`: generador preparado para emitir páginas estáticas desde datos reales y contenido editorial.
- `tools/prepartido-editorial-template.js`: genera una plantilla editable para un partido concreto.
- `tools/import-prepartido-editorial-sheet.js`: importa una hoja publicada como CSV y actualiza la capa editorial.
- `tools/sync-prepartido.js`: sincroniza la hoja conectada y regenera todas las fichas con un único comando.
- `data/prepartido/sources.json`: configuración del enlace CSV de Google Sheets.
- `docs/prepartido-editorial-sheet-template.csv`: plantilla de columnas para replicar en Google Sheets.

## Entidades

Competition, Season, Round, Match, Team, Player, Venue, TeamMatchStats, Injury, Suspension, Lineup, News, Source, Market, Odds, Prediction, Bet, BetRevision y BetResult.

## Cómo añadir un partido

1. Confirmar calendario con fuente oficial o proveedor.
2. Añadir el partido en `data/prepartido/laliga.json`.
3. Usar slug canónico: `equipo-local-equipo-visitante-dd-mm-aaaa`.
4. Completar solo datos confirmados.
5. Dejar `null`, arrays vacíos o “Dato no disponible” cuando falte información.
6. Ejecutar el generador cuando exista contenido suficiente.
7. Incluir la URL en sitemap solo si la página debe indexarse.

## Cómo añadir una apuesta

1. Crear `mainBet` o añadir en `valueBets`.
2. Introducir mercado, selección, cuota, probabilidad SigmaBet, cuota mínima y stake.
3. El sistema calcula cuota justa, probabilidad implícita, edge y SigmaValue.
4. No editar silenciosamente selección, cuota ni stake tras publicar. El siguiente paso será persistir `BetRevision`.

## Cómo completar una previa manual

El calendario, resultados, escudos, estadio, hora y estructura base viven en `data/prepartido/laliga.json`.

El análisis propio vive en `data/prepartido/editorial.json`. Ese archivo se mezcla encima del calendario usando el `id` o el `slug` del partido.

Flujo recomendado:

1. Buscar el slug del partido en `data/prepartido/laliga.json` o en la URL generada.
2. Generar una plantilla:

```bash
node tools/prepartido-editorial-template.js real-betis-real-sociedad-2026-08-21
```

3. Copiar el bloque dentro de `matches` en `data/prepartido/editorial.json`.
4. Rellenar solo lo que esté contrastado:
   - `analysis`: lectura propia del partido.
   - `keys`: claves breves.
   - `probabilities`: estimación 1X2 si existe.
   - `lineups`: onces probables por equipo.
   - `injuries`: bajas, sanciones y dudas.
   - `mainBet`: apuesta principal o `No Bet`.
5. Ejecutar:

```bash
node tools/build-prepartido.js
```

Si una ficha no tiene contenido editorial, se muestra el calendario y contexto básico con mensajes claros de que no hay análisis o alineaciones disponibles.

## Cómo completar previas desde Google Sheets

Esta es la vía recomendada para trabajar cada día.

1. Crear una hoja de Google Sheets con las columnas de `docs/prepartido-editorial-sheet-template.csv`.
2. Publicar esa pestaña como CSV.
3. Pegar el enlace una sola vez en `data/prepartido/sources.json`:

```json
{
  "editorialCsvUrl": "URL_CSV_PUBLICADA"
}
```

4. Rellenar una fila por partido usando el `slug` de la ficha.
5. Separar listas con `|`.
   - Claves: `Clave 1 | Clave 2 | Clave 3`.
   - XI: `Jugador 1 | Jugador 2 | ... | Jugador 11`.
6. Separar bajas con `|` y cada baja con `;`.
   - Ejemplo: `Jugador A; baja; lesión muscular | Jugador B; duda; molestias`.
7. Sincronizar y regenerar todo con un único comando:

```bash
node tools/sync-prepartido.js
```

La hoja es la fuente cómoda para editar. `editorial.json` queda como salida interna versionada para publicar la web.

Si se quiere importar una hoja puntual sin tocar la configuración:

```bash
node tools/import-prepartido-editorial-sheet.js "URL_CSV_PUBLICADA"
```

También puede guardarse la URL en una variable de entorno:

```bash
SIGMABET_PREPARTIDO_EDITORIAL_CSV_URL="URL_CSV_PUBLICADA" node tools/import-prepartido-editorial-sheet.js
```

## Proveedores pendientes

- Sports data: calendario, resultados, clasificación, H2H, estadísticas y plantillas.
- Odds provider: cuotas de apertura, actuales y cierre.
- News provider: noticias, ruedas de prensa, lesiones, sanciones y XI.
- Auth/database: panel privado real, historial de cambios y publicación.

## Reglas editoriales

- No inventar datos.
- Distinguir predicción de apuesta.
- Mostrar “Sin apuesta recomendada” cuando no haya edge suficiente.
- Mantener +18 y juego responsable.
- Priorizar utilidad antes que SEO.
