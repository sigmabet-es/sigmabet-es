const matchesApp = document.querySelector("[data-matches-app]");

if (matchesApp) {
  const dataUrl = matchesApp.dataset.source || "/data/prepartido/laliga.json";
  const listTarget = matchesApp.querySelector("[data-matches-list]");
  const dateLabel = matchesApp.querySelector("[data-date-label]");
  const dateInput = matchesApp.querySelector("[data-date-input]");
  const previousButton = matchesApp.querySelector("[data-date-prev]");
  const nextButton = matchesApp.querySelector("[data-date-next]");
  const statusTarget = matchesApp.querySelector("[data-matches-status]");
  const competitionTarget = matchesApp.querySelector("[data-competition-label]");
  const params = new URLSearchParams(window.location.search);

  const pad = (value) => String(value).padStart(2, "0");
  const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const selected = parseDate(params.get("fecha")) || new Date();
  selected.setHours(0, 0, 0, 0);
  let selectedDate = selected;
  let dataset = null;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const dayDifference = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86400000);
  };

  const labelForDate = (date) => {
    const diff = dayDifference(date);
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    if (diff === -1) return "Ayer";
    return new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "short" }).format(date);
  };

  const longDate = (date) =>
    new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);

  const setUrlDate = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("fecha", toDateKey(selectedDate));
    window.history.replaceState({}, "", url);
  };

  const teamById = (id) => dataset?.teams?.find((team) => team.id === id) || null;
  const roundById = (id) => dataset?.rounds?.find((round) => round.id === id) || null;
  const matchDateKey = (match) => String(match.startDate || "").slice(0, 10);
  const matchTime = (match) => {
    if (!match.startDate) return "Hora pendiente";
    const parsed = new Date(match.startDate);
    if (Number.isNaN(parsed.getTime())) return "Hora pendiente";
    return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(parsed);
  };

  const statusLabel = (status) => {
    const clean = normalize(status);
    if (clean === "proximo") return "Próximo";
    if (clean === "en_directo") return "En directo";
    if (clean === "finalizado") return "Finalizado";
    if (clean === "aplazado") return "Aplazado";
    if (clean === "suspendido") return "Suspendido";
    if (clean === "draft") return "Borrador";
    return "Data only";
  };

  const renderForm = (team) => {
    const form = Array.isArray(team?.form) ? team.form.slice(-5) : [];
    if (!form.length) return '<span class="match-mini-form-empty">Sin forma</span>';
    return form
      .map((item) => `<span class="form-${escapeHtml(normalize(item))}">${escapeHtml(item)}</span>`)
      .join("");
  };

  const renderMatchCard = (match) => {
    const home = teamById(match.homeTeamId);
    const away = teamById(match.awayTeamId);
    const round = roundById(match.roundId);
    const href = match.slug ? `/partidos/${match.slug}/` : "/partidos/plantilla/";
    const hasBet = match.mainBet && match.mainBet.result !== "no_bet";
    return `
      <a class="daily-match-card" href="${escapeHtml(href)}">
        <div class="daily-match-top">
          <span>${escapeHtml(round?.name || dataset?.competition?.name || "LaLiga")}</span>
          <b>${escapeHtml(matchTime(match))}</b>
        </div>
        <div class="daily-match-teams">
          <strong>${escapeHtml(home?.name || "Equipo local")}</strong>
          <em>vs</em>
          <strong>${escapeHtml(away?.name || "Equipo visitante")}</strong>
        </div>
        <div class="daily-match-bottom">
          <span class="daily-match-status">${escapeHtml(statusLabel(match.status))}</span>
          <span>${hasBet ? "Apuesta SigmaBet" : "Previa"}</span>
        </div>
        <div class="daily-match-form" aria-label="Forma últimos 5">
          <div><small>Local</small>${renderForm(home)}</div>
          <div><small>Visitante</small>${renderForm(away)}</div>
        </div>
      </a>
    `;
  };

  const render = () => {
    if (!dataset) return;
    const dateKey = toDateKey(selectedDate);
    const matches = (dataset.matches || [])
      .filter((match) => matchDateKey(match) === dateKey)
      .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")));

    if (dateLabel) dateLabel.textContent = labelForDate(selectedDate);
    if (dateInput) dateInput.value = dateKey;
    if (statusTarget) statusTarget.textContent = longDate(selectedDate);
    if (competitionTarget) competitionTarget.textContent = dataset.competition?.name || "Competiciones";
    setUrlDate();

    if (!listTarget) return;
    if (!matches.length) {
      listTarget.innerHTML = `
        <div class="daily-empty-state">
          <span>${escapeHtml(labelForDate(selectedDate))}</span>
          <strong>No hay partidos cargados para este día.</strong>
          <p>Cuando se conecte el calendario confirmado, aquí aparecerán los encuentros del día y el enlace a cada ficha prepartido.</p>
        </div>
      `;
      return;
    }
    listTarget.innerHTML = matches.map(renderMatchCard).join("");
  };

  const moveDay = (days) => {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + days);
    render();
  };

  previousButton?.addEventListener("click", () => moveDay(-1));
  nextButton?.addEventListener("click", () => moveDay(1));
  dateLabel?.addEventListener("click", () => {
    try {
      dateInput?.showPicker?.();
    } catch (error) {
      dateInput?.click();
    }
  });
  dateInput?.addEventListener("change", () => {
    const nextDate = parseDate(dateInput.value);
    if (!nextDate) return;
    selectedDate = nextDate;
    render();
  });

  fetch(dataUrl, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("No se pudo cargar el calendario.");
      return response.json();
    })
    .then((payload) => {
      dataset = payload;
      render();
    })
    .catch(() => {
      if (statusTarget) statusTarget.textContent = "Calendario no disponible";
      if (listTarget) {
        listTarget.innerHTML = '<div class="daily-empty-state"><strong>No hemos podido cargar los partidos.</strong><p>Inténtalo de nuevo más tarde.</p></div>';
      }
    });
}
