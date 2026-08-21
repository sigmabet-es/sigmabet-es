const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "prepartido", "laliga.json");
const htmlPath = process.argv[2] || "/tmp/lv_laliga_2026_27_all.html";

const teamMap = {
  "Athletic": ["athletic-club", "Athletic Club"],
  "Athletic Club": ["athletic-club", "Athletic Club"],
  "Atlético de Madrid": ["atletico-de-madrid", "Atlético de Madrid"],
  "Celta": ["celta", "Celta"],
  "Deportivo Alavés": ["deportivo-alaves", "Deportivo Alavés"],
  "Elche": ["elche-cf", "Elche CF"],
  "Elche CF": ["elche-cf", "Elche CF"],
  "Espanyol": ["rcd-espanyol", "RCD Espanyol de Barcelona"],
  "FC Barcelona": ["fc-barcelona", "FC Barcelona"],
  "Getafe": ["getafe-cf", "Getafe CF"],
  "Getafe CF": ["getafe-cf", "Getafe CF"],
  "Levante": ["levante-ud", "Levante UD"],
  "Levante UD": ["levante-ud", "Levante UD"],
  "Málaga": ["malaga-cf", "Málaga CF"],
  "Málaga CF": ["malaga-cf", "Málaga CF"],
  "Osasuna": ["ca-osasuna", "CA Osasuna"],
  "CA Osasuna": ["ca-osasuna", "CA Osasuna"],
  "RC Deportivo": ["rc-deportivo", "RC Deportivo"],
  "Racing": ["racing-club", "R. Racing Club"],
  "R. Racing Club": ["racing-club", "R. Racing Club"],
  "Rayo Vallecano": ["rayo-vallecano", "Rayo Vallecano"],
  "Real Betis": ["real-betis", "Real Betis"],
  "Real Madrid": ["real-madrid", "Real Madrid"],
  "Real Sociedad": ["real-sociedad", "Real Sociedad"],
  "Sevilla": ["sevilla-fc", "Sevilla FC"],
  "Sevilla FC": ["sevilla-fc", "Sevilla FC"],
  "Valencia": ["valencia-cf", "Valencia CF"],
  "Valencia CF": ["valencia-cf", "Valencia CF"],
  "Villarreal": ["villarreal-cf", "Villarreal CF"],
  "Villarreal CF": ["villarreal-cf", "Villarreal CF"]
};

const teamVenues = {
  "athletic-club": "San Mamés",
  "atletico-de-madrid": "Riyadh Air Metropolitano",
  "celta": "Estadio Abanca-Balaídos",
  "deportivo-alaves": "Mendizorroza",
  "elche-cf": "Estadio Martínez Valero",
  "rcd-espanyol": "RCDE Stadium",
  "fc-barcelona": "Spotify Camp Nou",
  "getafe-cf": "Estadio Coliseum",
  "levante-ud": "Ciutat de Valencia",
  "malaga-cf": "Estadio La Rosaleda",
  "ca-osasuna": "Estadio El Sadar",
  "rc-deportivo": "ABANCA-Riazor",
  "racing-club": "El Sardinero",
  "rayo-vallecano": "Estadio de Vallecas",
  "real-betis": "Estadio de La Cartuja",
  "real-madrid": "Estadio Bernabéu",
  "real-sociedad": "Reale Arena",
  "sevilla-fc": "Ramón Sánchez-Pizjuán",
  "valencia-cf": "Mestalla",
  "villarreal-cf": "Estadio de la Cerámica"
};

const officialOverrides = {
  "laliga-2026-2027-j1-alaves-getafe": {
    referee: "Manuel Jesús Orellana Cid"
  },
  "laliga-2026-2027-j1-sevilla-rayo": {
    referee: "Ricardo de Burgos Bengoetxea"
  },
  "laliga-2026-2027-j1-racing-villarreal": {
    referee: "Miguel Sesma Espinosa"
  },
  "laliga-2026-2027-j1-espanyol-levante": {
    referee: "Muñiz Muñoz"
  },
  "laliga-2026-2027-j1-deportivo-elche": {
    referee: "Francisco José Hernández Maeso"
  },
  "laliga-2026-2027-j2-rayo-vallecano-deportivo-alaves": {
    status: "finalizado",
    score: { home: 1, away: 1 },
    referee: "José Luis Munuera Montero"
  },
  "laliga-2026-2027-j2-real-betis-real-sociedad": {
    referee: "Isidro Díaz de Mera Escuderos"
  }
};

const pad = (value) => String(value).padStart(2, "0");
const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const madridOffset = (dateKey) => {
  const month = Number(dateKey.slice(5, 7));
  if (month >= 4 && month <= 10) return "+02:00";
  return "+01:00";
};

const normalizeStart = (startDate) => {
  const dateKey = startDate.slice(0, 10);
  const time = startDate.slice(11, 16);
  const timePending = time === "00:00";
  return {
    localDate: dateKey,
    localTime: timePending ? null : time,
    startDate: timePending ? `${dateKey}T00:00:00${madridOffset(dateKey)}` : `${dateKey}T${time}:00${madridOffset(dateKey)}`,
    timeStatus: timePending ? "pending" : "confirmed"
  };
};

const findTeam = (name) => {
  const found = teamMap[name.trim()];
  if (!found) throw new Error(`Equipo no mapeado: ${name}`);
  return { id: found[0], name: found[1] };
};

const parseEvent = (eventJson, roundNumber) => {
  const event = JSON.parse(eventJson.replace(/\n/g, ""));
  const [rawHome, rawAway] = event.name.split(" - ");
  const home = findTeam(rawHome);
  const away = findTeam(rawAway);
  const start = normalizeStart(event.startDate);
  const id = `laliga-2026-2027-j${roundNumber}-${home.id}-${away.id}`;
  const base = {
    id,
    slug: `${home.id}-${away.id}-${start.localDate}`,
    competitionId: "laliga",
    seasonId: "laliga-2026-2027",
    roundId: `laliga-2026-2027-jornada-${roundNumber}`,
    homeTeamId: home.id,
    awayTeamId: away.id,
    startDate: start.startDate,
    localDate: start.localDate,
    localTime: start.localTime,
    timeStatus: start.timeStatus,
    venue: event.location?.name || teamVenues[home.id] || null,
    referee: null,
    status: "proximo",
    quality: "data_only",
    seoPriority: "C",
    robots: "noindex",
    lastUpdated: "2026-08-21T01:45:00+01:00",
    preview: "No hay ningún análisis disponible para este encuentro.",
    keys: [],
    probabilities: null,
    mainBet: {
      type: "principal",
      market: "No Bet",
      selection: "Sin apuesta recomendada",
      bookmaker: null,
      odds: null,
      sigmaProbability: null,
      minimumOdds: null,
      stake: null,
      publishedAt: null,
      result: "no_bet"
    },
    valueBets: [],
    injuries: [],
    lineups: [],
    news: []
  };
  return { ...base, ...(officialOverrides[id] || {}) };
};

const readCalendarBlocks = (html) =>
  [...html.matchAll(/<div class="calendar-block">([\s\S]*?)(?=<div class="calendar-block">|<\/main>|$)/g)].map((match) => match[1]);

const readEvents = (block) =>
  [...block.matchAll(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Event"[\s\S]*?\})<\/script>/g)].map(
    (match) => match[1]
  );

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");
const blocks = readCalendarBlocks(html);
const existingJ1 = data.matches
  .filter((match) => match.roundId === "laliga-2026-2027-jornada-1")
  .map((match) => {
    const dateKey = match.localDate || String(match.startDate || "").slice(0, 10);
    const time = match.localTime || String(match.startDate || "").slice(11, 16);
    const timePending = !time || time === "00:00";
    return {
      ...match,
      startDate: timePending ? `${dateKey}T00:00:00${madridOffset(dateKey)}` : `${dateKey}T${time}:00${madridOffset(dateKey)}`,
      localDate: dateKey,
      localTime: timePending ? null : time,
      timeStatus: timePending ? "pending" : "confirmed",
      venue: match.venue || teamVenues[match.homeTeamId] || null,
      ...(officialOverrides[match.id] || {})
    };
  });
const imported = [];

blocks.slice(1).forEach((block) => {
  const roundNumber = Number((block.match(/data-round-number="(\d+)"/) || [])[1]);
  if (!Number.isFinite(roundNumber) || roundNumber < 2) return;
  readEvents(block).forEach((eventJson) => imported.push(parseEvent(eventJson, roundNumber)));
});

const matches = [...existingJ1, ...imported].sort((a, b) => {
  const dateOrder = String(a.startDate || "").localeCompare(String(b.startDate || ""));
  return dateOrder || a.id.localeCompare(b.id);
});

const rounds = Array.from({ length: 38 }, (_, index) => {
  const roundNumber = index + 1;
  const roundId = `laliga-2026-2027-jornada-${roundNumber}`;
  const roundMatches = matches.filter((match) => match.roundId === roundId);
  const dates = roundMatches.map((match) => match.localDate || String(match.startDate).slice(0, 10)).filter(Boolean).sort();
  return {
    id: roundId,
    slug: `jornada-${roundNumber}`,
    name: `Jornada ${roundNumber}`,
    startDate: dates[0] || null,
    endDate: dates[dates.length - 1] || null,
    matchIds: roundMatches.map((match) => match.id)
  };
});

const teamIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
const teams = Object.values(teamMap)
  .filter(([id], index, array) => teamIds.has(id) && array.findIndex(([itemId]) => itemId === id) === index)
  .map(([id, name]) => ({
    id,
    slug: id,
    name,
    crest: null,
    venueId: null,
    standing: null,
    form: [],
    stats: {}
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

const nextData = {
  ...data,
  competition: { ...data.competition, status: "season_calendar_loaded" },
  season: { ...data.season, status: "full_calendar_loaded" },
  lastUpdated: "2026-08-21T01:45:00+01:00",
  teams,
  rounds,
  matches,
  notes: [
    "Calendario completo importado desde La Vanguardia y contrastado con LALIGA para las jornadas con horario confirmado.",
    "Los horarios exactos pueden sufrir cambios; LALIGA recomienda verificar regularmente horarios y fechas en canales oficiales.",
    "Los campos desconocidos quedan en null o arrays vacíos; no se inventan lesiones, cuotas, XI, noticias, árbitros ni análisis."
  ]
};

fs.writeFileSync(dataPath, `${JSON.stringify(nextData, null, 2)}\n`);
console.log(`Importados ${matches.length} partidos y ${rounds.length} jornadas.`);
