/* Imágenes de redes: la vista previa y la descarga usan el mismo canvas. */
(() => {
  const FONT = 'Manrope, Inter, system-ui, sans-serif';
  const GREEN = '#00FF7F', WHITE = '#F2F5F3', MUTED = '#929F97';
  const formats = {portrait: [1080, 1350], square: [1080, 1080], story: [1080, 1920]};
  const text = value => String(value ?? '').trim();
  const font = (ctx, size, weight = 600) => { ctx.font = `${weight} ${size}px ${FONT}`; };
  const write = (ctx, value, x, y, size, weight = 600, color = WHITE, align = 'left') => {
    font(ctx, size, weight); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(String(value), x, y);
  };
  const wrap = (ctx, value, width) => {
    const lines = []; let line = '';
    for (const paragraph of text(value).split(/\r?\n/)) {
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (ctx.measureText(word).width > width) {
          if (line) { lines.push(line); line = ''; }
          for (const character of word) {
            if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
            line += character;
          }
        } else if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = word; }
        else line = line ? line + ' ' + word : word;
      }
      if (line) { lines.push(line); line = ''; }
    }
    return lines;
  };
  const box = (ctx, x, y, width, height, radius, fill, stroke) => {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
    if (fill) {ctx.fillStyle = fill; ctx.fill();}
    if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();}
  };
  const decimal = value => text(value).replace(/(\d)\.(?=\d)/g, '$1,');
  const dateLabel = value => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric'}).toUpperCase() : 'SELECCIÓN DIARIA';
  };
  const metricsFor = (pick, settings) => {
    const items = [];
    if (settings.showOdds && text(pick.odd)) items.push(['CUOTA', decimal(pick.odd)]);
    if (settings.showSigma && text(pick.valorSigma)) items.push(['VALOR SIGMA', decimal(pick.valorSigma)]);
    if (settings.showStake && text(pick.stake)) items.push(['STAKE', decimal(pick.stake)]);
    return items;
  };
  const prepare = (ctx, settings, picks) => {
    const [, height] = formats[settings.format] || formats.portrait;
    font(ctx, 64, 800);
    const title = wrap(ctx, settings.title || 'Recomendaciones del día', 920);
    const listTop = 180 + title.length * 78 + 56;
    const capacity = height - 158 - listTop;
    const rows = picks.map((pick, index) => {
      font(ctx, 16, 500); const league = wrap(ctx, pick.competition, 700);
      font(ctx, 28, 700); const match = wrap(ctx, pick.match, 796);
      font(ctx, 27, 600); const selection = wrap(ctx, pick.pick, 796);
      const metrics = metricsFor(pick, settings);
      const rowHeight = 50 + league.length * 22 + match.length * 36 + 18 + selection.length * 36 + (metrics.length ? 62 : 12);
      return {pick, index, league, match, selection, metrics, height: Math.max(178, rowHeight)};
    });
    const pages = []; let page = [], used = 0;
    for (const row of rows) {
      if (row.height > capacity) throw new Error('Una recomendación es demasiado larga para este formato. Acorta su texto o elige Historia.');
      if (page.length && used + row.height + 14 > capacity) { pages.push(page); page = []; used = 0; }
      page.push(row); used += row.height + (page.length > 1 ? 14 : 0);
    }
    if (page.length || !pages.length) pages.push(page);
    return {pages, title, listTop};
  };
  const diamond = (ctx, x, y) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(.9, .9); ctx.strokeStyle = '#9CE2FF';ctx.lineWidth = 1.8;ctx.lineJoin = 'round';
    for (const points of [[[7,4],[17,4],[22,10],[12,21],[2,10],[7,4]],[[7,4],[12,21],[17,4]],[[2,10],[22,10]],[[7,4],[12,10],[17,4]]]) {
      ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.stroke();
    }
    ctx.restore();
  };
  const draw = (ctx, settings, layout, pageIndex, height) => {
    ctx.fillStyle = '#080B09';ctx.fillRect(0, 0, 1080, height);
    ctx.strokeStyle = '#00FF7F08';ctx.lineWidth = 1;ctx.beginPath();
    for(let x=0;x<=1080;x+=60){ctx.moveTo(x,0);ctx.lineTo(x,height);}
    for(let y=0;y<=height;y+=60){ctx.moveTo(0,y);ctx.lineTo(1080,y);}ctx.stroke();
    const glow=ctx.createRadialGradient(1040,height,0,1040,height,780);glow.addColorStop(0,'#00FF7F0E');glow.addColorStop(1,'#00FF7F00');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,height);
    write(ctx, 'σ', 62, 59, 56, 800, GREEN);write(ctx, 'SigmaBet', 115, 72, 34, 800);
    write(ctx, dateLabel(settings.date), 1016, 84, 17, 600, '#B0BAB4', 'right');
    write(ctx, 'LA SELECCIÓN SIGMA', 64, 147, 14, 700, GREEN);
    layout.title.forEach((line,i)=>write(ctx,line,60,180+i*78,64,800));
    const page=layout.pages[pageIndex];
    if (!page.length) {
      box(ctx,64,layout.listTop,952,210,18,'#101612','#26342B');
      write(ctx,'Tu próxima publicación empieza aquí.',100,layout.listTop+60,28,650);
      write(ctx,'Añade un encuentro y su recomendación en el editor.',100,layout.listTop+108,20,500,MUTED);
    }
    let top=layout.listTop;
    for(const row of page){
      const {pick}=row;
      box(ctx,64,top,952,row.height,18,'#101612','#2A352E');
      write(ctx,String(row.index+1).padStart(2,'0'),88,top+25,16,650,GREEN);
      let y=top+24;
      row.league.forEach(line=>{write(ctx,line,140,y,16,500,MUTED);y+=22;});
      if(text(pick.time))write(ctx,text(pick.time),984,top+25,17,650,'#CDD7D0','right');
      row.match.forEach(line=>{write(ctx,line,140,y+5,28,700);y+=36;});
      y+=18;
      ctx.fillStyle=GREEN;ctx.beginPath();ctx.arc(145,y+15,3,0,Math.PI*2);ctx.fill();
      row.selection.forEach(line=>{write(ctx,line,162,y,27,600,'#C7F5DB');y+=36;});
      if(row.metrics.length){
        y=top+row.height-48;
        let metricX=140;
        for(const [label,value] of row.metrics){
          font(ctx,12,650);const labelWidth=ctx.measureText(label).width;
          font(ctx,18,650);const valueWidth=ctx.measureText(value).width;
          const isSigma=label==='VALOR SIGMA';
          const metricWidth=labelWidth+valueWidth+(isSigma?52:28);
          if(metricX+metricWidth>984)throw new Error('Un valor es demasiado largo. Revisa cuota, stake o Valor Sigma.');
          write(ctx,label,metricX,y+5,12,650,MUTED);
          if(isSigma){diamond(ctx,metricX+labelWidth+12,y);write(ctx,value,metricX+labelWidth+38,y+1,18,650,'#9CE2FF');}
          else write(ctx,value,metricX+labelWidth+12,y+1,18,650);
          metricX+=metricWidth+26;
        }
      }
      top+=row.height+14;
    }
    const footer=height-122;
    ctx.beginPath();ctx.moveTo(64,footer);ctx.lineTo(1016,footer);ctx.strokeStyle='#FFFFFF1A';ctx.stroke();
    write(ctx,'Más datos. Menos fe.',64,footer+24,22,650);
    write(ctx,'@SigmaBetES · sigmabet.es',1016,footer+26,18,650,GREEN,'right');
    write(ctx,'+18 · Juego responsable · No hay apuestas seguras',64,footer+66,13,500,MUTED);
    if(layout.pages.length>1)write(ctx,`${pageIndex+1} / ${layout.pages.length}`,1016,footer+65,14,650,MUTED,'right');
  };
  const render = async (settings, picks) => {
    await document.fonts?.ready;
    const canvas=document.createElement('canvas');const [width,height]=formats[settings.format]||formats.portrait;canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');const layout=prepare(ctx,settings,picks);
    const pages=layout.pages.map((_,index)=>{const page=document.createElement('canvas');page.width=width;page.height=height;draw(page.getContext('2d'),settings,layout,index,height);return page;});
    return pages;
  };
  window.SigmaDailyArt={render,formats,prepare};
})();
