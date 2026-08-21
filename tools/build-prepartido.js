const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "prepartido", "laliga.json");
const outputRoot = root;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const text = (value, fallback = "Dato no disponible") => {
  const clean = String(value ?? "").trim();
  return clean || fallback;
};

const percent = (value) => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "Dato no disponible");
const fairOdds = (probability) => {
  const number = Number(probability);
  return Number.isFinite(number) && number > 0 ? (100 / number).toFixed(2) : "Dato no disponible";
};
const impliedProbability = (odds) => {
  const number = Number(odds);
  return Number.isFinite(number) && number > 1 ? (100 / number).toFixed(2) : "Dato no disponible";
};
const edge = (probability, odds) => {
  const sigma = Number(probability);
  const implied = Number(impliedProbability(odds));
  return Number.isFinite(sigma) && Number.isFinite(implied) ? `${(sigma - implied).toFixed(2)} pp` : "Dato no disponible";
};
const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const readData = () => JSON.parse(fs.readFileSync(dataPath, "utf8"));
const mkdirp = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeFile = (file, content) => {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, content);
};

const pageShell = ({ title, description, canonical, robots = "index,follow", body, structuredData }) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="https://sigmabet.es/assets/img/banner.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="icon" href="/assets/img/logo.svg?v=20260709-05" type="image/svg+xml" />
    <link rel="stylesheet" href="/assets/css/styles.css?v=20260821-02" />
    <script src="/assets/js/main.js?v=20260709-05" defer></script>
    <script src="/assets/js/prepartido-match.js?v=20260821-01" defer></script>
    ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ""}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/index.html" aria-label="SigmaBet inicio"><img src="/assets/img/logo.svg?v=20260709-05" alt="" /><span>SigmaBet</span></a>
      <button class="nav-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" data-nav-toggle><span></span><span></span><span></span></button>
      <nav class="site-nav" aria-label="Menú principal" data-nav>
        <a href="/index.html">Inicio</a><a href="/partidos/">Partidos</a><a href="/registro.html">Registro</a><a href="/normas.html">Normas</a><a href="/juego-responsable.html">Juego responsable</a><a class="nav-telegram" href="https://t.me/SigmaBetES" target="_blank" rel="noreferrer" data-telegram-link>Telegram gratis</a>
      </nav>
      <div class="header-actions"><a class="header-x-link" href="https://x.com/SigmaBetES" target="_blank" rel="noreferrer" aria-label="SigmaBet en X">X</a><a class="button button-small" href="https://t.me/SigmaBetES" target="_blank" rel="noreferrer" data-telegram-link>Telegram gratis</a></div>
    </header>
    <main>${body}</main>
    <footer class="site-footer">
      <div><a class="brand footer-brand" href="/index.html"><img src="/assets/img/logo.svg?v=20260709-05" alt="" /><span>SigmaBet</span></a><p>Más datos. Menos fe.</p><p>+18 | Juego responsable. No hay apuestas seguras. Las apuestas implican riesgo.</p></div>
      <nav aria-label="Footer"><a href="https://t.me/SigmaBetES" target="_blank" rel="noreferrer" data-telegram-link>Telegram gratis</a><a href="https://x.com/SigmaBetES" target="_blank" rel="noreferrer">X: @SigmaBetES</a><a href="mailto:sigmabet.com@gmail.com">sigmabet.com@gmail.com</a><a href="/partidos/">Partidos</a><a href="/metodologia.html">Metodología</a><a href="/registro.html">Registro</a><a href="/legal.html">Legal</a></nav>
      <p class="copyright">SigmaBet © 2026</p>
    </footer>
  </body>
</html>`;

const renderBet = (bet) => {
  if (!bet || bet.result === "no_bet") {
    return `<article class="match-bet-card match-no-bet"><span>Sin apuesta recomendada</span><strong>No Bet</strong><p>SigmaBet no detecta actualmente una diferencia suficiente entre nuestra estimación y las cuotas disponibles para justificar una entrada.</p></article>`;
  }

  return `<article class="match-bet-card">
    <span>Apuesta SigmaBet</span>
    <strong>${escapeHtml(text(bet.selection))}</strong>
    <p>${escapeHtml(text(bet.market))}</p>
    <dl class="match-metric-strip">
      <div><dt>Cuota</dt><dd>${escapeHtml(text(bet.odds))}</dd></div>
      <div><dt>Stake</dt><dd>${escapeHtml(text(bet.stake))}/5</dd></div>
      <div><dt>Cuota justa</dt><dd>${escapeHtml(fairOdds(bet.sigmaProbability))}</dd></div>
      <div><dt>Implícita</dt><dd>${escapeHtml(impliedProbability(bet.odds))}%</dd></div>
      <div><dt>Edge</dt><dd>${escapeHtml(edge(bet.sigmaProbability, bet.odds))}</dd></div>
    </dl>
  </article>`;
};

const renderFormRow = (team) => {
  const form = Array.isArray(team?.form) ? team.form.slice(-5) : [];
  if (!form.length) return '<span class="match-mini-form-empty">Sin datos</span>';
  return form.map((item) => `<span class="form-${escapeHtml(normalize(item))}">${escapeHtml(item)}</span>`).join("");
};

const renderTeamCurrentForm = (team, label) => {
  const stats = team?.stats?.last5 || {};
  return `<article>
    <span>${escapeHtml(team?.name || label)}</span>
    <div class="form-row">${renderFormRow(team)}</div>
    <dl>
      <div><dt>Balance</dt><dd>${escapeHtml(text(stats.record))}</dd></div>
      <div><dt>Goles</dt><dd>${escapeHtml(text(stats.goals))}</dd></div>
      <div><dt>Portería a cero</dt><dd>${escapeHtml(text(stats.cleanSheets))}</dd></div>
    </dl>
  </article>`;
};

const renderLineup = (match, team, typeLabel) => {
  const lineup = (match.lineups || []).find((item) => item.teamId === team?.id && item.type !== "oficial");
  const players = Array.isArray(lineup?.players) ? lineup.players : [];
  return `<article class="match-panel">
    <h2>Alineación probable ${escapeHtml(typeLabel)}</h2>
    <p>${escapeHtml(team?.name || "Equipo")} · Formación: ${escapeHtml(text(lineup?.formation))} · Confianza: ${escapeHtml(text(lineup?.confidence, "pendiente"))}</p>
    ${
      players.length
        ? `<ol class="lineup-list">${players.map((player) => `<li>${escapeHtml(player)}</li>`).join("")}</ol>`
        : '<div class="lineup-placeholder">XI probable</div>'
    }
  </article>`;
};

const matchTimestamp = (match) => new Date(match.startDate || "9999-12-31T00:00:00Z").getTime();
const isFinished = (match) =>
  match.status === "finalizado" &&
  match.score &&
  Number.isFinite(Number(match.score.home)) &&
  Number.isFinite(Number(match.score.away));

const scoreText = (match) => (isFinished(match) ? `${match.score.home} - ${match.score.away}` : "VS");

const resultForTeam = (match, teamId) => {
  if (!isFinished(match)) return null;
  const homeScore = Number(match.score.home);
  const awayScore = Number(match.score.away);
  if (homeScore === awayScore) return "E";
  const homeWon = homeScore > awayScore;
  return (teamId === match.homeTeamId && homeWon) || (teamId === match.awayTeamId && !homeWon) ? "V" : "D";
};

const completedBefore = (data, beforeMatch) =>
  data.matches
    .filter((item) => item.id !== beforeMatch.id && isFinished(item) && matchTimestamp(item) < matchTimestamp(beforeMatch))
    .sort((a, b) => matchTimestamp(b) - matchTimestamp(a));

const teamMatches = (data, match, teamId, scope = "all", limit = 5) =>
  completedBefore(data, match)
    .filter((item) => item.homeTeamId === teamId || item.awayTeamId === teamId)
    .filter((item) => scope === "all" || (scope === "home" ? item.homeTeamId === teamId : item.awayTeamId === teamId))
    .slice(0, limit);

const h2hMatches = (data, match, scope = "all") =>
  completedBefore(data, match)
    .filter(
      (item) =>
        (item.homeTeamId === match.homeTeamId && item.awayTeamId === match.awayTeamId) ||
        (item.homeTeamId === match.awayTeamId && item.awayTeamId === match.homeTeamId)
    )
    .filter((item) => scope === "all" || (scope === "home" ? item.homeTeamId === match.homeTeamId : item.awayTeamId === match.homeTeamId))
    .slice(0, 10);

const renderFormPills = (data, match, teamId) => {
  const results = teamMatches(data, match, teamId, "all", 5).map((item) => resultForTeam(item, teamId));
  if (!results.length) return '<span class="match-form-empty">Sin resultados previos</span>';
  return results.map((item) => `<span class="form-${escapeHtml(normalize(item))}">${escapeHtml(item)}</span>`).join("");
};

const teamName = (teams, id) => teams.get(id)?.name || "Equipo";

const renderResultRow = (data, item, teamId) => {
  const teams = new Map(data.teams.map((team) => [team.id, team]));
  const result = resultForTeam(item, teamId);
  const scope = item.homeTeamId === teamId ? "home" : "away";
  return `<li data-scope-row="${scope}">
    <span class="form-${escapeHtml(normalize(result))}">${escapeHtml(result)}</span>
    <strong>${escapeHtml(teamName(teams, item.homeTeamId))} ${escapeHtml(scoreText(item))} ${escapeHtml(teamName(teams, item.awayTeamId))}</strong>
    <small>${escapeHtml(item.localDate || String(item.startDate).slice(0, 10))} · ${escapeHtml(item.roundId.replace("laliga-2026-2027-", "").replace("-", " "))}</small>
  </li>`;
};

const renderScopeControls = () => `<div class="match-scope-controls" role="group" aria-label="Filtrar resultados">
  <button type="button" class="is-active" data-scope-filter="all">Todos</button>
  <button type="button" data-scope-filter="home">Local</button>
  <button type="button" data-scope-filter="away">Visitante</button>
</div>`;

const renderRecentTeamResults = (data, match, team) => {
  const rows = teamMatches(data, match, team.id, "all", 10);
  return `<article class="match-results-card" data-filter-section>
    <div class="match-section-head">
      <div><span>Últimos resultados</span><h3>${escapeHtml(team.name)}</h3></div>
      ${renderScopeControls()}
    </div>
    ${
      rows.length
        ? `<ul class="match-result-list">${rows.map((item) => renderResultRow(data, item, team.id)).join("")}</ul>`
        : '<p class="match-empty-copy">No hay resultados de liga suficientes en temporada actual o anterior para este equipo.</p>'
    }
  </article>`;
};

const renderH2h = (data, match, home, away) => {
  const rows = h2hMatches(data, match, "all");
  const summary = rows.reduce(
    (acc, item) => {
      const result = resultForTeam(item, home.id);
      if (result === "V") acc.home += 1;
      if (result === "D") acc.away += 1;
      if (result === "E") acc.draw += 1;
      return acc;
    },
    { home: 0, draw: 0, away: 0 }
  );

  return `<section id="h2h" class="match-panel match-h2h-panel" data-filter-section>
    <div class="match-section-head">
      <div><span>H2H</span><h2>Últimos enfrentamientos directos</h2></div>
      ${renderScopeControls()}
    </div>
    <div class="match-h2h-summary">
      <div><small>${escapeHtml(home.name)}</small><strong>${summary.home}</strong></div>
      <div><small>Empates</small><strong>${summary.draw}</strong></div>
      <div><small>${escapeHtml(away.name)}</small><strong>${summary.away}</strong></div>
    </div>
    ${
      rows.length
        ? `<ul class="match-result-list">${rows.map((item) => renderResultRow(data, item, home.id)).join("")}</ul>`
        : '<p class="match-empty-copy">No hay H2H disponible en temporada actual o anterior para este cruce.</p>'
    }
  </section>`;
};

const renderAnalysisNotice = (match) => {
  const hasAnalysis = text(match.analysis, "") || (match.mainBet && match.mainBet.result !== "no_bet");
  if (hasAnalysis) return "";
  return `<aside class="match-analysis-empty">
    <span>Análisis SigmaBet</span>
    <strong>No hay ningún análisis disponible para este encuentro.</strong>
    <p>La ficha muestra calendario y contexto básico. Cuando haya análisis propio, aparecerá aquí con sus datos y criterio.</p>
  </aside>`;
};

const renderCrest = (team) =>
  team?.crest
    ? `<img src="${escapeHtml(team.crest)}" alt="" loading="lazy" />`
    : `<span class="match-team-fallback">${escapeHtml(String(team?.name || "?").slice(0, 2))}</span>`;

const renderMatch = (data, match) => {
  const teams = new Map(data.teams.map((team) => [team.id, team]));
  const home = teams.get(match.homeTeamId) || { name: "Equipo local", slug: "" };
  const away = teams.get(match.awayTeamId) || { name: "Equipo visitante", slug: "" };
  const round = data.rounds.find((item) => item.id === match.roundId) || { name: "Jornada pendiente", slug: "" };
  const title = `${home.name} vs ${away.name}: análisis y pronóstico | SigmaBet`;
  const description = `Análisis del ${home.name} vs ${away.name} con estadísticas, H2H, bajas, posibles alineaciones, probabilidades y apuestas con valor de SigmaBet.`;
  const canonical = `https://sigmabet.es/partidos/${match.slug}/`;
  const body = `
    <nav class="match-breadcrumb" aria-label="Migas de pan"><a href="/index.html">Inicio</a><span>/</span><a href="/competiciones/laliga/">LaLiga</a><span>/</span><span>${escapeHtml(round.name)}</span></nav>
    <article class="match-page">
      <header class="match-detail-hero">
        <p class="kicker">${escapeHtml(data.competition.name)} · ${escapeHtml(round.name)}</p>
        <h1>${escapeHtml(home.name)} vs ${escapeHtml(away.name)}</h1>
        <div class="match-kickoff-strip">
          <div><span>Hora local</span><strong data-local-time data-time-status="${escapeHtml(match.timeStatus || "confirmed")}" data-start-date="${escapeHtml(match.startDate || "")}">${escapeHtml(match.timeStatus === "pending" ? "Horario pendiente" : text(match.localTime || match.startDate))}</strong></div>
          <div><span>Estadio</span><strong>${escapeHtml(text(match.venue, "Estadio pendiente"))}</strong></div>
          <div><span>Árbitro</span><strong>${escapeHtml(text(match.referee, "Árbitro pendiente"))}</strong></div>
        </div>
        <div class="match-vs-board">
          <section>
            <span>Local</span>
            ${renderCrest(home)}
            <strong>${escapeHtml(home.name)}</strong>
            <div class="form-row">${renderFormPills(data, match, home.id)}</div>
          </section>
          <b class="${isFinished(match) ? "is-result" : ""}">${escapeHtml(scoreText(match))}</b>
          <section>
            <span>Visitante</span>
            ${renderCrest(away)}
            <strong>${escapeHtml(away.name)}</strong>
            <div class="form-row">${renderFormPills(data, match, away.id)}</div>
          </section>
        </div>
        ${renderAnalysisNotice(match)}
      </header>
      <nav class="match-anchor-nav" aria-label="Navegación del partido"><a href="#h2h">H2H</a><a href="#resultados">Resultados</a><a href="#alineaciones">Alineaciones</a><a href="#analisis">Análisis</a><a href="#apuestas">Apuestas</a></nav>
      ${renderH2h(data, match, home, away)}
      <section id="resultados" class="match-results-grid">${renderRecentTeamResults(data, match, home)}${renderRecentTeamResults(data, match, away)}</section>
      <section id="alineaciones" class="match-soft-section"><h2>Alineaciones y bajas</h2><p>Se añadirán alineaciones probables, bajas, sanciones y dudas cuando exista información contrastada.</p></section>
      <section id="analisis" class="match-soft-section"><h2>Análisis SigmaBet</h2><p>${escapeHtml(text(match.analysis, "No hay ningún análisis disponible para este encuentro."))}</p></section>
      <section id="apuestas" class="match-soft-section"><h2>Apuestas con valor</h2><p>Predicción no significa apuesta. Si no existe valor claro, no se publica apuesta.</p></section>
    </article>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home.name} vs ${away.name}`,
    startDate: match.startDate || undefined,
    url: canonical,
    location: match.venue ? { "@type": "Place", name: match.venue } : undefined,
    competitor: [
      { "@type": "SportsTeam", name: home.name },
      { "@type": "SportsTeam", name: away.name },
    ],
  };

  return pageShell({ title, description, canonical, robots: match.robots === "noindex" ? "noindex,follow" : "index,follow", body, structuredData });
};

const build = () => {
  const data = readData();
  const publicMatches = data.matches.filter((match) => match.slug);

  publicMatches.forEach((match) => {
    writeFile(path.join(outputRoot, "partidos", match.slug, "index.html"), renderMatch(data, match));
  });

  console.log(`SigmaBet prepartido: ${publicMatches.length} páginas de partido generadas.`);
};

build();
