const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope={window:{}};vm.runInNewContext(fs.readFileSync('assets/js/monthly-balance-data.js','utf8'),scope);
const {parseCsv,dateKey,months,summarize}=scope.window.SigmaMonthlyData;
const csv='Fecha;Partido;Apuesta;Cuota;Stake;Resultado;U / Profit;Cuota Null\n01/10/2026;A vs B;"Primera selección\nSegunda selección";1,47;2;Ganado;0,32;1,16\n02/10/2026;C vs D;Empate;2;1;Perdido;-1;\n03/10/2026;E vs F;Victoria;2;1;Nulo;0;\n04/10/2026;G vs H;Victoria;2;3;Pendiente;99;\n01/09/2026;I vs J;Victoria;2;10;Ganado;10;\n01/10/2025;K vs L;Victoria;2;10;Ganado;10;';
const rows=parseCsv(csv),oct=summarize(rows,'2026-10');
assert.equal(rows.length,6);assert.match(rows[0].apuesta,/\n/);assert.equal(oct.settled,3);assert.equal(oct.wins,1);assert.equal(oct.losses,1);assert.equal(oct.voids,1);assert.equal(oct.pending,1);assert(Math.abs(oct.balance+.68)<1e-9);assert.equal(oct.yield,-17);assert.equal(oct.points[0],0);assert(Math.abs(oct.points.at(-1)+.68)<1e-9);assert.equal(oct.issues.length,0);
assert.equal(summarize([...rows,rows[0]],'2026-10').settled,3);
assert.equal(summarize(rows,'2026-09').balance,10);assert.equal(summarize(rows,'2025-10').balance,10);
assert.equal(Array.from(months(rows)).join(','),'2026-10,2026-09,2025-10');
assert.equal(dateKey('2026-02-30'),'');assert.equal(dateKey('29/02/2024'),'2024-02-29');assert.equal(dateKey('2026-10-01T00:00:00Z'),'2026-10-01');
assert.equal(summarize([{...rows[0],profit:''}],'2026-10').issues.length,1);
assert.equal(summarize([{...rows[0],resultado:'desconocido'}],'2026-10').issues.length,1);
assert.equal(summarize([{...rows[0],stake:''}],'2026-10').yield,null);
assert.equal(summarize([{...rows[0],resultado:'Anulada',profit:''}],'2026-10').balance,0);
assert.equal(summarize([{...rows[0],resultado:'Anulada',profit:'1'}],'2026-10').issues.length,1);
assert.equal(summarize([rows[3]],'2026-10').settled,0);assert.equal(summarize([rows[3]],'2026-10').balance,0);
assert.throws(()=>parseCsv('Fecha,Apuesta,Resultado\n01/10/2026,Prueba,Ganado'),/Faltan/);
assert.equal(parseCsv('\uFEFFFecha,Partido,Apuesta,Stake,Resultado,Profit\n01/10/2026,"Local, CF vs B",Victoria,1,Ganado,"1,15"')[0].profit,'1,15');
const drawn=[];
const context=new Proxy({measureText(text){return {width:String(text).length*65};},fillText(text){drawn.push(String(text));},createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get(target,key){return key in target?target[key]:()=>{};}});
const artScope={window:{},document:{fonts:{ready:Promise.resolve()},createElement(){return {getContext(){return context;}};}}};vm.runInNewContext(fs.readFileSync('assets/js/monthly-balance-art.js','utf8'),artScope);
(async()=>{
 for(const balance of [-.68,0,14.5]){
  const canvas=await artScope.window.SigmaMonthlyArt.render({...oct,balance},{provisional:true});assert.equal(canvas.width,1080);assert.equal(canvas.height,1080);
 }
 assert(drawn.some(text=>text.includes('PROVISIONAL')));assert(drawn.includes('-0,68 u'));assert(drawn.includes('0,00 u'));assert(drawn.includes('+14,50 u'));assert(drawn.some(text=>text.includes('pendientes excluidas')));
 console.log('Balance mensual: meses y años aislados, pendientes excluidas, liquidaciones originales, nulos, duplicados, datos incompletos y PNG 1080 × 1080 correctos.');
})().catch(error=>{console.error(error);process.exitCode=1;});
