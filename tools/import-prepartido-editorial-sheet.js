const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "prepartido", "laliga.json");
const editorialPath = path.join(root, "data", "prepartido", "editorial.json");

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

const boolFrom = (value) => {
  const clean = normalize(value);
  if (!clean) return true;
  return !["no", "false", "0", "ocultar"].includes(clean);
};

const splitList = (value) =>
  String(value || "")
    .split(/\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);

const statusFrom = (value) => {
  const clean = normalize(value);
  if (clean === "baja") return "baja";
  if (["lesionado", "lesion"].includes(clean)) return "lesionado";
  if (["sancionado", "sancion"].includes(clean)) return "sancionado";
  if (["recuperado", "vuelve"].includes(clean)) return "recuperado";
  return "duda";
};

const confidenceFrom = (value) => {
  const clean = normalize(value);
  if (["alta", "media", "baja"].includes(clean)) return clean;
  return "pendiente";
};

const betResultFrom = (value) => {
  const clean = normalize(value);
  if (["pendiente", "ganada", "perdida", "nula", "media_ganada", "media perdida", "media_perdida"].includes(clean)) {
    return clean.replace(" ", "_");
  }
  return "no_bet";
};

const aliases = {
  slug: ["slug", "partido_slug", "url"],
  id: ["id", "match_id"],
  publicar: ["publicar", "activo", "mostrar"],
  preview: ["preview", "resumen", "entradilla"],
  analysis: ["analisis", "análisis", "lectura"],
  keys: ["claves", "keys", "puntos clave"],
  probHome: ["prob local", "prob_local", "probabilidad local"],
  probDraw: ["prob empate", "prob_empate", "probabilidad empate"],
  probAway: ["prob visitante", "prob_visitante", "probabilidad visitante"],
  market: ["mercado", "apuesta mercado", "apuesta_mercado"],
  selection: ["seleccion", "selección", "apuesta", "pick"],
  bookmaker: ["casa", "bookmaker"],
  odds: ["cuota", "odds"],
  sigmaProbability: ["prob apuesta", "prob_apuesta", "probabilidad apuesta", "prob sigmabet"],
  minimumOdds: ["cuota minima", "cuota mínima", "cuota_minima"],
  stake: ["stake"],
  publishedAt: ["publicada", "published_at", "hora publicacion"],
  betResult: ["resultado apuesta", "resultado", "estado apuesta"],
  homeFormation: ["xi local formacion", "xi_local_formacion", "formacion local"],
  homeConfidence: ["xi local confianza", "xi_local_confianza", "confianza local"],
  homePlayers: ["xi local", "alineacion local", "alineación local"],
  awayFormation: ["xi visitante formacion", "xi_visitante_formacion", "formacion visitante"],
  awayConfidence: ["xi visitante confianza", "xi_visitante_confianza", "confianza visitante"],
  awayPlayers: ["xi visitante", "alineacion visitante", "alineación visitante"],
  homeInjuries: ["bajas local", "bajas_local"],
  awayInjuries: ["bajas visitante", "bajas_visitante"],
  robots: ["robots", "seo"],
  quality: ["calidad", "quality"],
};

const findColumn = (headers, key) => headers.findIndex((header) => aliases[key].includes(normalize(header)));
const getCell = (row, headers, key) => {
  const index = findColumn(headers, key);
  return index >= 0 ? row[index] : "";
};

const parseInjuries = (value, teamId) =>
  splitList(value)
    .map((item) => {
      const [name, status, reason] = item.split(";").map((part) => part.trim());
      return name
        ? {
            teamId,
            name,
            position: null,
            status: statusFrom(status),
            confidence: "pendiente",
            reason: text(reason, null),
            source: null,
            sourceUrl: null,
            updatedAt: null,
          }
        : null;
    })
    .filter(Boolean);

const pubhtmlToCsv = async (source) => {
  const response = await fetch(source, {
    cache: "no-store",
    headers: { "user-agent": "SigmaBet prepartido editorial importer" },
  });
  if (!response.ok) throw new Error(`La hoja respondió ${response.status}`);
  const html = await response.text();
  const gid = html.match(/gid=(\d+)/)?.[1];
  if (!gid) throw new Error("No se encontró ningún gid en el enlace pubhtml de previas.");
  return `${source.replace(/\/pubhtml.*$/i, "/pub")}?gid=${gid}&single=true&output=csv`;
};

const readSource = async (source) => {
  if (/^https?:\/\//i.test(source) && /\/pubhtml/i.test(source)) return readSource(await pubhtmlToCsv(source));
  if (/^https?:\/\//i.test(source)) {
    const separator = source.includes("?") ? "&" : "?";
    const response = await fetch(`${source}${separator}_=${Date.now()}`, {
      cache: "no-store",
      headers: { "user-agent": "SigmaBet prepartido editorial importer" },
    });
    if (!response.ok) throw new Error(`La hoja respondió ${response.status}`);
    return response.text();
  }
  return fs.readFileSync(path.resolve(root, source), "utf8");
};

const loadJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);

const findMatch = (data, row, headers) => {
  const slug = text(getCell(row, headers, "slug"));
  const id = text(getCell(row, headers, "id"));
  return data.matches.find((match) => match.slug === slug || match.id === id);
};

const buildEntry = (match, row, headers) => {
  const probHome = numberFrom(getCell(row, headers, "probHome"));
  const probDraw = numberFrom(getCell(row, headers, "probDraw"));
  const probAway = numberFrom(getCell(row, headers, "probAway"));
  const selection = text(getCell(row, headers, "selection"));
  const market = text(getCell(row, headers, "market"));
  const homePlayers = splitList(getCell(row, headers, "homePlayers"));
  const awayPlayers = splitList(getCell(row, headers, "awayPlayers"));
  const hasBet = selection && market;
  const lineups = [];

  if (homePlayers.length || text(getCell(row, headers, "homeFormation"))) {
    lineups.push({
      teamId: match.homeTeamId,
      type: "probable",
      formation: text(getCell(row, headers, "homeFormation"), null),
      confidence: confidenceFrom(getCell(row, headers, "homeConfidence")),
      players: homePlayers,
      updatedAt: null,
    });
  }

  if (awayPlayers.length || text(getCell(row, headers, "awayFormation"))) {
    lineups.push({
      teamId: match.awayTeamId,
      type: "probable",
      formation: text(getCell(row, headers, "awayFormation"), null),
      confidence: confidenceFrom(getCell(row, headers, "awayConfidence")),
      players: awayPlayers,
      updatedAt: null,
    });
  }

  return {
    quality: text(getCell(row, headers, "quality"), "basic"),
    seoPriority: "C",
    robots: text(getCell(row, headers, "robots"), "noindex"),
    updatedAt: new Date().toISOString(),
    preview: text(getCell(row, headers, "preview"), null),
    analysis: text(getCell(row, headers, "analysis"), null),
    keys: splitList(getCell(row, headers, "keys")),
    probabilities:
      probHome !== null || probDraw !== null || probAway !== null
        ? {
            home: probHome,
            draw: probDraw,
            away: probAway,
            updatedAt: new Date().toISOString(),
          }
        : null,
    mainBet: hasBet
      ? {
          type: "principal",
          market,
          selection,
          bookmaker: text(getCell(row, headers, "bookmaker"), null),
          odds: numberFrom(getCell(row, headers, "odds")),
          sigmaProbability: numberFrom(getCell(row, headers, "sigmaProbability")),
          minimumOdds: numberFrom(getCell(row, headers, "minimumOdds")),
          stake: numberFrom(getCell(row, headers, "stake")),
          publishedAt: text(getCell(row, headers, "publishedAt"), null),
          result: betResultFrom(getCell(row, headers, "betResult")) === "no_bet" ? "pendiente" : betResultFrom(getCell(row, headers, "betResult")),
        }
      : {
          type: "principal",
          market: "No Bet",
          selection: "Sin apuesta recomendada",
          bookmaker: null,
          odds: null,
          sigmaProbability: null,
          minimumOdds: null,
          stake: null,
          publishedAt: null,
          result: "no_bet",
        },
    valueBets: [],
    injuries: [
      ...parseInjuries(getCell(row, headers, "homeInjuries"), match.homeTeamId),
      ...parseInjuries(getCell(row, headers, "awayInjuries"), match.awayTeamId),
    ],
    lineups,
    news: [],
  };
};

const main = async (source) => {
  const data = loadJson(dataPath, { matches: [] });
  const editorial = loadJson(editorialPath, { updatedAt: "", matches: {} });
  const rows = parseCsv(await readSource(source));
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalize(cell) === "slug") || row.some((cell) => normalize(cell) === "id"));

  if (headerIndex < 0) throw new Error("No se encontró una cabecera con columna slug o id.");

  const headers = rows[headerIndex];
  let imported = 0;
  const unknown = [];

  rows.slice(headerIndex + 1).forEach((row) => {
    if (!row.some((cell) => String(cell).trim())) return;
    if (!boolFrom(getCell(row, headers, "publicar"))) return;

    const match = findMatch(data, row, headers);
    if (!match) {
      unknown.push(text(getCell(row, headers, "slug")) || text(getCell(row, headers, "id")) || "fila sin slug/id");
      return;
    }

    editorial.matches[match.slug] = buildEntry(match, row, headers);
    imported += 1;
  });

  editorial.updatedAt = new Date().toISOString();
  fs.writeFileSync(editorialPath, `${JSON.stringify(editorial, null, 2)}\n`);

  console.log(`Previas importadas: ${imported}`);
  if (unknown.length) {
    console.warn(`Partidos no encontrados: ${unknown.join(", ")}`);
  }
};

if (require.main === module) {
  const source = process.argv[2] || process.env.SIGMABET_PREPARTIDO_EDITORIAL_CSV_URL || "";

  if (!source) {
    console.error("Uso: node tools/import-prepartido-editorial-sheet.js <csv-url-o-ruta>");
    process.exit(1);
  }

  main(source).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { importEditorialSheet: main };
