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
const drawn=[],strokes=[],clips=[];
const context=new Proxy({stroke(){strokes.push(this.strokeStyle);},rect(x,y,w,h){clips.push({x,y,w,h});},measureText(text){return {width:String(text).length*65};},fillText(text){drawn.push(String(text));},createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get(target,key){return key in target?target[key]:()=>{};}});
const artScope={window:{},document:{fonts:{ready:Promise.resolve()},createElement(){return {getContext(){return context;}};}}};vm.runInNewContext(fs.readFileSync('assets/js/monthly-balance-art.js','utf8'),artScope);
const telegramScope={window:{SigmaMonthlyData:scope.window.SigmaMonthlyData,SigmaMonthlyArt:artScope.window.SigmaMonthlyArt},URL,document:{querySelector(){return null;}}};
vm.runInNewContext(fs.readFileSync('assets/js/monthly-telegram.js','utf8'),telegramScope);
const telegram=telegramScope.window.SigmaMonthlyTelegramText;
const links=new Map([[telegram.key(oct.bets[0]),'https://t.me/SigmaBetES/123']]);
const post=telegram.messages(oct,links,{provisional:true}).join('\n');
assert(telegram.messages({...oct,bets:[{...oct.bets[0],resultadoSelecciones:'✅↩️',cuotaNull:'1,16'}]}).join('\n').includes('Cuota 1,16'));
assert(post.includes('Balance: -0,68 u'));assert(post.includes('Balance provisional'));assert(post.includes('https://t.me/SigmaBetES/123'));assert(post.includes('✅ Ganada'));assert(post.includes('❌ Perdida'));assert(post.includes('↩️ Anulada'));assert(!post.includes('G vs H'));assert(!post.includes('undefined'));assert(!post.includes('null'));assert.equal(telegram.messages(null).length,0);
for(const link of ['https://t.me/SigmaBetES/123','https://t.me/c/123456/45','https://t.me/s/SigmaBetES/123','https://t.me/channel/123/456?single'])assert(telegram.telegramLink(link));
for(const link of ['https://evil.com/SigmaBetES/123','javascript:alert(1)','https://t.me/SigmaBetES','http://t.me/SigmaBetES/123','https://t.me.evil.com/canal/123','https://user:pass@t.me/canal/123'])assert.equal(telegram.telegramLink(link),null);
const many=Array.from({length:100},(_,i)=>({...oct.bets[0],partido:`Equipo ${i} vs Rival`,apuesta:'Selección detallada '.repeat(15)}));
const large={...oct,bets:many,settled:100};
const parts=telegram.messages(large);assert(parts.length>1);assert(parts.every(part=>part.length<=4096));for(let i=0;i<100;i++)assert(parts.some(part=>part.includes(`Equipo ${i} vs Rival`)));
const long=telegram.messages({...oct,bets:[{...oct.bets[0],apuesta:'Selección '.repeat(2000)}],settled:1});assert(long.length>1);assert(long.every(part=>part.length<=4096));
console.log('Telegram: resultados y enlaces correctos, pendientes excluidas, enlaces ajenos rechazados y resúmenes largos divididos sin perder apuestas.');
(async()=>{
 for(const balance of [-.68,0,14.5]){
  const canvas=await artScope.window.SigmaMonthlyArt.render({...oct,balance},{provisional:true});assert.equal(canvas.width,1080);assert.equal(canvas.height,1080);
 }
 for(const points of [[0,-2,3,-1],[0,2,-3,1],[0,0,0]]){
  strokes.length=0;clips.length=0;
  await artScope.window.SigmaMonthlyArt.render({...oct,points,balance:points.at(-1)});
  assert(strokes.includes('#00ff7f'),'El tramo positivo debe pintarse en verde aunque el mes termine en negativo.');
  assert(strokes.includes('#ff717d'),'El tramo negativo debe pintarse en rojo aunque el mes termine en positivo.');
  assert.equal(clips.length,2);
  assert.equal(clips[0].y+clips[0].h,clips[1].y,'Ambos recortes deben coincidir exactamente en el cero.');
 }
 assert(drawn.some(text=>text.includes('PROVISIONAL')));assert(drawn.includes('-0,68 u'));assert(drawn.includes('0,00 u'));assert(drawn.includes('+14,50 u'));assert(drawn.some(text=>text.includes('pendientes excluidas')));
 console.log('Balance mensual: meses y años aislados, pendientes excluidas, liquidaciones originales, nulos, duplicados, datos incompletos y PNG 1080 × 1080 correctos.');
})().catch(error=>{console.error(error);process.exitCode=1;});
