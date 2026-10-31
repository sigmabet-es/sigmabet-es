const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const main=fs.readFileSync('assets/js/main.js','utf8'),api=fs.readFileSync('api/registro.js','utf8');
function adjustment(source){const a=source.indexOf('const applyVoidAdjustment =');const b=source.indexOf('\n};',a)+3;const scope={};vm.createContext(scope);vm.runInContext(source.slice(a,b)+';globalThis.apply=applyVoidAdjustment',scope);return scope.apply;}
for(const source of [main,api]){
 const apply=adjustment(source);const row={cuota:'1,47',cuotaNull:'1,16',resultadoSelecciones:'✅ + ↩️',notas:'Cuota tras la anulación: 9,99',resultado:'Ganado',profit:'0,16',stake:'1'};
 for(const cuotaNull of ['1,16','1.16',' 1,16 ']){
  const result=apply({...row,cuotaNull});assert.equal(Number(result.cuota.replace(',','.')),1.16);assert.equal(result.cuotaOriginal,'1,47');assert.equal(result.profit,'0,16');assert.equal(result.resultado,'Ganado');assert.equal(apply(result).cuotaOriginal,'1,47');
 }
 for(const cuotaNull of ['',null,'0,16','Cuota 1,16','NaN','-1']) assert.equal(apply({...row,cuotaNull}).cuota,'1,47');
 assert.equal(apply({...row,resultadoSelecciones:'✅ + ✅'}).cuota,'1,47');
 const oldCache={...row,cuota:'9,99',cuotaOriginal:'1,47',cuotaAjustada:true,cuotaNull:''};
 const reset=apply(oldCache);assert.equal(reset.cuota,'1,47');assert.equal(reset.cuotaAjustada,undefined);
}
for(const [name,end,normalize,text,parts] of [['selectionStatus','const sharePickText','normalize','displayText','pickParts'],['homeSelectionStatus','const dateInHomeRange','normalizeHome','textHome','homePickParts']]){
 const a=main.indexOf('  const '+name+' ='),b=main.indexOf('  '+end,a);const scope={};scope[normalize]=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();scope[text]=(v,f='')=>String(v||f).trim();scope[parts]=v=>String(v||'').split(/\s+\+\s+|\r?\n+/).map(s=>s.trim()).filter(Boolean);vm.createContext(scope);const statusParts=name==='selectionStatus'?'selectionParts':'homeSelectionParts';vm.runInContext(main.slice(a,b)+`;globalThis.status=${name};globalThis.parts=${statusParts};`,scope);
 assert.equal(scope.status('↩️'),'Anulada');assert.equal(scope.status('↩'),'Anulada');assert.equal(scope.status('Anulada'),'Anulada');assert.equal(scope.status('✅'),'Ganado');
 for(const statuses of ['✅ + ↩️','✅↩️','✅\n↩️']){const parts=scope.parts('Primera selección + Segunda selección',statuses);assert.equal(parts[0].status,'Ganado');assert.equal(parts[1].status,'Anulada');assert.equal(parts[1].text,'Segunda selección');}
 const inline=scope.parts('✅ Primera selección + ↩️ Segunda selección','');assert.equal(inline[1].text,'Segunda selección');assert.equal(inline[1].status,'Anulada');
}
const markupScope={};vm.createContext(markupScope);const markupStart=main.indexOf('const adjustedOddMarkup =');const markupEnd=main.indexOf('\n\n',markupStart);vm.runInContext(main.slice(markupStart,markupEnd)+';globalThis.markup=adjustedOddMarkup;',markupScope);assert.match(markupScope.markup({cuotaOriginal:'1.47',cuota:'1.16',cuotaAjustada:true},String,String),/<del>1,47<\/del>.*→.*1,16/);
console.log('Anulaciones: ↩️ reconocido, Cuota Null aplicada, Notas ignoradas y original conservada; sin cambiar beneficio ni estado global. Portada y registro consistentes.');
