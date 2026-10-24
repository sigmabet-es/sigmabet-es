const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const feedScope = {window: {}};
vm.runInNewContext(fs.readFileSync('assets/js/admin-picks-data.js', 'utf8'), feedScope);
const {parseCsv, dateKey} = feedScope.window.SigmaPendingFeed;
const rows = parseCsv('Fecha,Competición,Partido,Apuesta,Cuota,EV Estimado,Stake,Resultado,Hora\n24/10/2026,LaLiga,"Local, CF vs Visitante","Más de 1,5 goles\nLocal recibe tarjeta",1.80,5.2%,1u,Pendiente,18:30\n24/10/2026,LaLiga,Otro encuentro,Victoria,1.70,4%,1u,Ganado,20:00\n');
assert.equal(rows.length, 1); assert.equal(rows[0].match, 'Local, CF vs Visitante'); assert.match(rows[0].pick, /\n/); assert.equal(rows[0].valorSigma, '5.2%'); assert.equal(rows[0].time, '18:30'); assert.equal(dateKey(rows[0].date), '2026-10-24');
assert.equal(parseCsv('Fecha;Competición;Partido;Apuesta;Resultado\n24/10/2026;LaLiga;A vs B;Empate;Pendiente')[0].match, 'A vs B');
const makeContext = () => ({font: '', measureText(value) {const size = Number(this.font.match(/(\d+)px/)?.[1] || 16); return {width: String(value).length * size * .55};}, fillText() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillRect() {}, moveTo() {}, lineTo() {}, arc() {}, save() {}, restore() {}, translate() {}, scale() {}, createRadialGradient() {return {addColorStop() {}};}});
const artScope = {window: {}, document: {fonts: {ready: Promise.resolve()}, createElement() {return {width: 0, height: 0, getContext: makeContext};}}};
vm.runInNewContext(fs.readFileSync('assets/js/daily-art.js', 'utf8'), artScope);
const art = artScope.window.SigmaDailyArt;
const settings = {date: '2026-10-24', title: 'Recomendaciones del día', showOdds: true, showSigma: true, showStake: true};
const picks = Array.from({length: 12}, (_, i) => ({match: `Equipo local ${i} vs Equipo visitante`, competition: 'Competición', pick: 'Más de 1,5 goles\nAmbos equipos reciben tarjeta', odd: '1.80', valorSigma: '5.2%', stake: '1u'}));
(async () => {
  for (const format of Object.keys(art.formats)) {
    const data = {...settings, format};const ctx = makeContext();const layout = art.prepare(ctx, data, picks);
    assert(layout.pages.length > 1); assert.equal(layout.pages.flat().length, picks.length);
    for (const page of layout.pages) {
      assert(layout.listTop + page.reduce((sum, row) => sum + row.height, 0) + (page.length - 1) * 14 <= art.formats[format][1] - 158);
      assert(page.every(row => row.metrics.length === 3));
    }
    const pages = await art.render(data, picks);
    assert.equal(pages.length, layout.pages.length); assert(pages.every(page => page.width === 1080 && page.height === art.formats[format][1]));
    console.log(`${format}: ${pages.length} páginas, recomendaciones completas y pie sin solapamientos.`);
  }
  const noMetrics = art.prepare(makeContext(), {...settings, format: 'portrait', showOdds: false, showSigma: false, showStake: false}, picks);
  assert(noMetrics.pages.flat().every(row => row.metrics.length === 0));
  assert.throws(() => art.prepare(makeContext(), {...settings, format: 'square'}, [{...picks[0], pick: 'Texto muy largo '.repeat(1000)}]), /demasiado larga/);
  console.log('CSV con comillas, saltos y separadores; solo pendientes; fechas y métricas opcionales correctos.');
})().catch(error => {console.error(error);process.exitCode = 1;});
