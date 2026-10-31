const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAutomaticAnalysis, buildEditorialPick, buildForecast, matchMetricTotal } = require("../build-prepartido.js");

const teams = [
  { id: "home", name: "Local" },
  { id: "away", name: "Visitante" },
  { id: "other", name: "Rival" },
];

const finished = (id, date, homeTeamId = "home", awayTeamId = "other", score = { home: 2, away: 1 }) => ({
  id,
  startDate: `${date}T18:00:00Z`,
  localDate: date,
  homeTeamId,
  awayTeamId,
  competitionId: "laliga",
  status: "finalizado",
  score,
  stats: {
    firstHalfGoals: { home: 1, away: 0 },
    corners: { home: 5, away: 4 },
    shots: { home: 13, away: 10 },
    shotsOnTarget: { home: 6, away: 3 },
    yellowCards: { home: 2, away: 2 },
    redCards: { home: 0, away: 0 },
    fouls: { home: 12, away: 13 },
  },
});

test("conserva los totales necesarios para las estadísticas del encuentro", () => {
  const match = finished("one", "2026-01-01");
  assert.equal(matchMetricTotal(match, "goals"), 3);
  assert.equal(matchMetricTotal(match, "firstHalfGoals"), 1);
  assert.equal(matchMetricTotal(match, "corners"), 9);
});

test("el pronóstico de forma solo utiliza partidos anteriores", () => {
  const target = { id: "target", startDate: "2026-07-01T18:00:00Z", localDate: "2026-07-01", homeTeamId: "home", awayTeamId: "away", status: "programado" };
  const homePast = Array.from({ length: 6 }, (_, index) => finished(`home-${index}`, `2026-06-${String(index + 1).padStart(2, "0")}`));
  const awayPast = Array.from({ length: 6 }, (_, index) => finished(`away-${index}`, `2026-05-${String(index + 1).padStart(2, "0")}`, "other", "away", { home: 2, away: 0 }));
  const future = finished("future", "2026-08-01");
  const forecast = buildForecast({ teams, matches: [...homePast, ...awayPast, target, future] }, target, teams[0], teams[1]);

  assert.equal(forecast.sampleCount, 12);
  assert.equal(forecast.homeForm.rate, 100);
  assert.equal(forecast.awayForm.rate, 0);
  assert.match(forecast.tendency.label, /Local/);
});

test("propone una apuesta editorial con frecuencia y muestra verificables", () => {
  const target = { id: "target", startDate: "2026-07-01T18:00:00Z", localDate: "2026-07-01", homeTeamId: "home", awayTeamId: "away", status: "programado" };
  const homePast = Array.from({ length: 6 }, (_, index) => finished(`home-${index}`, `2026-06-${String(index + 1).padStart(2, "0")}`));
  const awayPast = Array.from({ length: 6 }, (_, index) => finished(`away-${index}`, `2026-05-${String(index + 1).padStart(2, "0")}`, "other", "away", { home: 2, away: 1 }));
  const data = { teams, matches: [...homePast, ...awayPast, target] };
  const analysis = buildAutomaticAnalysis(data, target, teams[0], teams[1]);
  const pick = buildEditorialPick(data, target, teams[0], teams[1], analysis);

  assert.notEqual(pick.label, "Esperar / sin apuesta");
  assert.ok(pick.total >= 4);
  assert.ok(pick.rate >= 0 && pick.rate <= 100);
});
