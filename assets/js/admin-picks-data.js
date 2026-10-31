(() => {
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
      date: get(row, 'fecha'), competition: get(row, 'competicion'), match: get(row, 'partido', 'evento'), pick: get(row, 'apuesta', 'pick'), odd: get(row, 'cuota', 'odd'), valorSigma: get(row, 'ev estimado'), stake: get(row, 'stake'), time: get(row, 'hora', 'horario')
    })).filter(row => row.match && row.pick).reverse();
  };
  const dateKey = value => {
    const clean = String(value || '').trim();
    const parts = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return parts ? `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : clean.slice(0, 10);
  };
  window.SigmaPendingFeed = {parseCsv, dateKey};
})();
