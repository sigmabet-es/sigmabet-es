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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) || toDateKey(parsed) !== value ? null : parsed;
  };
  const selected = parseDate(params.get("fecha")) || new Date();
  selected.setHours(0, 0, 0, 0);
  let selectedDate = selected;
  let calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  let dataset = null;
  let query = "";
  let statusFilter = "all";
  const search = matchesApp.querySelector("[data-team-search]");
  const statusButtons = [...matchesApp.querySelectorAll("[data-status-filter]")];
  const week = matchesApp.querySelector("[data-week]");
  const count = matchesApp.querySelector("[data-match-count]");

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
    if (match.timeStatus === "pending") return "—";
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
    if (clean === "cancelado") return "Cancelado";
    if (clean === "suspendido") return "Suspendido";
    if (clean === "draft") return "Por confirmar";
    return "Por confirmar";
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
    calendarGrid.querySelector(".is-selected")?.focus();
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
          aria-pressed="${key === selectedKey}" aria-label="${escapeHtml(longDate(current))}${markedDates.has(key) ? ", con partidos" : ""}"
        >
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    });
    calendarGrid.innerHTML = days.join("");
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
    const score =
      match.score && typeof match.score.home === "number" && typeof match.score.away === "number" && Number.isFinite(match.score.home) && Number.isFinite(match.score.away)
        ? `${match.score.home} - ${match.score.away}`
        : "";
    const centerLabel = score || matchTime(match);
    return `
      <a class="daily-match-card" href="${escapeHtml(href)}">
        <div class="daily-match-top">
          <span>${escapeHtml(round?.name || dataset?.competition?.name || "LaLiga")}</span>
          <span class="daily-match-status status-${escapeHtml(normalize(match.status))}">${escapeHtml(statusLabel(match.status))}</span>
        </div>
        <div class="daily-match-teams">
          <div class="daily-team daily-team-home">
            ${teamCrest(home)}
            <strong>${escapeHtml(home?.name || "Equipo local")}</strong>
          </div>
          <div class="daily-match-center${score ? " has-score" : ""}">
            <strong>${escapeHtml(centerLabel)}</strong>
            <span>${score ? "Resultado" : match.timeStatus === "pending" ? "Por confirmar" : "Hora local"}</span>
          </div>
          <div class="daily-team daily-team-away">
            ${teamCrest(away)}
            <strong>${escapeHtml(away?.name || "Equipo visitante")}</strong>
          </div>
        </div>
        <div class="daily-match-bottom"><span>Pronóstico, forma y estadísticas</span><span class="match-open">Ver partido <b aria-hidden="true">→</b></span></div>
      </a>
    `;
  };

  const render = () => {
    if (!dataset) return;
    const dateKey = toDateKey(selectedDate);
    const matches = (dataset.matches || [])
      .filter((match) => matchDateKey(match) === dateKey && matchesQuery(match))
      .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")));

    if (dateLabel) dateLabel.textContent = labelForDate(selectedDate);
    if (statusTarget) statusTarget.textContent = longDate(selectedDate);
    if (competitionTarget) competitionTarget.textContent = dataset.competition?.name || "Competiciones";
    const updatedTarget = matchesApp.querySelector("[data-data-updated]");
    if (updatedTarget && dataset.source?.name === "football-data.org") {
      const updated = new Date(dataset.lastUpdated);
      updatedTarget.textContent = Number.isNaN(updated.getTime()) ? "" : `Actualizado: ${new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(updated)} · Datos con retraso`;
    }
    renderCalendar();
    renderWeek();
    count.textContent = `${matches.length} ${matches.length === 1 ? "partido" : "partidos"}${query ? " · " + search.value : ""}`;
    matchesApp.querySelector("[data-today]").disabled = dayDifference(selectedDate) === 0;
    matchesApp.querySelector("[data-season-label]").textContent = `Temporada ${dataset.season?.name || "actual"}`;
    setUrlDate();

    if (!listTarget) return;
    listTarget.setAttribute("aria-busy", "false");
    if (!matches.length) {
      const next = [...new Set(dataset.matches.filter(matchesQuery).map(matchDateKey))].sort().find(date => date > dateKey);
      listTarget.innerHTML = `
        <div class="daily-empty-state">
          <span>${escapeHtml(labelForDate(selectedDate))}</span>
          <strong>${query ? "No hay encuentros de este equipo este día" : "Hoy el balón descansa"}</strong>
          <p>${query ? "Prueba con otro equipo o consulta otra fecha." : "No hay partidos programados para esta fecha. Explora el calendario para encontrar el siguiente encuentro."}</p>
          ${next ? `<button type="button" class="matches-next" data-jump-date="${escapeHtml(next)}">Ver próximos partidos <span aria-hidden="true">→</span></button>` : ""}
        </div>
      `;
      return;
    }
    listTarget.innerHTML = matches.map(renderMatchCard).join("");
  };

  const matchesStatus = (match) => {
    const status = normalize(match.status);
    if (statusFilter === "upcoming") return ["proximo", "programado", "draft", "por_confirmar"].includes(status);
    if (statusFilter === "finished") return status === "finalizado";
    return true;
  };
  const matchesQuery = (match) =>
    matchesStatus(match) && (!query || normalize(`${teamById(match.homeTeamId)?.name || ""} ${teamById(match.awayTeamId)?.name || ""}`).includes(query));
  const renderWeek = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    week.innerHTML = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const key = toDateKey(day);
      const total = dataset.matches.filter(match => matchDateKey(match) === key && matchesQuery(match)).length;
      return `<button type="button" data-jump-date="${key}" aria-pressed="${key === toDateKey(selectedDate)}" aria-label="${escapeHtml(longDate(day))}, ${total} ${total === 1 ? "partido" : "partidos"}"><span>${dayDifference(day) === 0 ? "Hoy" : new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(day)}</span><strong>${day.getDate()}</strong><small>${total ? `${total} part.` : "—"}</small></button>`;
    }).join("");
  };
  const selectDate = (date) => {
    selectedDate = date;
    calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    closeCalendar();
    render();
  };
  const updateSearch = () => { query = normalize(search.value); render(); };
  search.addEventListener("input", updateSearch);
  search.addEventListener("search", updateSearch);
  search.addEventListener("change", updateSearch);
  statusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      statusFilter = button.dataset.statusFilter || "all";
      statusButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });
  matchesApp.querySelector("[data-today]").addEventListener("click", () => selectDate(parseDate(toDateKey(new Date()))));
  matchesApp.addEventListener("click", event => {
    const jump = event.target.closest("[data-jump-date]");
    if (jump) selectDate(parseDate(jump.dataset.jumpDate));
    if (event.target.closest("[data-retry]")) load();
  });
  listTarget.addEventListener("error", event => {
    if (event.target.tagName === "IMG") event.target.replaceWith(Object.assign(document.createElement("span"), { className: "daily-team-fallback", textContent: "⚽" }));
  }, true);
  window.addEventListener("popstate", () => selectDate(parseDate(new URLSearchParams(location.search).get("fecha")) || parseDate(toDateKey(new Date()))));
  const moveDay = (days) => {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + days);
    calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    closeCalendar();
    render();
  };

  previousButton?.addEventListener("click", () => moveDay(-1));
  nextButton?.addEventListener("click", () => moveDay(1));

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
    dateLabel?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!calendarPopover || calendarPopover.hidden) return;
    if (calendarPopover.contains(event.target) || dateLabel?.contains(event.target)) return;
    closeCalendar();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !calendarPopover.hidden) { closeCalendar(); dateLabel?.focus(); }
  });

  const load = () => {
    listTarget.setAttribute("aria-busy", "true");
    statusTarget.textContent = "Actualizando calendario…";
    return fetch(dataUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) })
    .then((response) => {
      if (!response.ok) throw new Error("No se pudo cargar el calendario.");
      return response.json();
    })
    .then((payload) => {
      if (!Array.isArray(payload.matches) || !Array.isArray(payload.teams)) throw new Error("Calendario inválido");
      dataset = payload;
      render();
    })
    .catch(() => {
      listTarget.setAttribute("aria-busy", "false");
      if (statusTarget) statusTarget.textContent = "Calendario no disponible";
      if (listTarget) {
        listTarget.innerHTML = '<div class="daily-empty-state"><strong>No hemos podido cargar los partidos.</strong><p>Comprueba tu conexión y vuelve a intentarlo.</p><button type="button" class="matches-next" data-retry>Reintentar</button></div>';
      }
    });
  };
  load();
}
