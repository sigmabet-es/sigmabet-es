/* Texto plano: los enlaces se pegan en Telegram sin depender de Markdown. */
(() => {
  const data=window.SigmaMonthlyData, art=window.SigmaMonthlyArt;
  const key=row=>[data.dateKey(row.fecha),row.partido,row.apuesta,row.cuotaOriginal ?? row.cuota,row.stake].map(v=>String(v??'').trim()).join('|');
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const telegramLink=value=>{
    const raw=String(value??'').trim();if(!raw)return '';
    try{
      const url=new URL(raw);
      if(url.protocol!=='https:' || url.hostname!=='t.me' || url.username || url.password || url.port) return null;
      if(!/^\/(?:c\/\d+\/\d+(?:\/\d+)?|(?:s\/)?[a-zA-Z][a-zA-Z0-9_]{3,}\/\d+(?:\/\d+)?)\/?$/.test(url.pathname))return null;
      return url.href;
    }catch{return null;}
  };
  const messages=(summary,links=new Map(),{provisional=false}={})=>{
    if(!summary || !summary.settled || summary.issues.length)return [];
    const label=art.monthLabel(summary.month),title=`📊 SIGMABET · ${label.toLocaleUpperCase('es-ES')}`;
    const intro=[title,provisional?'Balance provisional':'Balance del mes','',`Balance: ${art.signed(summary.balance)} u`,`Yield: ${summary.yield===null?'—':art.signed(summary.yield)+' %'}`,`${summary.settled} apuestas cerradas · ${summary.wins} ganadas · ${summary.losses} perdidas · ${summary.voids} anuladas`,summary.pending?`${summary.pending} pendientes, excluidas del balance.`:'', '', 'RESUMEN DE APUESTAS'].filter((line,i,all)=>line!=='' || all[i-1]!=='').join('\n');
    const blocks=summary.bets.map((row,index)=>{
      const state=data.status(row.resultado),labels={win:'✅ Ganada',loss:'❌ Perdida',void:'↩️ Anulada'};
      const profit=data.number(row.profit)??0;
      const annulled=/↩|anulad|void|push|nulo|cancelad/i.test(`${row.resultadoSelecciones||''} ${row.apuesta||''}`);
      const revisedOdd=data.number(row.cuotaNull);
      const odd=annulled && revisedOdd!==null && revisedOdd>=1?art.format(revisedOdd):clean(row.cuota).replace(/(\d)\.(?=\d)/g,'$1,');
      const details=[odd?`Cuota ${odd}`:'',clean(row.stake)?`Stake ${clean(row.stake)}${/u$/i.test(clean(row.stake))?'':' u'}`:''].filter(Boolean).join(' · ');
      const date=data.dateKey(row.fecha).slice(8)+'/'+data.dateKey(row.fecha).slice(5,7);
      const link=telegramLink(links.get(key(row))||'');
      return [`${index+1}. ${date} · ${clean(row.partido)||'Apuesta'}`,clean(row.apuesta),`${labels[state]} · ${art.signed(profit)} u`,details,link?`Ver apuesta: ${link}`:''].filter(Boolean).join('\n');
    });
    const footer='Registro completo: https://sigmabet.es/registro.html\n+18 · No hay apuestas seguras. Los resultados pasados no garantizan resultados futuros.';
    // Margen para títulos de continuación y recuentos, sin cortar un enlace.
    const limit=3700,parts=[];let current=intro;
    for(const block of [...blocks,footer]){
      // Una selección excepcionalmente larga también se divide sin perder texto.
      const chunks=[];let rest=block;
      while(rest.length>limit){let cut=rest.lastIndexOf('\n',limit);if(cut<limit/2)cut=rest.lastIndexOf(' ',limit);if(cut<1)cut=limit; if(/[\uD800-\uDBFF]/.test(rest[cut-1]))cut--;chunks.push(rest.slice(0,cut));rest=rest.slice(cut).trimStart();}
      if(rest)chunks.push(rest);
      for(const chunk of chunks){if(current.length+chunk.length+2>limit){parts.push(current);current=chunk;}else current+='\n\n'+chunk;}
    }
    if(current)parts.push(current);
    return parts.map((part,index)=>parts.length>1?`${index?title+'\n':''}Parte ${index+1}/${parts.length}\n\n${part}`:part);
  };
  window.SigmaMonthlyTelegramText={key,telegramLink,messages};
  const root=document.querySelector('[data-telegram-summary]');if(!root)return;
  const $=selector=>root.querySelector(selector),links=new Map();let selected=null,options={},parts=[],page=0;
  const show=()=>{
    $('[data-telegram-text]').value=parts[page]||'';
    $('[data-telegram-count]').textContent=`${(parts[page]||'').length} caracteres`;
    $('[data-telegram-page]').textContent=`${parts.length?page+1:0} / ${parts.length}`;
    $('[data-telegram-prev]').disabled=page<=0;
    $('[data-telegram-next]').disabled=page>=parts.length-1;
    $('[data-copy-telegram]').disabled=!parts.length || !!root.querySelector('[aria-invalid="true"]');
    $('[data-copy-telegram]').textContent=parts.length>1?'Copiar esta parte':'Copiar texto';
  };
  const generate=()=>{
    parts=messages(selected,links,options);page=Math.min(page,Math.max(0,parts.length-1));show();
    const invalid=root.querySelector('[aria-invalid="true"]');
    $('[data-telegram-status]').textContent=invalid?'Revisa los enlaces señalados. Usa el enlace a un mensaje concreto de Telegram.':parts.length?`${parts.length===1?'Texto listo para copiar.':`Resumen dividido en ${parts.length} partes.`} Los enlaces vacíos se omiten.`:'Selecciona un mes con apuestas cerradas y datos válidos.';
  };
  window.SigmaMonthlyTelegram={update(summary,settings={}){
    selected=summary;options=settings;page=0;
    const container=$('[data-telegram-bets]');container.replaceChildren();
    if(!summary){const p=document.createElement('p');p.className='muted';p.textContent='Selecciona un mes con apuestas cerradas.';container.append(p);generate();return;}
    summary.bets.forEach((row,index)=>{
      const wrapper=document.createElement('div');wrapper.className='telegram-bet';
      const title=document.createElement('strong');title.textContent=`${index+1}. ${data.dateKey(row.fecha).slice(8)}/${data.dateKey(row.fecha).slice(5,7)} · ${clean(row.partido)||'Apuesta'}`;
      const pick=document.createElement('p');pick.textContent=clean(row.apuesta);pick.className='muted small';
      const label=document.createElement('label');label.textContent='Enlace al mensaje de Telegram';
      const input=document.createElement('input');input.type='url';input.placeholder='https://t.me/SigmaBetES/123';input.maxLength=500;input.value=links.get(key(row))||'';
      const hint=document.createElement('small');hint.className='telegram-link-error';hint.textContent='Usa https://t.me/canal/número o el enlace de un mensaje privado.';hint.hidden=true;
      const validate=()=>{const invalid=telegramLink(input.value)===null;input.setAttribute('aria-invalid',String(invalid));input.setCustomValidity(invalid?'Introduce el enlace a un mensaje de Telegram.':'');hint.hidden=!invalid;};
      input.addEventListener('input',()=>{links.set(key(row),input.value);validate();generate();});validate();
      label.append(input);wrapper.append(title,pick,label,hint);container.append(wrapper);
    });
    generate();
  }};
  $('[data-telegram-prev]').addEventListener('click',()=>{if(page>0){page--;show();}});
  $('[data-telegram-next]').addEventListener('click',()=>{if(page<parts.length-1){page++;show();}});
  $('[data-copy-telegram]').addEventListener('click',async()=>{
    const text=parts[page];if(!text || root.querySelector('[aria-invalid="true"]'))return;
    try{await navigator.clipboard.writeText(text);$('[data-telegram-status]').textContent=`${parts.length>1?`Parte ${page+1} copiada.`:'Texto copiado.'} Listo para pegar en Telegram.`;}
    catch{const textarea=$('[data-telegram-text]');textarea.focus();textarea.select();$('[data-telegram-status]').textContent='El navegador no permitió copiar. Texto seleccionado: pulsa ⌘C o Ctrl+C.';}
  });
})();
