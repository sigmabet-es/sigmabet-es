const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { importEditorialSheet } = require("./import-prepartido-editorial-sheet");
const { importTeamResultsSheet } = require("./import-prepartido-team-results-sheet");

const root = path.resolve(__dirname, "..");
const sourcesPath = path.join(root, "data", "prepartido", "sources.json");

const readSources = () => {
  if (!fs.existsSync(sourcesPath)) return {};
  return JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status || 1);
};

const main = async () => {
  const sources = readSources();
  const editorialCsvUrl = process.env.SIGMABET_PREPARTIDO_EDITORIAL_CSV_URL || sources.editorialCsvUrl || "";
  const teamResultsCsvUrl = process.env.SIGMABET_PREPARTIDO_TEAM_RESULTS_CSV_URL || sources.teamResultsCsvUrl || "";

  if (!editorialCsvUrl.trim()) {
    console.warn("No hay Google Sheet conectado. Añade editorialCsvUrl en data/prepartido/sources.json.");
  } else {
    await importEditorialSheet(editorialCsvUrl.trim());
  }

  if (!teamResultsCsvUrl.trim()) {
    console.warn("No hay hoja de resultados conectada. Añade teamResultsCsvUrl en data/prepartido/sources.json.");
  } else {
    await importTeamResultsSheet(teamResultsCsvUrl.trim());
  }

  run("node", ["tools/build-prepartido.js"]);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
