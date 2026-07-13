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
      if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
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
  const filters = {
    time: registry.querySelector('[data-filter="time"]'),
    from: registry.querySelector('[data-filter="from"]'),
    to: registry.querySelector('[data-filter="to"]'),
  };
  const customRange = registry.querySelector("[data-custom-range]");
  const summaryTargets = {
    total: registry.querySelector('[data-summary="total"]'),
    hit: registry.querySelector('[data-summary="hit"]'),
    balance: registry.querySelector('[data-summary="balance"]'),
    yield: registry.querySelector('[data-summary="yield"]'),
    avgOdd: registry.querySelector('[data-summary="avgOdd"]'),
    avgStake: registry.querySelector('[data-summary="avgStake"]'),
    updated: registry.querySelector('[data-summary="updated"]'),
  };
  const registryWarningTarget = registry.querySelector("[data-registry-warning]");
  const sheetUrl = registry.dataset.sheetUrl?.trim();
  const refreshMs = Number(registry.dataset.refreshMs || 60000);
  const registryCacheKey = `sigmabet:registry:${sheetUrl || "default"}`;
  let registryRows = [];
  let registryUpdatedAt = "";

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
    return `${sign}${number.toFixed(2)} u`;
  };

  const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

  const formatOdd = (value) => displayText(value).replace(",", ".");

  const formatPercentValue = (value) => `${value.toFixed(2)}%`;

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
      "SigmaBet | Pick registrado",
      `${displayText(row.partido, "Partido")} · ${displayText(row.competition, "Competición")}`,
      `Pick: ${isPendingRow ? "Disponible en el Telegram gratuito" : displayText(row.apuesta, "No disponible")}`,
      `Cuota: ${displayText(row.cuota)} · Stake: ${displayText(row.stake)}`,
      `Resultado: ${status} · Unidades: ${profit}`,
      "+18 | Juego responsable. No hay apuestas seguras.",
    ];
    return lines.join("\n");
  };

  const updateCustomRangeVisibility = () => {
    if (!customRange) return;
    customRange.hidden = filters.time?.value !== "custom";
  };

  const rowMatchesTime = (row) => {
    const value = filters.time?.value || "Todos";
    if (value === "Todos") return true;

    const date = parseDate(row.fecha);
    if (!date) return false;

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (value === "custom") {
      const from = filters.from?.value ? new Date(`${filters.from.value}T00:00:00`) : null;
      const to = filters.to?.value ? new Date(`${filters.to.value}T23:59:59`) : null;
      return (!from || date >= from) && (!to || date <= to);
    }

    if (value === "7d") {
      const start = new Date(startToday);
      start.setDate(start.getDate() - 6);
      return date >= start && date <= now;
    }

    if (value === "30d") {
      const start = new Date(startToday);
      start.setDate(start.getDate() - 29);
      return date >= start && date <= now;
    }

    if (value === "90d") {
      const start = new Date(startToday);
      start.setDate(start.getDate() - 89);
      return date >= start && date <= now;
    }

    if (value === "365d") {
      const start = new Date(startToday);
      start.setDate(start.getDate() - 364);
      return date >= start && date <= now;
    }

    return true;
  };

  const rowMatchesFilters = (row) => rowMatchesTime(row);

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
    const balanceClass = balance > 0 ? "is-positive" : balance < 0 ? "is-negative" : "";

    if (!settled.length) {
      if (summaryTargets.total) summaryTargets.total.textContent = "Sin datos";
      if (summaryTargets.hit) summaryTargets.hit.textContent = "Sin datos";
      if (summaryTargets.balance) summaryTargets.balance.textContent = "Sin datos";
      if (summaryTargets.yield) summaryTargets.yield.textContent = "Sin datos";
      if (summaryTargets.avgOdd) summaryTargets.avgOdd.textContent = "Sin datos";
      if (summaryTargets.avgStake) summaryTargets.avgStake.textContent = "Sin datos";
    } else {
      if (summaryTargets.total) summaryTargets.total.textContent = String(settled.length);
      if (summaryTargets.hit) summaryTargets.hit.textContent = formatPercentValue(hitRate);
      if (summaryTargets.balance) summaryTargets.balance.textContent = formatUnits(balance);
      if (summaryTargets.yield) summaryTargets.yield.textContent = formatPercent(yieldValue);
      if (summaryTargets.avgOdd) summaryTargets.avgOdd.textContent = avgOdd.toFixed(2);
      if (summaryTargets.avgStake) summaryTargets.avgStake.textContent = `${avgStake.toFixed(2)} u`;
    }
    if (summaryTargets.balance) {
      summaryTargets.balance.className = balanceClass;
    }
    if (summaryTargets.yield) {
      summaryTargets.yield.className = yieldValue > 0 ? "is-positive" : yieldValue < 0 ? "is-negative" : "";
    }
    if (summaryTargets.updated) {
      summaryTargets.updated.textContent = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(registryUpdatedAt ? new Date(registryUpdatedAt) : new Date());
    }
  };

  const renderRegistryChart = (rows) => {
    if (!chartTarget) return;

    const settled = rows.filter(isSettled).sort((a, b) => (parseDate(a.fecha) || 0) - (parseDate(b.fecha) || 0));
    let balance = 0;
    const points = settled.map((row) => {
      balance += numberFrom(row.profit);
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
        ${areas.map((area) => `<path class="chart-area chart-area-${area.type}" d="${area.d}"></path>`).join("")}
        ${segments.map((segment) => `<path class="chart-line chart-line-${segment.type}" d="${segment.d}"></path>`).join("")}
      </svg>
    `;
  };

  const renderRows = (visibleRows) => {
    if (!rowsTarget) return;
    if (countTarget) {
      countTarget.textContent = `${visibleRows.length} ${visibleRows.length === 1 ? "pick" : "picks"}`;
    }

    if (!visibleRows.length) {
      rowsTarget.innerHTML = '<div class="registry-ledger-empty">No hay picks para los filtros seleccionados.</div>';
      return;
    }

    rowsTarget.innerHTML = visibleRows
      .map((row) => {
        const profit = numberFrom(row.profit);
        const profitClass = profit > 0 ? "profit-positive" : profit < 0 ? "profit-negative" : "";
        const statusLabel = resultLabel(row.resultado);
        const isPendingRow = ["", "pendiente"].includes(normalize(row.resultado));
        const rowClass = `registry-row-${normalize(statusLabel).replace(/\s+/g, "-")}`;
        const timeline = isPendingRow ? [] : selectionParts(row.apuesta, row.resultadoSelecciones);
        const sharePayload = {
          type: "pick",
          date: row.fecha,
          competition: row.competition,
          match: row.partido,
          pick: isPendingRow ? "Disponible en el Telegram gratuito" : row.apuesta,
          odd: formatOdd(row.cuota),
          stake: row.stake,
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
                <span class="pending-status-pill">Pendiente</span>
              </div>
            </article>
          `;
        }

        return `
          <details class="registry-ledger-item ${rowClass}">
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
                </div>
              </div>
              <div class="registry-ledger-result">
                <span class="pill ${resultClass(row.resultado)}">${escapeHtml(statusLabel)}</span>
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
                    <p class="registry-expanded-label">Pick pendiente</p>
                    <div class="pending-telegram-note">
                      <span>Apuesta en Telegram gratuito.</span>
                      <a href="${TELEGRAM_URL}" target="_blank" rel="noreferrer">Acceder</a>
                    </div>
                  `
                  : `
                    <p class="registry-expanded-label">Pick registrado</p>
                    <div class="pick-timeline">
                      ${(timeline.length ? timeline : [{ text: row.apuesta || "Pick registrado", status: "" }])
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

  const renderRegistryView = () => {
    const filteredRows = registryRows.filter(rowMatchesFilters);
    const displayRows = [...filteredRows].reverse();
    renderSummary(filteredRows);
    renderRegistryChart(filteredRows);
    renderRows(displayRows);
  };

  const updateStatus = (message) => {
    if (statusTarget) statusTarget.textContent = message;
  };

  const loadRegistry = async () => {
    if (!sheetUrl) {
      updateStatus("El registro automático no está disponible ahora mismo.");
      return;
    }

    try {
      updateStatus("Actualizando registro desde Google Sheets...");
      if (registryWarningTarget) registryWarningTarget.hidden = true;
      const separator = sheetUrl.includes("?") ? "&" : "?";
      const response = await fetchWithTimeout(`${sheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
      const csvText = await response.text();
      registryRows = parseRegistryRows(csvText);
      registryUpdatedAt = new Date().toISOString();
      localStorage.setItem(registryCacheKey, JSON.stringify({ rows: registryRows, updatedAt: registryUpdatedAt }));
      updateCustomRangeVisibility();
      renderRegistryView();
      updateStatus(`Registro conectado. ${registryRows.length} filas leídas desde Tracking.`);
    } catch (error) {
      const cached = JSON.parse(localStorage.getItem(registryCacheKey) || "null");
      if (cached?.rows?.length) {
        registryRows = cached.rows;
        registryUpdatedAt = cached.updatedAt;
        renderRegistryView();
        updateStatus("No hemos podido actualizar el registro. Se muestran los últimos datos disponibles.");
        if (registryWarningTarget) registryWarningTarget.hidden = false;
      } else {
        updateStatus(`No he podido leer el Google Sheet: ${error.message}`);
      }
    }
  };

  Object.values(filters).forEach((filter) => {
    filter?.addEventListener("change", () => {
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
  const sheetUrl = homeFeed.dataset.sheetUrl?.trim();
  const refreshMs = Number(homeFeed.dataset.refreshMs || 60000);
  const pendingTarget = homeFeed.querySelector("[data-pending-picks]");
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
  const homeCacheKey = `sigmabet:home:${sheetUrl || "default"}`;
  let homeRows = [];
  let homeUpdatedAt = "";

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
    resultado: ["resultado"],
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
        resultado: homeCell(row, headers, "resultado"),
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
    const pending = rows
      .filter((row) => ["", "pendiente"].includes(normalizeHome(row.resultado)))
      .sort((a, b) => parseHomeDate(b.fecha) - parseHomeDate(a.fecha))
      .slice(0, 5);

    if (!pendingTarget) return;
    if (!pending.length) {
      pendingTarget.innerHTML = '<div class="pending-empty"><span>--</span><strong>No hay apuestas pendientes</strong><em>--</em></div>';
      return;
    }

    pendingTarget.innerHTML = pending
      .map((row) => {
        return `
          <article class="registry-ledger-item registry-row-pendiente registry-pending-card">
            ${pendingTelegramMarkup("pending-telegram-banner")}
            <div class="registry-pending-inner">
              <div class="registry-ledger-main">
                <span class="registry-date">${escapeHome(row.fecha)}</span>
                <strong class="registry-event">${escapeHome(row.partido)}</strong>
                <span class="registry-competition">${escapeHome(row.competition || row.tipo || "Pendiente")}</span>
              </div>
              <span class="pending-status-pill">Pendiente</span>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderChartHome = () => {
    const settled = filteredHomeRows().sort((a, b) => parseHomeDate(a.fecha) - parseHomeDate(b.fecha));
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

    if (!settled.length) {
      if (statTargets.settled) statTargets.settled.textContent = "Sin datos";
      if (statTargets.hit) statTargets.hit.textContent = "Sin datos";
      if (statTargets.balance) statTargets.balance.textContent = "Sin datos";
      if (statTargets.yield) statTargets.yield.textContent = "Sin datos";
    } else {
      if (statTargets.settled) statTargets.settled.textContent = String(settled.length);
      if (statTargets.hit) statTargets.hit.textContent = percentHome(hitRate);
      if (statTargets.balance) statTargets.balance.textContent = unitsHome(balance);
      if (statTargets.yield) statTargets.yield.textContent = percentHome(yieldValue * 100);
    }
    if (statTargets.balance) {
      statTargets.balance.className = balanceClass;
    }
    if (statTargets.yield) {
      statTargets.yield.className = yieldValue > 0 ? "is-positive" : yieldValue < 0 ? "is-negative" : "";
    }
    if (statTargets.avgOdd) statTargets.avgOdd.textContent = avgOdd ? avgOdd.toFixed(2) : "0.00";
    if (statTargets.avgStake) statTargets.avgStake.textContent = `${avgStake.toFixed(2)} u`;
    if (updatedTarget) {
      const updatedDate = homeUpdatedAt ? new Date(homeUpdatedAt) : new Date();
      const desktop = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(updatedDate);
      const mobile = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(updatedDate).replace(",", " ·");
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
  };

  const renderHomeFeed = () => {
    renderPendingHome(homeRows);
    renderChartHome();
    if (customRangeTarget) customRangeTarget.hidden = (rangeTarget?.value || "month") !== "custom";
  };

  const loadHomeFeed = async () => {
    if (!sheetUrl) return;
    try {
      if (statusTarget) statusTarget.textContent = "Actualizando";
      if (warningTarget) warningTarget.hidden = true;
      const separator = sheetUrl.includes("?") ? "&" : "?";
      const response = await fetchWithTimeout(`${sheetUrl}${separator}_=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
      homeRows = parseHomeRows(await response.text());
      homeUpdatedAt = new Date().toISOString();
      localStorage.setItem(homeCacheKey, JSON.stringify({ rows: homeRows, updatedAt: homeUpdatedAt }));
      renderHomeFeed();
      if (statusTarget) statusTarget.textContent = "En vivo";
    } catch (error) {
      const cached = JSON.parse(localStorage.getItem(homeCacheKey) || "null");
      if (cached?.rows?.length) {
        homeRows = cached.rows;
        homeUpdatedAt = cached.updatedAt;
        renderHomeFeed();
        if (statusTarget) statusTarget.textContent = "Sin conexión";
        if (warningTarget) warningTarget.hidden = false;
      } else if (statusTarget) {
        statusTarget.textContent = "Error de conexión";
      }
    }
  };

  rangeTarget?.addEventListener("change", renderHomeFeed);
  customDateTargets.from?.addEventListener("change", renderHomeFeed);
  customDateTargets.to?.addEventListener("change", renderHomeFeed);

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
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    const state = resultColors(payload.result, payload.profit);
    const selections = Array.isArray(payload.selections) && payload.selections.length
      ? payload.selections
      : [{ text: payload.pick || "Pick registrado", status: payload.result || "" }];

    drawGrid(ctx);
    drawBrand(ctx);

    ctx.strokeStyle = "rgba(245,245,245,0.1)";
    ctx.fillStyle = "rgba(245,245,245,0.028)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundedRect(ctx, 86, 178, 908, 806, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = green;
    ctx.font = `850 20px ${mono}`;
    ctx.fillText("> PICK REGISTRADO", 116, 246);

    ctx.fillStyle = muted;
    ctx.font = `750 18px ${mono}`;
    ctx.fillText(String(payload.date || "--").toUpperCase(), 116, 292);
    ctx.fillText(String(payload.competition || "SigmaBet").toUpperCase(), 116, 322);

    ctx.fillStyle = text;
    ctx.font = `900 70px ${sans}`;
    wrapText(ctx, payload.match || "Partido", 116, 414, 710, 78, 2);

    ctx.strokeStyle = `${state.color}66`;
    ctx.fillStyle = `${state.color}12`;
    ctx.beginPath();
    roundedRect(ctx, 770, 272, 164, 46, 999);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = state.color;
    ctx.font = `850 18px ${mono}`;
    ctx.textAlign = "center";
    ctx.fillText(state.label, 852, 302);
    ctx.textAlign = "left";

    ctx.fillStyle = state.color;
    ctx.font = `900 56px ${mono}`;
    ctx.textAlign = "right";
    ctx.fillText(payload.profit || "0.00u", 934, 398);
    ctx.textAlign = "left";

    const metric = (label, value, x, y, width) => {
      ctx.strokeStyle = "rgba(245,245,245,0.1)";
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      roundedRect(ctx, x, y, width, 82, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = text;
      ctx.font = `850 30px ${mono}`;
      ctx.fillText(value || "--", x + 22, y + 39);
      ctx.fillStyle = muted;
      ctx.font = `800 15px ${mono}`;
      ctx.fillText(label, x + 22, y + 62);
    };

    metric("CUOTA", payload.odd || "--", 116, 484, 252);
    metric("STAKE", payload.stake || "--", 386, 484, 252);
    metric("UDS.", payload.profit || "--", 656, 484, 278);

    ctx.fillStyle = muted;
    ctx.font = `850 18px ${mono}`;
    ctx.fillText("SELECCIONES", 116, 638);

    ctx.strokeStyle = "rgba(245,245,245,0.11)";
    ctx.lineWidth = 2;
    const circleX = 136;
    const textX = 174;
    const rowHeight = 74;
    const visibleSelections = selections.slice(0, 3);
    const centers = visibleSelections.map((_, index) => 674 + index * rowHeight);

    if (centers.length > 1) {
      ctx.strokeStyle = "rgba(245,245,245,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circleX, centers[0]);
      ctx.lineTo(circleX, centers[centers.length - 1]);
      ctx.stroke();
    }

    visibleSelections.forEach((selection, index) => {
      const centerY = centers[index];
      drawSelectionStatus(ctx, circleX, centerY, selection.status || payload.result || "");
      ctx.fillStyle = text;
      ctx.font = `850 27px ${sans}`;
      wrapText(ctx, selection.text || "Selección", textX, centerY - 8, 720, 30, 2);
    });

    if (selections.length > visibleSelections.length) {
      ctx.fillStyle = muted;
      ctx.font = `750 22px ${mono}`;
      ctx.fillText(`+${selections.length - visibleSelections.length} selecciones más`, textX, 674 + visibleSelections.length * rowHeight + 4);
    }

    ctx.strokeStyle = "rgba(245,245,245,0.08)";
    ctx.beginPath();
    ctx.moveTo(116, 958);
    ctx.lineTo(934, 958);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = `750 18px ${mono}`;
    ctx.fillText("+18 · Juego responsable · No hay apuestas seguras", 116, 1000);
    ctx.fillStyle = green;
    ctx.font = `850 22px ${mono}`;
    ctx.fillText("@SigmaBetES", 732, 1000);
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
    if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
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
