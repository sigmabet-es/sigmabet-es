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
    <link rel="stylesheet" href="/assets/css/styles.css?v=20260709-05" />
    <script src="/assets/js/main.js?v=20260709-05" defer></script>
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
      <header class="match-hero">
        <p class="kicker">${escapeHtml(data.competition.name)} · ${escapeHtml(round.name)}</p>
        <h1>${escapeHtml(home.name)} vs ${escapeHtml(away.name)}: análisis y pronóstico</h1>
        <p>${escapeHtml(text(match.preview, "Ficha prepartido preparada para incorporar datos confirmados, análisis SigmaBet, probabilidades y apuestas con valor."))}</p>
        <div class="match-scoreboard">
          <div><span>Local</span><strong>${escapeHtml(home.name)}</strong></div>
          <b>VS</b>
          <div><span>Visitante</span><strong>${escapeHtml(away.name)}</strong></div>
        </div>
        <dl class="match-meta-grid">
          <div><dt>Fecha</dt><dd>${escapeHtml(text(match.startDate))}</dd></div>
          <div><dt>Estadio</dt><dd>${escapeHtml(text(match.venue))}</dd></div>
          <div><dt>Estado</dt><dd>${escapeHtml(text(match.status))}</dd></div>
          <div><dt>Actualizado</dt><dd>${escapeHtml(text(match.lastUpdated))}</dd></div>
        </dl>
      </header>
      <nav class="match-anchor-nav" aria-label="Navegación del partido"><a href="#resumen">Resumen</a><a href="#forma">Forma</a><a href="#estadisticas">Estadísticas</a><a href="#h2h">H2H</a><a href="#bajas">Bajas</a><a href="#alineaciones">Alineaciones</a><a href="#analisis">Análisis</a><a href="#apuestas">Apuestas</a></nav>
      <section id="forma" class="match-panel"><h2>Rendimiento actual: últimos 5 partidos</h2><div class="match-current-form">${renderTeamCurrentForm(home, "Local")}${renderTeamCurrentForm(away, "Visitante")}</div></section>
      <section id="alineaciones" class="match-grid">${renderLineup(match, home, "local")}${renderLineup(match, away, "visitante")}</section>
      <section id="resumen" class="match-grid">${renderBet(match.mainBet)}<article class="match-panel"><h2>Previa SigmaBet</h2><p>${escapeHtml(text(match.preview))}</p></article></section>
      <section id="estadisticas" class="match-panel"><h2>Estadísticas comparadas</h2><p>Se mostrarán temporada, últimos 10, últimos 5 y casa/fuera cuando existan datos fiables.</p></section>
      <section id="h2h" class="match-panel"><h2>H2H</h2><p>Dato no disponible. El H2H no se sobreponderará cuando las plantillas o contexto hayan cambiado.</p></section>
      <section id="bajas" class="match-panel"><h2>Bajas, sanciones y dudas</h2><p>Dato no disponible. Solo se publicará información rastreable a fuentes fiables.</p></section>
      <section id="analisis" class="match-panel"><h2>Análisis SigmaBet</h2><p>${escapeHtml(text(match.analysis))}</p></section>
      <section id="apuestas" class="match-panel"><h2>Apuestas con valor</h2><p>Predicción no significa apuesta. El equipo más probable no siempre es la mejor entrada.</p></section>
      <aside class="match-telegram"><h2>Sigue las apuestas de SigmaBet en Telegram</h2><p>Consulta qué selecciones termina jugando SigmaBet y recibe actualizaciones de cuotas, alineaciones y mercados.</p><a class="button" href="https://t.me/SigmaBetES" target="_blank" rel="noreferrer" data-telegram-link>Entrar en Telegram</a></aside>
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
  const publicMatches = data.matches.filter((match) => match.slug && match.robots !== "noindex");

  publicMatches.forEach((match) => {
    writeFile(path.join(outputRoot, "partidos", match.slug, "index.html"), renderMatch(data, match));
  });

  console.log(`SigmaBet prepartido: ${publicMatches.length} páginas de partido generadas.`);
};

build();
