const admin = document.querySelector("[data-admin-prepartido]");

if (admin) {
  const fields = {
    home: admin.querySelector('[data-probability="home"]'),
    draw: admin.querySelector('[data-probability="draw"]'),
    away: admin.querySelector('[data-probability="away"]'),
    sigma: admin.querySelector('[data-bet="sigmaProbability"]'),
    odds: admin.querySelector('[data-bet="odds"]'),
    stake: admin.querySelector('[data-bet="stake"]'),
  };
  const outputs = {
    probabilityState: admin.querySelector("[data-probability-state]"),
    fairOdds: admin.querySelector('[data-output="fairOdds"]'),
    implied: admin.querySelector('[data-output="implied"]'),
    edge: admin.querySelector('[data-output="edge"]'),
    sigmaValue: admin.querySelector('[data-output="sigmaValue"]'),
    stake: admin.querySelector('[data-output="stake"]'),
  };

  const numberFrom = (value) => {
    const parsed = Number.parseFloat(String(value || "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const format = (value, suffix = "") => (Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "Dato no disponible");

  const classifySigmaValue = (edge) => {
    if (!Number.isFinite(edge) || edge <= 0) return { label: "NO BET", score: 0 };
    if (edge < 2) return { label: "MUY BAJO", score: 1 };
    if (edge < 4) return { label: "BAJO", score: 2 };
    if (edge < 6) return { label: "MODERADO", score: 3 };
    if (edge < 9) return { label: "ALTO", score: 4 };
    return { label: "MUY ALTO", score: 5 };
  };

  const calculate = () => {
    const home = numberFrom(fields.home?.value);
    const draw = numberFrom(fields.draw?.value);
    const away = numberFrom(fields.away?.value);
    const total = home + draw + away;
    const sigma = numberFrom(fields.sigma?.value);
    const odds = numberFrom(fields.odds?.value);
    const stake = numberFrom(fields.stake?.value);
    const fairOdds = sigma > 0 ? 100 / sigma : Number.NaN;
    const implied = odds > 1 ? 100 / odds : Number.NaN;
    const edge = Number.isFinite(implied) ? sigma - implied : Number.NaN;
    const sigmaValue = classifySigmaValue(edge);

    if (outputs.probabilityState) {
      outputs.probabilityState.textContent = total === 100 ? "Probabilidades válidas: 100%" : `Revisar: suman ${total.toFixed(1)}%`;
      outputs.probabilityState.className = total === 100 ? "is-positive" : "is-negative";
    }
    if (outputs.fairOdds) outputs.fairOdds.textContent = format(fairOdds);
    if (outputs.implied) outputs.implied.textContent = format(implied, "%");
    if (outputs.edge) {
      outputs.edge.textContent = format(edge, " pp");
      outputs.edge.className = edge > 0 ? "is-positive" : edge < 0 ? "is-negative" : "";
    }
    if (outputs.sigmaValue) outputs.sigmaValue.textContent = `${sigmaValue.label} · ${sigmaValue.score}/5`;
    if (outputs.stake) outputs.stake.textContent = stake ? `${stake.toFixed(1)}/5` : "Dato no disponible";
  };

  admin.addEventListener("input", calculate);
  calculate();
}
