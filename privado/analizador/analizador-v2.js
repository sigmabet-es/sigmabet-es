(function () {
  "use strict";
  const markets = [
    ["totalGoals", "Goles totales"], ["teamGoals", "Goles del equipo"], ["totalFirstHalfGoals", "Goles totales · 1ª mitad"],
    ["teamFirstHalfGoals", "Goles del equipo · 1ª mitad"], ["totalSecondHalfGoals", "Goles totales · 2ª mitad"],
    ["teamSecondHalfGoals", "Goles del equipo · 2ª mitad"], ["totalShots", "Remates totales"], ["teamShots", "Remates del equipo"],
    ["totalShotsOnTarget", "Remates a puerta totales"], ["teamShotsOnTarget", "Remates a puerta del equipo"],
    ["totalCorners", "Córners totales"], ["teamCorners", "Córners del equipo"], ["totalYellowCards", "Tarjetas amarillas totales"],
    ["teamYellowCards", "Tarjetas amarillas del equipo"], ["totalRedCards", "Tarjetas rojas totales"], ["teamRedCards", "Tarjetas rojas del equipo"],
    ["totalFouls", "Faltas totales"], ["teamFouls", "Faltas del equipo"]
  ];
  const state = { matches: [], fixtures: [], teams: new Map(), mode: "team", activeTeamId: null };
  const $ = (id) => document.getElementById(id);
  const toNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const pair = (match, key) => match.stats?.[key] ? [toNumber(match.stats[key].home), toNumber(match.stats[key].away)] : [null, null];
  const sum = (values) => values.every((value) => value !== null) ? values.reduce((total, value) => total + value, 0) : null;
  const sideOf = (match, teamId) => match.homeTeamId === teamId ? 0 : 1;
  const isTeamMarket = (market) => market.startsWith("team");

  function metric(match, teamId, market, direction) {
    const ownSide = sideOf(match, teamId);
    const side = direction === "against" && isTeamMarket(market) ? 1 - ownSide : ownSide;
    const definitions = {
      totalGoals: () => sum([toNumber(match.score?.home), toNumber(match.score?.away)]), teamGoals: () => toNumber(side ? match.score?.away : match.score?.home),
      totalFirstHalfGoals: () => sum(pair(match,"firstHalfGoals")), teamFirstHalfGoals: () => pair(match,"firstHalfGoals")[side],
      totalSecondHalfGoals: () => sum(pair(match,"secondHalfGoals")), teamSecondHalfGoals: () => pair(match,"secondHalfGoals")[side],
      totalShots: () => sum(pair(match,"shots")), teamShots: () => pair(match,"shots")[side],
      totalShotsOnTarget: () => sum(pair(match,"shotsOnTarget")), teamShotsOnTarget: () => pair(match,"shotsOnTarget")[side],
      totalCorners: () => sum(pair(match,"corners")), teamCorners: () => pair(match,"corners")[side],
      totalYellowCards: () => sum(pair(match,"yellowCards")), teamYellowCards: () => pair(match,"yellowCards")[side],
      totalRedCards: () => sum(pair(match,"redCards")), teamRedCards: () => pair(match,"redCards")[side],
      totalFouls: () => sum(pair(match,"fouls")), teamFouls: () => pair(match,"fouls")[side]
    };
    return definitions[market]?.() ?? null;
  }

  function passes(value, condition, line) {
    return condition === "over" ? value > line : condition === "under" ? value < line : condition === "atleast" ? value >= line : value <= line;
  }
  function seasonLabel(id) { const years=String(id).match(/(\d{4})-(\d{4})$/); return years?`${years[1].slice(2)}/${years[2].slice(2)}`:id; }
  function dateLabel(value) { return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)); }
  function team(id) { return state.teams.get(id)||{id,name:id,crest:""}; }
  function fixture() { return state.fixtures.find((match)=>match.id===$("fixture").value); }
  function selectedSeasons() { return [...$("seasons").querySelectorAll("input:checked")].map((input)=>input.value); }

  function calculate(teamId, forcedVenue, cutoff) {
    const market=$("market").value, direction=$("direction").value, line=Number($("line").value), condition=$("condition").value;
    let sample=state.matches.filter((match)=>(match.homeTeamId===teamId||match.awayTeamId===teamId)&&selectedSeasons().includes(match.seasonId));
    if(cutoff) sample=sample.filter((match)=>new Date(match.startDate)<cutoff);
    const venue=forcedVenue||$("venue").value;
    if(venue==="home") sample=sample.filter((match)=>match.homeTeamId===teamId);
    if(venue==="away") sample=sample.filter((match)=>match.awayTeamId===teamId);
    sample=sample.map((match)=>({match,value:metric(match,teamId,market,direction)})).filter((item)=>item.value!==null);
    if($("limit").value!=="all") sample=sample.slice(0,Number($("limit").value));
    const results=sample.map((item)=>({...item,hit:passes(item.value,condition,line)}));
    const hits=results.filter((item)=>item.hit).length;
    return {results,hits,rate:results.length?Math.round(hits/results.length*100):0,average:results.length?results.reduce((total,item)=>total+item.value,0)/results.length:0};
  }

  function context() {
    if(state.mode==="team") return {teamId:$("team").value,venue:null,cutoff:null};
    const match=fixture(); if(!match) return {};
    if(![match.homeTeamId,match.awayTeamId].includes(state.activeTeamId)) state.activeTeamId=match.homeTeamId;
    return {teamId:state.activeTeamId,venue:state.activeTeamId===match.homeTeamId?"home":"away",cutoff:new Date(match.startDate)};
  }

  function renderComparison(match) {
    const box=$("comparison");
    if(state.mode!=="match"||!match){box.hidden=true;return;}
    const cutoff=new Date(match.startDate), sides=[[match.homeTeamId,"home"],[match.awayTeamId,"away"]];
    box.hidden=false;
    box.innerHTML=sides.map(([id,venue])=>{const item=team(id),result=calculate(id,venue,cutoff);return `<button type="button" data-team="${id}" class="${state.activeTeamId===id?"active":""}"><img src="${item.crest}" alt=""><b>${item.name}</b><strong>${result.results.length?`${result.rate}%`:"—"}</strong></button>`;}).join("");
  }

  function render() {
    const current=context(); if(!current.teamId)return;
    const market=$("market").value,direction=$("direction").value,line=Number($("line").value),result=calculate(current.teamId,current.venue,current.cutoff);
    renderComparison(state.mode==="match"?fixture():null);
    $("rate").textContent=result.results.length?result.rate:"—"; $("meter").style.width=`${result.rate}%`;
    $("hits").textContent=result.hits; $("misses").textContent=result.results.length-result.hits; $("sample").textContent=result.results.length; $("average").textContent=result.results.length?result.average.toFixed(2):"—";
    const marketName=markets.find(([id])=>id===market)?.[1].toLowerCase()||"la selección",conditionName=$("condition").selectedOptions[0].textContent.toLowerCase();
    const directionName=isTeamMarket(market)?(direction==="against"?" recibidos":" a favor"):"",contextName=state.mode==="match"?(current.venue==="home"?" como local":" como visitante"):"";
    $("summary-text").textContent=result.results.length?`${team(current.teamId).name} cumplió ${conditionName} ${line} en ${result.hits} de ${result.results.length} partidos${contextName} (${marketName}${directionName}).`:"No hay partidos con datos para estos filtros.";
    $("matches").innerHTML=result.results.length?result.results.map(({match,value,hit})=>{
      const home=team(match.homeTeamId),away=team(match.awayTeamId),max=Math.max(line*1.5,value,1),width=Math.min(100,value/max*100),valueLabel=isTeamMarket(market)&&direction==="against"?"recibidos":"valor";
      return `<article class="match ${hit?"hit":"miss"}"><div class="date"><strong>${dateLabel(match.startDate)}</strong>${seasonLabel(match.seasonId)}</div><div class="teams"><div class="team-line"><img src="${home.crest}" alt=""><span>${home.name}</span><b>${match.score.home}</b></div><div class="team-line"><img src="${away.crest}" alt=""><span>${away.name}</span><b>${match.score.away}</b></div></div><div class="value"><strong>${value}</strong><span>${valueLabel}</span></div><div><div class="venue">${match.homeTeamId===current.teamId?"Como local":"Como visitante"}</div><div class="bar" style="color:${hit?"var(--green)":"var(--red)"}"><i style="width:${width}%"></i></div></div><div class="result">${hit?"✓":"×"}</div></article>`;
    }).join(""):`<p class="empty">No hay partidos con esta estadística y selección.</p>`;
  }

  function syncControls() {
    const matchMode=state.mode==="match"; $("team-field").hidden=matchMode; $("fixture-field").hidden=!matchMode; $("venue-field").hidden=matchMode;
    document.querySelectorAll("[data-mode]").forEach((button)=>button.classList.toggle("active",button.dataset.mode===state.mode));
    const teamMarket=isTeamMarket($("market").value); $("direction-field").hidden=!teamMarket; $("direction").disabled=!teamMarket;
  }
  function changeMode(mode){state.mode=mode;if(mode==="match")state.activeTeamId=fixture()?.homeTeamId||null;syncControls();render();}

  function setup(history,current){
    [history,current].forEach((set)=>(set.teams||[]).forEach((item)=>state.teams.set(item.id,item)));
    const unique=new Map();[...(history.matches||[]),...(current.matches||[])].forEach((match)=>unique.set(match.id,match));
    state.matches=[...unique.values()].filter((match)=>match.status==="finalizado").sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
    state.fixtures=[...(current.matches||[])].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
    $("team").innerHTML=[...state.teams.values()].sort((a,b)=>a.name.localeCompare(b.name,"es")).map((item)=>`<option value="${item.id}">${item.name}</option>`).join("");
    $("market").innerHTML=markets.map(([value,label])=>`<option value="${value}">${label}</option>`).join("");
    $("fixture").innerHTML=state.fixtures.map((match)=>`<option value="${match.id}">${dateLabel(match.startDate)} · ${team(match.homeTeamId).name} vs ${team(match.awayTeamId).name}</option>`).join("");
    const next=state.fixtures.find((match)=>new Date(match.startDate)>=new Date());if(next)$("fixture").value=next.id;
    const seasons=[...new Set(state.matches.map((match)=>match.seasonId))].sort().reverse();
    $("seasons").innerHTML=seasons.map((id,index)=>`<label class="chip"><input type="checkbox" value="${id}" ${index<2?"checked":""}><span>${seasonLabel(id)}</span></label>`).join("");
    const params=new URLSearchParams(location.search);if(params.get("team")&&state.teams.has(params.get("team")))$("team").value=params.get("team");if(params.get("fixture")&&state.fixtures.some((match)=>match.id===params.get("fixture")))$("fixture").value=params.get("fixture");if(params.get("mode")==="match")state.mode="match";
    syncControls();render();
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    ["team","market","condition","direction","venue","limit"].forEach((id)=>$(id).addEventListener("change",()=>{syncControls();render();}));
    $("fixture").addEventListener("change",()=>{state.activeTeamId=fixture()?.homeTeamId||null;render();});$("line").addEventListener("input",render);$("seasons").addEventListener("change",render);$("analyze").addEventListener("click",render);
    document.querySelector(".mode-switch").addEventListener("click",(event)=>{const button=event.target.closest("[data-mode]");if(button)changeMode(button.dataset.mode);});
    $("comparison").addEventListener("click",(event)=>{const button=event.target.closest("[data-team]");if(button){state.activeTeamId=button.dataset.team;render();}});
    try{const[current,history]=await Promise.all([fetch("/data/prepartido/laliga.json").then((response)=>response.json()),fetch("/data/prepartido/history.json").then((response)=>response.json())]);setup(history,current);}catch(error){$("matches").innerHTML='<p class="empty">No se han podido cargar los datos. Vuelve a intentarlo.</p>';$("summary-text").textContent="Error al cargar la base de datos.";}
  });
})();
