const SHEET_URL =
  process.env.SIGMABET_REGISTRY_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQF6IjnBd19bjJ8Ws5La0n8FBKmh-ad3Kfj89CQRCKi3JrbsTGcuIn6WJaqkQXL_A/pub?gid=544576635&single=true&output=csv";

const memoryCache = globalThis.__sigmabetRegistryCache || {
  payload: null,
  updatedAt: "",
};

globalThis.__sigmabetRegistryCache = memoryCache;

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const text = (value, fallback = "") => {
  const clean = String(value ?? "").trim();
  return clean || fallback;
};

const numberFrom = (value) => {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(
    String(value ?? "")
      .replace("%", "")
      .replace("u", "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasNumber = (value) => Number.isFinite(numberFrom(value)) && String(value ?? "").trim() !== "";

const parseDate = (value) => {
  const raw = text(value);
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dashMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
};

const aliases = {
  fecha: ["fecha"],
  competition: ["competicion", "competición"],
  partido: ["partido", "evento"],
  apuesta: ["apuesta", "pick"],
  casa: ["casa", "bookie", "casa de apuestas"],
  cuota: ["cuota", "odd"],
  resultado: ["resultado"],
  stake: ["stake"],
  profit: ["u / profit", "u/profit", "profit", "unidades"],
  acumulado: ["acumulado", "balance", "balance acumulado"],
  datos: ["datos/estadisticas", "datos/estadísticas", "datos", "estadisticas", "estadísticas"],
  resumen: ["resumen", "comentario"],
  notas: ["notas", "nota"],
  resultadoSelecciones: [
    "resultado selecciones",
    "resultado seleccion",
    "resultado selección",
    "resultados selecciones",
    "resultados seleccion",
    "resultados selección",
    "selecciones resultado",
    "estado selecciones",
    "estado seleccion",
    "estado selección",
  ],
  tipo: ["tipo", "tipo de apuesta", "tipo de pick"],
};

const findColumn = (headers, key) => headers.findIndex((header) => aliases[key].includes(normalize(header)));

const getCell = (row, headers, key) => {
  const index = findColumn(headers, key);
  return index >= 0 ? row[index] : "";
};

const isValidRow = (row, seen) => {
  const result = normalize(row.resultado);
  const validResults = [
    "ganado",
    "ganada",
    "verde",
    "win",
    "perdido",
    "perdida",
    "rojo",
    "loss",
    "nulo",
    "void",
    "push",
    "pendiente",
    "",
  ];
  const duplicateKey = [row.fecha, row.partido, row.apuesta, row.cuota, row.stake].map(normalize).join("|");
  const valid =
    parseDate(row.fecha) &&
    text(row.partido) &&
    text(row.apuesta) &&
    hasNumber(row.cuota) &&
    hasNumber(row.stake) &&
    validResults.includes(result) &&
    (result === "pendiente" || result === "" || hasNumber(row.profit)) &&
    !seen.has(duplicateKey);

  if (valid) seen.add(duplicateKey);
  return Boolean(valid);
};

const parseRows = (csv) => {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex(
    (row) =>
      row.some((cell) => normalize(cell) === "fecha") &&
      row.some((cell) => ["competicion", "competición"].includes(normalize(cell))) &&
      row.some((cell) => ["apuesta", "pick"].includes(normalize(cell)))
  );

  if (headerIndex < 0) throw new Error("No se encontró la cabecera del registro.");

  const headers = rows[headerIndex];
  const seen = new Set();

  return rows
    .slice(headerIndex + 1)
    .map((row) => {
      const apuesta = getCell(row, headers, "apuesta");
      const tipo = getCell(row, headers, "tipo");

      return {
        fecha: getCell(row, headers, "fecha"),
        competition: getCell(row, headers, "competition"),
        partido: getCell(row, headers, "partido"),
        apuesta,
        casa: getCell(row, headers, "casa"),
        cuota: getCell(row, headers, "cuota"),
        resultado: getCell(row, headers, "resultado"),
        stake: getCell(row, headers, "stake"),
        profit: getCell(row, headers, "profit"),
        acumulado: getCell(row, headers, "acumulado"),
        datos: getCell(row, headers, "datos"),
        resumen: getCell(row, headers, "resumen"),
        notas: getCell(row, headers, "notas"),
        resultadoSelecciones: getCell(row, headers, "resultadoSelecciones"),
        tipo: tipo || (normalize(apuesta).includes("dorado") || normalize(apuesta).includes("senal sigma") ? "Señal Sigma" : "Gratis"),
      };
    })
    .filter((row) => row.fecha || row.competition || row.partido || row.apuesta || row.resultado)
    .filter((row) => isValidRow(row, seen));
};

const isSettled = (row) => !["", "pendiente"].includes(normalize(row.resultado));

const isWin = (row) => ["ganado", "ganada", "verde", "win"].includes(normalize(row.resultado));

const calculateSummary = (rows) => {
  const settled = rows.filter(isSettled);
  const balance = rows.reduce((sum, row) => sum + numberFrom(row.profit), 0);
  const stake = settled.reduce((sum, row) => sum + (numberFrom(row.stake) || 1), 0);
  const wins = settled.filter(isWin).length;
  const avgOdd = settled.length ? settled.reduce((sum, row) => sum + numberFrom(row.cuota), 0) / settled.length : 0;
  const round = (value) => Number(value.toFixed(4));

  return {
    totalRows: rows.length,
    settled: settled.length,
    wins,
    balance: round(balance),
    yield: round(stake ? balance / stake : 0),
    hitRate: round(settled.length ? wins / settled.length : 0),
    avgOdd: round(avgOdd),
    avgStake: round(settled.length ? stake / settled.length : 0),
  };
};

const buildPayload = (rows, source) => ({
  source,
  updatedAt: new Date().toISOString(),
  rows,
  summary: calculateSummary(rows),
});

const sendJson = (res, status, payload, cacheControl) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", cacheControl);
  res.end(JSON.stringify(payload));
};

module.exports = async function handler(_req, res) {
  try {
    const separator = SHEET_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${SHEET_URL}${separator}_=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "user-agent": "SigmaBet registry cache",
      },
    });

    if (!response.ok) throw new Error(`La fuente respondió ${response.status}`);

    const rows = parseRows(await response.text());
    const payload = buildPayload(rows, "fresh");
    memoryCache.payload = payload;
    memoryCache.updatedAt = payload.updatedAt;

    sendJson(res, 200, payload, "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400");
  } catch (error) {
    if (memoryCache.payload) {
      sendJson(
        res,
        200,
        {
          ...memoryCache.payload,
          source: "stale",
          staleReason: error.message,
        },
        "public, s-maxage=30, stale-while-revalidate=300"
      );
      return;
    }

    sendJson(
      res,
      503,
      {
        source: "error",
        error: "El registro no está disponible temporalmente. Inténtalo de nuevo más tarde.",
      },
      "no-store"
    );
  }
};
