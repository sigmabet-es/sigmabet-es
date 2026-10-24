const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const TELEGRAM_URL = "https://t.me/SigmaBetES";

document.querySelectorAll("[data-telegram-link]").forEach((link) => {
  link.setAttribute("href", TELEGRAM_URL);
});

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

if (toggle && nav) {
  const setNavOpen = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    nav.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("nav-is-open", isOpen);
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setNavOpen(!isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });
}

const telegramMobileBar = (() => {
  if (!window.matchMedia("(max-width: 760px)").matches) return null;
  if (sessionStorage.getItem("sigmabetTelegramBarClosed") === "true") return null;

  const bar = document.createElement("div");
  bar.className = "telegram-mobile-bar";
  bar.setAttribute("data-telegram-mobile-bar", "");
  bar.innerHTML = `
    <a href="${TELEGRAM_URL}" target="_blank" rel="noreferrer">Unirme al Telegram gratis</a>
    <button type="button" aria-label="Cerrar Telegram">×</button>
  `;
  document.body.append(bar);

  const show = () => {
    if (!bar.classList.contains("is-visible")) {
      bar.classList.add("is-visible");
      document.body.classList.add("has-telegram-mobile-bar");
    }
  };
  const close = () => {
    sessionStorage.setItem("sigmabetTelegramBarClosed", "true");
    document.body.classList.remove("has-telegram-mobile-bar");
    bar.remove();
    window.removeEventListener("scroll", onScroll);
  };
  let canShow = false;
  const onScroll = () => {
    if (canShow && window.scrollY > 640) show();
  };

  bar.querySelector("button")?.addEventListener("click", close);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.setTimeout(() => {
    canShow = true;
    if (window.scrollY > 640) show();
  }, 7000);
  return bar;
})();

const signalFeed = document.querySelector("[data-signal-feed]");
const signalNavLink = document.querySelector('.site-nav a[href="senal-sigma.html"]');

if (signalNavLink || signalFeed) {
  const legacyTrackingSheet =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQF6IjnBd19bjJ8Ws5La0n8FBKmh-ad3Kfj89CQRCKi3JrbsTGcuIn6WJaqkQXL_A/pub?gid=544576635&single=true&output=csv";
  const fallbackSignalSheet =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQF6IjnBd19bjJ8Ws5La0n8FBKmh-ad3Kfj89CQRCKi3JrbsTGcuIn6WJaqkQXL_A/pub?gid=1487545286&single=true&output=csv";
  const signalSheetUrl = signalFeed?.dataset.sheetUrl?.trim() || signalNavLink?.dataset.signalSheetUrl?.trim() || fallbackSignalSheet;
  const signalDedicatedFlag = signalFeed?.dataset.dedicatedSheet === "true" || signalNavLink?.dataset.dedicatedSheet === "true";
  const signalDedicatedSheet = signalDedicatedFlag && signalSheetUrl !== legacyTrackingSheet;
  const signalSheetReady = !signalDedicatedFlag || signalDedicatedSheet;
  const signalRefreshMs = Number(signalFeed?.dataset.refreshMs || 60000);
  const signalTargets = {
    badges: signalFeed ? [...signalFeed.querySelectorAll("[data-signal-badge]")] : [],
    titles: signalFeed ? [...signalFeed.querySelectorAll("[data-signal-title]")] : [],
    copies: signalFeed ? [...signalFeed.querySelectorAll("[data-signal-copy]")] : [],
    count: signalFeed?.querySelector("[data-signal-count]"),
    rows: signalFeed?.querySelector("[data-signal-rows]"),
    radarTitle: signalFeed?.querySelector("[data-signal-radar-title]"),
    radarMeta: signalFeed?.querySelector("[data-signal-radar-meta]"),
    radarOdd: signalFeed?.querySelector("[data-signal-radar-odd]"),
    radarCountdown: signalFeed?.querySelector("[data-signal-radar-countdown]"),
    match: signalFeed?.querySelector("[data-signal-match]"),
    accessLinks: signalFeed ? [...signalFeed.querySelectorAll("[data-signal-access]")] : [],
    accessTitle: signalFeed?.querySelector("[data-signal-access-title]"),
    accessCopy: signalFeed?.querySelector("[data-signal-access-copy]"),
    accessDate: signalFeed?.querySelector("[data-signal-access-date]"),
    accessOdd: signalFeed?.querySelector("[data-signal-access-odd]"),
    accessStake: signalFeed?.querySelector("[data-signal-access-stake]"),
    accessPrice: signalFeed?.querySelector("[data-signal-access-price]"),
    countdown: signalFeed?.querySelector("[data-signal-countdown]"),
    countdownCard: signalFeed?.querySelector("[data-signal-countdown-card]"),
    countdownCopy: signalFeed?.querySelector("[data-signal-countdown-copy]"),
    countdownLabel: signalFeed?.querySelector("[data-signal-countdown-label]"),
    performanceTotal: signalFeed?.querySelector("[data-signal-performance-total]"),
    performanceWins: signalFeed?.querySelector("[data-signal-performance-wins]"),
    performanceHit: signalFeed?.querySelector("[data-signal-performance-hit]"),
    performanceProfit: signalFeed?.querySelector("[data-signal-performance-profit]"),
  };
  let signalCountdownDeadline = null;

  const signalNormalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const signalText = (value, fallback = "--") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const signalEscape = (value) =>
    signalText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const signalNumber = (value) => {
    const parsed = Number.parseFloat(
      String(value ?? "")
        .replace("%", "")
        .replace("u", "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "")
    );
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const signalUnits = (value) => {
    const number = signalNumber(value);
    return `${number > 0 ? "+" : ""}${number.toFixed(2)} u`;
  };

  const signalCsv = (csv) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < csv.length; index += 1) {
      const char = csv[index];
      const next = csv[index + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim())) rows.push(row);
    return rows;
  };

  const signalAliases = {
    fecha: ["fecha", "dia", "día"],
    competition: ["competicion", "competición", "liga", "torneo"],
    partido: ["partido", "evento", "encuentro", "match"],
    apuesta: ["apuesta", "pick", "seleccion", "selección", "mercado"],
    cuota: ["cuota", "odd"],
    valorSigma: ["ev estimado"],
    resultado: ["resultado", "estado", "resultado pick"],
    stake: ["stake"],
    profit: ["u / profit", "u/profit", "profit", "unidades", "uds", "beneficio", "lucro"],
    tipo: ["tipo", "tipo de apuesta", "tipo de pick"],
    price: ["precio", "importe", "coste", "precio acceso", "precio señal", "precio senal"],
    accessUrl: ["enlace acceso", "link acceso", "url acceso", "enlace de acceso", "pasarela", "pago", "link pago", "enlace pago"],
    accessUntil: [
      "disponible hasta",
      "disponible durante",
      "fin acceso",
      "fecha fin",
      "fecha limite",
      "fecha límite",
      "caduca",
      "cierre acceso",
      "hasta",
      "hora limite",
      "hora límite",
      "hora cierre",
    ],
  };

  const signalColumn = (headers, aliases) => headers.findIndex((header) => aliases.includes(signalNormalize(header)));
  const signalCell = (row, headers, key) => {
    const index = signalColumn(headers, signalAliases[key]);
    return index >= 0 ? row[index] : "";
  };

  const signalRowsFromCsv = (csvText) => {
    const csvRows = signalCsv(csvText);
    const headerIndex = csvRows.findIndex((row) => {
      const normalized = row.map(signalNormalize);
      const hasDate = normalized.some((cell) => signalAliases.fecha.includes(cell));
      const hasResult = normalized.some((cell) => signalAliases.resultado.includes(cell));
      const hasPickish = normalized.some((cell) =>
        [...signalAliases.apuesta, ...signalAliases.partido].includes(cell)
      );
      return hasDate && hasResult && hasPickish;
    });
    if (headerIndex < 0) return [];
    const headers = csvRows[headerIndex];

    return csvRows
      .slice(headerIndex + 1)
      .map((row) => {
        const apuesta = signalCell(row, headers, "apuesta");
        const rawType = signalCell(row, headers, "tipo");
        const explicitSignal =
          signalNormalize(rawType).includes("senal sigma") ||
          signalNormalize(rawType).includes("dorado") ||
          signalNormalize(apuesta).includes("senal sigma") ||
          signalNormalize(apuesta).includes("dorado");
        const inferredType = explicitSignal
            ? "Señal Sigma"
            : rawType;

        return {
          fecha: signalCell(row, headers, "fecha"),
          competition: signalCell(row, headers, "competition"),
          partido: signalCell(row, headers, "partido"),
          apuesta,
          cuota: signalCell(row, headers, "cuota"),
          valorSigma: signalCell(row, headers, "valorSigma"),
          resultado: signalCell(row, headers, "resultado"),
          stake: signalCell(row, headers, "stake"),
          profit: signalCell(row, headers, "profit"),
          tipo: inferredType,
          price: signalCell(row, headers, "price"),
          accessUrl: signalCell(row, headers, "accessUrl"),
          accessUntil: signalCell(row, headers, "accessUntil"),
          isExplicitSignal: explicitSignal,
        };
      })
      .filter((row) => row.fecha || row.competition || row.partido || row.apuesta || row.resultado)
      .filter((row) => signalDedicatedSheet || row.isExplicitSignal || signalNormalize(row.tipo).includes("senal sigma"));
  };

  const signalIsActive = (row) =>
    ["pendiente", "pending", "activa", "activo", "abierta", "abierto", "en vivo", "live"].includes(
      signalNormalize(row.resultado)
    );
  const signalIsClosed = (row) =>
    ["ganado", "ganada", "verde", "win", "perdido", "perdida", "rojo", "loss", "nulo", "nula", "void"].includes(
      signalNormalize(row.resultado)
    );

  const signalResultLabel = (row) => {
    if (signalIsActive(row)) return "Activa";
    const clean = signalNormalize(row.resultado);
    if (["ganado", "ganada", "verde", "win"].includes(clean)) return "Ganada";
    if (["perdido", "perdida", "rojo", "loss"].includes(clean)) return "Perdida";
    if (["nulo", "nula", "void"].includes(clean)) return "Nula";
    return signalText(row.resultado, "Cerrada");
  };

  const signalResultClass = (row) => {
    if (signalIsActive(row)) return "pill-gold";
    const clean = signalNormalize(row.resultado);
    if (["ganado", "ganada", "verde", "win"].includes(clean)) return "pill-win";
    if (["perdido", "perdida", "rojo", "loss"].includes(clean)) return "pill-loss";
    if (["nulo", "nula", "void"].includes(clean)) return "pill-null";
    return "pill-pending";
  };

  const signalItemClass = (row) => {
    if (signalIsActive(row)) return "is-active";
    const clean = signalNormalize(row.resultado);
    if (["ganado", "ganada", "verde", "win"].includes(clean)) return "is-win";
    if (["perdido", "perdida", "rojo", "loss"].includes(clean)) return "is-loss";
    return "";
  };

  const signalIsWin = (row) => ["ganado", "ganada", "verde", "win"].includes(signalNormalize(row.resultado));

  const signalPickParts = (value) =>
    signalText(value, "")
      .split(/\s+\+\s+|\r?\n+/)
      .map((part) => part.trim())
      .filter(Boolean);

  const signalAccessHref = (value) => {
    const text = signalText(value, "");
    if (/^https?:\/\//i.test(text)) return text;
    if (/^www\./i.test(text)) return `https://${text}`;
    return "";
  };

  const signalParseDate = (value, baseDate = "") => {
    const text = signalText(value, "").replace(/\s+/g, " ");
    if (!text) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const parsed = new Date(text);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const dateMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dateMatch) {
      const [, day, month, year, hour = "23", minute = "59", second = "59"] = dateMatch;
      const fullYear = Number(year.length === 2 ? `20${year}` : year);
      const parsed = new Date(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    const baseMatch = signalText(baseDate, "").match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (timeMatch && baseMatch) {
      const [, day, month, year] = baseMatch;
      const [, hour, minute, second = "0"] = timeMatch;
      const fullYear = Number(year.length === 2 ? `20${year}` : year);
      const parsed = new Date(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  const signalCountdownText = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const two = (value) => String(value).padStart(2, "0");
    return days > 0 ? `${days}d ${two(hours)}:${two(minutes)}:${two(seconds)}` : `${two(hours)}:${two(minutes)}:${two(seconds)}`;
  };

  const signalUpdateCountdown = () => {
    if (!signalTargets.countdown) return false;
    const hasDeadline = signalCountdownDeadline instanceof Date && !Number.isNaN(signalCountdownDeadline.getTime());
    signalTargets.countdownCard?.classList.toggle("has-deadline", hasDeadline);

    if (!hasDeadline) {
      signalTargets.countdown.textContent = "--:--:--";
      if (signalTargets.radarCountdown) signalTargets.radarCountdown.textContent = "--:--:--";
      if (signalTargets.countdownLabel) signalTargets.countdownLabel.textContent = "Tiempo de acceso";
      if (signalTargets.countdownCopy) signalTargets.countdownCopy.textContent = "La ventana de compra se mostrará cuando haya una señal activa.";
      return false;
    }

    const remaining = signalCountdownDeadline.getTime() - Date.now();
    const expired = remaining <= 0;
    signalTargets.countdown.textContent = signalCountdownText(remaining);
    if (signalTargets.radarCountdown) signalTargets.radarCountdown.textContent = signalCountdownText(remaining);
    if (signalTargets.countdownLabel) signalTargets.countdownLabel.textContent = expired ? "Compra cerrada" : "Disponible durante";
    if (signalTargets.countdownCopy) {
      signalTargets.countdownCopy.textContent = expired
        ? "La ventana de compra ha finalizado."
        : "Compra disponible durante el tiempo indicado.";
    }
    signalTargets.countdownCard?.classList.toggle("is-expired", expired);
    return expired;
  };

  const renderSignalState = (signalRows) => {
    const activeRows = signalRows.filter(signalIsActive);
    const activeSignal = activeRows[0];
    const hasActiveSignal = activeRows.length > 0;
    const accessUrl = hasActiveSignal ? signalAccessHref(activeSignal.accessUrl) : "";
    const hasAccessUrl = Boolean(accessUrl);
    signalCountdownDeadline = hasActiveSignal ? signalParseDate(activeSignal.accessUntil, activeSignal.fecha) : null;
    const accessExpired = signalUpdateCountdown();
    const accessAvailable = hasActiveSignal && hasAccessUrl && !accessExpired;
    document.body.classList.toggle("has-active-signal", hasActiveSignal);
    signalNavLink?.classList.toggle("signal-nav-active", hasActiveSignal);

    signalTargets.badges.forEach((target) => {
      target.textContent = hasActiveSignal ? "Estado: Señal Sigma activa" : "Estado: Sin Señal Sigma activa";
    });
    signalTargets.titles.forEach((target) => {
      target.textContent = hasActiveSignal ? "Señal detectada" : "Sin señal detectada";
    });
    if (signalTargets.match) {
      signalTargets.match.textContent = hasActiveSignal ? signalText(activeSignal.partido, "Encuentro detectado") : "Sin encuentro activo";
    }
    signalTargets.copies.forEach((target) => {
      target.textContent = hasActiveSignal
        ? "Señal Sigma es una apuesta puntual que supera nuestro filtro habitual de análisis y confianza. No es apuesta segura y quedará registrada al cierre."
        : "Una Señal Sigma solo aparece cuando el análisis supera nuestro filtro habitual. Si no hay valor suficiente, no se abre ninguna señal.";
    });
    if (signalTargets.count) {
      const closedRows = signalRows.filter(signalIsClosed);
      signalTargets.count.textContent = `${closedRows.length} ${closedRows.length === 1 ? "señal" : "señales"}`;
    }
    const closedRows = signalRows.filter(signalIsClosed);
    const wins = closedRows.filter(signalIsWin).length;
    const profit = closedRows.reduce((sum, row) => sum + signalNumber(row.profit), 0);
    if (signalTargets.performanceTotal) signalTargets.performanceTotal.textContent = String(closedRows.length);
    if (signalTargets.performanceWins) signalTargets.performanceWins.textContent = String(wins);
    if (signalTargets.performanceHit) {
      signalTargets.performanceHit.textContent = closedRows.length ? `${((wins / closedRows.length) * 100).toFixed(1)}%` : "0%";
    }
    if (signalTargets.performanceProfit) {
      signalTargets.performanceProfit.textContent = signalUnits(profit);
      signalTargets.performanceProfit.className = profit > 0 ? "is-positive" : profit < 0 ? "is-negative" : "";
    }
    if (signalTargets.radarTitle) {
      signalTargets.radarTitle.textContent = hasActiveSignal ? signalText(activeSignal.partido, "Señal detectada") : "Lectura detectada";
    }
    if (signalTargets.radarMeta) {
      signalTargets.radarMeta.textContent = hasActiveSignal
        ? `${signalText(activeSignal.fecha, "--")} · ${signalText(activeSignal.competition, "Señal Sigma")}`
        : "Señal activa";
    }
    if (signalTargets.radarOdd) {
      const cuota = signalText(activeSignal?.cuota, "");
      const stake = signalText(activeSignal?.stake, "");
      signalTargets.radarOdd.textContent = hasActiveSignal
        ? `${cuota ? `Cuota ${cuota}` : "Pendiente"}${stake ? ` · Stake ${stake}` : ""}`
        : "Pendiente";
    }
    if (signalTargets.accessTitle) {
      signalTargets.accessTitle.textContent = accessAvailable ? "Compra abierta" : hasActiveSignal ? "Compra no disponible" : "Sin Señal Sigma activa";
    }
    if (signalTargets.accessCopy) {
      signalTargets.accessCopy.textContent = hasActiveSignal
        ? "Compra puntual de una lectura de mayor confianza. Tras el pago, se entrega acceso al canal privado de esta señal concreta."
        : "No abrimos una señal si no encontramos valor suficiente.";
    }
    if (signalTargets.accessDate) signalTargets.accessDate.textContent = hasActiveSignal ? signalText(activeSignal.fecha) : "--";
    if (signalTargets.accessOdd) signalTargets.accessOdd.textContent = hasActiveSignal ? signalText(activeSignal.cuota) : "--";
    if (signalTargets.accessStake) signalTargets.accessStake.textContent = hasActiveSignal ? signalText(activeSignal.stake) : "--";
    if (signalTargets.accessPrice) signalTargets.accessPrice.textContent = hasActiveSignal ? signalText(activeSignal.price, "No publicado") : "--";
    signalTargets.accessLinks.forEach((target) => {
      const href = accessAvailable ? accessUrl : TELEGRAM_URL;
      target.classList.toggle("is-disabled", hasActiveSignal && !accessAvailable);
      target.setAttribute("aria-disabled", String(hasActiveSignal && !accessAvailable));
      target.setAttribute("href", href);
      target.setAttribute("target", "_blank");
      target.setAttribute("rel", "noreferrer");
      target.textContent = accessAvailable
        ? "Comprar acceso"
        : hasActiveSignal
          ? "Compra no disponible"
          : "Recibir avisos en Telegram";
    });
  };

  const renderSignalRows = (signalRows) => {
    if (!signalTargets.rows) return;
    const closedRows = signalRows.filter(signalIsClosed);
    if (!closedRows.length) {
      signalTargets.rows.innerHTML = '<div class="signal-empty">Aún no hay señales registradas.</div>';
      return;
    }

    signalTargets.rows.innerHTML = [...closedRows]
      .reverse()
      .map((row) => {
        const profit = signalNumber(row.profit);
        const profitClass = profit > 0 ? "is-positive" : profit < 0 ? "is-negative" : "";
        const parts = signalPickParts(row.apuesta);

        return `
          <details class="signal-registry-item ${signalItemClass(row)}">
            <summary>
              <div class="signal-card-main">
                <span class="signal-card-date">${signalEscape(row.fecha)}</span>
                <strong>${signalEscape(row.partido || "Señal Sigma")}</strong>
                <div class="signal-card-meta">
                  <span>${signalEscape(row.competition || "SigmaBet")}</span>
                  <span>Cuota <b>${signalEscape(row.cuota)}</b></span>
                  <span>Stake <b>${signalEscape(row.stake || "--")}</b></span>
                </div>
              </div>
              <div class="signal-card-result">
                <span class="pill ${signalResultClass(row)}">${signalEscape(signalResultLabel(row))}</span>
                <strong class="signal-card-profit ${profitClass}">${signalUnits(row.profit)}</strong>
                <span class="pending-toggle"></span>
              </div>
            </summary>
            <div class="signal-registry-expanded">
              <div class="pick-timeline">${(parts.length ? parts : [row.apuesta || "Señal registrada"])
                .map((part) => `<div class="pick-step">${signalEscape(part)}</div>`)
                .join("")}</div>
            </div>
          </details>
        `;
      })
      .join("");
  };

  const loadSignalState = async () => {
    if (!signalSheetReady) {
      renderSignalState([]);
      if (signalTargets.rows) {
        signalTargets.rows.innerHTML =
          '<div class="signal-empty">El estado de la Señal Sigma no está disponible ahora mismo.</div>';
      }
      return;
    }

    try {
      const separator = signalSheetUrl.includes("?") ? "&" : "?";
      const response = await fetchWithTimeout(`${signalSheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`La fuente de datos respondió ${response.status}`);
      const signalRows = signalRowsFromCsv(await response.text());
      renderSignalState(signalRows);
      renderSignalRows(signalRows);
    } catch (error) {
      renderSignalState([]);
      if (signalTargets.rows) {
        signalTargets.rows.innerHTML = '<div class="signal-empty">No he podido conectar con el tracker.</div>';
      }
    }
  };

  loadSignalState();
  if (signalRefreshMs > 0) window.setInterval(loadSignalState, signalRefreshMs);
  window.setInterval(signalUpdateCountdown, 1000);
}

const registry = document.querySelector("[data-registry]");

if (registry) {
  const rowsTarget = registry.querySelector("[data-registry-rows]");
  const chartTarget = registry.querySelector("[data-registry-chart]");
  const countTarget = registry.querySelector("[data-registry-count]");
  const statusTarget = registry.querySelector("[data-registry-status]");
  const registryOverview = registry.querySelector(".registry-overview");
  const filters = {
    time: registry.querySelector('[data-filter="time"]'),
    year: registry.querySelector('[data-filter="year"]'),
    month: registry.querySelector('[data-filter="month"]'),
    from: registry.querySelector('[data-filter="from"]'),
    to: registry.querySelector('[data-filter="to"]'),
  };
  const customRange = registry.querySelector("[data-custom-range]");
  const historyReset = registry.querySelector("[data-chart-history]");
  const summaryTargets = {
    total: registry.querySelector('[data-summary="total"]'),
    hit: registry.querySelector('[data-summary="hit"]'),
    balance: registry.querySelector('[data-summary="balance"]'),
    yield: registry.querySelector('[data-summary="yield"]'),
    avgOdd: registry.querySelector('[data-summary="avgOdd"]'),
    avgStake: registry.querySelector('[data-summary="avgStake"]'),
    winStreak: registry.querySelector('[data-summary="winStreak"]'),
    lossStreak: registry.querySelector('[data-summary="lossStreak"]'),
    updated: registry.querySelector('[data-summary="updated"]'),
  };
  const registryWarningTarget = registry.querySelector("[data-registry-warning]");
  const apiUrl = registry.dataset.apiUrl?.trim();
  const sheetUrl = registry.dataset.sheetUrl?.trim();
  const refreshMs = Number(registry.dataset.refreshMs || 60000);
  const registryCacheKey = `sigmabet:registry:${apiUrl || sheetUrl || "default"}`;
  let registryRows = [];
  let registryUpdatedAt = "";
  let registryHasRenderedData = false;
  let registryHasTerminalError = false;
  const loadingMarkup = '<span class="stat-skeleton" aria-label="Cargando"></span>';

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const displayText = (value, fallback = "--") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const escapeHtml = (value) =>
    displayText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const numberFrom = (value) => {
    if (typeof value === "number") return value;
    const text = String(value ?? "")
      .replace("%", "")
      .replace("u", "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const hasNumber = (value) => Number.isFinite(numberFrom(value)) && String(value ?? "").trim() !== "";

  const formatUnits = (value) => {
    const number = numberFrom(value);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} u`;
  };

  const sigmaMarkup = (row) => {
    const raw = String(row.valorSigma ?? "").trim();
    // Conservar la escala de la hoja: no convertir valores sin unidad a porcentajes.
    const label = raw ? raw.replace(/(\d)\.(?=\d)/g, "$1,") : "—";
    return `<span class="registry-sigma" tabindex="0" aria-label="Valor Sigma ${escapeHtml(label)}" aria-describedby="sigma-value-tooltip"><svg class="sigma-diamond" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10l5 6-10 11L2 10 7 4Z"/><path d="m7 4 5 17 5-17M2 10h20M7 4l5 6 5-6"/></svg><b>${escapeHtml(label)}</b></span>`;
  };

  // Fuera de las tarjetas para evitar recortes por overflow o contain.
  const sigmaTooltip = document.createElement("div");
  sigmaTooltip.id = "sigma-value-tooltip";
  sigmaTooltip.className = "sigma-value-tooltip";
  sigmaTooltip.setAttribute("role", "tooltip");
  sigmaTooltip.textContent = "Valor Sigma: ventaja estimada de la apuesta según nuestro análisis. No garantiza el resultado.";
  sigmaTooltip.hidden = true;
  document.body.append(sigmaTooltip);
  let sigmaAnchor = null;
  const hideSigmaTooltip = () => { sigmaTooltip.hidden = true; sigmaAnchor = null; };
  const showSigmaTooltip = (anchor) => {
    sigmaAnchor = anchor;
    sigmaTooltip.hidden = false;
    const bounds = anchor.getBoundingClientRect();
    const box = sigmaTooltip.getBoundingClientRect();
    const margin = 12;
    const left = Math.max(margin, Math.min(bounds.left + bounds.width / 2 - box.width / 2, window.innerWidth - box.width - margin));
    const below = bounds.bottom + 10;
    const top = below + box.height <= window.innerHeight - margin ? below : Math.max(margin, bounds.top - box.height - 10);
    sigmaTooltip.style.left = `${left}px`;
    sigmaTooltip.style.top = `${top}px`;
  };
  registry.addEventListener("pointerover", (event) => {
    const anchor = event.target.closest?.(".registry-sigma");
    if (anchor && anchor !== sigmaAnchor) showSigmaTooltip(anchor);
  });
  registry.addEventListener("pointerout", (event) => {
    const anchor = event.target.closest?.(".registry-sigma");
    if (anchor && !anchor.contains(event.relatedTarget)) hideSigmaTooltip();
  });
  registry.addEventListener("focusin", (event) => {
    const anchor = event.target.closest?.(".registry-sigma");
    if (anchor) showSigmaTooltip(anchor);
  });
  registry.addEventListener("focusout", (event) => {
    if (event.target.closest?.(".registry-sigma")) hideSigmaTooltip();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hideSigmaTooltip(); });
  window.addEventListener("scroll", () => {
    if (sigmaAnchor && document.activeElement === sigmaAnchor) showSigmaTooltip(sigmaAnchor);
    else hideSigmaTooltip();
  }, { passive: true, capture: true });
  window.addEventListener("resize", hideSigmaTooltip, { passive: true });

  const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

  const formatOdd = (value) => displayText(value).replace(",", ".");

  const formatPercentValue = (value) => `${value.toFixed(2)}%`;

  const formatRegistryUpdatedAt = () =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(registryUpdatedAt ? new Date(registryUpdatedAt) : new Date());

  const setRegistryOverviewVisible = (isVisible) => {
    if (registryOverview) registryOverview.hidden = !isVisible;
  };

  const setSummaryLoading = () => {
    setRegistryOverviewVisible(true);
    Object.entries(summaryTargets).forEach(([key, target]) => {
      if (!target) return;
      target.className = "";
      if (key === "updated") target.innerHTML = loadingMarkup;
      else target.innerHTML = loadingMarkup;
    });
  };

  const setSummaryUnavailable = () => {
    setRegistryOverviewVisible(true);
    Object.entries(summaryTargets).forEach(([key, target]) => {
      if (!target) return;
      target.className = "";
      target.textContent = key === "updated" ? "Sin datos" : "Sin datos";
    });
  };

  const setRegistryTerminalState = (message) => {
    registryHasTerminalError = true;
    setRegistryOverviewVisible(false);
    updateStatus(message);
    if (countTarget) countTarget.textContent = "";
    if (rowsTarget) rowsTarget.innerHTML = `<div class="registry-ledger-empty">${escapeHtml(message)}</div>`;
    if (registryWarningTarget) registryWarningTarget.hidden = true;
  };

  const parseDate = (value) => {
    const text = displayText(value, "");
    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const dashMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dashMatch) {
      const [, year, month, day] = dashMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseCsv = (csv) => {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let index = 0; index < csv.length; index += 1) {
      const char = csv[index];
      const next = csv[index + 1];

      if (char === '"' && insideQuotes && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
    return rows;
  };

  const headerAliases = {
    fecha: ["fecha"],
    competition: ["competicion", "competición"],
    partido: ["partido", "evento"],
    apuesta: ["apuesta", "pick"],
    casa: ["casa", "bookie", "casa de apuestas"],
    cuota: ["cuota", "odd"],
    valorSigma: ["ev estimado"],
    resultado: ["resultado"],
    stake: ["stake"],
    profit: ["u / profit", "u/profit", "profit", "unidades"],
    acumulado: ["acumulado", "balance", "balance acumulado"],
    datos: ["datos/estadisticas", "datos/estadísticas", "datos", "estadisticas", "estadísticas"],
    resumen: ["resumen", "comentario"],
    notas: ["notas", "nota"],
    resultadoSelecciones: [
      "resultado selecciones",
      "resultado seleccion",
      "resultado selección",
      "resultados selecciones",
      "resultados seleccion",
      "resultados selección",
      "selecciones resultado",
      "estado selecciones",
      "estado seleccion",
      "estado selección",
    ],
    tipo: ["tipo", "tipo de apuesta", "tipo de pick"],
  };

  const findColumn = (headers, aliases) =>
    headers.findIndex((header) => aliases.includes(normalize(header)));

  const getCell = (row, headers, key) => {
    const index = findColumn(headers, headerAliases[key]);
    return index >= 0 ? row[index] : "";
  };

  const isValidRegistryRow = (row, seen) => {
    const result = normalize(row.resultado);
    const validResults = ["ganado", "ganada", "verde", "win", "perdido", "perdida", "rojo", "loss", "nulo", "void", "push", "pendiente", ""];
    const duplicateKey = [row.fecha, row.partido, row.apuesta, row.cuota, row.stake].map(normalize).join("|");
    const valid =
      parseDate(row.fecha) &&
      displayText(row.partido, "") &&
      displayText(row.apuesta, "") &&
      hasNumber(row.cuota) &&
      hasNumber(row.stake) &&
      validResults.includes(result) &&
      (result === "pendiente" || result === "" || hasNumber(row.profit)) &&
      !seen.has(duplicateKey);

    if (valid) seen.add(duplicateKey);
    else console.warn("Fila de registro ignorada por validación", row);
    return valid;
  };

  const parseRegistryRows = (csvText) => {
    const csvRows = parseCsv(csvText);
    const headerIndex = csvRows.findIndex((row) =>
      row.some((cell) => normalize(cell) === "fecha") &&
      row.some((cell) => ["competicion", "competición"].includes(normalize(cell))) &&
      row.some((cell) => ["apuesta", "pick"].includes(normalize(cell)))
    );

    if (headerIndex < 0) {
      throw new Error("No encuentro la fila de cabeceras del Tracking.");
    }

    const headers = csvRows[headerIndex];
    return csvRows
      .slice(headerIndex + 1)
      .map((row) => {
        const apuesta = getCell(row, headers, "apuesta");
        const rawType = getCell(row, headers, "tipo");

        return {
          fecha: getCell(row, headers, "fecha"),
          competition: getCell(row, headers, "competition"),
          partido: getCell(row, headers, "partido"),
          apuesta,
          casa: getCell(row, headers, "casa"),
          cuota: getCell(row, headers, "cuota"),
          valorSigma: getCell(row, headers, "valorSigma"),
          resultado: getCell(row, headers, "resultado"),
          stake: getCell(row, headers, "stake"),
          profit: getCell(row, headers, "profit"),
          acumulado: getCell(row, headers, "acumulado"),
          datos: getCell(row, headers, "datos"),
          resumen: getCell(row, headers, "resumen"),
          notas: getCell(row, headers, "notas"),
          resultadoSelecciones: getCell(row, headers, "resultadoSelecciones"),
          tipo: rawType || (normalize(apuesta).includes("dorado") || normalize(apuesta).includes("senal sigma") ? "Señal Sigma" : "Gratis"),
        };
      })
      .filter((row) => row.fecha || row.competition || row.partido || row.apuesta || row.resultado)
      .filter((row, _, all) => {
        if (!all._seen) Object.defineProperty(all, "_seen", { value: new Set() });
        return isValidRegistryRow(row, all._seen);
      });
  };

  const resultClass = (result) => {
    const clean = normalize(result);
    if (clean === "ganado" || clean === "verde") return "pill-win";
    if (clean === "perdido" || clean === "rojo") return "pill-loss";
    if (clean === "nulo") return "pill-null";
    return "pill-pending";
  };

  const resultLabel = (result) => {
    const clean = normalize(result);
    if (clean === "ganado" || clean === "verde") return "Ganado";
    if (clean === "perdido" || clean === "rojo") return "Perdido";
    if (clean === "nulo") return "Nulo";
    if (clean === "pendiente") return "Pendiente";
    return displayText(result, "Pendiente");
  };

  const typeClass = (type) => (normalize(type).includes("dorado") || normalize(type).includes("senal sigma") ? "pill-gold" : "pill-free");

  const isSettled = (row) => !["", "pendiente"].includes(normalize(row.resultado));

  const isWin = (row) => ["ganado", "verde", "win"].includes(normalize(row.resultado));

  const isLoss = (row) => ["perdido", "rojo", "loss"].includes(normalize(row.resultado));

  const pickParts = (value) =>
    displayText(value, "")
      .split(/\s+\+\s+|\r?\n+/)
      .map((part) => part.trim())
      .filter(Boolean);

  const selectionStatus = (value) => {
    const text = String(value || "").trim();
    const clean = normalize(text);
    if (!clean) return "";
    if (/^[✅🟢✓✔]/u.test(text) || ["ganado", "ganada", "verde", "win", "acierto", "acertado", "acertada"].includes(clean)) {
      return "Ganado";
    }
    if (/^[❌🔴✕✖]/u.test(text) || ["perdido", "perdida", "rojo", "loss", "fallo", "fallado", "fallada"].includes(clean)) {
      return "Perdido";
    }
    if (/^[➖⚪🟡]/u.test(text) || ["nulo", "void", "push", "cancelado", "cancelada"].includes(clean)) {
      return "Nulo";
    }
    if (["pendiente", "pending", "por jugar"].includes(clean)) return "Pendiente";

    if (/(^|\b)(ganado|ganada|verde|win|acierto|acertado|acertada)(\b|$)/.test(clean)) return "Ganado";
    if (/(^|\b)(perdido|perdida|rojo|loss|fallo|fallado|fallada)(\b|$)/.test(clean)) return "Perdido";
    if (/(^|\b)(nulo|void|push|cancelado|cancelada)(\b|$)/.test(clean)) return "Nulo";
    if (/(^|\b)(pendiente|pending|por jugar)(\b|$)/.test(clean)) return "Pendiente";
    return "";
  };

  const stripSelectionStatus = (value) => {
    let text = displayText(value, "");
    text = text.replace(/^[✅🟢✓✔❌🔴✕✖➖⚪🟡]\s*/u, "");
    text = text.replace(/^\s*(ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\s*[-:|·–—]\s*/i, "");
    text = text.replace(/\s*[-:|·–—]\s*(ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\s*$/i, "");
    text = text.replace(/\s*\((ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\)\s*$/i, "");
    return text.trim();
  };

  const selectionParts = (pickValue, statusValue) => {
    const picks = pickParts(pickValue);
    const rawStatuses = pickParts(statusValue);
    const hasUsefulStatuses = rawStatuses.some((part) => selectionStatus(part) || stripSelectionStatus(part) !== part);

    if (rawStatuses.length && hasUsefulStatuses) {
      return (picks.length ? picks : rawStatuses.map(stripSelectionStatus)).map((pick, index) => {
        const statusChunk = rawStatuses[index] || "";
        const stripped = stripSelectionStatus(statusChunk);
        return {
          text: stripped && stripped !== statusChunk && !selectionStatus(statusChunk) ? stripped : pick,
          status: selectionStatus(statusChunk),
        };
      });
    }

    return picks.map((pick) => ({ text: pick, status: "" }));
  };

  const sharePickText = (row) => {
    const status = resultLabel(row.resultado);
    const profit = formatUnits(row.profit);
    const isPendingRow = ["", "pendiente"].includes(normalize(row.resultado));
    const lines = [
      "SigmaBet | Apuesta registrada",
      `${displayText(row.partido, "Partido")} · ${displayText(row.competition, "Competición")}`,
      `Apuesta: ${isPendingRow ? "Disponible en el Telegram gratuito" : displayText(row.apuesta, "No disponible")}`,
      `Cuota: ${displayText(row.cuota)} · Stake: ${displayText(row.stake)}`,
      `Resultado: ${status} · Unidades: ${profit}`,
      "+18 | Juego responsable. No hay apuestas seguras.",
    ];
    return lines.join("\n");
  };

  const updateCustomRangeVisibility = () => {
    const isCustom = filters.time?.value === "custom";
    if (customRange) customRange.hidden = !isCustom;
    const monthRange = registry.querySelector("[data-month-range]");
    if (monthRange) monthRange.hidden = filters.time?.value !== "month";
    if (historyReset) historyReset.hidden = (filters.time?.value || "Todos") === "Todos";
  };

  const rowMatchesTime = (row) => {
    const value = filters.time?.value || "Todos";
    if (value === "Todos") return true;

    const date = parseDate(row.fecha);
    if (!date) return false;

    if (value === "month") {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return filters.month?.value === key;
    }

    if (value === "custom") {
      const from = filters.from?.value ? new Date(`${filters.from.value}T00:00:00`) : null;
      const to = filters.to?.value ? new Date(`${filters.to.value}T23:59:59`) : null;
      return (!from || date >= from) && (!to || date <= to);
    }

    return true;
  };

  const rowMatchesFilters = (row) => rowMatchesTime(row);

  const streakStats = (rows) => {
    const ordered = [...rows].sort((a, b) => (parseDate(a.fecha) || 0) - (parseDate(b.fecha) || 0));
    let currentType = "";
    let currentCount = 0;
    let bestWins = 0;
    let worstLosses = 0;

    ordered.forEach((row) => {
      const type = isWin(row) ? "win" : isLoss(row) ? "loss" : "";
      if (!type) return;
      currentCount = type === currentType ? currentCount + 1 : 1;
      currentType = type;
      if (type === "win") bestWins = Math.max(bestWins, currentCount);
      if (type === "loss") worstLosses = Math.max(worstLosses, currentCount);
    });

    return { bestWins, worstLosses };
  };

  const renderSummary = (rows) => {
    const settled = rows.filter(isSettled);
    const balance = rows.reduce((sum, row) => sum + numberFrom(row.profit), 0);
    const stake = settled.reduce((sum, row) => {
      const stakeValue = numberFrom(row.stake);
      return sum + (stakeValue || 1);
    }, 0);
    const yieldValue = stake ? balance / stake : 0;
    const wins = settled.filter(isWin).length;
    const hitRate = settled.length ? (wins / settled.length) * 100 : 0;
    const avgOdd = settled.length
      ? settled.reduce((sum, row) => sum + numberFrom(row.cuota), 0) / settled.length
      : 0;
    const avgStake = settled.length ? stake / settled.length : 0;
    const streaks = streakStats(settled);
    const balanceClass = balance > 0 ? "is-positive" : balance < 0 ? "is-negative" : "";

    if (!settled.length) {
      setSummaryUnavailable();
    } else {
      setRegistryOverviewVisible(true);
      if (summaryTargets.total) summaryTargets.total.textContent = String(settled.length);
      if (summaryTargets.hit) summaryTargets.hit.textContent = formatPercentValue(hitRate);
      if (summaryTargets.balance) summaryTargets.balance.textContent = formatUnits(balance);
      if (summaryTargets.yield) summaryTargets.yield.textContent = formatPercent(yieldValue);
      if (summaryTargets.avgOdd) summaryTargets.avgOdd.textContent = avgOdd.toFixed(2);
      if (summaryTargets.avgStake) summaryTargets.avgStake.textContent = `${avgStake.toFixed(2)} u`;
      if (summaryTargets.winStreak) summaryTargets.winStreak.textContent = `${streaks.bestWins} ${streaks.bestWins === 1 ? "ganada" : "ganadas"}`;
      if (summaryTargets.lossStreak) summaryTargets.lossStreak.textContent = `${streaks.worstLosses} ${streaks.worstLosses === 1 ? "perdida" : "perdidas"}`;
      if (summaryTargets.winStreak) summaryTargets.winStreak.className = streaks.bestWins ? "is-positive" : "";
      if (summaryTargets.lossStreak) summaryTargets.lossStreak.className = streaks.worstLosses ? "is-negative" : "";
    }
    if (summaryTargets.balance) {
      summaryTargets.balance.className = balanceClass;
    }
    if (summaryTargets.yield) {
      summaryTargets.yield.className = yieldValue > 0 ? "is-positive" : yieldValue < 0 ? "is-negative" : "";
    }
    if (summaryTargets.updated) {
      summaryTargets.updated.textContent = registryUpdatedAt ? formatRegistryUpdatedAt() : "Sin datos";
    }
  };

  const renderRegistryChart = (rows) => {
    if (!chartTarget) return;

    const settled = rows.filter(isSettled).sort((a, b) => (parseDate(a.fecha) || 0) - (parseDate(b.fecha) || 0));
    if (!settled.length) {
      chartTarget.innerHTML = '<div class="chart-empty-state">Todavía no existen apuestas cerradas en este periodo.</div>';
      return;
    }

    let balance = 0;
    const points = settled.map((row) => {
      balance += numberFrom(row.profit);
      return balance;
    });
    const values = points.length ? [0, ...points] : [0, 0];
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values, 0);
    const roughStep = Math.max(1, (dataMax - dataMin) / 4);
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= roughStep);
    const min = Math.floor(dataMin / step) * step;
    const max = Math.max(min + step, Math.ceil(dataMax / step) * step);
    const range = max - min;
    const scaleTicks = Array.from({ length: Math.round(range / step) + 1 }, (_, index) => max - index * step);
    const width = 640;
    const height = 240;
    const padX = 28;
    const padY = 30;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    // Una distancia uniforme por apuesta; el zoom cambia la ventana visible.
    const coords = values.map((value, index) => ({
      value,
      x: padX + innerW * index / Math.max(1, values.length - 1),
      y: padY + innerH - ((value - min) / range) * innerH,
    }));
    const betSegments = settled.map((row, index) => {
      const from = coords[index];
      const to = coords[index + 1];
      const profit = numberFrom(row.profit);
      const cumulative = to?.value ?? 0;
      return {
        row,
        from,
        to,
        type: profit >= 0 ? "positive" : "negative",
        cumulative,
      };
    });
    // El eje avanza por apuesta: cada mes ocupa el tramo de sus operaciones.
    const monthBands = [];
    settled.forEach((row, index) => {
      const date = parseDate(row.fecha);
      const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "unknown";
      const previous = monthBands[monthBands.length - 1];
      if (previous?.key === key) {
        previous.end = coords[index + 1].x;
        previous.profit += numberFrom(row.profit);
      } else {
        monthBands.push({ key, date, start: coords[index].x, end: coords[index + 1].x, profit: numberFrom(row.profit) });
      }
    });
    const monthMarkup = monthBands.map((band, index) =>
      `<rect class="chart-month-band${index % 2 ? ' chart-month-band-alt' : ''}" x="${band.start}" y="${padY}" width="${band.end - band.start}" height="${innerH}" />${index ? `<line class="chart-month-divider" x1="${band.start}" x2="${band.start}" y1="${padY}" y2="${height - padY}" />` : ""}`
    ).join("");
    const monthAxisMarkup = monthBands.map((band) => {
      if (!band.date) return "";
      const fullLabel = band.date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      const label = band.date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }).replace(".", "");
      const tone = band.profit > 0 ? "is-positive" : band.profit < 0 ? "is-negative" : "";
      const monthKey = `${band.date.getFullYear()}-${String(band.date.getMonth() + 1).padStart(2, "0")}`;
      const selected = filters.time?.value === "month" && filters.month?.value === monthKey;
      return `<button type="button" class="chart-month-label" data-chart-month="${monthKey}" aria-pressed="${selected}" aria-label="${escapeHtml(`Ver ${fullLabel}, resultado mensual ${formatUnits(band.profit)}`)}" style="left:${band.start / width * 100}%;width:${(band.end - band.start) / width * 100}%" title="${escapeHtml(`Ver ${fullLabel}`)}"><span>${escapeHtml(label)}</span><strong class="${tone}">(${escapeHtml(formatUnits(band.profit))})</strong></button>`;
    }).join("");
    const zeroY = padY + innerH - ((0 - min) / range) * innerH;
    const segments = [];
    const areas = [];
    const point = ({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    const areaPath = (from, to) =>
      `M${point(from)} L${point(to)} L${to.x.toFixed(1)} ${zeroY.toFixed(1)} L${from.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    for (let index = 1; index < coords.length; index += 1) {
      const prev = coords[index - 1];
      const next = coords[index];
      const prevPositive = prev.value >= 0;
      const nextPositive = next.value >= 0;

      if (prevPositive === nextPositive || prev.value === next.value) {
        const type = prevPositive ? "positive" : "negative";
        segments.push({ type, d: `M${point(prev)} L${point(next)}` });
        areas.push({ type, d: areaPath(prev, next) });
      } else {
        const ratio = (0 - prev.value) / (next.value - prev.value);
        const cross = { value: 0, x: prev.x + (next.x - prev.x) * ratio, y: zeroY };
        const prevType = prevPositive ? "positive" : "negative";
        const nextType = nextPositive ? "positive" : "negative";
        segments.push({ type: prevType, d: `M${point(prev)} L${point(cross)}` });
        segments.push({ type: nextType, d: `M${point(cross)} L${point(next)}` });
        areas.push({ type: prevType, d: areaPath(prev, cross) });
        areas.push({ type: nextType, d: areaPath(cross, next) });
      }
    }

    const betDetailMarkup = (segment) => {
      const status = resultLabel(segment.row.resultado);
      const statusClass = normalize(status).replace(/\s+/g, "-");
      const profit = formatUnits(segment.row.profit);
      const profitValue = numberFrom(segment.row.profit);
      const profitClass = profitValue > 0 ? "chart-bet-profit-positive" : profitValue < 0 ? "chart-bet-profit-negative" : "";
      const selections = selectionParts(segment.row.apuesta, segment.row.resultadoSelecciones);
      const context = displayText(segment.row.competition || segment.row.competicion || segment.row.liga, "Registro de apuestas");
      return `
        <div class="chart-bet-meta-row">
          <span>${escapeHtml(displayText(segment.row.fecha, ""))}</span>
          <i class="chart-result-pill chart-result-${escapeHtml(statusClass)}">${escapeHtml(status)}</i>
        </div>
        <div class="chart-bet-main">
          <p>${escapeHtml(context)}</p>
          <strong>${escapeHtml(displayText(segment.row.partido, "Apuesta"))}</strong>
        </div>
        <ul class="chart-selection-list">
          ${(selections.length ? selections : [{ text: segment.row.apuesta || "Apuesta registrada", status }])
            .map((selection) => {
              const selectionStatusLabel = resultLabel(selection.status || "Pendiente");
              const selectionClass = normalize(selectionStatusLabel).replace(/\s+/g, "-");
              return `<li class="chart-selection-${escapeHtml(selectionClass)}"><span>${escapeHtml(selection.text)}</span><span class="sr-only">${escapeHtml(selectionStatusLabel)}</span></li>`;
            }).join("")}
        </ul>
        <dl class="chart-bet-metrics">
          <div><dt>Cuota</dt><dd>${escapeHtml(formatOdd(segment.row.cuota))}</dd></div>
          <div class="chart-bet-sigma"><dt>Valor Sigma</dt><dd><b><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10l5 6-10 11L2 10 7 4Z"/><path d="m7 4 5 17 5-17M2 10h20M7 4l5 6 5-6"/></svg>${escapeHtml(String(segment.row.valorSigma ?? "").trim().replace(/(\d)\.(?=\d)/g, "$1,") || "—")}</b></dd></div>
          <div><dt>Stake</dt><dd>${escapeHtml(displayText(segment.row.stake, "1u"))}</dd></div>
          <div><dt>Resultado</dt><dd class="${profitClass}">${escapeHtml(profit)}</dd></div>
        </dl>
      `;
    };
    const calloutPosition = (segment) => {
      const source = segment.to;
      const placeRight = source.x < width * 0.55;
      const cardW = 220;
      const cardH = 106;
      const cardX = placeRight ? Math.min(source.x + 22, width - cardW - 18) : Math.max(source.x - cardW - 22, 18);
      const cardY =
        source.y < height * 0.52
          ? Math.min(source.y + 16, height - cardH - 18)
          : Math.max(source.y - cardH - 16, 18);
      const anchorX = placeRight ? cardX : cardX + cardW;
      const anchorY = cardY + 34;
      const startX = source.x + (placeRight ? 7 : -7);
      const elbowX = anchorX + (placeRight ? -14 : 14);

      return {
        style: `--callout-left:${((cardX / width) * 100).toFixed(2)}%; --callout-top:${((cardY / height) * 100).toFixed(2)}%;`,
        connector: `M${startX.toFixed(1)} ${source.y.toFixed(1)} H${elbowX.toFixed(1)} V${anchorY.toFixed(1)} H${anchorX.toFixed(1)}`,
      };
    };
    const enableChartCallout = window.matchMedia("(min-width: 761px)").matches;
    chartTarget.innerHTML = `
      <div class="registry-chart-layout">
        <div class="registry-chart-plot" data-chart-plot style="min-width:${Math.max(320, monthBands.length * 112)}px">
          <svg viewBox="0 0 640 240" role="img" aria-label="Evolución de unidades">
            ${scaleTicks.map((value) => {
              const y = padY + innerH * (max - value) / range;
              return `<path class="chart-grid-line" d="M${padX} ${y} H${width - padX}"></path><text class="chart-scale-label" x="${width - padX + 5}" y="${y}" dominant-baseline="middle">${escapeHtml(value.toLocaleString("es-ES", { maximumFractionDigits: 0 }))} u</text>`;
            }).join("")}
            <g class="chart-months">${monthMarkup}</g>
            <path class="chart-zero-line" d="M${padX} ${zeroY.toFixed(1)} H${width - padX}"></path>
            ${areas.map((area) => `<path class="chart-area chart-area-${area.type}" d="${area.d}"></path>`).join("")}
            ${segments.map((segment) => `<path class="chart-line chart-line-${segment.type}" d="${segment.d}"></path>`).join("")}
            ${
              enableChartCallout
                ? `<g class="chart-bet-layer">
                    ${betSegments
                      .map((segment, index) => {
                        const d = `M${point(segment.from)} L${point(segment.to)}`;
                        const status = resultLabel(segment.row.resultado);
                        const profit = formatUnits(segment.row.profit);
                        const title = `${displayText(segment.row.fecha, "")} · ${displayText(segment.row.partido, "Apuesta")}`;
                        const description = `${displayText(segment.row.apuesta, "Apuesta registrada")} · ${status} · ${profit}`;
                        return `
                          <g class="chart-bet-segment chart-bet-${segment.type}" data-chart-bet-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(`${title}. ${description}`)}">
                            <path class="chart-bet-hit" d="${d}"></path>
                            <path class="chart-bet-focus" d="${d}"></path>
                            <circle class="chart-bet-point" cx="${segment.to.x.toFixed(1)}" cy="${segment.to.y.toFixed(1)}" r="4"></circle>
                          </g>
                        `;
                      })
                      .join("")}
                  </g>`
                : ""
            }
          </svg>
          <div class="chart-month-axis" aria-label="Meses del registro">${monthAxisMarkup}</div>
          <p class="chart-month-caption">Resultado mensual · unidades (u)</p>
        </div>
        <aside class="chart-bet-card chart-bet-card-side chart-callout-card is-hidden" data-chart-bet-detail aria-hidden="true">
        </aside>
      </div>
    `;

    const plotTarget = chartTarget.querySelector("[data-chart-plot]");
    const detailTarget = chartTarget.querySelector("[data-chart-bet-detail]");
    const hideDetail = () => {
      if (!detailTarget) return;
      detailTarget.classList.add("is-hidden");
      detailTarget.setAttribute("aria-hidden", "true");
    };
    if (!enableChartCallout) {
      hideDetail();
      return;
    }
    const positionDetail = (event) => {
      if (!plotTarget || !detailTarget) return;
      const anchor = event?.currentTarget?.getBoundingClientRect() || plotTarget.getBoundingClientRect();
      const pointerX = event?.type?.startsWith("mouse") ? event.clientX : (anchor.left + anchor.right) / 2;
      const pointerY = event?.type?.startsWith("mouse") ? event.clientY : (anchor.top + anchor.bottom) / 2;
      const margin = 16, gap = 28;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      detailTarget.style.removeProperty("max-height");
      const card = detailTarget.getBoundingClientRect();
      const clampX = x => Math.max(margin, Math.min(x, viewportWidth - card.width - margin));
      const clampY = y => Math.max(margin, Math.min(y, viewportHeight - card.height - margin));
      let left, top;
      detailTarget.style.right = "auto";
      // La mayor parte de la tarjeta queda por encima del cursor, a un lado.
      if (pointerX + gap + card.width <= viewportWidth - margin) {
        left = pointerX + gap;
        top = clampY(pointerY - card.height + 44);
      } else if (pointerX - gap - card.width >= margin) {
        // Anclar el borde derecho directamente al cursor evita diferencias de anchura.
        detailTarget.style.right = `${viewportWidth - pointerX + gap}px`;
        top = clampY(pointerY - card.height + 44);
      } else {
        left = clampX(pointerX - card.width / 2);
        const above = Math.max(0, pointerY - gap - margin);
        const below = Math.max(0, viewportHeight - pointerY - gap - margin);
        if (above >= card.height || above >= below) {
          detailTarget.style.maxHeight = `${Math.max(1, above)}px`;
          top = Math.max(margin, pointerY - gap - Math.min(card.height, above));
        } else {
          detailTarget.style.maxHeight = `${Math.max(1, below)}px`;
          top = pointerY + gap;
        }
      }
      detailTarget.style.left = left === undefined ? "auto" : `${left}px`;
      detailTarget.style.top = `${top}px`;
    };
    chartTarget.querySelectorAll("[data-chart-bet-index]").forEach((node) => {
      const segment = betSegments[Number(node.dataset.chartBetIndex)];
      const setActiveSegment = (event) => {
        if (!segment || !detailTarget) return;
        detailTarget.classList.remove("is-hidden");
        detailTarget.setAttribute("aria-hidden", "false");
        detailTarget.classList.toggle("chart-bet-positive", segment.type === "positive");
        detailTarget.classList.toggle("chart-bet-negative", segment.type === "negative");
        detailTarget.innerHTML = betDetailMarkup(segment);
        positionDetail(event);
      };
      node.addEventListener("mouseenter", setActiveSegment);
      node.addEventListener("mousemove", positionDetail);
      node.addEventListener("mouseleave", hideDetail);
      node.addEventListener("focus", setActiveSegment);
      node.addEventListener("blur", hideDetail);
    });
    plotTarget?.addEventListener("mousemove", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-chart-bet-index], [data-chart-bet-detail]")) {
        hideDetail();
      }
    });
    plotTarget?.addEventListener("mouseleave", hideDetail);
    plotTarget?.querySelector(":scope > svg")?.addEventListener("mouseleave", hideDetail);
  };

  const renderRows = (visibleRows, emptyMessage = "No hay apuestas que coincidan con los filtros seleccionados.", target = rowsTarget, updateCount = true) => {
    if (!target) return;
    if (countTarget && updateCount) {
      countTarget.textContent = `${visibleRows.length} ${visibleRows.length === 1 ? "apuesta" : "apuestas"}`;
    }

    if (!visibleRows.length) {
      target.innerHTML = `<div class="registry-ledger-empty">${escapeHtml(emptyMessage)}</div>`;
      return;
    }

    target.innerHTML = visibleRows
      .map((row) => {
        const profit = numberFrom(row.profit);
        const profitClass = profit > 0 ? "profit-positive" : profit < 0 ? "profit-negative" : "";
        const statusLabel = resultLabel(row.resultado);
        const isPendingRow = ["", "pendiente"].includes(normalize(row.resultado));
        const rowClass = `registry-row-${normalize(statusLabel).replace(/\s+/g, "-")}`;
        const statusIconPath = rowClass === "registry-row-ganado"
          ? "m5 12 4 4L19 6"
          : rowClass === "registry-row-perdido" ? "m6 6 12 12M18 6 6 18" : "M5 12h14";
        const timeline = isPendingRow ? [] : selectionParts(row.apuesta, row.resultadoSelecciones);
        const sharePayload = {
          type: "apuesta",
          date: row.fecha,
          competition: row.competition,
          match: row.partido,
          pick: isPendingRow ? "Disponible en el Telegram gratuito" : row.apuesta,
          odd: formatOdd(row.cuota),
          stake: row.stake,
          valorSigma: row.valorSigma,
          result: statusLabel,
          profit: formatUnits(row.profit),
          selections: isPendingRow
            ? []
            : timeline.map((part) => ({
                text: part.text,
                status: resultLabel(part.status),
              })),
        };

        if (isPendingRow) {
          return `
            <article class="registry-ledger-item registry-row-pendiente registry-pending-card">
              <div class="pending-telegram-banner">
                <svg class="pending-telegram-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.7 3.4 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 13.6.8 12c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.2.5Z"></path>
                </svg>
                <span>Apuesta en Telegram gratuito.</span>
                <a class="pending-telegram-action" href="${TELEGRAM_URL}" target="_blank" rel="noreferrer">Acceder</a>
              </div>
              <div class="registry-pending-inner">
                <div class="registry-ledger-main">
                  <span class="registry-date">${escapeHtml(row.fecha)}</span>
                  <strong class="registry-event">${escapeHtml(row.partido)}</strong>
                  <span class="registry-competition">${escapeHtml(row.competition)}</span>
                </div>
                <div class="registry-pending-metrics"><span class="pending-status-pill">Pendiente</span></div>
              </div>
            </article>
          `;
        }

        return `
          <details class="registry-ledger-item bet-card ${rowClass}">
            <summary>
              <div class="registry-ledger-content">
                <div class="registry-ledger-main">
                  <span class="registry-date">${escapeHtml(row.fecha)}</span>
                  <strong class="registry-event">${escapeHtml(row.partido)}</strong>
                  <span class="registry-competition">${escapeHtml(row.competition)}</span>
                </div>
                <div class="registry-ledger-meta">
                  <span>Cuota <b>${escapeHtml(formatOdd(row.cuota))}</b></span>
                  <span>Stake <b>${escapeHtml(row.stake)}</b></span>
                  <span class="bet-card-sigma"><span class="bet-metric-label">Valor Sigma</span>${sigmaMarkup(row)}</span>
                </div>
              </div>
              <div class="registry-ledger-result">
                <span class="pill ${resultClass(row.resultado)}"><svg class="bet-status-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${statusIconPath}"></path></svg>${escapeHtml(statusLabel)}</span>
                <strong class="registry-profit ${profitClass}">${formatUnits(row.profit)}</strong>
                <span class="pending-toggle"></span>
                <button class="share-button" type="button" aria-label="Compartir apuesta" title="Compartir apuesta" data-share-card="${escapeHtml(JSON.stringify(sharePayload))}">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8.5 12 4.5 8 8.5"></path><path d="M12 5v10"></path><path d="M6.5 12.5v5h11v-5"></path></svg>
                  <span class="sr-only">Compartir apuesta</span>
                </button>
              </div>
            </summary>
            <div class="registry-ledger-expanded">
              ${
                isPendingRow
                  ? `
                    <p class="registry-expanded-label">Apuesta pendiente</p>
                    <div class="pending-telegram-note">
                      <span>Apuesta en Telegram gratuito.</span>
                      <a href="${TELEGRAM_URL}" target="_blank" rel="noreferrer">Acceder</a>
                    </div>
                  `
                  : `
                    <p class="registry-expanded-label">Apuesta registrada</p>
                    <div class="pick-timeline">
                      ${(timeline.length ? timeline : [{ text: row.apuesta || "Apuesta registrada", status: "" }])
                        .map((part) => {
                          const selectionLabel = resultLabel(part.status);
                          const selectionClass = part.status ? normalize(selectionLabel).replace(/\s+/g, "-") : "sin-resultado";
                          return `
                            <div class="pick-step selection-${selectionClass}">
                              <span>${escapeHtml(part.text)}</span>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>
                  `
              }
            </div>
          </details>
        `;
      })
      .join("");
  };

  const updateMonthOptions = () => {
    if (!filters.month || !filters.year) return;
    const selected = filters.month.value;
    const selectedYear = filters.year.value;
    const months = new Map();
    registryRows.forEach((row) => {
      const date = parseDate(row.fecha);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.set(key, date.toLocaleDateString("es-ES", { month: "long" }));
    });
    const years = [...new Set([...months.keys()].map((key) => key.slice(0, 4)))].sort().reverse();
    filters.year.replaceChildren(...years.map((year) => new Option(year, year)));
    if (years.includes(selectedYear)) filters.year.value = selectedYear;
    const options = [...months].filter(([key]) => key.startsWith(`${filters.year.value}-`)).sort(([a], [b]) => b.localeCompare(a));
    filters.month.replaceChildren(...options.map(([key, label]) => new Option(label.charAt(0).toUpperCase() + label.slice(1), key)));
    if (options.some(([key]) => key === selected)) filters.month.value = selected;
    if (!months.size) filters.month.append(new Option("Sin datos", ""));
    filters.month.disabled = filters.year.disabled = !months.size;
  };

  const historyMore = registry.querySelector("[data-history-more]");
  let historyLimit = 20;
  const renderHistory = () => {
    hideSigmaTooltip();
    const periodRows = registryRows.filter(rowMatchesFilters);
    const pending = periodRows.filter((row) => !isSettled(row)).reverse();
    const pendingSection = registry.querySelector("[data-pending-section]");
    if (pendingSection) {
      pendingSection.hidden = !pending.length;
      registry.querySelector("[data-pending-count]").textContent = `${pending.length} abiertas`;
      renderRows(pending, "", registry.querySelector("[data-pending-rows]"), false);
    }
    const rows = periodRows.filter(isSettled).reverse();
    renderRows(rows.slice(0, historyLimit), "No hay apuestas cerradas en el periodo seleccionado.", rowsTarget, false);
    if (countTarget) countTarget.textContent = `${Math.min(historyLimit, rows.length)} de ${rows.length} apuestas`;
    if (historyMore) historyMore.hidden = rows.length <= historyLimit;
  };
  historyMore?.addEventListener("click", () => { historyLimit += 20; renderHistory(); });

  const renderRegistryView = ({ source = "fresh" } = {}) => {
    const filteredRows = registryRows.filter(rowMatchesFilters);
    const settledRows = filteredRows.filter(isSettled);
    renderSummary(filteredRows);
    renderRegistryChart(filteredRows);
    renderHistory();

    if (source === "stale") {
      updateStatus("No hemos podido actualizar el registro. Se muestran los últimos datos disponibles.");
    } else if (settledRows.length) {
      updateStatus(`Se muestran datos. Última actualización: ${formatRegistryUpdatedAt()}.`);
    } else {
      updateStatus("Todavía no existen apuestas cerradas en este periodo.");
    }
  };

  const updateStatus = (message) => {
    if (statusTarget) statusTarget.textContent = message;
  };

  const loadRegistryDataset = async () => {
    if (apiUrl) {
      try {
        const separator = apiUrl.includes("?") ? "&" : "?";
        const response = await fetchWithTimeout(`${apiUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error(`La API respondió ${response.status}`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload.rows)) throw new Error("La API no devolvió filas válidas.");
        return {
          rows: payload.rows,
          updatedAt: payload.updatedAt || new Date().toISOString(),
          source: payload.source === "stale" ? "stale" : "fresh",
        };
      } catch (error) {
        if (!sheetUrl) throw error;
      }
    }

    if (!sheetUrl) throw new Error("No hay fuente de datos disponible.");

    const separator = sheetUrl.includes("?") ? "&" : "?";
    const response = await fetchWithTimeout(`${sheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`La fuente de datos respondió ${response.status}`);
    return {
      rows: parseRegistryRows(await response.text()),
      updatedAt: new Date().toISOString(),
      source: "fresh",
    };
  };

  const loadRegistry = async () => {
    if (!apiUrl && !sheetUrl) {
      setRegistryTerminalState("El registro no está disponible temporalmente. Inténtalo de nuevo más tarde.");
      return;
    }

    try {
      updateStatus("Actualizando el registro…");
      if (!registryHasRenderedData) setSummaryLoading();
      if (registryWarningTarget) registryWarningTarget.hidden = true;
      const dataset = await loadRegistryDataset();
      registryRows = dataset.rows;
      updateMonthOptions();
      registryUpdatedAt = dataset.updatedAt;
      localStorage.setItem(registryCacheKey, JSON.stringify({ rows: registryRows, updatedAt: registryUpdatedAt }));
      updateCustomRangeVisibility();
      registryHasRenderedData = true;
      registryHasTerminalError = false;
      renderRegistryView({ source: dataset.source });
      if (dataset.source === "stale" && registryWarningTarget) registryWarningTarget.hidden = false;
    } catch (error) {
      const cached = JSON.parse(localStorage.getItem(registryCacheKey) || "null");
      if (cached?.rows?.length) {
        registryRows = cached.rows;
        updateMonthOptions();
        registryUpdatedAt = cached.updatedAt;
        registryHasRenderedData = true;
        registryHasTerminalError = false;
        renderRegistryView({ source: "stale" });
        if (registryWarningTarget) registryWarningTarget.hidden = false;
      } else {
        setRegistryTerminalState("El registro no está disponible temporalmente. Inténtalo de nuevo más tarde.");
      }
    }
  };

  const selectChartMonth = (monthKey) => {
    if (registryHasTerminalError || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) return;
    if (!filters.time || !filters.year || !filters.month) return;
    // Reconstruir primero los meses del año pulsado, incluso si cambia el año.
    filters.year.value = monthKey.slice(0, 4);
    updateMonthOptions();
    filters.month.value = monthKey;
    filters.time.value = "month";
    historyLimit = 20;
    updateCustomRangeVisibility();
    renderRegistryView();
    chartTarget.querySelector(`[data-chart-month="${monthKey}"]`)?.focus({ preventScroll: true });
  };

  // Delegación: los botones se regeneran al actualizar o filtrar la gráfica.
  chartTarget?.addEventListener("click", (event) => {
    const monthButton = event.target.closest("[data-chart-month]");
    if (monthButton) selectChartMonth(monthButton.dataset.chartMonth);
  });
  historyReset?.addEventListener("click", () => {
    if (registryHasTerminalError || !filters.time) return;
    filters.time.value = "Todos";
    historyLimit = 20;
    updateCustomRangeVisibility();
    renderRegistryView();
    filters.time.focus({ preventScroll: true });
  });

  Object.values(filters).forEach((filter) => {
    filter?.addEventListener("change", () => {
      if (registryHasTerminalError) return;
      historyLimit = 20;
      if (filter === filters.year) updateMonthOptions();
      updateCustomRangeVisibility();
      renderRegistryView();
    });
  });

  updateCustomRangeVisibility();
  loadRegistry();
  if (refreshMs > 0) {
    window.setInterval(loadRegistry, refreshMs);
  }
}

const homeFeed = document.querySelector("[data-home-feed]");

if (homeFeed) {
  const apiUrl = homeFeed.dataset.apiUrl?.trim();
  const sheetUrl = homeFeed.dataset.sheetUrl?.trim();
  const refreshMs = Number(homeFeed.dataset.refreshMs || 60000);
  const pendingTarget = homeFeed.querySelector("[data-latest-bets]");
  const chartTarget = homeFeed.querySelector("[data-performance-chart]");
  const statusTarget = homeFeed.querySelector("[data-home-status]");
  const updatedTarget = homeFeed.querySelector("[data-home-updated]");
  const warningTarget = homeFeed.querySelector("[data-home-warning]");
  const rangeTarget = homeFeed.querySelector("[data-home-range]");
  const customRangeTarget = homeFeed.querySelector("[data-home-custom-range]");
  const customDateTargets = {
    from: homeFeed.querySelector('[data-home-date="from"]'),
    to: homeFeed.querySelector('[data-home-date="to"]'),
  };
  const statTargets = {
    settled: homeFeed.querySelector('[data-home-stat="settled"]'),
    hit: homeFeed.querySelector('[data-home-stat="hit"]'),
    balance: homeFeed.querySelector('[data-home-stat="balance"]'),
    yield: homeFeed.querySelector('[data-home-stat="yield"]'),
    avgOdd: homeFeed.querySelector('[data-home-stat="avgOdd"]'),
    avgStake: homeFeed.querySelector('[data-home-stat="avgStake"]'),
  };
  const homeCacheKey = `sigmabet:home:${apiUrl || sheetUrl || "default"}`;
  let homeRows = [];
  let homeUpdatedAt = "";
  let homeHasRenderedData = false;
  let homeHasTerminalError = false;
  const homeLoadingMarkup = '<span class="stat-skeleton" aria-label="Cargando"></span>';

  const normalizeHome = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const textHome = (value, fallback = "--") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const escapeHome = (value) =>
    textHome(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const numberHome = (value) => {
    const text = String(value ?? "")
      .replace("%", "")
      .replace("u", "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const hasHomeNumber = (value) => Number.isFinite(numberHome(value)) && String(value ?? "").trim() !== "";

  const unitsHome = (value) => {
    const number = numberHome(value);
    return `${number > 0 ? "+" : ""}${number.toFixed(2)} u`;
  };

  const percentHome = (value) => `${value.toFixed(2)}%`;

  const formatHomeUpdatedAt = () => {
    const updatedDate = homeUpdatedAt ? new Date(homeUpdatedAt) : new Date();
    const desktop = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(updatedDate);
    const mobile = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(updatedDate).replace(",", " ·");
    return { desktop, mobile };
  };

  const setHomeStatsLoading = () => {
    Object.values(statTargets).forEach((target) => {
      if (!target) return;
      target.className = "";
      target.innerHTML = homeLoadingMarkup;
    });
    if (updatedTarget) updatedTarget.textContent = "Actualizando el registro…";
  };

  const setHomeStatsUnavailable = () => {
    Object.values(statTargets).forEach((target) => {
      if (!target) return;
      target.className = "";
      target.textContent = "Sin datos";
    });
  };

  const renderHomeChartState = (message) => {
    if (chartTarget) chartTarget.innerHTML = `<div class="chart-empty-state">${escapeHome(message)}</div>`;
  };

  const setHomeTerminalState = (message) => {
    homeHasTerminalError = true;
    if (statusTarget) statusTarget.textContent = message;
    setHomeStatsUnavailable();
    if (updatedTarget) updatedTarget.textContent = "";
    if (pendingTarget) pendingTarget.innerHTML = `<div class="pending-empty"><strong>${escapeHome(message)}</strong></div>`;
    renderHomeChartState(message);
    if (warningTarget) warningTarget.hidden = true;
  };

  const parseHomeDate = (value) => {
    const text = textHome(value, "");
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const parseHomeCsv = (csv) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < csv.length; index += 1) {
      const char = csv[index];
      const next = csv[index + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim())) rows.push(row);
    return rows;
  };

  const homeAliases = {
    fecha: ["fecha"],
    competition: ["competicion", "competición"],
    partido: ["partido", "evento"],
    apuesta: ["apuesta", "pick"],
    casa: ["casa", "bookie", "casa de apuestas"],
    cuota: ["cuota", "odd"],
    valorSigma: ["ev estimado"],
    resultado: ["resultado"],
    resultadoSelecciones: [
      "resultado selecciones",
      "resultado de selecciones",
      "resultados selecciones",
      "resultado picks",
      "selecciones resultado",
      "estado selecciones",
    ],
    stake: ["stake"],
    profit: ["u / profit", "u/profit", "profit", "unidades"],
    tipo: ["tipo", "tipo de apuesta", "tipo de pick"],
  };

  const findHomeColumn = (headers, aliases) =>
    headers.findIndex((header) => aliases.includes(normalizeHome(header)));

  const homeCell = (row, headers, key) => {
    const index = findHomeColumn(headers, homeAliases[key]);
    return index >= 0 ? row[index] : "";
  };

  const parseHomeRows = (csv) => {
    const rows = parseHomeCsv(csv);
    const headerIndex = rows.findIndex((row) =>
      row.some((cell) => normalizeHome(cell) === "fecha") &&
      row.some((cell) => ["apuesta", "pick"].includes(normalizeHome(cell)))
    );
    if (headerIndex < 0) throw new Error("No se encontró la cabecera del Tracking.");
    const headers = rows[headerIndex];

    const seen = new Set();
    return rows
      .slice(headerIndex + 1)
      .map((row) => ({
        fecha: homeCell(row, headers, "fecha"),
        competition: homeCell(row, headers, "competition"),
        partido: homeCell(row, headers, "partido"),
        apuesta: homeCell(row, headers, "apuesta"),
        casa: homeCell(row, headers, "casa"),
        cuota: homeCell(row, headers, "cuota"),
          valorSigma: homeCell(row, headers, "valorSigma"),
        resultado: homeCell(row, headers, "resultado"),
        resultadoSelecciones: homeCell(row, headers, "resultadoSelecciones"),
        stake: homeCell(row, headers, "stake"),
        profit: homeCell(row, headers, "profit"),
        tipo: homeCell(row, headers, "tipo"),
      }))
      .filter((row) => row.fecha || row.partido || row.apuesta || row.resultado)
      .filter((row) => {
        const result = normalizeHome(row.resultado);
        const validResults = ["ganado", "ganada", "verde", "win", "perdido", "perdida", "rojo", "loss", "nulo", "void", "push", "pendiente", ""];
        const key = [row.fecha, row.partido, row.apuesta, row.cuota, row.stake].map(normalizeHome).join("|");
        const valid =
          parseHomeDate(row.fecha).getTime() !== 0 &&
          textHome(row.partido, "") &&
          textHome(row.apuesta, "") &&
          hasHomeNumber(row.cuota) &&
          hasHomeNumber(row.stake) &&
          validResults.includes(result) &&
          (result === "pendiente" || result === "" || hasHomeNumber(row.profit)) &&
          !seen.has(key);
        if (valid) seen.add(key);
        else console.warn("Fila de portada ignorada por validación", row);
        return valid;
      });
  };

  const isSettledHome = (row) => !["", "pendiente"].includes(normalizeHome(row.resultado));

  const isWinHome = (row) => ["ganado", "verde", "win"].includes(normalizeHome(row.resultado));

  const resultLabelHome = (value) => {
    const clean = normalizeHome(value);
    if (["ganado", "ganada", "verde", "win"].includes(clean)) return "Ganado";
    if (["perdido", "perdida", "rojo", "loss"].includes(clean)) return "Perdido";
    if (["nulo", "void", "push"].includes(clean)) return "Nulo";
    return "Pendiente";
  };

  const resultClassHome = (value) => {
    const clean = normalizeHome(value);
    if (["ganado", "ganada", "verde", "win"].includes(clean)) return "pill-win";
    if (["perdido", "perdida", "rojo", "loss"].includes(clean)) return "pill-loss";
    if (["nulo", "void", "push"].includes(clean)) return "pill-null";
    return "pill-pending";
  };

  const homePickParts = (value) =>
    textHome(value, "")
      .split(/\s+\+\s+|\r?\n+|;|\|/)
      .map((part) => part.trim())
      .filter(Boolean);

  const homeSelectionStatus = (value) => {
    const text = String(value || "").trim();
    const clean = normalizeHome(text);
    if (!clean) return "";
    if (/^[✅🟢✓✔]/u.test(text) || ["ganado", "ganada", "verde", "win", "acierto", "acertado", "acertada"].includes(clean)) return "Ganado";
    if (/^[❌🔴✕✖]/u.test(text) || ["perdido", "perdida", "rojo", "loss", "fallo", "fallado", "fallada"].includes(clean)) return "Perdido";
    if (/^[➖⚪🟡]/u.test(text) || ["nulo", "void", "push", "cancelado", "cancelada"].includes(clean)) return "Nulo";
    if (["pendiente", "pending", "por jugar"].includes(clean)) return "Pendiente";

    if (/(^|\b)(ganado|ganada|verde|win|acierto|acertado|acertada)(\b|$)/.test(clean)) return "Ganado";
    if (/(^|\b)(perdido|perdida|rojo|loss|fallo|fallado|fallada)(\b|$)/.test(clean)) return "Perdido";
    if (/(^|\b)(nulo|void|push|cancelado|cancelada)(\b|$)/.test(clean)) return "Nulo";
    if (/(^|\b)(pendiente|pending|por jugar)(\b|$)/.test(clean)) return "Pendiente";
    return "";
  };

  const stripHomeSelectionStatus = (value) => {
    let text = textHome(value, "");
    text = text.replace(/^[✅🟢✓✔❌🔴✕✖➖⚪🟡]\s*/u, "");
    text = text.replace(/^\s*(ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\s*[-:|·–—]\s*/i, "");
    text = text.replace(/\s*[-:|·–—]\s*(ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\s*$/i, "");
    text = text.replace(/\s*\((ganado|ganada|verde|win|acierto|acertado|acertada|perdido|perdida|rojo|loss|fallo|fallado|fallada|nulo|void|push|cancelado|cancelada|pendiente|pending|por jugar)\)\s*$/i, "");
    return text.trim();
  };

  const homeSelectionParts = (pickValue, statusValue) => {
    const picks = homePickParts(pickValue);
    const rawStatuses = homePickParts(statusValue);
    const hasUsefulStatuses = rawStatuses.some((part) => homeSelectionStatus(part) || stripHomeSelectionStatus(part) !== part);

    if (rawStatuses.length && hasUsefulStatuses) {
      return (picks.length ? picks : rawStatuses.map(stripHomeSelectionStatus)).map((pick, index) => {
        const statusChunk = rawStatuses[index] || "";
        const stripped = stripHomeSelectionStatus(statusChunk);
        return {
          text: stripped && stripped !== statusChunk && !homeSelectionStatus(statusChunk) ? stripped : pick,
          status: homeSelectionStatus(statusChunk),
        };
      });
    }

    return picks.map((pick) => ({ text: pick, status: "" }));
  };

  const dateInHomeRange = (row) => {
    const mode = rangeTarget?.value || "month";
    if (mode === "all") return true;

    const date = parseHomeDate(row.fecha);
    if (date.getTime() === 0) return false;

    if (mode === "custom") {
      const from = customDateTargets.from?.value ? new Date(`${customDateTargets.from.value}T00:00:00`) : null;
      const to = customDateTargets.to?.value ? new Date(`${customDateTargets.to.value}T23:59:59`) : null;
      return (!from || date >= from) && (!to || date <= to);
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysByMode = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    start.setDate(start.getDate() - (daysByMode[mode] || 30) + 1);
    return date >= start && date <= now;
  };

  const filteredHomeRows = () => homeRows.filter((row) => isSettledHome(row) && dateInHomeRange(row));

  const pendingTelegramMarkup = (className = "pending-telegram-note") => `
    <div class="${className}">
      <svg class="pending-telegram-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.7 3.4 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 13.6.8 12c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.2.5Z"></path>
      </svg>
      <span>Apuesta en Telegram gratuito.</span>
      <a class="pending-telegram-action" href="${TELEGRAM_URL}" target="_blank" rel="noreferrer">Acceder</a>
    </div>
  `;

  const renderPendingHome = (rows) => {
    const latestSettled = [...rows]
      .reverse()
      .filter(isSettledHome)
      .slice(0, 3);

    if (!pendingTarget) return;
    if (!latestSettled.length) {
      pendingTarget.innerHTML = '<div class="pending-empty"><strong>No hay apuestas finalizadas todavía</strong></div>';
      return;
    }

    pendingTarget.innerHTML = latestSettled
      .map((row) => {
        const profit = numberHome(row.profit);
        const profitClass = profit > 0 ? "profit-positive" : profit < 0 ? "profit-negative" : "";
        const rowClass = `registry-row-${normalizeHome(resultLabelHome(row.resultado))}`;
        const selections = homeSelectionParts(row.apuesta, row.resultadoSelecciones);
        return `
          <details class="registry-ledger-item ${rowClass}">
            <summary>
              <div class="registry-ledger-content">
                <div class="registry-ledger-main">
                  <span class="registry-date">${escapeHome(row.fecha)}</span>
                  <strong class="registry-event">${escapeHome(row.partido)}</strong>
                  <span class="registry-competition">${escapeHome(row.competition || row.tipo || "Fútbol")}</span>
                </div>
                <div class="registry-ledger-meta">
                  <span>Cuota <b>${escapeHome(numberHome(row.cuota).toFixed(2))}</b></span>
                  <span>Stake <b>${escapeHome(row.stake)}</b></span>
                </div>
              </div>
              <div class="registry-ledger-result">
                <span class="pill ${resultClassHome(row.resultado)}">${escapeHome(resultLabelHome(row.resultado))}</span>
                <strong class="registry-profit ${profitClass}">${unitsHome(row.profit)}</strong>
                <span class="pending-toggle"></span>
              </div>
            </summary>
            <div class="registry-ledger-expanded">
              <p class="registry-expanded-label">Apuesta registrada</p>
              <div class="pick-timeline">
                ${(selections.length ? selections : ["Apuesta registrada"])
                  .map((selection) => {
                    const selectionText = typeof selection === "string" ? selection : selection.text;
                    const selectionLabel = typeof selection === "string" ? "" : resultLabelHome(selection.status);
                    const selectionClass = selection.status ? normalizeHome(selectionLabel).replace(/\s+/g, "-") : "sin-resultado";
                    return `<div class="pick-step selection-${selectionClass}"><span>${escapeHome(selectionText)}</span></div>`;
                  })
                  .join("")}
              </div>
            </div>
          </details>
        `;
      })
      .join("");
  };

  const renderChartHome = () => {
    const settled = filteredHomeRows().sort((a, b) => parseHomeDate(a.fecha) - parseHomeDate(b.fecha));
    if (!settled.length) {
      setHomeStatsUnavailable();
      if (updatedTarget && homeUpdatedAt) {
        const { desktop, mobile } = formatHomeUpdatedAt();
        updatedTarget.innerHTML = `<span class="last-updated-desktop">Última actualización: ${desktop}</span><span class="last-updated-mobile">Actualizado: ${mobile}</span>`;
      }
      renderHomeChartState("Todavía no existen apuestas cerradas en este periodo.");
      return 0;
    }

    let balance = 0;
    const points = settled.map((row) => {
      balance += numberHome(row.profit);
      return balance;
    });
    const values = points.length ? [0, ...points] : [0, 0];
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = max - min || 1;
    const width = 640;
    const height = 240;
    const padX = 28;
    const padY = 30;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const coords = values.map((value, index) => {
      const x = padX + (innerW * index) / Math.max(values.length - 1, 1);
      const y = padY + innerH - ((value - min) / range) * innerH;
      return { value, x, y };
    });
    const stake = settled.reduce((sum, row) => sum + (numberHome(row.stake) || 1), 0);
    const yieldValue = stake ? balance / stake : 0;
    const wins = settled.filter(isWinHome).length;
    const hitRate = settled.length ? (wins / settled.length) * 100 : 0;
    const avgOdd = settled.length
      ? settled.reduce((sum, row) => sum + numberHome(row.cuota), 0) / settled.length
      : 0;
    const avgStake = settled.length ? stake / settled.length : 0;
    const zeroY = padY + innerH - ((0 - min) / range) * innerH;
    const segments = [];
    const areas = [];
    const point = ({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    const areaPath = (from, to) =>
      `M${point(from)} L${point(to)} L${to.x.toFixed(1)} ${zeroY.toFixed(1)} L${from.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    for (let index = 1; index < coords.length; index += 1) {
      const prev = coords[index - 1];
      const next = coords[index];
      const prevPositive = prev.value >= 0;
      const nextPositive = next.value >= 0;

      if (prevPositive === nextPositive || prev.value === next.value) {
        const type = prevPositive ? "positive" : "negative";
        segments.push({ type, d: `M${point(prev)} L${point(next)}` });
        areas.push({ type, d: areaPath(prev, next) });
      } else {
        const ratio = (0 - prev.value) / (next.value - prev.value);
        const cross = {
          value: 0,
          x: prev.x + (next.x - prev.x) * ratio,
          y: zeroY,
        };
        const prevType = prevPositive ? "positive" : "negative";
        const nextType = nextPositive ? "positive" : "negative";
        segments.push({ type: prevType, d: `M${point(prev)} L${point(cross)}` });
        segments.push({ type: nextType, d: `M${point(cross)} L${point(next)}` });
        areas.push({ type: prevType, d: areaPath(prev, cross) });
        areas.push({ type: nextType, d: areaPath(cross, next) });
      }
    }

    const balanceClass = balance > 0 ? "is-positive" : balance < 0 ? "is-negative" : "";

    if (statTargets.settled) statTargets.settled.textContent = String(settled.length);
    if (statTargets.hit) statTargets.hit.textContent = percentHome(hitRate);
    if (statTargets.balance) statTargets.balance.textContent = unitsHome(balance);
    if (statTargets.yield) statTargets.yield.textContent = percentHome(yieldValue * 100);
    if (statTargets.balance) {
      statTargets.balance.className = balanceClass;
    }
    if (statTargets.yield) {
      statTargets.yield.className = yieldValue > 0 ? "is-positive" : yieldValue < 0 ? "is-negative" : "";
    }
    if (statTargets.avgOdd) statTargets.avgOdd.textContent = settled.length ? avgOdd.toFixed(2) : "Sin datos";
    if (statTargets.avgStake) statTargets.avgStake.textContent = settled.length ? `${avgStake.toFixed(2)} u` : "Sin datos";
    if (updatedTarget) {
      const { desktop, mobile } = formatHomeUpdatedAt();
      updatedTarget.innerHTML = `<span class="last-updated-desktop">Última actualización: ${desktop}</span><span class="last-updated-mobile">Actualizado: ${mobile}</span>`;
    }
    if (chartTarget) {
      chartTarget.innerHTML = `
        <div class="chart-unit-axis" aria-hidden="true">
          <span>+u</span>
          <span>0u</span>
          <span>-u</span>
        </div>
        <svg viewBox="0 0 640 240" role="img" aria-label="Evolución de unidades">
          <path class="chart-grid-line" d="M24 56 H616"></path>
          <path class="chart-grid-line" d="M24 120 H616"></path>
          <path class="chart-grid-line" d="M24 184 H616"></path>
          <path class="chart-zero-line" d="M${padX} ${zeroY.toFixed(1)} H${width - padX}"></path>
          ${areas
            .map((area) => `<path class="chart-area chart-area-${area.type}" d="${area.d}"></path>`)
            .join("")}
          ${segments
            .map((segment) => `<path class="chart-line chart-line-${segment.type}" d="${segment.d}"></path>`)
            .join("")}
        </svg>
      `;
    }
    return settled.length;
  };

  const renderHomeFeed = ({ source = "fresh" } = {}) => {
    renderPendingHome(homeRows);
    const settledCount = renderChartHome();
    if (customRangeTarget) customRangeTarget.hidden = (rangeTarget?.value || "month") !== "custom";

    if (source === "stale") {
      if (statusTarget) statusTarget.textContent = "No hemos podido actualizar el registro. Se muestran los últimos datos disponibles.";
    } else if (settledCount) {
      if (statusTarget) statusTarget.textContent = "Se muestran datos.";
    } else if (statusTarget) {
      statusTarget.textContent = "Todavía no existen apuestas cerradas en este periodo.";
    }
  };

  const loadHomeDataset = async () => {
    if (apiUrl) {
      try {
        const separator = apiUrl.includes("?") ? "&" : "?";
        const response = await fetchWithTimeout(`${apiUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error(`La API respondió ${response.status}`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload.rows)) throw new Error("La API no devolvió filas válidas.");
        return {
          rows: payload.rows,
          updatedAt: payload.updatedAt || new Date().toISOString(),
          source: payload.source === "stale" ? "stale" : "fresh",
        };
      } catch (error) {
        if (!sheetUrl) throw error;
      }
    }

    if (!sheetUrl) throw new Error("No hay fuente de datos disponible.");

    const separator = sheetUrl.includes("?") ? "&" : "?";
    const response = await fetchWithTimeout(`${sheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`La fuente de datos respondió ${response.status}`);
    return {
      rows: parseHomeRows(await response.text()),
      updatedAt: new Date().toISOString(),
      source: "fresh",
    };
  };

  const loadHomeFeed = async () => {
    if (!apiUrl && !sheetUrl) {
      setHomeTerminalState("El registro no está disponible temporalmente. Inténtalo de nuevo más tarde.");
      return;
    }
    try {
      if (statusTarget) statusTarget.textContent = "Actualizando el registro…";
      if (!homeHasRenderedData) setHomeStatsLoading();
      if (warningTarget) warningTarget.hidden = true;
      const dataset = await loadHomeDataset();
      homeRows = dataset.rows;
      homeUpdatedAt = dataset.updatedAt;
      localStorage.setItem(homeCacheKey, JSON.stringify({ rows: homeRows, updatedAt: homeUpdatedAt }));
      homeHasRenderedData = true;
      homeHasTerminalError = false;
      renderHomeFeed({ source: dataset.source });
      if (dataset.source === "stale" && warningTarget) warningTarget.hidden = false;
    } catch (error) {
      const cached = JSON.parse(localStorage.getItem(homeCacheKey) || "null");
      if (cached?.rows?.length) {
        homeRows = cached.rows;
        homeUpdatedAt = cached.updatedAt;
        homeHasRenderedData = true;
        homeHasTerminalError = false;
        renderHomeFeed({ source: "stale" });
        if (warningTarget) warningTarget.hidden = false;
      } else {
        setHomeTerminalState("El registro no está disponible temporalmente. Inténtalo de nuevo más tarde.");
      }
    }
  };

  rangeTarget?.addEventListener("change", () => {
    if (!homeHasTerminalError) renderHomeFeed();
  });
  customDateTargets.from?.addEventListener("change", () => {
    if (!homeHasTerminalError) renderHomeFeed();
  });
  customDateTargets.to?.addEventListener("change", () => {
    if (!homeHasTerminalError) renderHomeFeed();
  });

  loadHomeFeed();
  if (refreshMs > 0) window.setInterval(loadHomeFeed, refreshMs);
}

const shareCanvasHelpers = (() => {
  const green = "#00FF7F";
  const red = "#FF5A5F";
  const text = "#F5F5F5";
  const muted = "#8F8F8F";
  const bg = "#050706";
  const mono = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace';
  const sans = "Manrope, Inter, system-ui, sans-serif";

  const drawGrid = (ctx, size = 1080) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(0,255,127,0.055)";
    ctx.lineWidth = 1;
    for (let x = 64; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 64; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  };

  const drawBrand = (ctx, size = 1080) => {
    const drawLogoMark = (x, y, fontSize) => {
      ctx.save();
      ctx.fillStyle = green;
      ctx.font = `800 ${fontSize}px ${sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("σ", x, y);
      ctx.restore();
    };

    drawLogoMark(128, 109, 47);
    ctx.fillStyle = text;
    ctx.font = `800 30px ${sans}`;
    ctx.fillText("SigmaBet", 156, 122);
  };

  const roundedRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };

  const wrapText = (ctx, value, x, y, maxWidth, lineHeight, maxLines = 4) => {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((part, index) => ctx.fillText(index === maxLines - 1 && lines.length > maxLines ? `${part}...` : part, x, y + index * lineHeight));
    return y + Math.min(lines.length, maxLines) * lineHeight;
  };

  const resultColors = (result, profit) => {
    const clean = String(result || "").toLowerCase();
    const numeric = Number.parseFloat(String(profit || "").replace(",", "."));
    const hasNumeric = Number.isFinite(numeric);
    if (!clean && !hasNumeric) return { color: muted, label: "SIN RESULTADO" };
    if (clean.includes("perd") || clean.includes("rojo") || (hasNumeric && numeric < 0)) return { color: red, label: "PERDIDO" };
    if (clean.includes("nulo")) return { color: "#D7B354", label: "NULO" };
    if (clean.includes("pend")) return { color: muted, label: "PENDIENTE" };
    return { color: green, label: "GANADO" };
  };

  const drawSelectionStatus = (ctx, x, y, status) => {
    const state = resultColors(status, "");
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = state.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.72)";
    ctx.stroke();
  };

  const drawPickCard = async (payload) => {
    await document.fonts?.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    const ctx = canvas.getContext("2d");
    const isPending = String(payload.result || "").trim().toLowerCase() === "pendiente";
    const state = resultColors(payload.result, isPending ? "" : payload.profit);
    const selections = Array.isArray(payload.selections) && payload.selections.length
      ? payload.selections
      : [{ text: payload.pick || "Apuesta registrada", status: payload.result || "" }];

    // Medir antes de dibujar para conservar encuentros y selecciones completos.
    const linesFor = (value, maxWidth) => {
      const words = String(value || "").trim().split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";
      for (const word of words) {
        if (ctx.measureText(word).width > maxWidth) {
          if (line) { lines.push(line); line = ""; }
          for (const character of word) {
            if (line && ctx.measureText(line + character).width > maxWidth) {
              lines.push(line);
              line = "";
            }
            line += character;
          }
        } else if (line && ctx.measureText(`${line} ${word}`).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) lines.push(line);
      return lines;
    };
    let titleSize = 54;
    let titleLines;
    do {
      ctx.font = `750 ${titleSize}px ${sans}`;
      titleLines = linesFor(payload.match || "Partido", 872);
      if (titleLines.length <= 3 || titleSize <= 34) break;
      titleSize -= 2;
    } while (true);
    const titleLineHeight = Math.ceil(titleSize * 1.16);
    const titleTop = 278;
    const selectionsTop = Math.max(388, titleTop + titleLines.length * titleLineHeight + 30);
    ctx.font = `650 26px ${sans}`;
    const selectionRows = selections.map((selection) => {
      const lines = linesFor(selection.text || "Selección", 772);
      return { ...selection, lines, height: Math.max(82, lines.length * 32 + 32) };
    });
    const rowsBottom = selectionsTop + 36 + selectionRows.reduce((sum, row) => sum + row.height + 12, 0);
    const resultTop = Math.max(738, rowsBottom + 40);
    const footerTop = Math.max(962, resultTop + 208);
    canvas.height = Math.max(1080, footerTop + 102);

    const box = (x, y, width, height, radius, fill, stroke, borderWidth = 1) => {
      ctx.beginPath();
      roundedRect(ctx, x, y, width, height, radius);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = borderWidth; ctx.stroke(); }
    };
    const write = (value, x, y, size, weight = 600, color = text, align = "left") => {
      ctx.font = `${weight} ${size}px ${sans}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      ctx.fillText(String(value), x, y);
    };
    const fit = (value, x, y, width, size, weight = 650, color = text, align = "left") => {
      let fitted = size;
      do {
        ctx.font = `${weight} ${fitted}px ${sans}`;
        if (ctx.measureText(String(value)).width <= width) break;
        fitted -= 1;
      } while (fitted > 12);
      write(value, x, y, fitted, weight, color, align);
    };
    ctx.fillStyle = "#080909";
    ctx.fillRect(0, 0, 1080, canvas.height);
    ctx.strokeStyle = "rgba(0,255,127,0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 64; x < 1080; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 64; y < canvas.height; y += 64) { ctx.moveTo(0, y); ctx.lineTo(1080, y); }
    ctx.stroke();
    const glow = ctx.createRadialGradient(950, 180, 0, 950, 180, 720);
    glow.addColorStop(0, "#FFFFFF04");
    glow.addColorStop(1, "#FFFFFF00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, canvas.height);
    drawBrand(ctx);
    write(payload.date || "Registro público", 976, 100, 19, 500, "#ADADAD", "right");
    box(64, 178, 952, footerTop - 178, 26, "#111313");
    const cardGlow = ctx.createRadialGradient(1016, footerTop, 0, 1016, footerTop, 760);
    cardGlow.addColorStop(0, `${state.color}38`);
    cardGlow.addColorStop(0.5, `${state.color}12`);
    cardGlow.addColorStop(1, `${state.color}00`);
    box(64, 178, 952, footerTop - 178, 26, cardGlow, state.color, 3);
    // La liga actúa como antetítulo, sin duplicar etiquetas ni añadir otro contenedor.
    fit(String(payload.competition || "Registro SigmaBet"), 104, 231, 580, 20, 550, "#AEBBB4");
    const ticketStatus = state.label === "GANADO" ? "GANADOR" : state.label;
    ctx.font = `800 22px ${sans}`;
    const tabWidth = Math.max(184, ctx.measureText(ticketStatus).width + 100);
    const tabRight = 990;
    const tabLeft = tabRight - tabWidth;
    // Dos curvas tangentes por lado forman una unión continua con el borde.
    ctx.beginPath();
    ctx.moveTo(tabLeft, 178);
    ctx.arc(tabLeft, 204, 26, -Math.PI / 2, 0);
    ctx.arc(tabLeft + 52, 204, 26, Math.PI, Math.PI / 2, true);
    ctx.lineTo(tabRight - 52, 230);
    ctx.arc(tabRight - 52, 204, 26, Math.PI / 2, 0, true);
    ctx.arc(tabRight, 204, 26, Math.PI, Math.PI * 1.5);
    ctx.lineTo(tabLeft, 178);
    ctx.fillStyle = state.color;
    ctx.fill();
    write(ticketStatus, (tabLeft + tabRight) / 2, 192, 22, 800, "#08120D", "center");
    titleLines.forEach((line, index) => write(line, 104, titleTop + index * titleLineHeight, titleSize, 750));

    write("SELECCIONES", 104, selectionsTop, 15, 650, "#9BA3A0");
    let rowTop = selectionsTop + 36;
    for (const selection of selectionRows) {
      box(104, rowTop, 872, selection.height, 12, "#FFFFFF03", "#FFFFFF0C");
      const selectionState = resultColors(selection.status || "", "");
      const centerY = rowTop + selection.height / 2;
      box(122, centerY - 17, 34, 34, 17, "#FFFFFF08");
      ctx.beginPath();
      ctx.strokeStyle = selectionState.color;
      ctx.lineWidth = 2.5;
      if (selectionState.label === "GANADO") { ctx.moveTo(131, centerY); ctx.lineTo(137, centerY + 6); ctx.lineTo(147, centerY - 6); }
      else if (selectionState.label === "PERDIDO") { ctx.moveTo(133, centerY - 6); ctx.lineTo(145, centerY + 6); ctx.moveTo(145, centerY - 6); ctx.lineTo(133, centerY + 6); }
      else { ctx.moveTo(133, centerY); ctx.lineTo(145, centerY); }
      ctx.stroke();
      const textTop = rowTop + (selection.height - selection.lines.length * 32) / 2;
      selection.lines.forEach((line, index) => write(line, 176, textTop + index * 32, 26, 650));
      rowTop += selection.height + 12;
    }
    if (!isPending) {
      write("RESULTADO EN UNIDADES", 976, resultTop + 26, 13, 650, "#ADB4B1", "right");
      fit(payload.profit || "—", 976, resultTop + 62, 296, 52, 750, state.color, "right");
    }
    // Valor Sigma conserva el distintivo utilizado en la web.
    write("VALOR SIGMA", 266, resultTop + 26, 13, 600, "#ADB4B1");
    {
      const x = 266;
      const sigmaValue = (String(payload.valorSigma ?? "").trim() || "—").replace(/(\d)\.(?=\d)/g, "$1,");
        const badgeY = resultTop + 61;
        ctx.font = `650 26px ${sans}`;
        const badgeWidth = Math.min(196, Math.max(130, ctx.measureText(sigmaValue).width + 64));
        const badgeFill = ctx.createLinearGradient(x, badgeY, x + badgeWidth, badgeY + 48);
        badgeFill.addColorStop(0, "#56CAFF1C");
        badgeFill.addColorStop(1, "#56CAFF08");
        box(x, badgeY, badgeWidth, 48, 9, badgeFill, "#83D9FF40");
        const dx = x + 13, dy = badgeY + 10, scale = 1.1;
        const path = (points) => {
          ctx.moveTo(dx + points[0][0] * scale, dy + points[0][1] * scale);
          points.slice(1).forEach(([px, py]) => ctx.lineTo(dx + px * scale, dy + py * scale));
        };
        ctx.beginPath();
        path([[7,4],[17,4],[22,10],[12,21],[2,10],[7,4]]);
        path([[7,4],[12,21],[17,4]]);
        path([[2,10],[22,10]]);
        path([[7,4],[12,10],[17,4]]);
        ctx.strokeStyle = "#9CE2FF"; ctx.lineWidth = 1.65; ctx.lineJoin = "round"; ctx.stroke();
        fit(sigmaValue, x + 49, badgeY + 10, badgeWidth - 61, 26, 650, "#9CE2FF");
    }
    write("STAKE", 490, resultTop + 26, 13, 600, "#ADB4B1");
    fit(payload.stake || "—", 490, resultTop + 68, 132, 30);
    write("CUOTA", 104, resultTop + 26, 13, 600, "#ADB4B1");
    fit(payload.odd || "—", 104, resultTop + 68, 140, 30);

    write("REGISTRO PÚBLICO · sigmabet.es", 104, footerTop - 42, 14, 550, "#7D8983");
    write("Más datos. Menos fe.", 104, footerTop + 26, 19, 650, "#CBCFCB");
    write("@SigmaBetES", 976, footerTop + 24, 22, 700, green, "right");
    write("+18 · Juego responsable · No hay apuestas seguras", 104, footerTop + 59, 13, 500, "#858B87");
    return canvas;
  };

  const drawSummaryCard = async (payload, canvas) => {
    await document.fonts?.ready;
    const target = canvas || document.createElement("canvas");
    target.width = 1080;
    target.height = 1080;
    const ctx = target.getContext("2d");
    const positive = Number(payload.profit || 0) >= 0;
    const accent = positive ? green : red;

    drawGrid(ctx);
    drawBrand(ctx);

    ctx.fillStyle = muted;
    ctx.font = `750 16px ${mono}`;
    ctx.textAlign = "right";
    ctx.fillText(String(payload.period || "PERIODO").toUpperCase(), 964, 132);
    ctx.fillStyle = "rgba(245,245,245,0.42)";
    ctx.font = `750 13px ${mono}`;
    ctx.fillText("PERIODO", 964, 104);
    ctx.textAlign = "left";

    ctx.fillStyle = green;
    ctx.font = `800 22px ${mono}`;
    ctx.fillText("> BALANCE SEMANAL", 116, 292);

    ctx.fillStyle = accent;
    ctx.font = `900 88px ${sans}`;
    ctx.fillText(`${positive ? "+" : ""}${Number(payload.profit || 0).toFixed(2)}u`, 116, 404);

    ctx.strokeStyle = "rgba(245,245,245,0.11)";
    ctx.beginPath();
    ctx.moveTo(116, 506);
    ctx.lineTo(964, 506);
    ctx.stroke();

    const stat = (label, value, x, y, color = text) => {
      ctx.strokeStyle = "rgba(245,245,245,0.09)";
      ctx.fillStyle = "rgba(245,245,245,0.025)";
      ctx.beginPath();
      roundedRect(ctx, x, y, 392, 128, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = `800 15px ${mono}`;
      ctx.fillText(label, x + 24, y + 36);
      ctx.fillStyle = color;
      ctx.font = `900 50px ${sans}`;
      ctx.fillText(value, x + 24, y + 94);
    };

    stat("PICKS TOTALES", String(payload.total || 0), 116, 594);
    stat("ACIERTOS", String(payload.wins || 0), 572, 594, green);
    stat("HIT RATE", `${Number(payload.hitRate || 0).toFixed(1)}%`, 116, 758);
    stat("YIELD", `${Number(payload.yieldValue || 0) > 0 ? "+" : ""}${Number(payload.yieldValue || 0).toFixed(1)}%`, 572, 758, accent);
    ctx.fillStyle = muted;
    ctx.font = `650 22px ${mono}`;
    ctx.fillText("#Balance", 116, 1006);
    ctx.fillText("@SigmaBetES", 746, 1006);
    return target;
  };

  const canvasToBlob = (canvas) =>
    new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });

  const shareCanvas = async (canvas, filename) => {
    const blob = await canvasToBlob(canvas);
    if (!blob) return false;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file] });
      return true;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    return true;
  };

  return { drawPickCard, drawSummaryCard, shareCanvas };
})();

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-share-card]");
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  target.classList.add("is-working");

  try {
    const payload = JSON.parse(target.dataset.shareCard || "{}");
    const canvas = await shareCanvasHelpers.drawPickCard(payload);
    await shareCanvasHelpers.shareCanvas(canvas, "sigmabet-apuesta.png");
  } catch (error) {
    target.classList.add("has-error");
    window.setTimeout(() => target.classList.remove("has-error"), 1400);
  } finally {
    target.classList.remove("is-working");
  }
});

const shareRangeTool = document.querySelector("[data-share-range]");

if (shareRangeTool) {
  const sheetUrl = shareRangeTool.dataset.sheetUrl?.trim();
  const fromTarget = shareRangeTool.querySelector("[data-share-from]");
  const toTarget = shareRangeTool.querySelector("[data-share-to]");
  const buildTarget = shareRangeTool.querySelector("[data-share-build]");
  const canvasTarget = shareRangeTool.querySelector("[data-share-canvas]");
  const shareTarget = shareRangeTool.querySelector("[data-share-summary]");
  let rows = [];
  let summaryPayload = null;

  const normalizeRange = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const numberRange = (value) => {
    const parsed = Number.parseFloat(
      String(value ?? "")
        .replace("%", "")
        .replace("u", "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "")
    );
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseRangeDate = (value) => {
    const text = String(value || "").trim();
    const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseRangeCsv = (csv) => {
    const parsedRows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < csv.length; index += 1) {
      const char = csv[index];
      const next = csv[index + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim())) parsedRows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim())) parsedRows.push(row);
    return parsedRows;
  };

  const columnRange = (headers, names) => headers.findIndex((header) => names.includes(normalizeRange(header)));

  const loadShareRows = async () => {
    if (!sheetUrl) return;
    const separator = sheetUrl.includes("?") ? "&" : "?";
    const response = await fetchWithTimeout(`${sheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`La fuente de datos respondió ${response.status}`);
    const csvRows = parseRangeCsv(await response.text());
    const headerIndex = csvRows.findIndex((row) =>
      row.some((cell) => normalizeRange(cell) === "fecha") &&
      row.some((cell) => ["resultado"].includes(normalizeRange(cell)))
    );
    if (headerIndex < 0) throw new Error("No encuentro cabeceras del Tracking.");

    const headers = csvRows[headerIndex];
    const indexes = {
      fecha: columnRange(headers, ["fecha"]),
      resultado: columnRange(headers, ["resultado"]),
      profit: columnRange(headers, ["u / profit", "u/profit", "profit", "unidades"]),
      stake: columnRange(headers, ["stake"]),
    };

    rows = csvRows
      .slice(headerIndex + 1)
      .map((row) => ({
        fecha: row[indexes.fecha] || "",
        resultado: row[indexes.resultado] || "",
        profit: row[indexes.profit] || "",
        stake: row[indexes.stake] || "",
      }))
      .filter((row) => row.fecha || row.resultado);
  };

  const buildShareRangeImage = async () => {
    if (!rows.length) await loadShareRows();

    const from = fromTarget?.value ? new Date(`${fromTarget.value}T00:00:00`) : null;
    const to = toTarget?.value ? new Date(`${toTarget.value}T23:59:59`) : null;
    const filtered = rows.filter((row) => {
      const date = parseRangeDate(row.fecha);
      const clean = normalizeRange(row.resultado);
      const settled = !["", "pendiente", "pending"].includes(clean);
      return settled && date && (!from || date >= from) && (!to || date <= to);
    });
    const wins = filtered.filter((row) => ["ganado", "ganada", "verde", "win"].includes(normalizeRange(row.resultado))).length;
    const profit = filtered.reduce((sum, row) => sum + numberRange(row.profit), 0);
    const stake = filtered.reduce((sum, row) => sum + (numberRange(row.stake) || 1), 0);
    const yieldValue = stake ? (profit / stake) * 100 : 0;
    const hitRate = filtered.length ? (wins / filtered.length) * 100 : 0;
    const fromText = from ? from.toLocaleDateString("es-ES") : "inicio";
    const toText = to ? to.toLocaleDateString("es-ES") : "hoy";
    summaryPayload = {
      period: `${fromText} - ${toText}`,
      total: filtered.length,
      wins,
      profit,
      hitRate,
      yieldValue,
    };
    if (canvasTarget) await shareCanvasHelpers.drawSummaryCard(summaryPayload, canvasTarget);
    if (shareTarget) {
      shareTarget.disabled = false;
    }
  };

  buildTarget?.addEventListener("click", () => {
    buildShareRangeImage().catch(() => {
      if (shareTarget) shareTarget.disabled = true;
    });
  });

  shareTarget?.addEventListener("click", async () => {
    if (!summaryPayload) return;
    shareTarget.classList.add("is-working");
    try {
      const canvas = await shareCanvasHelpers.drawSummaryCard(summaryPayload, canvasTarget);
      await shareCanvasHelpers.shareCanvas(canvas, "sigmabet-balance.png");
    } finally {
      shareTarget.classList.remove("is-working");
    }
  });

  if (canvasTarget) {
    shareCanvasHelpers.drawSummaryCard({ period: "Semana", total: 0, wins: 0, profit: 0, hitRate: 0, yieldValue: 0 }, canvasTarget);
  }
}
