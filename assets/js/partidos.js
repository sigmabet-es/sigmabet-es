const matchesApp = document.querySelector("[data-matches-app]");

if (matchesApp) {
  const dataUrl = matchesApp.dataset.source || "/data/prepartido/laliga.json";
  const listTarget = matchesApp.querySelector("[data-matches-list]");
  const dateLabel = matchesApp.querySelector("[data-date-label]");
  const previousButton = matchesApp.querySelector("[data-date-prev]");
  const nextButton = matchesApp.querySelector("[data-date-next]");
  const statusTarget = matchesApp.querySelector("[data-matches-status]");
  const competitionTarget = matchesApp.querySelector("[data-competition-label]");
  const calendarPopover = matchesApp.querySelector("[data-calendar-popover]");
  const calendarGrid = matchesApp.querySelector("[data-calendar-grid]");
  const calendarMonthTarget = matchesApp.querySelector("[data-calendar-month]");
  const calendarPrev = matchesApp.querySelector("[data-calendar-prev]");
  const calendarNext = matchesApp.querySelector("[data-calendar-next]");
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
  let calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
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
  const matchDateKey = (match) => match.localDate || String(match.startDate || "").slice(0, 10);
  const datesWithMatches = () => new Set((dataset?.matches || []).map(matchDateKey).filter(Boolean));
  const matchTime = (match) => {
    if (match.timeStatus === "pending") return "Horario pendiente";
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

  const closeCalendar = () => {
    if (!calendarPopover) return;
    calendarPopover.hidden = true;
    dateLabel?.setAttribute("aria-expanded", "false");
  };

  const openCalendar = () => {
    if (!calendarPopover) return;
    calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderCalendar();
    calendarPopover.hidden = false;
    dateLabel?.setAttribute("aria-expanded", "true");
  };

  const renderCalendar = () => {
    if (!calendarGrid || !calendarMonthTarget) return;
    const markedDates = datesWithMatches();
    const todayKey = toDateKey(new Date());
    const selectedKey = toDateKey(selectedDate);
    const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(calendarMonth);
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(firstDay);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    start.setDate(firstDay.getDate() - mondayOffset);

    calendarMonthTarget.textContent = monthLabel;
    const days = Array.from({ length: 42 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const key = toDateKey(current);
      const outside = current.getMonth() !== calendarMonth.getMonth();
      const label = current.getDate();
      return `
        <button
          type="button"
          class="match-calendar-day${outside ? " is-outside" : ""}${key === selectedKey ? " is-selected" : ""}${key === todayKey ? " is-today" : ""}${markedDates.has(key) ? " has-matches" : ""}"
          data-calendar-date="${escapeHtml(key)}"
          aria-label="${escapeHtml(longDate(current))}"
        >
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    });
    calendarGrid.innerHTML = days.join("");
  };

  const renderForm = (team) => {
    const form = Array.isArray(team?.form) ? team.form.slice(-5) : [];
    if (!form.length) return '<span class="match-mini-form-empty">Sin forma</span>';
    return form
      .map((item) => `<span class="form-${escapeHtml(normalize(item))}">${escapeHtml(item)}</span>`)
      .join("");
  };

  const teamCrest = (team) =>
    team?.crest
      ? `<img src="${escapeHtml(team.crest)}" alt="" loading="lazy" />`
      : `<span class="daily-team-fallback">${escapeHtml(String(team?.name || "?").slice(0, 2))}</span>`;

  const renderMatchCard = (match) => {
    const home = teamById(match.homeTeamId);
    const away = teamById(match.awayTeamId);
    const round = roundById(match.roundId);
    const href = match.slug ? `/partidos/${match.slug}/` : "/partidos/plantilla/";
    const hasBet = match.mainBet && match.mainBet.result !== "no_bet";
    const score =
      match.score && Number.isFinite(Number(match.score.home)) && Number.isFinite(Number(match.score.away))
        ? `${match.score.home} - ${match.score.away}`
        : "";
    const centerLabel = score || matchTime(match);
    return `
      <a class="daily-match-card" href="${escapeHtml(href)}">
        <div class="daily-match-top">
          <span>${escapeHtml(round?.name || dataset?.competition?.name || "LaLiga")}</span>
          <span class="daily-match-status">${escapeHtml(statusLabel(match.status))}</span>
        </div>
        <div class="daily-match-teams">
          <div class="daily-team daily-team-home">
            ${teamCrest(home)}
            <strong>${escapeHtml(home?.name || "Equipo local")}</strong>
          </div>
          <div class="daily-match-center${score ? " has-score" : ""}">
            <strong>${escapeHtml(centerLabel)}</strong>
            <span>${score ? "Resultado" : "Hora local"}</span>
          </div>
          <div class="daily-team daily-team-away">
            ${teamCrest(away)}
            <strong>${escapeHtml(away?.name || "Equipo visitante")}</strong>
          </div>
        </div>
        <div class="daily-match-bottom">
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
    if (statusTarget) statusTarget.textContent = longDate(selectedDate);
    if (competitionTarget) competitionTarget.textContent = dataset.competition?.name || "Competiciones";
    renderCalendar();
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
    calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    closeCalendar();
    render();
  };

  previousButton?.addEventListener("click", () => moveDay(-1));
  nextButton?.addEventListener("click", () => moveDay(1));
  dateLabel?.setAttribute("aria-haspopup", "dialog");
  dateLabel?.setAttribute("aria-expanded", "false");
  dateLabel?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!calendarPopover || calendarPopover.hidden) {
      openCalendar();
    } else {
      closeCalendar();
    }
  });
  calendarPrev?.addEventListener("click", (event) => {
    event.stopPropagation();
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  calendarNext?.addEventListener("click", (event) => {
    event.stopPropagation();
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  calendarGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-calendar-date]");
    if (!button) return;
    const nextDate = parseDate(button.dataset.calendarDate);
    if (!nextDate) return;
    selectedDate = nextDate;
    calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    closeCalendar();
    render();
  });
  document.addEventListener("click", (event) => {
    if (!calendarPopover || calendarPopover.hidden) return;
    if (calendarPopover.contains(event.target) || dateLabel?.contains(event.target)) return;
    closeCalendar();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCalendar();
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
