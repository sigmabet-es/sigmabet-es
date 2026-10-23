(() => {
  const root = document.querySelector('[data-admin-export]');
  if (!root) return;
  const selector = root.querySelector('[data-pending-select]');
  const status = root.querySelector('[data-export-status]');
  const form = root.querySelector('[data-export-form]');
  const preview = root.querySelector('[data-export-preview]');
  const download = root.querySelector('[data-download-pick]');
  let rows = [], canvas = null, revision = 0;
  const normalize = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parseCsv = text => {
    const delimiter = text.split(/\r?\n/).find(line => /fecha/i.test(line))?.includes(';') ? ';' : ',';
    const records = []; let record = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { record.push(cell); cell = ''; }
      else if (/[\r\n]/.test(char) && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        record.push(cell); records.push(record); record = []; cell = '';
      } else cell += char;
    }
    record.push(cell); records.push(record);
    const headerIndex = records.findIndex(row => row.some(c => normalize(c) === 'fecha') && row.some(c => ['apuesta', 'pick'].includes(normalize(c))));
    if (headerIndex < 0) throw new Error('No se encuentran las cabeceras Fecha y Apuesta en el CSV.');
    const headers = records[headerIndex].map(normalize);
    const get = (row, ...aliases) => String(row[headers.findIndex(h => aliases.includes(h))] || '').trim();
    return records.slice(headerIndex + 1).filter(row => ['', 'pendiente'].includes(normalize(get(row, 'resultado')))).map(row => ({
      date: get(row, 'fecha'), competition: get(row, 'competicion'), match: get(row, 'partido', 'evento'), pick: get(row, 'apuesta', 'pick'), odd: get(row, 'cuota', 'odd'), valorSigma: get(row, 'ev estimado'), stake: get(row, 'stake')
    })).filter(row => row.match && row.pick).reverse();
  };
  const render = async () => {
    const current = ++revision;
    download.disabled = true; canvas = null;
    if (!form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form));
    payload.result = 'Pendiente'; payload.profit = '';
    payload.selections = payload.pick.split(/\r?\n+|\s+\+\s+/).map(text => ({text: text.trim(), status: 'Pendiente'})).filter(item => item.text);
    try {
      const next = await shareCanvasHelpers.drawPickCard(payload);
      if (current !== revision) return;
      canvas = next; preview.replaceChildren(canvas); download.disabled = false;
      status.textContent = 'Vista previa lista para descargar.';
    } catch { status.textContent = 'No se ha podido generar la imagen. Revisa los datos y vuelve a intentarlo.'; }
  };
  const choose = () => {
    const row = rows[Number(selector.value)];
    if (!row) return;
    for (const [key, value] of Object.entries(row)) form.elements.namedItem(key).value = key === 'pick' ? value.replace(/\s+\+\s+/g, '\n') : value;
    render();
  };
  const populate = text => {
    rows = parseCsv(text); selector.replaceChildren();
    rows.forEach((row, index) => selector.add(new Option(`${row.date} · ${row.match}`, String(index))));
    selector.disabled = !rows.length;
    if (rows.length) choose();
    else { revision++; canvas = null; download.disabled = true; selector.add(new Option('Sin apuestas pendientes', '')); preview.textContent = 'No hay pendientes en esta hoja.'; status.textContent = 'No se encontraron apuestas pendientes.'; }
  };
  selector.addEventListener('change', choose);
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('input', () => { revision++; canvas = null; download.disabled = true; status.textContent = 'Hay cambios: actualiza la vista previa antes de descargar.'; });
  root.querySelector('[data-csv-file]').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { populate(await file.text()); } catch (error) { status.textContent = error.message; }
  });
  download.addEventListener('click', async () => {
    if (!canvas) return;
    download.disabled = true;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG vacío');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `sigmabet-pendiente-${Date.now()}.png`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      status.textContent = 'PNG descargado.';
    } catch { status.textContent = 'No se pudo descargar. Vuelve a intentarlo.'; }
    finally { download.disabled = !canvas; }
  });
  fetch(root.dataset.sheetUrl, {cache: 'no-store'}).then(response => {
    if (!response.ok) throw new Error('No se pudo cargar'); return response.text();
  }).then(populate).catch(() => { selector.replaceChildren(new Option('Importa el CSV para empezar', '')); status.textContent = 'No se pudo cargar el registro. Puedes importar el CSV del Excel o introducir una apuesta manualmente.'; });
})();
