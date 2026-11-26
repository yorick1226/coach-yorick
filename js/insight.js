'use strict';
/* ---------- inzicht ---------- */
function barSvg(vals, labels, opt){
  opt = opt||{}; const W = 320, H = 110, pb = 16, max = Math.max(1, ...vals, opt.target||0); const bw = W/vals.length;
  let s = '<svg viewBox="0 0 '+W+' '+(H+pb)+'" width="100%" role="img">';
  vals.forEach((v,i) => { const h = v/max*(H-12); s += '<rect x="'+(i*bw+3)+'" y="'+(H-h)+'" width="'+(bw-6)+'" height="'+h+'" rx="3" fill="'+(i===vals.length-1?'#60a5fa':'#22c55e')+'"/>';
    if(v && vals.length <= 16) s += '<text x="'+(i*bw+bw/2)+'" y="'+(H-h-3)+'" text-anchor="middle">'+(opt.fmt?opt.fmt(v):Math.round(v))+'</text>';
    if(vals.length <= 16 || i % Math.ceil(vals.length/13) === 0) s += '<text x="'+(i*bw+bw/2)+'" y="'+(H+12)+'" text-anchor="middle">'+labels[i]+'</text>'; });
  return s+'</svg>';
}
function stackSvg(splits, labels){ const W = 320, H = 100, bw = W/splits.length; let s = '<svg viewBox="0 0 '+W+' '+(H+16)+'" width="100%">';
  splits.forEach((sp,i) => { if(!sp.tot){ s += '<text x="'+(i*bw+bw/2)+'" y="'+(H+12)+'" text-anchor="middle">'+labels[i]+'</text>'; return; } let y = H;
    for(const [k,c] of [['rustig','#22c55e'],['matig','#f5b942'],['hard','#f87171']]){ const h = sp.t[k]/sp.tot*H; y -= h; s += '<rect x="'+(i*bw+2)+'" y="'+y+'" width="'+(bw-4)+'" height="'+h+'" fill="'+c+'"/>'; }
    s += '<text x="'+(i*bw+bw/2)+'" y="'+(H+12)+'" text-anchor="middle">'+labels[i]+'</text>'; });
  return s+'</svg>'; }
function lineSvg(series){
  const W = 320, H = 110; const all = series.flatMap(x=>x.pts.map(p=>p[1])); if(!all.length) return '';
  const xs = series.flatMap(x=>x.pts.map(p=>p[0])); const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const lo = Math.min(...all)*0.95, hi = Math.max(...all)*1.05; const X = v => x1===x0 ? W/2 : (v-x0)/(x1-x0)*(W-40)+10; const Y = v => H-10-(v-lo)/((hi-lo)||1)*(H-20);
  let s = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img">';
  for(const sr of series){ if(!sr.pts.length) continue; s += '<polyline fill="none" stroke="'+sr.c+'" stroke-width="2" points="'+sr.pts.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'"/>';
    sr.pts.forEach(p => s += '<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="2.5" fill="'+sr.c+'"/>');
    const l = sr.pts[sr.pts.length-1]; s += '<text x="'+(X(l[0])+5)+'" y="'+(Y(l[1])+4)+'">'+fmtN(l[1])+'</text>'; }
  return s+'</svg>';
}
/* Fitheid/vermoeidheid (Banister-achtig impuls-responsmodel) op sessie-RPE × minuten (Foster).
   RPE onbekend → schatting uit gem. HF t.o.v. drempel-HF, anders per sport. Trend, geen voorspeller van blessures. */
function estRpe(a){ const l = Number(setting('lthr')) || (PLAN && PLAN.athlete && PLAN.athlete.lthr) || 173;
  if(a.hr){ const r = a.hr/l; return r < 0.8 ? 3 : r < 0.87 ? 4 : r < 0.92 ? 5 : r < 0.97 ? 7 : 8; }
  return /Ride/.test(a.sport||'') ? 3 : a.sport==='WeightTraining' ? 5 : RUNS.includes(a.sport) ? 4 : 4; }
function loadSeries(days){ const t = today(), start = addDays(t, -days-60), L = {}; const add = (d, v) => { if(d >= start && d <= t) L[d] = (L[d]||0) + v; };
  const sidOf = {}; for(let m = mondayOf(start); m <= t; m = addDays(m, 7)){ const w = weekByStart(m); if(!w) continue; const mw = matchWeek(w); for(const [sid, a] of Object.entries(mw.by)) if(a && a.id) sidOf[a.id] = sid; }
  for(const a of (STRAVA.activities||[])){ const min = (a.sec||a.el||0)/60; if(!min) continue; const sid = sidOf[a.id]; const rpe = sid && S.done[sid] && S.done[sid].rpe; add(a.date, min*(rpe || estRpe(a))); }
  for(const c of S.cardio) if(!c.del && !c.sid && c.sec) add(c.date, c.sec/60*(c.rpe||4));
  for(const [sid, v] of Object.entries(S.done)){ if(!v.d || v.skip) continue; const f = sessById(sid); if(!f || Object.values(sidOf).includes(sid)) continue; const min = num(v.min) || f.s.min || 0; if(min) add(f.date, min*(v.rpe||5)); }
  const k1 = 1-Math.exp(-1/42), k2 = 1-Math.exp(-1/7); let ctl = 0, atl = 0; const out = [];
  for(let d = start; d <= t; d = addDays(d, 1)){ const x = L[d]||0; ctl += (x-ctl)*k1; atl += (x-atl)*k2; out.push({d, x, ctl, atl}); }
  return out.slice(-days); }
function loadCard(){ const s = loadSeries(84); if(!s.length || !s.some(x => x.x)) return ''; const L = s[s.length-1]; const tsb = L.ctl - L.atl, r = L.ctl ? tsb/L.ctl : 0;
  const st = r < -0.3 ? ['Zwaar belast', 'var(--bad)', 'Vermoeidheid ligt ruim boven je fitheid. Prima voor een korte overload-week, maar niet langer dan 1–2 weken achter elkaar.']
    : r < -0.1 ? ['Opbouw', 'var(--warn)', 'Je traint meer dan je gewend bent: zo bouw je fitheid op. Let op slaap en rustige dagen.']
    : r < 0.15 ? ['In balans', 'var(--acc)', 'Belasting en herstel in evenwicht.'] : ['Fris', 'var(--blue)', 'Minder belast dan je gewend bent: goed vóór een wedstrijd, maar langer zo = fitheid zakt.'];
  const pts = k => s.filter((x, i) => i % 3 === 0 || i === s.length-1).map((x, i) => [i, Math.round(x[k])]);
  return '<div class="card" id="loadcurve"><h3>Fitheid & vermoeidheid</h3><div class="kv" style="border:0;padding:0"><span>Vorm nu</span><b style="color:'+st[1]+'">'+st[0]+'</b></div><div class="small">'+st[2]+'</div>'
    + lineSvg([{pts:pts('ctl'), c:'#22c55e'}, {pts:pts('atl'), c:'#f59e0b'}])
    + '<div class="small"><span style="color:#22c55e">■</span> fitheid (42-daags gem.) <span style="color:#f59e0b">■</span> vermoeidheid (7-daags gem.) · laatste 12 weken</div>'
    + '<details><summary class="small">Hoe wordt dit berekend?</summary><div class="small">Belasting per sessie = minuten × RPE (sessie-RPE, Foster). Zonder RPE schat de app RPE uit je gemiddelde hartslag t.o.v. je drempel-HF. Fitheid en vermoeidheid zijn voortschrijdende gemiddelden over 42 en 7 dagen (impuls-responsmodel, Banister). Bruikbaar als trend; dat zulke modellen blessures of prestaties precies voorspellen is niet goed aangetoond. Hoe vaker je RPE invult, hoe beter het klopt.</div></details></div>'; }
const e1 = x => x.reps<=12 && x.kg ? x.kg*(1+x.reps/30) : null;
/* Prognose uit je beste recente wedstrijd (Riegel, T2 = T1 × (D2/D1)^1,06). Tot de halve marathon goed gekalibreerd;
   marathon met exponent 1,07 en toch vaak te snel voor recreanten (Vickers & Vertosick 2016). */
function bestRace(){ const t = today(); const rs = (STRAVA.activities||[]).filter(a => a.race && RUNS.includes(a.sport) && a.km >= 4.5 && a.km <= 22 && diffD(t, a.date) <= 240)
  .concat(S.cardio.filter(c => !c.del && c.race && ['run'].includes(c.sport) && c.km >= 4.5 && c.km <= 22 && c.sec && diffD(t, c.date) <= 240).map(c => ({date:c.date, km:c.km, sec:c.sec, name:'Handmatig'})));
  if(!rs.length) return null; const eq = a => (a.el||a.sec) * Math.pow(10/a.km, 1.06); return rs.sort((a,b) => eq(a)-eq(b))[0]; }
/* drempel herijken: ≈ 1-uurs wedstrijdtempo uit je beste recente wedstrijd (≤ 10 weken). Alleen een voorstel; jij beslist. */
function tpSuggest(){ const br = bestRace(); if(!br || diffD(today(), br.date) > 70) return null; const T = br.el||br.sec; const d60 = br.km * Math.pow(3600/T, 1/1.06); const nw = Math.round(3600/d60);
  const tp = Number(setting('tpace')) || 263; if(Math.abs(nw - tp) < 6) return null; if(S.settings.tpSkip === nw) return null; return {nw, tp, br}; }
function tpCard(){ const x = tpSuggest(); if(!x) return '';
  return '<div class="card" id="tpcard"><b>Drempeltempo herijken?</b><div class="small" style="margin-top:4px">Ingesteld: <b>'+fmtPace(x.tp)+'</b>. Je '+esc(x.br.name)+' ('+fmtDay(x.br.date)+', '+fmtN(x.br.km,1)+' km in '+fmtSec(x.br.el||x.br.sec)+') wijst op ≈ <b>'+fmtPace(x.nw)+'</b> (1-uurstempo via Riegel). Een heuvelachtig of warm parcours geeft een tragere schatting dan je echt kunt; twijfel je, wacht dan op een vlakke wedstrijd of drempeltraining.</div><div class="row"><button class="btn sm pri" data-settp="'+x.nw+'">Zet op '+fmtPace(x.nw)+'</button><button class="btn sm" data-skiptp="'+x.nw+'">Niet nu</button></div></div>'; }
function riegel(t1, d1, d2, k){ return t1 * Math.pow(d2/d1, k||1.06); }
function perfCard(){ const br = bestRace(); const tp = Number(setting('tpace')) || 263; const ftp = num(S.settings.ftp) || (PLAN.athlete||{}).ftp || 230;
  let h = '<div class="card" id="perf"><h3>Prestatie & tempo’s</h3>';
  if(br){ const T = br.el||br.sec; h += '<div class="small">Uit je beste recente wedstrijd: <b>'+esc(br.name)+'</b> ('+fmtDay(br.date)+', '+fmtN(br.km,1)+' km in '+fmtSec(T)+').</div><table><tr><th>Afstand</th><th class="r">Prognose</th><th class="r">Tempo</th></tr>'
    + [[5,'5 km',1.06],[10,'10 km',1.06],[21.0975,'Halve marathon',1.06],[42.195,'Marathon (Parijs)',1.07]].map(([d,l,k]) => { const x = riegel(T, br.km, d, k); return '<tr><td>'+l+'</td><td class="r">'+fmtSec(x)+(d>40?'*':'')+'</td><td class="r">'+fmtPace(x/d)+'</td></tr>'; }).join('')
    + '</table><div class="small">Riegel-formule: tot de halve marathon goed op gemiddelde, maar de *marathonprognose is voor de helft van de recreanten 10+ min te snel (Vickers & Vertosick 2016). Reken voor Parijs op een marge erbij.</div>';
    const d60 = br.km * Math.pow(3600/T, 1/1.06); h += '<div class="small" style="margin-top:6px">Drempeltempo afgeleid (≈ 1 uur wedstrijdtempo): <b>'+fmtPace(3600/d60)+'</b>. Ingesteld: <b>'+fmtPace(tp)+'</b>'+(Math.abs(3600/d60 - tp) > 8 ? ' — wijkt af; heuvelachtig parcours geeft een tragere schatting.' : '.')+'</div>'; }
  const z = [['Herstel / easy', tp/0.78, tp/0.70],['Marathontempo', tp/0.92, tp/0.88],['Drempel', tp/1.02, tp/0.98],['Interval (VO2max, 3–5 min)', tp/1.08, tp/1.05],['Snelle herhalingen (200–400 m)', tp/1.15, tp/1.11]];
  h += '<table style="margin-top:8px"><tr><th>Looptempo’s</th><th class="r">min/km</th></tr>'+z.map(([n,a,b]) => '<tr><td>'+n+'</td><td class="r">'+fmtPace(a)+'–'+fmtPace(b)+'</td></tr>').join('')+'</table>';
  const fz = [['Z1 herstel',0,.55],['Z2 duur',.56,.75],['Z3 tempo',.76,.90],['Sweet spot',.88,.94],['Z4 drempel',.91,1.05],['Z5 VO2max',1.06,1.20]];
  h += '<table style="margin-top:8px"><tr><th>Fietszones (FTP '+ftp+' W)</th><th class="r">watt</th></tr>'+fz.map(([n,a,b]) => '<tr><td>'+n+'</td><td class="r">'+(a?Math.round(ftp*a):0)+'–'+Math.round(ftp*b)+'</td></tr>').join('')+'</table>';
  h += '<div class="small">Looptempo’s als percentage van je drempelsnelheid en fietszones volgens Coggan (% FTP): schattingen, geen labwaarden. Werk FTP en drempeltempo bij onder Meer na een test.</div></div>';
  return h; }
function rInsight(){
  $('htitle').textContent = 'Inzicht';
  const t = today(); const thisMon = mondayOf(t); const weeks = []; const NW = ui.range||12; for(let i=NW-1;i>=0;i--) weeks.push(addDays(thisMon, -7*i));
  const lab = weeks.map(w => weekIdOf(w).split('-W')[1]);
  const wk = weeks.map(a => { const b = addDays(a,6); const pw = weekByStart(a); const m = matchWeek(pw);
    let km=0, hm=0, sec=0; for(const x of actsIn(a,b)){ sec += x.sec||0; if(RUNS.includes(x.sport)){ km += x.km||0; hm += x.hm||0; } }
    for(const c of manualUnlinked(a,b,m)){ sec += c.sec||0; if(['run','trail'].includes(c.sport)) km += c.km||0; hm += c.hm||0; }
    return {km, hm, sec, load: pw ? weekStats(pw).load : 0}; });
  const MZ = PLAN.mozart || {};
  const runs = (STRAVA.activities||[]).filter(x => RUNS.includes(x.sport)).map(x => ({date:x.date, km:x.km||0, sec:x.sec||0, hm:x.hm||0}))
    .concat(S.cardio.filter(c => !c.del && ['run','trail'].includes(c.sport)).map(c => ({date:c.date, km:c.km||0, sec:c.sec||0, hm:c.hm||0})));
  const longKm = Math.max(0, ...runs.map(r=>r.km)), longH = Math.max(0, ...runs.map(r=>r.sec))/3600, sessHm = Math.max(0, ...runs.map(r=>r.hm));
  const byDay = {}; runs.forEach(r => byDay[r.date] = (byDay[r.date]||0) + r.km); let b2b = 0; for(const d in byDay){ const n = byDay[addDays(d,1)]; if(n) b2b = Math.max(b2b, byDay[d]+n); }
  const maxWkHm = Math.max(0, ...wk.map(x=>x.hm));
  const splits = weeks.map(a => intensitySplit(actsIn(a, addDays(a,6))));
  const fuel = S.cardio.filter(c => !c.del && c.kh && c.sec >= (MZ.fuelH||4)*3600 && (c.maag||5) >= 3).map(c => c.kh); const fuelBest = fuel.length ? Math.max(...fuel) : 0;
  const days = Math.round((parseD(MZ.date||'2027-06-05') - parseD(t))/864e5);
  const IT = ui.ins || 'overzicht'; let h = ''; const B = {}; let curT = 'overzicht'; const sec = t => { B[curT] = (B[curT]||'') + h; h = ''; curT = t; };
  { const cur = wk[wk.length-1], prev = wk.slice(-5,-1); const avg = f => prev.reduce((p,x)=>p+f(x),0)/Math.max(1,prev.length);
    const rideH = a => actsIn(a, addDays(a,6)).filter(x => /Ride/.test(x.sport||'')).reduce((p,x) => p+(x.sec||0)/3600, 0);
    const rh = rideH(thisMon), rhA = weeks.slice(-5,-1).reduce((p,a)=>p+rideH(a),0)/4;
    const gs = weekGroupSets(thisMon), hs = Object.entries(gs).filter(([g]) => !['plyo','hyrox'].includes(g)).reduce((p,[,v])=>p+v,0);
    const tile = (l, v, sub, tone) => '<div class="kpi"><span>'+l+'</span><b'+(tone?' style="color:'+tone+'"':'')+'>'+v+'</b><i>'+sub+'</i></div>';
    const nr = (PLAN.races||[]).find(r => r.date >= t); const nd = nr ? Math.round((parseD(nr.date)-parseD(t))/864e5) : null;
    const over = avg(x=>x.km) > 0 && cur.km > avg(x=>x.km)*1.3;
    h += '<div class="kpis">'+tile('Lopen deze week', fmtN(cur.km)+' km', (weekByStart(thisMon) ? 'plan '+fmtN(weekStats(weekByStart(thisMon)).runPlan)+' · ' : '')+'gem. '+fmtN(avg(x=>x.km)), over?'var(--warn)':'')+tile('Trainingstijd', fmtH(cur.sec), 'gem. '+fmtH(avg(x=>x.sec)))+tile('Fietsen', fmtN(rh)+' u', 'gem. '+fmtN(rhA)+' u')+tile('Harde krachtsets', String(hs), 'deze week')+'</div>';
    { const ca = coachAdvice(); if(ca.length) h += '<div class="card" id="coachadv"><div class="coachline">'+ic('progress',18)+'<div><b>Coach</b>'+ca.map(x => '<div class="advice1" style="margin-top:4px">'+x+'</div>').join('')+'</div></div></div>'; }
    { const ph = (PLAN.season||[]).find(x => x.from <= t && t <= x.to); const i = ph ? PLAN.season.indexOf(ph) : -1;
      if(ph) h += '<div class="card" id="phasecard"><span class="small">Seizoensfase '+(i+1)+'/'+PLAN.season.length+' · t/m '+fmtDay(ph.to)+'</span><b style="display:block;font-size:17px;margin:2px 0">'+esc(ph.name)+'</b><div class="small">'+esc(ph.goal)+'</div><div class="small" style="margin-top:4px">Lopen '+ph.km[0]+'–'+ph.km[1]+' km/week'+(PLAN.season[i+1] ? ' · daarna: '+esc(PLAN.season[i+1].name) : '')+'</div></div>'; }
    h += loadCard();
    if(nr) h += '<div class="card nextrace"><span class="small">Volgende wedstrijd</span><b>'+esc(nr.name)+'</b><span class="small">'+fmtDay(nr.date)+' · over '+nd+' dagen</span></div>'; }
  sec('lopen'); h += tpCard() + perfCard();
  h += '<div class="card" id="mozart"><h3>Richting Mozart <span class="small">nog '+days+' dagen</span></h3>';
  const pr = (l, v, tg, u, f) => '<div style="margin:8px 0"><div class="kv" style="border:0;padding:0"><span>'+l+'</span><span><b>'+(f?f(v):Math.round(v))+'</b> / '+tg+' '+u+'</span></div><div class="bar"><i style="width:'+Math.min(100, Math.round(v/tg*100))+'%"></i></div></div>';
  h += pr('Langste duurloop', longKm, MZ.longRunKm||50, 'km', v=>fmtN(v));
  h += pr('Langste tijd op de benen', longH, MZ.timeOnFeetH||8, 'u', v=>fmtN(v));
  h += pr('Meeste hoogtemeters in een week (12 wk)', maxWkHm, MZ.weekVert||4000, 'm');
  h += pr('Meeste hoogtemeters in één sessie', sessHm, MZ.sessionVert||2500, 'm');
  h += pr('Back-to-back (2 dagen)', b2b, MZ.b2bKm||60, 'km', v=>fmtN(v));
  h += pr('Geteste voeding ≥ '+(MZ.fuelH||4)+' u (maag ≥ 3)', fuelBest, MZ.fuelGph||80, 'g/u');
  { const since = '2026-11-01'; const ecc = new Set(); for(const x of S.sets) if(work(x) && x.date >= since && ['NH','SU','PDK','RNH'].includes(x.code)) ecc.add(x.date);
    for(const a of (STRAVA.activities||[])) if(RUNS.includes(a.sport) && a.date >= since && (a.hm||0) >= 300) ecc.add(a.date);
    h += pr('Afdaal-/excentrische prikkels sinds nov', ecc.size, 20, 'sessies');
    const gut = S.cardio.filter(c => !c.del && c.kh >= 60 && (c.sec||0) >= 5400 && c.date >= since).length;
    h += pr('Gut training (≥ 60 g/u, ≥ 1,5 u)', gut, 12, 'sessies');
    h += '<div class="small">Afdalen: na 10 bergaf-sessies was de spierpijn in de quadriceps na een gestandaardiseerde afdaling lager (Bontemps 2024). Maag: 2 weken dagelijks 90 g/u oefenen verminderde maagklachten (Costa 2017). Bouw dus ruim vóór juni op.</div>'; }
  h += '<div class="small">Doelen zijn coachrichtlijnen voor juni. Bron: Strava + handmatige logs.</div>';
  const hilly = (STRAVA.activities||[]).filter(a => RUNS.includes(a.sport) && a.km && a.hm >= 300).map(a => ({a, t:(a.el||a.sec), ek:(a.km + a.hm/100), vph: a.hm/((a.sec)/3600), mpk: a.hm/a.km})).map(x => Object.assign(x, {rate: x.ek/(x.t/3600)})).filter(x => x.rate >= 4.5 && x.vph < 1500).sort((x,y)=> y.a.date.localeCompare(x.a.date));
  const ref = hilly.find(x => x.t >= 3*3600 && x.mpk >= 25) || null; const MZ_EK = 84 + 48;
  if(ref){ const prog = MZ_EK/ref.rate; h += '<div class="banner '+(prog > 18 ? 'rood' : prog > 16.5 ? 'oranje' : 'groen')+'" style="margin-top:10px" id="mzprog"><b>Mozart-prognose ± '+fmtN(prog)+' u</b> (limiet 19 u)<div class="small" style="color:inherit">Grove schatting: 132 effort-km (84 km + 4800 hm/100) gedeeld door je tempo in '+esc(ref.a.name)+' ('+fmtN(ref.rate)+' effort-km/u, incl. stops). Wordt beter zodra je recentere lange heuvelsessies loopt.</div></div>'; }
  if(hilly.length) h += '<details style="margin-top:10px"><summary><b style="font-size:15px">Klimsessies (≥ 300 hm)</b></summary><table><tr><th>Datum</th><th class="r">hm</th><th class="r">hm/u</th><th class="r">effort-km/u</th></tr>'+hilly.slice(0,6).map(x => '<tr><td>'+fmtDay(x.a.date)+' '+x.a.date.slice(2,4)+'<div class="small">'+esc(x.a.name.slice(0,34))+'</div></td><td class="r">'+x.a.hm+'</td><td class="r">'+Math.round(x.vph)+'</td><td class="r">'+fmtN(x.rate)+'</td></tr>').join('')+'</table><div class="small">hm/u = hoogtemeters per bewegend uur over de hele sessie (inclusief vlak/dalen), geen pure klimsnelheid.</div></details>';
  h += '</div>';
  h += '<div class="card" id="runwk"><h3>Hardlopen km/week</h3>'+barSvg(wk.map(x=>x.km), lab)+'</div>';
  h += '<div class="card"><h3>Looptijd rustig / matig / hard</h3>'+stackSvg(splits, lab)+'<div class="small">Per ronde ingedeeld waar ronden bekend zijn (tempo t.o.v. drempel), anders per sessie op gemiddelde HF (rustig ≤ '+easyHr()+', hard ≥ 160) of tempo. Grof, maar laat het patroon zien. Richting ≥ 75–80% rustig.</div></div>';
  h += '<div class="card"><h3>Hoogtemeters/week</h3>'+barSvg(wk.map(x=>x.hm), lab)+'</div>';
  sec('overzicht'); h += '<div class="card"><h3>Trainingsuren/week</h3>'+barSvg(wk.map(x=>x.sec/3600), lab, {fmt:v=>fmtN(v)})+'</div>';
  sec('fietsen'); { const bk = weeks.map(a => actsIn(a, addDays(a,6)).filter(x => /Ride/.test(x.sport||'')).reduce((p,x) => p + (x.sec||0)/3600, 0)
      + S.cardio.filter(c => !c.del && c.sport==='bike' && c.date >= a && c.date <= addDays(a,6) && !c.sid).reduce((p,c) => p + (c.sec||0)/3600, 0));
    const rides = (STRAVA.activities||[]).filter(x => /Ride/.test(x.sport||'') && x.w).sort((p,q) => q.date.localeCompare(p.date)).slice(0,5);
    h += '<div class="card" id="bikewk"><h3>Fietsen: uren/week</h3>'+barSvg(bk, lab, {fmt:v=>fmtN(v)})+(rides.length ? '<table><tr><th>Recente ritten met vermogen</th><th class="r">W gem.</th></tr>'+rides.map(x => '<tr><td>'+fmtDay(x.date)+' · '+esc(x.name)+'</td><td class="r">'+x.w+'</td></tr>').join('')+'</table>' : '')+'</div>'; }
  sec('overzicht'); if(wk.some(x=>x.load)) h += '<div class="card"><h3>Belasting (sRPE)/week</h3>'+barSvg(wk.map(x=>x.load), lab)+'<div class="small">Alleen weken waarin je RPE per sessie invult.</div></div>';
  const rdp = [], slp = []; for(let i=27;i>=0;i--){ const y = dailyOf(addDays(t,-i)); if(y.rd!=null) rdp.push([28-i, y.rd]); if(y.sl!=null) slp.push([28-i, y.sl]); }
  if(rdp.length + slp.length >= 2) h += '<div class="card"><h3>Oura, 28 dagen</h3>'+lineSvg([{pts:rdp,c:'#22c55e'},{pts:slp,c:'#60a5fa'}])+'<div class="small"><span style="color:#22c55e">■</span> Readiness <span style="color:#60a5fa">■</span> Slaap</div></div>';
  let tr = '';
  for(const c of MAIN_LIFTS){ const byD = {}; for(const x of S.sets) if(work(x) && x.code===c){ const v = e1(x); if(v) byD[x.date] = Math.max(byD[x.date]||0, v); }
    const ds = Object.keys(byD).sort(); if(ds.length >= 2){ const d0 = parseD(ds[0]); tr += '<div style="margin-top:8px"><b>'+esc(EXN(c).n)+'</b>'+lineSvg([{pts:ds.map(d => [(parseD(d)-d0)/864e5, byD[d]]), c:'#f5b942'}])+'</div>'; } }
  sec('kracht'); if(tr) h += '<div class="card"><h3>Kracht: geschatte 1RM</h3>'+tr+'<div class="small">Schatting (Epley), geen gemeten 1RM.</div></div>';
  const pl = {}; for(let i=27;i>=0;i--){ const d = addDays(t,-i); const y = dailyOf(d); for(const [k,v] of Object.entries(y.pains||{})){ const r = pl[k] || (pl[k] = {n:0, max:0, last:null, lv:0}); r.n++; r.max = Math.max(r.max, v); r.last = d; r.lv = v; } }
  sec('overzicht'); const pk = Object.keys(pl);
  if(pk.length) h += '<div class="card"><h3>Pijn per plek, 28 dagen</h3>'+(pk.length ? '<table><tr><th>Plek</th><th class="r">Dagen</th><th class="r">Max</th><th>Laatst</th></tr>'+pk.sort((a,b)=>pl[b].n-pl[a].n).map(k => '<tr><td>'+esc(k)+'</td><td class="r">'+pl[k].n+'</td><td class="r">'+pl[k].max+'</td><td>'+fmtDay(pl[k].last)+' ('+pl[k].lv+')</td></tr>').join('')+'</table><div class="small">Meer dan 3 dagen achter elkaar op dezelfde plek, of een stijgende score: zeg het zondag.</div>' : '<div class="mut">Geen pijn gemeld. Mooi.</div>')+'</div>';
  sec('lichaam'); const bd = S.body.slice().sort((p,q)=> p.date.localeCompare(q.date));
  if(bd.length){ const t0 = parseD(bd[0].date); const W = bd.filter(x=>x.w).map(x => [(parseD(x.date)-t0)/864e5, x.w]); const SM = bd.filter(x=>x.ssm).map(x => [(parseD(x.date)-t0)/864e5, x.ssm]);
    const ib = bd.filter(x=>x.ssm); const f = ib[0], l = ib[ib.length-1]; const seg = bd.filter(x=>x.seg).pop();
    h += '<div class="card" id="bodyins"><h3>Lichaam</h3>'+lineSvg([{pts:W,c:'#60a5fa'}])+'<div class="small"><span style="color:#60a5fa">■</span> gewicht (kg)'+(PLAN.bodyGoal?' · doel: '+esc(PLAN.bodyGoal):'')+'</div>';
    if(SM.length > 1) h += lineSvg([{pts:SM,c:'#a78bfa'}])+'<div class="small"><span style="color:#a78bfa">■</span> skeletspiermassa (InBody, kg)</div>';
    if(f && l && f!==l) h += '<div class="kv"><span>InBody '+fmtDay(f.date)+' → '+fmtDay(l.date)+'</span><span>SSM '+(l.ssm-f.ssm>=0?'+':'')+fmtN(l.ssm-f.ssm)+' kg · vet '+(l.fatp-f.fatp>=0?'+':'')+fmtN(l.fatp-f.fatp)+'%-punt</span></div>';
    if(seg) h += '<div class="kv"><span>Segmenten ('+fmtDay(seg.date)+')</span><span class="small">armen '+seg.seg.arm+'% · romp '+seg.seg.trunk+'% · benen '+seg.seg.leg+'% van InBody-norm</span></div>';
    const mz = bd.filter(x => x.waist || x.arm || x.thigh || x.chest).pop(); if(mz) h += '<div class="kv"><span>Maten ('+fmtDay(mz.date)+')</span><span>'+[['taille','waist'],['borst','chest'],['arm','arm'],['bovenbeen','thigh']].filter(([,k])=>mz[k]).map(([n,k])=>n+' '+fmtN(mz[k])).join(' · ')+' cm</span></div>';
    h += '<div class="small">InBody-sprongen van dag tot dag zijn vaak vocht/glycogeen; kijk naar de trend over maanden. Meet onder gelijke omstandigheden (ochtend, nuchter).</div></div>'; }
  sec('kracht'); const vol = weeks.map(a => { const b2 = addDays(a,6); return S.sets.filter(x => work(x) && x.date>=a && x.date<=b2 && (x.rir==null||x.rir<=4) && !['plyo','hyrox'].includes(EXN(x.code).g)).length; });
  if(vol.some(Boolean)){ const tg = PLAN.setTargets||{}; const last4 = weeks.slice(-4); const per = {}; for(const x of S.sets) if(work(x) && x.date>=last4[0] && (x.rir==null||x.rir<=4)){ const g = EXN(x.code).g; if(g && !['plyo','hyrox'].includes(g)) per[g] = (per[g]||0)+1; }
    h += '<div class="card" id="volins"><h3>Krachtvolume: harde sets/week</h3>'+barSvg(vol, lab)+'<table><tr><th>Spiergroep</th><th class="r">gem./wk (4 wk)</th><th class="r">doel</th></tr>'+Object.keys(Object.assign({}, tg, per)).map(g => '<tr><td>'+g+'</td><td class="r">'+fmtN((per[g]||0)/4)+'</td><td class="r">'+(tg[g]||'–')+'</td></tr>').join('')+'</table></div>'; }
  sec('lichaam'); { const T = PLAN.mobTests||[]; const L = (S.mob||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
    const cnt = {}; for(const x of Object.values(S.rt||{})) for(const k of Object.keys(x)){ const m = k.match(/^MOB_([A-Z]+)_/); if(m) cnt[m[1]] = (cnt[m[1]]||0)+1; }
    if(L.length || Object.keys(cnt).length){ h += '<div class="card" id="mobins"><h3>Mobiliteit</h3>';
      if(Object.keys(cnt).length) h += '<div class="small">Gedaan per gebied: '+Object.entries(PLAN.mobFocus||{}).map(([f,v]) => v.n+' '+(cnt[f]||0)+'×').join(' · ')+'</div>';
      if(L.length) h += '<table><tr><th>Test</th>'+L.slice(-4).map(x => '<th class="r">'+fmtDay(x.date).split(' ').slice(1).join(' ')+'</th>').join('')+'<th class="r">doel</th></tr>'+T.map(t => '<tr><td>'+esc(t.n.split(' (')[0])+'</td>'+L.slice(-4).map(x => '<td class="r">'+(x[t.k]!=null?fmtN(x[t.k]):'–')+'</td>').join('')+'<td class="r">'+esc(t.goal)+'</td></tr>').join('')+'</table>';
      h += '</div>'; } }
  sec('lopen'); { const dr = (STRAVA.activities||[]).filter(a => a.dec != null && RUNS.includes(a.sport)).sort((p,q) => q.date.localeCompare(p.date)).slice(0,8);
    h += '<div class="card" id="drift"><h3>Duurvermogen: HF-drift lange duurlopen</h3>'+(dr.length ? '<table><tr><th>Run</th><th class="r">km</th><th class="r">drift</th></tr>'+dr.map(a => '<tr><td>'+fmtDay(a.date)+' · '+esc(a.name)+'</td><td class="r">'+fmtN(a.km)+'</td><td class="r" style="color:'+(a.dec < 5 ? 'var(--acc)' : a.dec < 8 ? 'var(--warn)' : 'var(--bad)')+'">'+fmtN(a.dec)+'%</td></tr>').join('')+'</table>' : '<div class="mut">Wordt vanaf nu elke avond berekend voor vlakke duurlopen van ≥ 75 min.</div>')
      +'<div class="small">Hoeveel je hartslag in de tweede helft oploopt bij hetzelfde tempo (snelheid/HF, eerste 10 min niet meegeteld). Vuistregel uit de coachpraktijk: < 5% = goed aeroob fundament, > 8% = duur nog te lang of te snel voor je huidige basis. Alleen op vlakke runs; warmte, wind en voeding beïnvloeden het ook.</div></div>'; }
  sec('overzicht'); h += blockHtml(); sec('lopen');
  h += recordsHtml();
  const fl = S.cardio.filter(c => !c.del && (c.kh || c.wat)).sort((a,b)=> b.date.localeCompare(a.date)).slice(0,10);
  if(fl.length) h += '<div class="card"><h3>Voedingslog</h3>'+(fl.length ? '<table><tr><th>Datum</th><th>Duur</th><th class="r">g/u</th><th class="r">Maag</th></tr>'+fl.map(c => '<tr><td>'+fmtDay(c.date)+'<div class="small">'+esc(c.wat||'')+'</div></td><td>'+(c.sec?fmtSec(c.sec):'')+'</td><td class="r">'+(c.kh||'')+'</td><td class="r">'+(c.maag||'')+'</td></tr>').join('')+'</table>' : '<div class="mut">Log voeding via “Log duur” bij lange sessies.</div>')+'</div>';
  h += '<div class="row"><button class="btn" data-manual="1">＋ Handmatige duursessie</button></div>';
  sec('end');
  { const ws = thisMon, {tg, why} = groupTargets(ws), per = weekGroupSets(ws);
    B.kracht = '<div class="card" id="grpwk"><h3>Deze week per spiergroep</h3><div class="gsg">'+MG.filter(([g]) => tg[g]).map(([g,n]) => { const v = per[g]||0, tt = tg[g]; return '<div class="gs"><span>'+n+'</span><b>'+v+'<i>/'+tt+'</i></b><div class="bar"><i style="width:'+Math.min(100, Math.round(v/tt*100))+'%'+(v>=tt?';background:var(--acc)':'')+'"></i></div></div>'; }).join('')+'</div><div class="small" style="margin-top:6px">Harde sets (RIR ≤ 4, geen opwarmsets).'+(why?' Benendoel lager: '+esc(why)+'.':'')+'</div></div>' + (B.kracht||''); }
  const TABS = [['overzicht','Overzicht'],['lopen','Lopen'],['fietsen','Fietsen'],['kracht','Kracht'],['lichaam','Lichaam']];
  let top = '<div class="seg" role="tablist">'+TABS.map(([k,l]) => '<button role="tab" class="'+(IT===k?'on':'')+'" data-ins="'+k+'">'+l+'</button>').join('')+'</div>';
  if(IT!=='lichaam') top += '<div class="seg sm">'+[[12,'12 wk'],[26,'½ jaar'],[52,'jaar']].map(([n,l]) => '<button class="'+((ui.range||12)===n?'on':'')+'" data-range="'+n+'">'+l+'</button>').join('')+'</div>';
  $('view').innerHTML = top + ((B[IT]||'').trim() || '<div class="card mut">Nog geen gegevens hier.</div>');
}
const STD = [['1 km',1],['1 mijl',1.609],['5 km',5],['10 km',10],['15 km',15],['21,1 km',21.0975],['30 km',30],['42,2 km',42.195],['50 km',50]];
function blocks(){ const bl = []; for(const w of PLAN.weeks){ const n = w.phase.split(' · ')[0].replace(/ (taper|deload).*$/,'').trim(); let b = bl.find(x => x.n===n); if(!b){ b = {n, weeks:[]}; bl.push(b); } b.weeks.push(w); } return bl.filter(b => b.weeks[0].start <= today()); }
function blockReport(b){
  const a = b.weeks[0].start, z = addDays(b.weeks[b.weeks.length-1].start, 6); const L = []; let sp=0, sd=0, km=0, hm=0, sec=0, flags=0, skips=0; const rd=[], sl=[]; const pains = {};
  for(const w of b.weeks){ if(w.start > today()) continue; const st = weekStats(w); sp += st.sessPlan; sd += st.sessDone; km += st.runDone; hm += st.vertDone; sec += st.secDone; flags += st.easyFlags.length; skips += st.skipped||0; rd.push(...st.rd); sl.push(...st.sl);
    for(let i=0;i<7;i++){ const y = dailyOf(addDays(w.start,i)); for(const [k,v] of Object.entries(y.pains||{})) pains[k] = Math.max(pains[k]||0, v); } }
  const split = intensitySplit(actsIn(a, z)); const nW = b.weeks.filter(w => w.start <= today()).length;
  L.push('BLOKRAPPORT '+b.n+' ('+fmtDay(a)+' – '+fmtDay(z)+', '+nW+' wk)');
  L.push('- Naleving: '+sd+'/'+sp+' sessies'+(skips?' ('+skips+' vervallen)':'')+' · lopen '+fmtN(km)+' km ('+fmtN(km/Math.max(1,nW))+'/wk) · '+Math.round(hm)+' hm · '+fmtH(sec));
  if(split.tot) L.push('- Looptijd rustig/matig/hard: '+['rustig','matig','hard'].map(k=>Math.round(split.t[k]/split.tot*100)).join('/')+' % · rustige runs te hard: '+flags+'×');
  const lifts = []; for(const c of MAIN_LIFTS){ const xs = S.sets.filter(x => work(x) && x.code===c && x.date>=a && x.date<=z && e1(x)); if(xs.length < 2) continue; const ds = [...new Set(xs.map(x=>x.date))].sort();
    const best = d => Math.max(...xs.filter(x=>x.date===d).map(e1)); lifts.push(EXN(c).n+' '+fmtN(best(ds[0]))+' → '+fmtN(best(ds[ds.length-1]))+' kg e1RM'); }
  L.push('- Kracht: '+(lifts.length ? lifts.join('; ') : 'te weinig gelogd voor een trend'));
  const sets = S.sets.filter(x => work(x) && x.date>=a && x.date<=z && (x.rir==null||x.rir<=4)); const per = {}; for(const x of sets){ const g = EXN(x.code).g; if(g && !['plyo','hyrox'].includes(g)) per[g] = (per[g]||0)+1; }
  if(Object.keys(per).length) L.push('- Harde sets/week: '+Object.entries(per).map(([g,n]) => g+' '+fmtN(n/Math.max(1,nW))).join(', '));
  const bd = S.body.filter(x => x.w && x.date>=addDays(a,-7) && x.date<=z).sort((p,q)=>p.date.localeCompare(q.date)); if(bd.length > 1) L.push('- Gewicht: '+fmtN(bd[0].w)+' → '+fmtN(bd[bd.length-1].w)+' kg');
  if(rd.length||sl.length) L.push('- Oura gem.: readiness '+(avg(rd)??'–')+', slaap '+(avg(sl)??'–'));
  L.push('- Pijn: '+(Object.keys(pains).length ? Object.entries(pains).map(([k,v])=>k+' max '+v).join(', ') : 'geen gemeld'));
  const races = (STRAVA.activities||[]).filter(x => x.race && x.date>=a && x.date<=z); if(races.length) L.push('- Wedstrijden: '+races.map(x => x.name+' '+fmtSec(x.el||x.sec)).join('; '));
  return L.join('\n'); }
function blockHtml(){ const bl = blocks(); if(!bl.length) return ''; const sel = ui.block ?? bl.length-1; const b = bl[Math.min(sel, bl.length-1)];
  return '<div class="card" id="blockrep"><h3>Blokrapport</h3><div class="chips sm">'+bl.map((x,i) => '<button class="chip'+(x===b?' on':'')+'" style="font-size:14px" data-block="'+i+'">'+esc(x.n)+'</button>').join('')+'</div><div class="det" style="font-size:14px">'+esc(blockReport(b))+'</div><div class="row"><button class="btn" id="x_block" data-bi="'+bl.indexOf(b)+'">Kopieer blokrapport</button></div><textarea id="x_out" readonly style="display:none"></textarea></div>'; }
function recordsHtml(){
  let h = '<div class="card"><h3 id="recdist">Records afstanden</h3><table><tr><th>Afstand</th><th>Tijd</th><th>Bron</th></tr>';
  for(const [lab, km] of STD){
    const cands = [];
    for(const p of (PLAN.pr||[])) if(p.dist===lab) cands.push({sec:p.sec, src:p.src});
    for(const p of (STRAVA.best||[])) if(p.dist===lab) cands.push({sec:p.sec, src:'Strava · '+fmtDay(p.date)+' '+p.date.slice(0,4)});
    for(const c of S.cardio) if(!c.del && c.race && c.km && c.sec && ['run','trail'].includes(c.sport) && Math.abs(c.km-km)/km <= 0.02) cands.push({sec:c.sec, src:'App · '+fmtDay(c.date)});
    const b = cands.sort((a,b)=>a.sec-b.sec)[0];
    h += '<tr><td>'+lab+'</td><td><b>'+(b?fmtSec(b.sec):'–')+'</b>'+(b?'<div class="small">'+fmtSec(b.sec/km)+' /km</div>':'')+'</td><td class="small">'+(b?esc(b.src):'')+'</td></tr>';
  }
  h += '</table><div class="small" style="margin-top:6px">Bron: Strava-beste prestaties (ook delen van langere runs), bijgewerkt '+esc(STRAVA.updated||'–')+', plus handmatige sessies met vinkje “Wedstrijd/test”.</div></div>';
  const races = (STRAVA.activities||[]).filter(a => a.race && RUNS.includes(a.sport)).sort((a,b)=> b.date.localeCompare(a.date)).slice(0,8);
  const rRow = a => '<tr><td>'+fmtDay(a.date)+' '+a.date.slice(2,4)+'</td><td>'+esc(a.name)+'<div class="small">'+(a.km?fmtN(a.km)+' km':'')+(a.hm?' · '+a.hm+' hm':'')+'</div></td><td class="r">'+fmtSec(a.el||a.sec)+'</td></tr>';
  if(races.length) h += '<div class="card"><h3>Wedstrijden</h3><table><tr><th>Datum</th><th>Wedstrijd</th><th class="r">Tijd</th></tr>'+races.slice(0,3).map(rRow).join('')+'</table>'+(races.length>3?'<details><summary class="small">Meer wedstrijden ('+(races.length-3)+')</summary><table>'+races.slice(3).map(rRow).join('')+'</table></details>':'')+'</div>';
  const by = {};
  for(const x of S.sets) if(work(x) && x.kg && unitOf(x.code)==='kg' && !EXN(x.code).time){
    const v = e1(x); const r = by[x.code] || (by[x.code] = {max:null, e1:null});
    if(!r.max || x.kg>r.max.kg || (x.kg===r.max.kg && x.reps>r.max.reps)) r.max = x;
    if(v && (!r.e1 || v>r.e1)) r.e1 = v; }
  const codes = Object.keys(by);
  if(!codes.length) return h;
  h += '<div class="card" id="recstr"><h3>Records kracht</h3>';
  { h += '<table><tr><th>Oefening</th><th>Zwaarste set</th><th class="r">e1RM*</th></tr>';
    for(const c of codes.sort((a,b)=>EXN(a).n.localeCompare(EXN(b).n))){ const r = by[c];
      h += '<tr><td>'+esc(EXN(c).n)+'</td><td>'+fmtKg(r.max.kg)+' × '+r.max.reps+'<div class="small">'+fmtDay(r.max.date)+'</div></td><td class="r">'+(r.e1?fmtKg(Math.round(r.e1*2)/2):'–')+'</td></tr>'; }
    h += '</table><div class="small" style="margin-top:6px">* Schatting (Epley), sets tot 12 reps.</div>'; }
  return h+'</div>';
}
