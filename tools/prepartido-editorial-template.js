const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "prepartido", "laliga.json"), "utf8"));
const query = process.argv[2];

if (!query) {
  console.error("Uso: node tools/prepartido-editorial-template.js <slug-o-id-del-partido>");
  process.exit(1);
}

const match = data.matches.find((item) => item.slug === query || item.id === query);

if (!match) {
  console.error(`No se ha encontrado ningún partido para: ${query}`);
  process.exit(1);
}

const teams = new Map(data.teams.map((team) => [team.id, team]));
const home = teams.get(match.homeTeamId);
const away = teams.get(match.awayTeamId);

const block = {
  [match.slug]: {
    quality: "basic",
    seoPriority: "C",
    robots: "noindex",
    updatedAt: new Date().toISOString(),
    preview: "Resumen corto de la previa.",
    analysis: "No hay ningún análisis disponible para este encuentro.",
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
    injuries: [
      {
        teamId: home?.id || match.homeTeamId,
        name: "",
        position: null,
        status: "duda",
        confidence: "pendiente",
        reason: null,
        source: null,
        sourceUrl: null,
        updatedAt: null
      }
    ],
    lineups: [
      {
        teamId: home?.id || match.homeTeamId,
        type: "probable",
        formation: null,
        confidence: "pendiente",
        players: [],
        updatedAt: null
      },
      {
        teamId: away?.id || match.awayTeamId,
        type: "probable",
        formation: null,
        confidence: "pendiente",
        players: [],
        updatedAt: null
      }
    ],
    news: []
  }
};

console.log(JSON.stringify(block, null, 2));
