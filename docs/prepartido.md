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
- `data/prepartido/schema.json`: contrato de entidades.
- `partidos/index.html`: hub de partidos.
- `partidos/plantilla/index.html`: plantilla visual no indexable de ficha prepartido.
- `competiciones/laliga/index.html`: hub SEO de LaLiga.
- `admin/index.html`: panel técnico no indexable para validar cálculos.
- `assets/js/prepartido-admin.js`: cálculos de cuota justa, probabilidad implícita, edge y SigmaValue.
- `tools/build-prepartido.js`: generador preparado para emitir páginas estáticas desde datos reales.

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
