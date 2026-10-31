(() => {
  const root=document.querySelector('[data-monthly-studio]');if(!root)return;
  const $=selector=>root.querySelector(selector), data=window.SigmaMonthlyData, art=window.SigmaMonthlyArt;
  const year=$('[data-year]'),month=$('[data-month]'),download=$('[data-download]'),status=$('[data-art-status]'),feed=$('[data-feed-status]'),preview=$('[data-preview]');
  let rows=[],available=[],canvas=null,revision=0,loadRevision=0,stale=false;
  const currentMonth=()=>{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Atlantic/Canary',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;
  };
  const clear=message=>{revision++;canvas=null;download.disabled=true;preview.replaceChildren();const p=document.createElement('p');p.textContent=message;preview.append(p);status.textContent=message;root.querySelectorAll('[data-summary]').forEach(el=>{el.textContent='—';el.className='';});};
  const render=async()=>{
    const version=++revision;canvas=null;download.disabled=true;
    if(!month.value){clear('No hay meses disponibles en el registro.');return;}
    try{
      const summary=data.summarize(rows,month.value);
      const provisional=summary.month>=currentMonth() || summary.pending>0 || stale;
      for(const key of ['balance','yield','settled','pending']){
        const el=$(`[data-summary="${key}"]`),value=summary[key];
        el.textContent=key==='balance'?`${art.signed(value)} u`:key==='yield'?(value===null?'—':`${art.signed(value)} %`):value;
        el.className=['balance','yield'].includes(key)?(value>0?'positive':value<0?'negative':''):'';
      }
      $('[data-month-note]').textContent=summary.issues.length?summary.issues.join(' '):!summary.settled?'Este mes todavía no tiene apuestas cerradas.':`${provisional?'Balance provisional.':'Mes cerrado.'} ${summary.pending?'Las apuestas pendientes quedan fuera del balance.':''} ${!summary.stakeComplete?'Falta stake válido en alguna apuesta: el yield no se mostrará.':''}`;
      if(summary.issues.length){clear('Corrige los datos señalados antes de generar la imagen.');return;}
      if(!summary.settled){clear('Este mes todavía no tiene apuestas cerradas.');return;}
      status.textContent='Generando imagen…';
      const next=await art.render(summary,{provisional});
      if(version!==revision)return;
      canvas=next;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Balance de ${art.monthLabel(summary.month)}: ${art.signed(summary.balance)} unidades. ${summary.wins} ganadas, ${summary.losses} perdidas y ${summary.voids} anuladas.`);
      preview.replaceChildren(canvas);download.disabled=false;status.textContent=provisional?'Imagen lista · Balance provisional.':'Imagen lista para descargar.';
    }catch(error){if(version===revision)clear(error.message || 'No se pudo generar la imagen.');}
  };
  const updateMonths=preferred=>{
    const keys=available.filter(key=>key.startsWith(year.value+'-'));
    month.replaceChildren(...keys.map(key=>new Option(new Intl.DateTimeFormat('es-ES',{month:'long',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z')),key)));
    if(keys.includes(preferred))month.value=preferred;
    month.disabled=!keys.length;render();
  };
  const populate=(nextRows,message,isStale=false)=>{
    const preferred=month.value;rows=nextRows;stale=isStale;available=data.months(rows);
    const years=[...new Set(available.map(key=>key.slice(0,4)))];year.replaceChildren(...years.map(value=>new Option(value,value)));year.disabled=!years.length;
    if(preferred && available.includes(preferred))year.value=preferred.slice(0,4);
    feed.textContent=message;updateMonths(preferred);
  };
  const fetchData=async(url,json=false)=>{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('No se pudo cargar el registro.');
    return json?response.json():response.text();
  };
  const load=async()=>{
    const version=++loadRevision;clear('Cargando el registro…');year.disabled=month.disabled=true;$('[data-reload]').disabled=true;feed.textContent='Actualizando datos…';
    try{
      let nextRows,message,isStale=false;
      try{
        const result=await fetchData('/api/registro',true);
        if(!Array.isArray(result.rows) || result.source==='error')throw new Error('Respuesta no válida');
        nextRows=result.rows;isStale=result.source==='stale';message=isStale?'Se usa la última copia disponible del registro. El balance será provisional.':'Registro actualizado desde la web.';
      }catch{
        nextRows=data.parseCsv(await fetchData(root.dataset.sheetUrl));message='Registro actualizado desde la hoja de apuestas.';
      }
      if(version!==loadRevision)return;populate(nextRows,message,isStale);
    }catch{
      if(version!==loadRevision)return;rows=[];available=[];year.replaceChildren(new Option('Sin datos',''));month.replaceChildren(new Option('Sin datos',''));clear('No se pudo cargar el registro. Puedes importar el CSV.');feed.textContent='Conexión no disponible. Importa el CSV de la hoja de apuestas.';
    }finally{if(version===loadRevision)$('[data-reload]').disabled=false;}
  };
  year.addEventListener('change',()=>updateMonths());month.addEventListener('change',render);$('[data-reload]').addEventListener('click',load);
  $('[data-csv-file]').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const version=++loadRevision;rows=[];available=[];year.disabled=month.disabled=true;clear('Importando CSV…');$('[data-reload]').disabled=false;
    try{const imported=data.parseCsv(await file.text());if(version!==loadRevision)return;populate(imported,`CSV importado: ${file.name}. Comprueba que sea la versión más reciente.`);}
    catch(error){if(version===loadRevision){clear(error.message);feed.textContent='No se pudo importar el archivo. Revisa que sea el CSV de apuestas.';}}
    finally{event.target.value='';}
  });
  download.addEventListener('click',async()=>{
    if(!canvas)return;const target=canvas,selectedMonth=month.value;download.disabled=true;
    try{
      const blob=await new Promise(resolve=>target.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG vacío');
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`sigmabet-balance-${selectedMonth}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      if(canvas===target)status.textContent='Imagen descargada.';
    }catch{if(canvas===target)status.textContent='No se pudo descargar. Vuelve a intentarlo.';}
    finally{download.disabled=!canvas;}
  });
  load();
})();
