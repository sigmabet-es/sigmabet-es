document.querySelectorAll("[data-local-time]").forEach((target) => {
  const status = target.dataset.timeStatus;
  const startDate = target.dataset.startDate;
  if (status === "pending" || !startDate) {
    target.textContent = "Horario pendiente";
    return;
  }

  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    target.textContent = "Horario pendiente";
    return;
  }

  target.textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(parsed);
});

document.querySelectorAll("[data-filter-section]").forEach((section) => {
  const buttons = [...section.querySelectorAll("[data-scope-filter]")];
  const rows = [...section.querySelectorAll("[data-scope-row]")];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.dataset.scopeFilter || "all";
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      rows.forEach((row) => {
        const outsideScope = scope !== "all" && row.dataset.scopeRow !== scope;
        const collapsed = row.hasAttribute("data-extra-match") && section.dataset.resultsExpanded !== "true";
        row.hidden = outsideScope || collapsed;
      });
    });
  });
});

document.querySelectorAll("[data-show-more]").forEach((button) => {
  button.addEventListener("click", () => {
    const section = button.closest("[data-filter-section]");
    if (!section) return;
    section.dataset.resultsExpanded = "true";
    const scope = section.querySelector("[data-scope-filter].is-active")?.dataset.scopeFilter || "all";
    section.querySelectorAll("[data-extra-match]").forEach((row) => {
      row.hidden = scope !== "all" && row.dataset.scopeRow !== scope;
    });
    button.remove();
  });
});

const anchorLinks = [...document.querySelectorAll('.match-anchor-nav a[href^="#"]')];
anchorLinks.forEach((link) => link.addEventListener("click", () => {
  anchorLinks.forEach((item) => item.classList.toggle("is-active", item === link));
}));

if ("IntersectionObserver" in window && anchorLinks.length) {
  const sections = anchorLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    anchorLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-25% 0px -60%", threshold: [0.05, 0.3] });
  sections.forEach((section) => observer.observe(section));
}

window.addEventListener("load", () => {
  if (!window.location.hash) return;
  const target = document.getElementById(window.location.hash.slice(1));
  if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
});
