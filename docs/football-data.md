# Datos gratuitos de football-data.org

La web publica una copia JSON de LaLiga. Las visitas nunca consultan el proveedor ni reciben el token. Un sincronizador separado guarda las respuestas y los registros de equipos y encuentros en SQLite, y exporta `data/prepartido/laliga.json`.

## Qué se importa

- Calendario de la temporada actual, horas, estados y resultados.
- Equipos, escudos y estadios disponibles.
- Clasificación, puntos, goles, forma de los últimos cinco partidos y medias de goles por equipo en casa/fuera.
- Datos ausentes se mantienen como `null`; no se inventan estadísticas avanzadas.
- Los resultados y horarios del plan gratuito pueden llegar con retraso.

Son tres consultas por sincronización: partidos, equipos y clasificación. Se separan por 6,1 segundos. Las respuestas válidas de menos de seis horas se reutilizan sin consultar la API; no hay reintentos automáticos. Un bloqueo impide sincronizaciones locales simultáneas. Con cuatro ejecuciones diarias se utilizan normalmente 12 consultas/día, independientemente del tráfico web.

## Uso local

Requiere Python 3.9+ con base de zonas horarias y Node.js 20+. No requiere paquetes adicionales. Configurar `FOOTBALL_DATA_TOKEN` en el entorno del proceso mediante un gestor de secretos. Nunca añadir el valor a archivos públicos ni comandos que se vayan a guardar en el repositorio.

```sh
python3 tools/sync-football-data.py --db /ruta/privada/football.sqlite
node tools/build-prepartido.js
```

La base debe vivir fuera del directorio publicado. Para una importación de prueba, usar `--output /ruta/privada/laliga.json`; puede partir de una copia del JSON existente para preservar los identificadores y enlaces. `--force` permite actualizar sin esperar seis horas (consume consultas).

SQLite conserva las respuestas del proveedor, los equipos y los partidos por identificador. Las actualizaciones de base de datos son transaccionales; el JSON se sustituye mediante renombrado atómico. Si falla una consulta o la validación, no se modifica la copia pública. Si el proceso se interrumpe entre la base y la exportación, la próxima ejecución puede recuperar el JSON de SQLite.

La primera prueba local utiliza `/tmp/sigmabet-private/football.sqlite`: es almacenamiento temporal, no la base de producción. La copia pública y los datos necesarios para preservar URLs están en el repositorio. La clave no se conserva en esa base.

## Activar las actualizaciones en GitHub

El archivo `.github/workflows/football-data.yml` queda preparado para ejecutarse a las 00:23, 06:23, 12:23 y 18:23 UTC; GitHub puede retrasar los trabajos programados.

1. En el repositorio, abrir **Settings → Secrets and variables → Actions → New repository secret**.
2. Crear `FOOTBALL_DATA_TOKEN` con el token de football-data.org.
3. Incorporar los cambios y el workflow a la rama predeterminada. Los horarios no se activan en ramas de trabajo.
4. Permitir al workflow escribir en el repositorio si la política de la organización lo requiere. Las reglas de protección de rama pueden impedir el commit automático.
5. Ejecutar **Actions → Actualizar datos de LaLiga → Run workflow** y comprobar el primer resultado.

La base SQLite se recupera y guarda usando GitHub Actions Cache, fuera de los archivos publicados. La caché puede caducar: en ese caso se reconstruye con tres consultas, conservando los identificadores del JSON versionado. No se debe usar esta caché como único archivo histórico; la copia pública queda versionada en Git y el JSON es suficiente para restaurar los datos actuales.

El workflow regenera las fichas y sube los cambios de datos/HTML a la rama predeterminada. **No despliega el sitio por sí mismo.** Debe conectarse al despliegue real del proyecto. En GitHub Pages, los commits hechos con `GITHUB_TOKEN` no desencadenan por sí solos una compilación Pages; se necesita un paso de despliegue explícito autorizado. Hasta activar ese despliegue, los datos nuevos estarán en el repositorio pero no necesariamente en la web publicada.

## Identidad y contenido editorial

Se conservan los identificadores y URLs existentes cuando los equipos y la temporada coinciden. Después se utiliza `footballDataId` como clave estable aunque cambie la fecha. Los análisis y apuestas de `editorial.json` siguen separados y no se modifican. El importador antiguo de calendario es una herramienta manual y no debe ejecutarse después de esta sincronización porque sustituiría los datos del proveedor.

Las estadísticas de hojas anteriores pueden complementar una ficha; sus marcadores no sustituyen un resultado de football-data.org. Las tablas históricas solo incluyen resultados anteriores al encuentro que se consulta.

## Comprobaciones

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/tests -p 'test_football_data.py'
node --check tools/build-prepartido.js
node --check assets/js/partidos.js
```

Documentación del proveedor: https://docs.football-data.org/general/v4/competition.html

## Histórico desde 2024/25: alcance definitivo

Las estadísticas seleccionadas son: marcador y goles por equipo, goles por mitades, remates, remates a puerta, córners, amarillas, rojas y faltas. Los nombres, escudos, árbitros y estadios disponibles se conservan como información del encuentro.

`sync-football-history.py` combina los resultados históricos de football-data.org con los CSV gratuitos de football-data.co.uk. Calcula goles de segunda mitad como resultado final menos primera mitad, con datos válidos. Exporta `history.json` y `coverage.json`, y guarda estadísticas por equipo/encuentro, temporada y árbitro en SQLite.

No consulta API-Football ni descarga estadísticas avanzadas o individuales. No necesita `API_FOOTBALL_TOKEN`. Los metadatos históricos verificados anteriormente se conservan; las respuestas originales archivadas en la base privada no se borran. No hay una cola de enriquecimiento pendiente para el alcance seleccionado.

```sh
python3 tools/sync-football-history.py --db /ruta/privada/football.sqlite
```

`--offline` reconstruye desde respuestas guardadas sin peticiones. Los históricos finalizados se reutilizan; el CSV de la temporada actual se actualiza como máximo cada seis horas. Si se pierde la caché privada, los históricos se descargan otra vez; los metadatos presentes en el JSON versionado se conservan. La programación requiere solo `FOOTBALL_DATA_TOKEN` y sigue pendiente de activación y despliegue.

Las medias de tarjetas por árbitro separan las muestras de amarillas y rojas, y excluyen valores ausentes. En cada previa solo se utilizan partidos anteriores al encuentro. El informe de cobertura cuenta únicamente las estadísticas acordadas; una ausencia se muestra como «—», nunca como cero.
