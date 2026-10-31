(() => {
  const GREEN = '#00ff7f', WHITE = '#f2f5f3', MUTED = '#91a198';
  const format = (value, decimals = 2) => new Intl.NumberFormat('es-ES', {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(value);
  const signed = value => `${value > 0 ? '+' : ''}${format(value)}`;
  const monthLabel = month => new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
  const render = async (data, {provisional = false} = {}) => {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite generar imágenes.');
    const color = data.balance > 0 ? GREEN : data.balance < 0 ? '#ff717d' : WHITE;
    const write = (text,x,y,size=20,weight=500,fill=WHITE) => {ctx.font = `${weight} ${size}px Manrope, system-ui, sans-serif`; ctx.fillStyle=fill; ctx.textBaseline='top'; ctx.fillText(String(text),x,y);};
    ctx.fillStyle='#090d0b'; ctx.fillRect(0,0,1080,1080);
    const glow = ctx.createRadialGradient(1020,420,0,1020,420,700); glow.addColorStop(0,data.balance < 0 ? '#ff617a16' : '#00ff7f18');glow.addColorStop(1,'#090d0b00');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1080);
    ctx.strokeStyle='#ffffff06'; ctx.lineWidth=1;
    for(let n=0;n<=1080;n+=48){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,1080);ctx.moveTo(0,n);ctx.lineTo(1080,n);ctx.stroke();}
    write('σ',64,49,60,800,GREEN);write('SigmaBet',119,63,29,750);write('REGISTRO PÚBLICO',744,73,15,600,MUTED);
    ctx.fillStyle='#34453b';ctx.fillRect(64,131,952,1);
    write(provisional ? 'BALANCE MENSUAL · PROVISIONAL' : 'BALANCE MENSUAL',64,170,16,650,MUTED);
    const label=monthLabel(data.month);write(label.charAt(0).toUpperCase()+label.slice(1),64,203,44,700);
    const value=signed(data.balance);let size=132;
    ctx.font=`750 ${size}px Manrope, system-ui, sans-serif`;
    while(ctx.measureText(value+' u').width>950 && size>54){size-=2;ctx.font=`750 ${size}px Manrope, system-ui, sans-serif`;}
    write(`${value} u`,57,280,size,750,color);
    write('Resultado neto de apuestas cerradas',66,430,19,500,MUTED);
    // Evolución del mes, anclada en cero y sin reutilizar el acumulado histórico.
    const x=66,y=500,w=948,h=210;
    const low=Math.min(0,...data.points),high=Math.max(0,...data.points),span=high-low || 1;
    const py=value => y+18+(high-value)/span*(h-36);
    const zeroY=py(0);
    ctx.setLineDash([5,8]);ctx.strokeStyle='#a0b2a060';ctx.beginPath();ctx.moveTo(x,zeroY);ctx.lineTo(x+w,zeroY);ctx.stroke();ctx.setLineDash([]);
    write('0',38,zeroY-8,14,600,MUTED);
    const pts=data.points.map((value,i)=>[x+i/Math.max(1,data.points.length-1)*w,py(value)]);
    if(pts.length>1){
      // Recortar en el cero mantiene exacto el cambio de color, incluso entre apuestas.
      for (const positive of [true,false]) {
        const tone=positive?GREEN:'#ff717d';
        const top=positive?y:zeroY, bottom=positive?zeroY:y+h;
        if(bottom<=top)continue;
        ctx.save();ctx.beginPath();ctx.rect(x-8,top,w+16,bottom-top);ctx.clip();
        const area=ctx.createLinearGradient(0,zeroY,0,positive?y:y+h);
        area.addColorStop(0,tone+'00');area.addColorStop(1,tone+'32');
        ctx.beginPath();ctx.moveTo(pts[0][0],zeroY);pts.forEach(([a,b])=>ctx.lineTo(a,b));ctx.lineTo(pts.at(-1)[0],zeroY);ctx.closePath();ctx.fillStyle=area;ctx.fill();
        ctx.beginPath();pts.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.strokeStyle=tone;ctx.lineWidth=4;ctx.lineJoin='round';ctx.stroke();
        ctx.restore();
      }
      // Los tramos exactamente a cero permanecen neutros.
      ctx.beginPath();
      pts.forEach(([a,b],i)=>{if(i && data.points[i]===0 && data.points[i-1]===0){ctx.moveTo(...pts[i-1]);ctx.lineTo(a,b);}});
      ctx.strokeStyle=MUTED;ctx.lineWidth=4;ctx.stroke();
      const last=pts.at(-1),lastValue=data.points.at(-1);ctx.beginPath();ctx.arc(last[0],last[1],6,0,Math.PI*2);ctx.fillStyle=lastValue>0?GREEN:lastValue<0?'#ff717d':WHITE;ctx.fill();
    }
    write('Inicio del mes · 0 u',66,729,15,500,MUTED);write(`${data.settled} apuestas cerradas`,766,729,15,500,MUTED);
    ctx.fillStyle='#34453b';ctx.fillRect(64,781,952,1);
    const metrics=[['YIELD',data.yield===null?'—':`${signed(data.yield)} %`],['GANADAS',data.wins],['PERDIDAS',data.losses],['ANULADAS',data.voids]];
    metrics.forEach(([label,value],i)=>{const left=66+i*244;write(label,left,816,14,650,MUTED);write(value,left,848,34,700,i===0?color:WHITE);});
    write(data.pending?`${data.pending} pendientes excluidas del balance.`:'Liquidaciones del registro · Sin apuestas pendientes.',66,917,16,500,MUTED);
    write('sigmabet.es',66,985,21,750);write('+18 · No hay apuestas seguras.',600,989,17,500,MUTED);
    write('Los resultados pasados no garantizan resultados futuros.',66,1027,14,500,MUTED);
    return canvas;
  };
  window.SigmaMonthlyArt={render,format,signed,monthLabel};
})();
