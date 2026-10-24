(() => {
  const root = document.querySelector('[data-daily-studio]');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const editors = $('[data-pick-editors]'), preview = $('[data-art-preview]');
  const download = $('[data-download-art]'), status = $('[data-art-status]');
  const storageKey = 'sigmabet:daily-studio:v1';
  const fields = ['competition', 'match', 'pick', 'time', 'odd', 'valorSigma', 'stake'];
  const blank = () => Object.fromEntries(fields.map(key => [key, '']));
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Atlantic/Canary', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const defaults = () => ({settings: {date: today, format: 'portrait', title: 'Recomendaciones del día', showOdds: true, showSigma: true, showStake: false}, picks: [blank()]});
  let state = defaults(), pages = [], pageIndex = 0, version = 0, timer;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') {
      for (const key of Object.keys(state.settings)) {
        if (typeof saved.settings?.[key] === typeof state.settings[key]) state.settings[key] = saved.settings[key];
      }
      if (!window.SigmaDailyArt.formats[state.settings.format]) state.settings.format = 'portrait';
      if (Array.isArray(saved.picks) && saved.picks.length) state.picks = saved.picks.slice(0, 20).map(row => Object.fromEntries(fields.map(key => [key, String(row?.[key] ?? '').slice(0, 1200)])));
    }
  } catch { /* El editor funciona sin almacenamiento local. */ }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); $('[data-draft-status]').textContent = 'Borrador guardado en este navegador.'; }
    catch { $('[data-draft-status]').textContent = 'Este navegador no permite guardar el borrador. Puedes seguir editando y descargarlo.'; }
  };
  const input = (index, key, label, placeholder = '') => `<label>${label}<input data-pick-field="${key}" data-pick-index="${index}" value="${escape(state.picks[index][key])}" ${key === 'time' ? 'type="time"' : 'type="text"'} maxlength="${key === 'match' ? 160 : key === 'competition' ? 100 : 30}" placeholder="${escape(placeholder)}"></label>`;
  const renderEditors = () => {
    editors.innerHTML = state.picks.map((row, index) => `<details class="pick-editor" open><summary><span class="pick-index">${String(index + 1).padStart(2, '0')}</span><span class="pick-summary">${escape(row.match || 'Nueva recomendación')}</span></summary>${input(index,'competition','Competición','Liga o torneo')}${input(index,'match','Encuentro','Local vs Visitante')}<label>Recomendación<textarea data-pick-field="pick" data-pick-index="${index}" rows="3" maxlength="1200" placeholder="Escribe la selección o las selecciones de esta apuesta">${escape(row.pick)}</textarea></label><div class="field-pair">${input(index,'time','Hora · opcional')}${input(index,'odd','Cuota · opcional','1,80')}</div><div class="field-pair">${input(index,'valorSigma','Valor Sigma · opcional')}${input(index,'stake','Stake · opcional','1,0 u')}</div><div class="pick-tools"><div class="pick-order"><button type="button" class="text-button" data-move-pick="${index}" data-direction="-1" ${!index ? 'disabled' : ''}>↑ Subir</button><button type="button" class="text-button" data-move-pick="${index}" data-direction="1" ${index === state.picks.length - 1 ? 'disabled' : ''}>↓ Bajar</button></div><button type="button" class="text-button remove-pick" data-remove-pick="${index}">Eliminar</button></div></details>`).join('');
    $('[data-pick-count]').textContent = state.picks.length;
  };
  const syncSettings = () => root.querySelectorAll('[data-setting]').forEach(input => {
    if (input.type === 'checkbox') input.checked = state.settings[input.dataset.setting];
    else input.value = state.settings[input.dataset.setting];
  });
  const showPage = () => {
    if (pages[pageIndex]) preview.replaceChildren(pages[pageIndex]);
    $('[data-page-label]').textContent = `${pageIndex + 1} / ${Math.max(1, pages.length)}`;
    $('[data-prev-page]').disabled = pageIndex <= 0;
    $('[data-next-page]').disabled = pageIndex >= pages.length - 1;
  };
  const render = async () => {
    const revision = ++version;
    download.disabled = true;
    const nonempty = state.picks.filter(row => fields.some(key => row[key].trim()));
    const ready = nonempty.filter(row => row.match.trim() && row.pick.trim());
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(state.settings.date)) throw new Error('Elige la fecha de la publicación.');
      const next = await window.SigmaDailyArt.render(state.settings, ready);
      if (revision !== version) return;
      pages = next; pageIndex = Math.min(pageIndex, pages.length - 1); showPage();
      const [width, height] = window.SigmaDailyArt.formats[state.settings.format];
      $('[data-art-size]').textContent = `${width} × ${height} px`;
      if (ready.length !== nonempty.length) status.textContent = 'Completa el encuentro y la recomendación de cada apuesta antes de descargar.';
      else if (!ready.length) status.textContent = 'Añade un encuentro y su recomendación para descargar.';
      else { status.textContent = `${ready.length} ${ready.length === 1 ? 'recomendación' : 'recomendaciones'} · ${pages.length} ${pages.length === 1 ? 'imagen lista' : 'imágenes listas'}.`; download.disabled = false; }
    } catch (error) { if (revision === version) status.textContent = error.message || 'No se pudo generar la vista previa.'; }
  };
  const update = () => { version++; download.disabled = true; clearTimeout(timer); save(); timer = setTimeout(render, 180); };
  root.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-setting]')) {
      state.settings[target.dataset.setting] = target.type === 'checkbox' ? target.checked : target.value;
      update();
    } else if (target.matches('[data-pick-field]')) {
      const row = state.picks[Number(target.dataset.pickIndex)];
      row[target.dataset.pickField] = target.value;
      if (target.dataset.pickField === 'match') target.closest('.pick-editor').querySelector('.pick-summary').textContent = target.value || 'Nueva recomendación';
      update();
    }
  });
  root.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-pick]');
    const move = event.target.closest('[data-move-pick]');
    if (remove) { state.picks.splice(Number(remove.dataset.removePick), 1); renderEditors(); update(); }
    if (move) {
      const from = Number(move.dataset.movePick), to = from + Number(move.dataset.direction);
      if (to < 0 || to >= state.picks.length) return;
      [state.picks[from], state.picks[to]] = [state.picks[to], state.picks[from]]; renderEditors(); update();
    }
  });
  $('[data-add-pick]').addEventListener('click', () => {
    if (state.picks.length >= 20) { status.textContent = 'Este borrador admite hasta 20 recomendaciones.'; return; }
    state.picks.push(blank()); renderEditors(); save();
    editors.lastElementChild?.querySelector('input')?.focus();
  });
  $('[data-new-draft]').addEventListener('click', () => { state = defaults(); pageIndex = 0; syncSettings(); renderEditors(); update(); });
  const appendRows = rows => {
    const daily = rows.filter(row => window.SigmaPendingFeed.dateKey(row.date) === state.settings.date);
    const key = row => [row.competition, row.match, row.pick].map(s => String(s || '').trim().toLowerCase()).join('|');
    const existing = new Set(state.picks.map(key));
    const incoming = daily.filter(row => {const k = key(row); if (existing.has(k)) return false; existing.add(k); return true;});
    if (!daily.length) { $('[data-feed-status]').textContent = 'No hay pendientes para la fecha elegida en esta hoja. Puedes añadirlas manualmente.'; return; }
    state.picks = state.picks.filter(row => fields.some(field => row[field].trim()));
    const added = incoming.slice(0, Math.max(0, 20 - state.picks.length));
    state.picks.push(...added.map(row => Object.fromEntries(fields.map(field => [field, row[field] || '']))));
    $('[data-feed-status]').textContent = `${added.length} recomendaciones añadidas de la fecha elegida.${added.length < incoming.length ? ' Se alcanzó el máximo de 20.' : ''}`;
    renderEditors(); update();
  };
  $('[data-import-pending]').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true; $('[data-feed-status]').textContent = 'Cargando pendientes…';
    try {
      const response = await fetch(root.dataset.sheetUrl, {cache: 'no-store', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('No se pudo cargar la hoja.');
      appendRows(window.SigmaPendingFeed.parseCsv(await response.text()));
    } catch { $('[data-feed-status]').textContent = 'No se pudo conectar con la hoja. Importa el CSV o añade las recomendaciones manualmente.'; }
    finally { button.disabled = false; }
  });
  $('[data-import-csv]').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { appendRows(window.SigmaPendingFeed.parseCsv(await file.text())); }
    catch (error) { $('[data-feed-status]').textContent = error.message; }
    event.target.value = '';
  });
  $('[data-prev-page]').addEventListener('click', () => { if (pageIndex > 0) {pageIndex--;showPage();} });
  $('[data-next-page]').addEventListener('click', () => { if (pageIndex < pages.length - 1) {pageIndex++;showPage();} });
  download.addEventListener('click', async () => {
    const canvas = pages[pageIndex]; if (!canvas || download.disabled) return;
    const stamp = version, selectedPage = pageIndex; download.disabled = true;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No se pudo generar el PNG.');
      const url = URL.createObjectURL(blob);const link = document.createElement('a');
      link.href = url;link.download = `sigmabet-recomendaciones-${state.settings.date}-${state.settings.format}-${selectedPage + 1}.png`;
      document.body.append(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url), 2000);
      status.textContent = `Página ${selectedPage + 1} descargada.${pages.length > 1 ? ' Usa las flechas para descargar las demás.' : ''}`;
    } catch { status.textContent = 'No se pudo descargar la imagen. Vuelve a intentarlo.'; }
    finally { if (stamp === version) download.disabled = false; }
  });
  syncSettings();renderEditors();render();
})();
