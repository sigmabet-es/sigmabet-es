const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "prepartido", "laliga.json");
const outputPath = path.join(root, "data", "prepartido", "team-results.json");

const parseCsv = (csv) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => String(cell).trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}_\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const text = (value, fallback = "") => {
  const clean = String(value ?? "").trim();
  return clean || fallback;
};

const numberFrom = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw.replace("%", "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value) => {
  const raw = text(value);
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${String(slash[2]).padStart(2, "0")}-${String(slash[1]).padStart(2, "0")}`;
  const dash = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dash) return `${dash[1]}-${String(dash[2]).padStart(2, "0")}-${String(dash[3]).padStart(2, "0")}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const aliases = {
  fecha: ["fecha"],
  temporada: ["temporada"],
  competicion: ["competicion", "competición"],
  jornada: ["jornada"],
  local: ["local"],
  visitante: ["visitante"],
  golesLocal: ["goles local"],
  golesVisitante: ["goles visitante"],
  golesLocal1T: ["goles local 1t"],
  golesVisitante1T: ["goles visitante 1t"],
  golesLocal2T: ["goles local 2t"],
  golesVisitante2T: ["goles visitante 2t"],
  xgLocal: ["xg local"],
  xgVisitante: ["xg visitante"],
  posesionLocal: ["posesion local", "posesión local"],
  posesionVisitante: ["posesion visitante", "posesión visitante"],
  tirosLocal: ["tiros local"],
  tirosVisitante: ["tiros visitante"],
  tirosPuertaLocal: ["tiros puerta local"],
  tirosPuertaVisitante: ["tiros puerta visitante"],
  cornersLocal: ["corners local"],
  cornersVisitante: ["corners visitante"],
  amarillasLocal: ["amarillas local"],
  amarillasVisitante: ["amarillas visitante"],
  rojasLocal: ["rojas local"],
  rojasVisitante: ["rojas visitante"],
  faltasLocal: ["faltas local"],
  faltasVisitante: ["faltas visitante"],
  offsidesLocal: ["offsides local"],
  offsidesVisitante: ["offsides visitante"],
  arbitro: ["arbitro", "árbitro"],
  estadio: ["estadio"],
  fuente: ["fuente"],
  notas: ["notas"],
};

const findColumn = (headers, key) => headers.findIndex((header) => aliases[key].includes(normalize(header)));
const getCell = (row, headers, key) => {
  const index = findColumn(headers, key);
  return index >= 0 ? row[index] : "";
};

const pubhtmlToCsv = async (source) => {
  const response = await fetch(source, {
    cache: "no-store",
    headers: { "user-agent": "SigmaBet team results importer" },
  });
  if (!response.ok) throw new Error(`La hoja de resultados respondió ${response.status}`);
  const html = await response.text();
  const gid = html.match(/gid=(\d+)/)?.[1];
  if (!gid) throw new Error("No se encontró ningún gid en el enlace pubhtml de resultados.");
  return `${source.replace(/\/pubhtml.*$/i, "/pub")}?gid=${gid}&single=true&output=csv`;
};

const readSource = async (source) => {
  if (/^https?:\/\//i.test(source) && /\/pubhtml/i.test(source)) return readSource(await pubhtmlToCsv(source));
  if (/^https?:\/\//i.test(source)) {
    const separator = source.includes("?") ? "&" : "?";
    const response = await fetch(`${source}${separator}_=${Date.now()}`, {
      cache: "no-store",
      headers: { "user-agent": "SigmaBet team results importer" },
    });
    if (!response.ok) throw new Error(`La hoja de resultados respondió ${response.status}`);
    return response.text();
  }
  return fs.readFileSync(path.resolve(root, source), "utf8");
};

const buildTeamIndex = (data) => {
  const index = new Map();
  (data.teams || []).forEach((team) => {
    [team.name, team.slug, team.id].filter(Boolean).forEach((value) => index.set(normalize(value), team));
  });
  return index;
};

const findTeam = (index, value) => {
  const clean = normalize(value);
  if (!clean) return null;
  const exact = index.get(clean);
  if (exact) return exact;
  const teams = [...new Set(index.values())];
  return teams.find((team) => {
    const name = normalize(team.name);
    return name.includes(clean) || clean.includes(name);
  }) || null;
};
const externalTeamFrom = (value) => {
  const name = text(value);
  const slug = slugify(name);
  return {
    id: `external-${slug}`,
    slug,
    name,
    crest: null,
    venueId: null,
    standing: null,
    form: [],
    stats: {},
  };
};

const buildStats = (row, headers) => ({
  firstHalfGoals: { home: numberFrom(getCell(row, headers, "golesLocal1T")), away: numberFrom(getCell(row, headers, "golesVisitante1T")) },
  secondHalfGoals: { home: numberFrom(getCell(row, headers, "golesLocal2T")), away: numberFrom(getCell(row, headers, "golesVisitante2T")) },
  xg: { home: numberFrom(getCell(row, headers, "xgLocal")), away: numberFrom(getCell(row, headers, "xgVisitante")) },
  possession: { home: numberFrom(getCell(row, headers, "posesionLocal")), away: numberFrom(getCell(row, headers, "posesionVisitante")) },
  shots: { home: numberFrom(getCell(row, headers, "tirosLocal")), away: numberFrom(getCell(row, headers, "tirosVisitante")) },
  shotsOnTarget: { home: numberFrom(getCell(row, headers, "tirosPuertaLocal")), away: numberFrom(getCell(row, headers, "tirosPuertaVisitante")) },
  corners: { home: numberFrom(getCell(row, headers, "cornersLocal")), away: numberFrom(getCell(row, headers, "cornersVisitante")) },
  yellowCards: { home: numberFrom(getCell(row, headers, "amarillasLocal")), away: numberFrom(getCell(row, headers, "amarillasVisitante")) },
  redCards: { home: numberFrom(getCell(row, headers, "rojasLocal")), away: numberFrom(getCell(row, headers, "rojasVisitante")) },
  fouls: { home: numberFrom(getCell(row, headers, "faltasLocal")), away: numberFrom(getCell(row, headers, "faltasVisitante")) },
  offsides: { home: numberFrom(getCell(row, headers, "offsidesLocal")), away: numberFrom(getCell(row, headers, "offsidesVisitante")) },
});

const compactStats = (stats) =>
  Object.fromEntries(
    Object.entries(stats).filter(([, value]) => value && Object.values(value).some((item) => item !== null))
  );

const main = async (source) => {
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const teamIndex = buildTeamIndex(data);
  const rows = parseCsv(await readSource(source));
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalize(cell) === "fecha") && row.some((cell) => normalize(cell) === "local"));

  if (headerIndex < 0) throw new Error("No se encontró una cabecera con columnas fecha y local.");

  const headers = rows[headerIndex];
  const matches = [];
  const unknownTeams = new Set();
  const externalTeams = new Map();
  const resolveTeam = (value) => {
    const existing = findTeam(teamIndex, value);
    if (existing) return existing;
    const name = text(value);
    if (!name) return null;
    unknownTeams.add(name);
    const team = externalTeamFrom(name);
    if (!externalTeams.has(team.id)) externalTeams.set(team.id, team);
    return externalTeams.get(team.id);
  };

  rows.slice(headerIndex + 1).forEach((row) => {
    if (!row.some((cell) => String(cell).trim())) return;
    const localDate = parseDate(getCell(row, headers, "fecha"));
    const home = resolveTeam(getCell(row, headers, "local"));
    const away = resolveTeam(getCell(row, headers, "visitante"));
    const homeGoals = numberFrom(getCell(row, headers, "golesLocal"));
    const awayGoals = numberFrom(getCell(row, headers, "golesVisitante"));

    if (!localDate || (!home && !away)) return;
    if (!home || !away || homeGoals === null || awayGoals === null) return;

    matches.push({
      id: `sheet-${localDate}-${home.id}-${away.id}`,
      slug: null,
      competitionId: slugify(getCell(row, headers, "competicion") || "laliga"),
      seasonId: text(getCell(row, headers, "temporada"), "temporada-desconocida"),
      roundId: text(getCell(row, headers, "jornada"), "Jornada sin dato"),
      homeTeamId: home.id,
      awayTeamId: away.id,
      startDate: `${localDate}T00:00:00+02:00`,
      localDate,
      localTime: null,
      timeStatus: "unknown",
      venue: text(getCell(row, headers, "estadio"), null),
      referee: text(getCell(row, headers, "arbitro"), null),
      status: "finalizado",
      quality: "stats_sheet",
      score: { home: homeGoals, away: awayGoals },
      stats: compactStats(buildStats(row, headers)),
      source: text(getCell(row, headers, "fuente"), null),
      notes: text(getCell(row, headers, "notas"), null),
    });
  });

  fs.writeFileSync(outputPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), teams: [...externalTeams.values()], matches }, null, 2)}\n`);
  console.log(`Resultados importados: ${matches.length}`);
  if (unknownTeams.size) console.warn(`Equipos externos añadidos al historial: ${[...unknownTeams].filter(Boolean).join(", ")}`);
};

if (require.main === module) {
  const source = process.argv[2] || process.env.SIGMABET_PREPARTIDO_TEAM_RESULTS_CSV_URL || "";
  if (!source) {
    console.error("Uso: node tools/import-prepartido-team-results-sheet.js <csv-url-o-ruta>");
    process.exit(1);
  }
  main(source).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { importTeamResultsSheet: main };
