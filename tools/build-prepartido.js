const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "prepartido", "laliga.json");
const editorialPath = path.join(root, "data", "prepartido", "editorial.json");
const teamResultsPath = path.join(root, "data", "prepartido", "team-results.json");
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

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const readData = () => readJson(dataPath, {});
const readEditorial = () => readJson(editorialPath, { matches: {} });
const readTeamResults = () => readJson(teamResultsPath, { matches: [] });
const mkdirp = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeFile = (file, content) => {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, content);
};

const mergeDefined = (base, override) => {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  return Object.entries(override).reduce(
    (next, [key, value]) => {
      if (value === undefined) return next;
      if (Array.isArray(value)) {
        next[key] = value;
        return next;
      }
      if (value && typeof value === "object" && base?.[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
        next[key] = mergeDefined(base[key], value);
        return next;
      }
      next[key] = value;
      return next;
    },
    { ...base }
  );
};

const mergeEditorial = (data, editorial) => {
  const matches = editorial?.matches || {};
  return {
    ...data,
    editorialUpdatedAt: editorial?.updatedAt || null,
    matches: (data.matches || []).map((match) => {
      const manual = matches[match.id] || matches[match.slug];
      if (!manual) return match;
      const merged = mergeDefined(match, manual);
      const hasContent =
        text(merged.analysis, "") ||
        (Array.isArray(merged.lineups) && merged.lineups.length) ||
        (Array.isArray(merged.injuries) && merged.injuries.length) ||
        (merged.mainBet && merged.mainBet.result !== "no_bet");
      return {
        ...merged,
        editorialStatus: hasContent ? "edited" : "empty",
        lastUpdated: manual.updatedAt || merged.lastUpdated,
      };
    }),
  };
};

const matchMergeKey = (match) =>
  [match.localDate || String(match.startDate || "").slice(0, 10), match.homeTeamId, match.awayTeamId].join("|");

const mergeTeamResults = (data, teamResults) => {
  const rows = Array.isArray(teamResults?.matches) ? teamResults.matches : [];
  const externalTeams = Array.isArray(teamResults?.teams) ? teamResults.teams : [];
  const teamsById = new Map((data.teams || []).map((team) => [team.id, team]));
  externalTeams.forEach((team) => {
    if (team?.id && !teamsById.has(team.id)) teamsById.set(team.id, team);
  });
  const byKey = new Map(rows.map((match) => [matchMergeKey(match), match]));
  const usedKeys = new Set();

  const matches = (data.matches || []).map((match) => {
    const key = matchMergeKey(match);
    const result = byKey.get(key);
    if (!result) return match;
    usedKeys.add(key);
    return mergeDefined(match, {
      score: result.score || match.score,
      status: result.score ? "finalizado" : match.status,
      stats: result.stats || match.stats,
      venue: match.venue || result.venue,
      referee: match.referee || result.referee,
      source: result.source || match.source,
      notes: result.notes || match.notes,
    });
  });

  const historicalMatches = rows
    .filter((match) => !usedKeys.has(matchMergeKey(match)))
    .map((match) => ({
      ...match,
      slug: null,
      robots: "noindex",
    }));

  return {
    ...data,
    teams: [...teamsById.values()],
    teamResultsUpdatedAt: teamResults?.updatedAt || null,
    matches: [...matches, ...historicalMatches],
  };
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
    <link rel="stylesheet" href="/assets/css/styles.css?v=20260821-03" />
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

const initials = (value) =>
  text(value, "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const teamKit = (teamId) => {
  const kits = {
    "athletic-club": ["#e0192d", "#ffffff", "#111111"],
    "atletico-de-madrid": ["#d7192d", "#ffffff", "#111111"],
    "ca-osasuna": ["#b8122a", "#10163a", "#ffffff"],
    celta: ["#9bd7ff", "#ffffff", "#0a1b2f"],
    "deportivo-alaves": ["#0055a4", "#ffffff", "#101010"],
    "elche-cf": ["#ffffff", "#1aa36f", "#111111"],
    "fc-barcelona": ["#a50044", "#004d98", "#ffffff"],
    "getafe-cf": ["#004ea8", "#004ea8", "#ffffff"],
    "levante-ud": ["#b00032", "#1f3f8f", "#ffffff"],
    "malaga-cf": ["#77c8ef", "#ffffff", "#111111"],
    "racing-club": ["#0a8f45", "#ffffff", "#111111"],
    "rayo-vallecano": ["#ffffff", "#d7192d", "#111111"],
    "rc-deportivo": ["#005bac", "#ffffff", "#111111"],
    "rcd-espanyol": ["#0050a4", "#ffffff", "#111111"],
    "real-betis": ["#00a651", "#ffffff", "#06120a"],
    "real-madrid": ["#ffffff", "#f3f3f3", "#111111"],
    "real-sociedad": ["#2362b8", "#ffffff", "#111111"],
    "sevilla-fc": ["#ffffff", "#d7192d", "#111111"],
    "valencia-cf": ["#ffffff", "#111111", "#111111"],
    "villarreal-cf": ["#ffe000", "#ffe000", "#111111"],
  };
  const [primary, secondary, textColor] = kits[teamId] || ["#00ff7f", "#ffffff", "#06120a"];
  return `--kit-primary:${primary};--kit-secondary:${secondary};--kit-text:${textColor};`;
};

const parseLineupPlayer = (player, fallbackNumber) => {
  const raw = text(player, "");
  const numbered = raw.match(/^\(?(\d{1,2})\)?[\s.)-]+(.+)$/);
  return {
    number: numbered ? numbered[1] : String(fallbackNumber),
    name: numbered ? text(numbered[2], raw) : raw,
  };
};

const splitLineupRows = (players, formation) => {
  const shape = text(formation, "")
    .split("-")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part) && part > 0);
  const rows = shape.length ? [1, ...shape] : [1, 4, 3, 3];
  let cursor = 0;
  return rows
    .map((amount, index) => {
      const rowPlayers = players.slice(cursor, cursor + amount);
      cursor += amount;
      return {
        type: index === 0 ? "goalkeeper" : index === rows.length - 1 ? "attack" : "line",
        players: rowPlayers,
      };
    })
    .filter((row) => row.players.length)
    .reverse();
};

const renderPitchPlayer = (player, index) => `<li class="pitch-player">
  <span class="pitch-shirt"><b>${escapeHtml(player.number || index + 1)}</b></span>
  <strong>${escapeHtml(player.name || "")}</strong>
</li>`;

const getLineup = (match, team) => (match.lineups || []).find((item) => item.teamId === team?.id && item.type !== "oficial");

const renderLineupTeamSummary = (match, team, typeLabel, side) => {
  const lineup = getLineup(match, team);
  return `<div class="lineup-matchup-team lineup-matchup-${escapeHtml(side)}">
    ${renderCrest(team)}
    <div>
      <span>${escapeHtml(typeLabel)}</span>
      <h3>${escapeHtml(team?.name || "Equipo")}</h3>
      <p>${escapeHtml(text(lineup?.formation, "Formación pendiente"))} · Confianza ${escapeHtml(text(lineup?.confidence, "pendiente"))}</p>
    </div>
  </div>`;
};

const renderFacingLineup = (match, team, side) => {
  const lineup = getLineup(match, team);
  const rawPlayers = Array.isArray(lineup?.players) ? lineup.players : [];
  const players = rawPlayers.map((player, index) => parseLineupPlayer(player, index + 1));
  const rows = splitLineupRows(players, lineup?.formation);
  const facingRows = side === "home" ? [...rows].reverse() : rows;

  if (!players.length) {
    return `<div class="facing-lineup facing-${escapeHtml(side)}" style="${escapeHtml(teamKit(team?.id))}">
      <div class="lineup-placeholder">Alineación pendiente</div>
    </div>`;
  }

  return `<ol class="facing-lineup facing-${escapeHtml(side)}" style="${escapeHtml(teamKit(team?.id))};--line-count:${facingRows.length}">
    ${facingRows
      .map(
        (row) => `<li class="facing-column facing-column-${escapeHtml(row.type)}"><ol>${row.players
          .map((player, index) => renderPitchPlayer(player, index))
          .join("")}</ol></li>`
      )
      .join("")}
  </ol>`;
};

const renderLineupCard = (match, team, typeLabel) => {
  const lineup = (match.lineups || []).find((item) => item.teamId === team?.id && item.type !== "oficial");
  const players = Array.isArray(lineup?.players) ? lineup.players.map((player, index) => parseLineupPlayer(player, index + 1)) : [];
  const rows = splitLineupRows(players, lineup?.formation);
  let playerIndex = players.length;
  return `<article class="lineup-card lineup-pitch-card">
    <div class="lineup-card-head">
      <div>
        <span>${escapeHtml(typeLabel)}</span>
        <h3>${escapeHtml(team?.name || "Equipo")}</h3>
      </div>
      <div class="lineup-card-meta">
        <strong>${escapeHtml(text(lineup?.formation, "Formación pendiente"))}</strong>
        <small>Confianza ${escapeHtml(text(lineup?.confidence, "pendiente"))}</small>
      </div>
    </div>
    ${
      players.length
        ? `<div class="lineup-pitch" aria-label="Alineación probable de ${escapeHtml(team?.name || "Equipo")}">
            ${team?.crest ? `<img class="lineup-watermark" src="${escapeHtml(team.crest)}" alt="" loading="lazy" />` : ""}
            <div class="pitch-lines" aria-hidden="true"></div>
            <ol class="pitch-lineup">${rows
              .map((row) => {
                playerIndex -= row.players.length;
                return `<li class="pitch-row pitch-row-${escapeHtml(row.type)}"><ol>${row.players
                  .map((player, index) => renderPitchPlayer(player, playerIndex + index))
                  .join("")}</ol></li>`;
              })
              .join("")}</ol>
          </div>`
        : '<div class="lineup-placeholder">Alineación pendiente</div>'
    }
  </article>`;
};

const renderLineupsSection = (match, home, away) => {
  const lineups = Array.isArray(match.lineups) ? match.lineups : [];
  return `<section id="alineaciones" class="match-soft-section">
    <div class="match-section-copy">
      <span>Alineaciones</span>
      <h2>Alineaciones probables</h2>
      <p>${
        lineups.length
          ? "Once probable sujeto a cambios hasta que existan alineaciones oficiales. Los dorsales se toman del Excel cuando vienen indicados."
          : "Alineaciones probables pendientes de confirmación. No se muestran jugadores si no hay información fiable."
      }</p>
    </div>
    <article class="lineup-matchup-card">
      <div class="lineup-matchup-head">
        ${renderLineupTeamSummary(match, home, "Local", "home")}
        <span class="lineup-matchup-vs">VS</span>
        ${renderLineupTeamSummary(match, away, "Visitante", "away")}
      </div>
      <div class="lineup-versus-pitch">
        ${home?.crest ? `<img class="lineup-watermark lineup-watermark-home" src="${escapeHtml(home.crest)}" alt="" loading="lazy" />` : ""}
        ${away?.crest ? `<img class="lineup-watermark lineup-watermark-away" src="${escapeHtml(away.crest)}" alt="" loading="lazy" />` : ""}
        <div class="pitch-lines" aria-hidden="true"></div>
        ${renderFacingLineup(match, home, "home")}
        ${renderFacingLineup(match, away, "away")}
      </div>
    </article>
  </section>`;
};

const renderInjuriesSection = (match, home, away) => {
  const injuries = Array.isArray(match.injuries) ? match.injuries : [];
  const byTeam = (team) => injuries.filter((item) => item.teamId === team.id);
  const statusLabel = (status) => {
    const normalized = normalize(status);
    if (normalized.includes("lesion")) return "Lesionado";
    if (normalized.includes("duda")) return "Duda";
    if (normalized.includes("sanc")) return "Sanción";
    if (normalized.includes("decision")) return "Decisión";
    return "Baja";
  };
  const renderItems = (team) => {
    const items = byTeam(team);
    const counts = items.reduce(
      (acc, item) => {
        const label = statusLabel(item.status);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {}
    );
    if (!items.length) {
      return `<div class="availability-empty">
        <span class="availability-ok">OK</span>
        <p>Sin bajas confirmadas en la ficha.</p>
      </div>`;
    }
    return `<div class="availability-summary">
        ${["Lesionado", "Baja", "Duda", "Sanción"].map((label) => `<span>${label} <strong>${counts[label] || 0}</strong></span>`).join("")}
      </div>
      <ul class="availability-list">${items
      .map(
        (item) => {
          const label = statusLabel(item.status);
          return `<li class="availability-item availability-${escapeHtml(normalize(label))}">
          <span class="availability-avatar">${escapeHtml(initials(item.name))}</span>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <small><b>${escapeHtml(label)}</b>${item.reason ? ` · ${escapeHtml(item.reason)}` : ""}${item.position ? ` · ${escapeHtml(item.position)}` : ""}</small>
          </div>
        </li>`
        }
      )
      .join("")}</ul>`;
  };

  return `<section id="bajas" class="match-soft-section">
    <div class="match-section-copy">
      <span>Disponibilidad</span>
      <h2>Bajas, sanciones y dudas</h2>
      <p>Solo se publican ausencias cuando existe información contrastada.</p>
    </div>
    <div class="availability-grid">
      <article class="availability-card">
        <div class="availability-team-head">${renderCrest(home)}<h3>${escapeHtml(home.name)}</h3></div>
        ${renderItems(home)}
      </article>
      <article class="availability-card">
        <div class="availability-team-head">${renderCrest(away)}<h3>${escapeHtml(away.name)}</h3></div>
        ${renderItems(away)}
      </article>
    </div>
  </section>`;
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

const renderProbabilities = (match) => {
  const probabilities = match.probabilities || null;
  if (!probabilities) return "";
  return `<dl class="match-probability-strip">
    <div><dt>Local</dt><dd>${escapeHtml(percent(probabilities.home))}</dd></div>
    <div><dt>Empate</dt><dd>${escapeHtml(percent(probabilities.draw))}</dd></div>
    <div><dt>Visitante</dt><dd>${escapeHtml(percent(probabilities.away))}</dd></div>
  </dl>`;
};

const renderAnalysisSection = (match) => {
  const keys = Array.isArray(match.keys) ? match.keys.filter(Boolean).slice(0, 5) : [];
  return `<section id="analisis" class="match-soft-section">
    <div class="match-section-copy">
      <span>Análisis SigmaBet</span>
      <h2>Lectura del partido</h2>
      <p>${escapeHtml(text(match.analysis, "No hay ningún análisis disponible para este encuentro."))}</p>
    </div>
    ${renderProbabilities(match)}
    ${
      keys.length
        ? `<ul class="match-key-list">${keys.map((key) => `<li>${escapeHtml(key)}</li>`).join("")}</ul>`
        : ""
    }
  </section>`;
};

const renderBetSection = (match) => `<section id="apuestas" class="match-soft-section">
  <div class="match-section-copy">
    <span>Apuestas</span>
    <h2>Apuesta con valor</h2>
    <p>Predicción no significa apuesta. Si no existe valor claro, no se publica entrada.</p>
  </div>
  ${renderBet(match.mainBet)}
</section>`;

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
      <nav class="match-anchor-nav" aria-label="Navegación del partido"><a href="#h2h">H2H</a><a href="#resultados">Resultados</a><a href="#alineaciones">Alineaciones</a><a href="#bajas">Bajas</a><a href="#analisis">Análisis</a><a href="#apuestas">Apuestas</a></nav>
      ${renderH2h(data, match, home, away)}
      <section id="resultados" class="match-results-grid">${renderRecentTeamResults(data, match, home)}${renderRecentTeamResults(data, match, away)}</section>
      ${renderLineupsSection(match, home, away)}
      ${renderInjuriesSection(match, home, away)}
      ${renderAnalysisSection(match)}
      ${renderBetSection(match)}
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
  const data = mergeEditorial(mergeTeamResults(readData(), readTeamResults()), readEditorial());
  const publicMatches = data.matches.filter((match) => match.slug);

  publicMatches.forEach((match) => {
    writeFile(path.join(outputRoot, "partidos", match.slug, "index.html"), renderMatch(data, match));
  });

  console.log(`SigmaBet prepartido: ${publicMatches.length} páginas de partido generadas.`);
};

build();
