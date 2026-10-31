/* El balance se suma desde las liquidaciones de la hoja; nunca desde las cuotas. */
(() => {
  const normalize = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const number = value => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const clean = String(value ?? '').trim().replace(/\s|u$/gi, '').replace(/−/g, '-').replace(',', '.');
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean) ? Number(clean) : null;
  };
  const dateKey = value => {
    const raw = String(value ?? '').trim();
    const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\b|T)/);
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\b|T)/);
    if (!slash && !iso) return '';
    const [y, m, d] = slash ? [+slash[3], +slash[2], +slash[1]] : [+iso[1], +iso[2], +iso[3]];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
      ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  };
  const status = value => {
    const raw = normalize(value);
    if (['ganado', 'ganada', 'verde', 'win', '✅'].includes(raw)) return 'win';
    if (['perdido', 'perdida', 'rojo', 'loss', '❌'].includes(raw)) return 'loss';
    if (['nulo', 'nula', 'anulado', 'anulada', 'void', 'push', 'cancelado', 'cancelada', '↩', '↩️'].includes(raw)) return 'void';
    if (['', 'pendiente', 'pending'].includes(raw)) return 'pending';
    return 'unknown';
  };
  const parseCsv = text => {
    // Detectar el separador fuera de comillas, incluso con cabeceras precedidas de notas.
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
    const header = lines.find(line => /fecha/i.test(line) && /apuesta|pick/i.test(line)) || '';
    const delimiter = header.includes(';') ? ';' : ',';
    const records = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && quoted && text[i + 1] === '"') {cell += '"'; i++;}
      else if (c === '"') quoted = !quoted;
      else if (c === delimiter && !quoted) {row.push(cell); cell = '';}
      else if (/[\r\n]/.test(c) && !quoted) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); records.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw new Error('El CSV tiene comillas sin cerrar. Exporta de nuevo la hoja de apuestas.');
    row.push(cell); records.push(row);
    const index = records.findIndex(row => row.some(c => normalize(c) === 'fecha') && row.some(c => ['apuesta', 'pick'].includes(normalize(c))));
    if (index < 0) throw new Error('No se encuentran las columnas Fecha y Apuesta.');
    const headers = records[index].map(normalize);
    const get = (row, ...names) => String(row[headers.findIndex(h => names.includes(h))] ?? '').trim();
    if (!headers.includes('resultado') || !headers.some(h => ['u / profit','u/profit','profit','unidades'].includes(h))) throw new Error('Faltan las columnas Resultado y/o U / Profit en el CSV.');
    return records.slice(index + 1).map(row => ({fecha: get(row,'fecha'), partido: get(row,'partido','evento'), cuota: get(row,'cuota','odd'), apuesta: get(row,'apuesta','pick'), resultado: get(row,'resultado'), profit: get(row,'u / profit','u/profit','profit','unidades'), stake: get(row,'stake')})).filter(row => row.apuesta && dateKey(row.fecha));
  };
  const uniqueRows = rows => {
    const seen = new Set();
    return rows.filter(row => {
      const key = [dateKey(row.fecha),row.partido,row.apuesta,row.cuota,row.stake].map(v => String(v ?? '').trim()).join('|');
      if (seen.has(key)) return false;
      seen.add(key);return true;
    });
  };
  const months = rows => [...new Set(rows.filter(row => row.apuesta && dateKey(row.fecha)).map(row => dateKey(row.fecha).slice(0,7)))].sort().reverse();
  const summarize = (rows, month) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Selecciona un mes válido.');
    const selected = uniqueRows(rows).filter(row => row.apuesta && dateKey(row.fecha).slice(0,7) === month);
    const settled = selected.filter(row => ['win','loss','void'].includes(status(row.resultado))).sort((a,b) => dateKey(a.fecha).localeCompare(dateKey(b.fecha)));
    const missing = settled.filter(row => number(row.profit) === null && status(row.resultado) !== 'void');
    const unknown = selected.filter(row => status(row.resultado) === 'unknown');
    const invalidVoids = settled.filter(row => status(row.resultado) === 'void' && number(row.profit) !== null && number(row.profit) !== 0);
    const issues = [];
    if (missing.length) issues.push(`${missing.length} apuestas cerradas sin unidades válidas.`);
    if (unknown.length) issues.push(`${unknown.length} apuestas con resultado no reconocido.`);
    if (invalidVoids.length) issues.push('Hay apuestas anuladas con una liquidación distinta de cero. Revisa la hoja.');
    let balance = 0;
    const points = [0, ...settled.map(row => {balance += number(row.profit) ?? 0; return balance;})];
    balance = Math.abs(balance) < .0000001 ? 0 : balance;
    const stakeComplete = settled.every(row => number(row.stake) !== null && number(row.stake) > 0);
    const stake = stakeComplete ? settled.reduce((sum,row) => sum + number(row.stake),0) : 0;
    const wins = settled.filter(row => status(row.resultado) === 'win').length;
    const losses = settled.filter(row => status(row.resultado) === 'loss').length;
    return {month, balance, points, settled: settled.length, wins, losses, voids: settled.length - wins - losses, pending: selected.filter(row => status(row.resultado) === 'pending').length, yield: stake ? balance / stake * 100 : null, hitRate: settled.length ? wins / settled.length * 100 : null, stakeComplete, issues};
  };
  window.SigmaMonthlyData = {parseCsv, dateKey, months, summarize};
})();
