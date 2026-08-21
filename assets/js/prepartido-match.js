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
        row.hidden = scope !== "all" && row.dataset.scopeRow !== scope;
      });
    });
  });
});
