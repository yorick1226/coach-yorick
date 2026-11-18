'use strict';
/* ---------- sessiekaart ---------- */
/* korte doelregel voor de dichte kaart: tempo/HF/watt/RIR uit de sessiegegevens */
function glance(s){ const d = s.detail || ''; const p = [];
  if(s.tgt && s.tgt.pace) p.push(fmtPace(s.tgt.pace[0])+'–'+fmtPace(s.tgt.pace[1])+'/km');
  else { const m = d.match(/\d:\d\d\s*[–-]\s*\d:\d\d\s*\/km/) || d.match(/@\s*(\d:\d\d\s*[–-]\s*\d:\d\d)/); if(m) p.push((m[1]||m[0]).replace(/\s/g,'').replace(/\/km$/,'')+'/km'); }
  const hr = d.match(/HF\s*[≤<]\s*\d{3}/); if(hr) p.push(hr[0].replace(/\s/g,' '));
  const w = d.match(/≈?\s*\d{2,3}\s*[–-]\s*\d{2,3}\s*W\b/); if(w) p.push(w[0].replace('≈','').replace(/\s/g,''));
  const L = (s.ex||[]).concat(s.bl||[]); if(L.length && !p.length){ const r = L.map(e => e.rir).filter(x => x > 0); p.push((s.bl ? s.bl.length+' blokken' : L.length+' oef.')+(r.length ? ' · RIR '+Math.min(...r)+(Math.max(...r)!==Math.min(...r)?'–'+Math.max(...r):'') : '')); }
  if(s.zwo) p.push('Zwift-workout');
  return p.join(' · '); }
/* Zwift-workout (.zwo) uit s.zwo: [{min, pct} | {min, pct:[van,naar]} | {rep, on:{min,pct}, off:{min,pct}}], pct = % FTP */
function zwoXml(s){ const f = v => (v/100).toFixed(2); const sec = m => Math.round(m*60); const st = s.zwo; const out = [];
  st.forEach((b, i) => { if(b.rep) out.push('<IntervalsT Repeat="'+b.rep+'" OnDuration="'+sec(b.on.min)+'" OffDuration="'+sec(b.off.min)+'" OnPower="'+f(b.on.pct)+'" OffPower="'+f(b.off.pct)+'"/>');
    else if(Array.isArray(b.pct)) out.push('<'+(i===0?'Warmup':i===st.length-1?'Cooldown':'Ramp')+' Duration="'+sec(b.min)+'" PowerLow="'+f(b.pct[0])+'" PowerHigh="'+f(b.pct[1])+'"/>');
    else out.push('<SteadyState Duration="'+sec(b.min)+'" Power="'+f(b.pct)+'"/>'); });
  const x = t => String(t).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
  return '<workout_file>\n<author>Coach Yorick</author>\n<name>'+x(s.title)+'</name>\n<description>'+x((s.detail||'').split('\n')[0])+'</description>\n<sportType>bike</sportType>\n<tags/>\n<workout>\n'+out.join('\n')+'\n</workout>\n</workout_file>\n'; }
function planLine(s){ const p = []; if(s.km) p.push(fmtN(s.km)+' km'); if(s.min) p.push('~'+s.min+' min'); if(s.hm) p.push(s.hm+' hm'); return p.join(' · '); }
function sessCard(it, m, opt){
  const s = it.s, st = S.done[s.id] || {}, a = m.by[s.id], skip = st.skip, done = !skip && (st.d || !!a);
  const open = ui.open[s.id] ?? !!opt.open;
  const meta = a ? (a.km ? fmtN(a.km)+' km' : '')+((a.el||a.sec) ? (a.km?' · ':'')+fmtSec(a.el||a.sec) : '') : planLine(s) || (hasEx(s) ? sessEx(s).length+' oefeningen' : '');
  const flag = skip ? '<span class="pill o">vervallen</span>' : st.alt ? '<span class="pill o">alternatief</span>' : it.date!==it.orig ? '<span class="pill o">verplaatst</span>' : (easyFlag(s, a) ? '<span class="pill r">⚠</span>' : '');
  let h = '<div class="card sess'+(done?' done':'')+(skip?' skip':'')+(open?' open':'')+'" id="s_'+s.id+'" style="--tc:'+(TYPE_COLOR[s.t]||'#6b7280')+'"><div class="st">';
  h += '<button class="chk'+(done?' on':'')+'" data-done="'+s.id+'" aria-label="Afvinken">✓</button>';
  h += (s.t!=='rest' ? '<button class="tt tap" data-open="'+s.id+'" data-isopen="'+(open?1:0)+'" aria-expanded="'+open+'">' : '<div class="tt">')+'<b>'+esc(s.title)+'</b><span class="meta"><span class="tag c">'+(TYPE_ICON[s.t]||'')+' '+(TYPE_LABEL[s.t]||s.t)+'</span>'+(meta?'<span>'+esc(meta)+'</span>':'')+flag+'</span>';
  h += s.t!=='rest' ? '</button><span class="chev" aria-hidden="true">'+(open?'▴':'▾')+'</span></div>' : '</div></div>';
  if(!open || s.t==='rest') return h+'</div>';
  h += '<div class="body">';
  const g = glance(s); if(g) h += '<div class="small glance">🎯 '+esc(g)+'</div>';
  if(it.date!==it.orig) h += '<div class="small">↪ verplaatst van '+fmtDay(it.orig)+'</div>';
  if(skip) h += '<div class="small" style="color:var(--warn)">Niet uitgevoerd: '+esc(skip)+'</div>';
  if(st.alt) h += '<div class="small" style="color:var(--blue)">Alternatief: '+esc(st.alt)+'</div>';
  const ef = easyFlag(s, a), iv = intervalEval(s, a);
  if(ef) h += '<div class="banner rood" style="margin:8px 0 0;padding:6px 10px;font-size:14px">⚠ '+esc(ef)+'</div>';
  if(iv) h += '<div class="banner '+(iv.good?'groen':'oranje')+'" style="margin:8px 0 0;padding:6px 10px;font-size:14px">'+(iv.good?'✓ ':'⚠ ')+esc(iv.txt)+'</div>';
  if(a) h += planVsDone(s, a);
  if(a) h += '<div class="strava"><b>✓ Strava</b> '+actLine(a)+(a.laps?'<br><button class="btn link" data-laps="'+s.id+'">'+(ui.laps[s.id]?'Ronden verbergen':'Ronden tonen ('+a.laps.length+')')+'</button>'+(ui.laps[s.id]?lapsTable(a):''):'')+'</div>';
  const quick = [];
  if(hasEx(s) && !skip) quick.push('<button class="btn sm pri" data-logger="'+s.id+'">Logger</button>');
  if(s.zwo && !skip) quick.push('<button class="btn sm" data-zwo="'+s.id+'">⬇ Zwift-bestand</button>');
  if(s.rt && !skip) quick.push('<button class="btn sm pri" data-rtstart="'+s.rt+'" data-rtkey="'+s.rt+'" data-rtdate="'+it.date+'">▶ Start routine</button>');
  if(quick.length) h += '<div class="row">'+quick.join('')+'</div>';
  const wc = !skip && wuFor(s); if(wc) h += '<div class="rtchips">'+rtChip(wc[0], wc[0]+'@'+s.id, it.date, 'Warming-up')+(wc[1] ? rtChip(wc[1], wc[1]+'@'+s.id, it.date, 'Cooldown') : '')+'</div>';
  if(!skip && hasEx(s) && backPain(it.date) >= 4){ const has = c => sessEx(s).some(e => cOf(s.id, e)===c && !S.swaps[s.id+'|'+e.c]);
    if(has('RDL') || has('SQ')) h += '<div class="banner oranje" style="margin:8px 0 0;padding:6px 10px;font-size:14px">Onderrug ≥4 vandaag. <button class="btn sm" data-backswap="'+s.id+'">Rugvriendelijk wisselen</button><div class="small">RDL → hip thrust, squat → leg press. Zelf terug te zetten in de logger.</div></div>'; }
  {
    if(s.detail) h += '<div class="det">'+esc(s.detail)+'</div>';
    if(hasEx(s)) h += '<table class="extab">'+sessEx(s).filter(e => !S.exskip[s.id+'|'+e.c]).map(e => '<tr><td>'+(e.blk ? '<b>'+esc(e.lbl)+'</b><div class="small">'+esc(EXN(cOf(s.id, e)).n)+'</div>' : esc(EXN(cOf(s.id, e)).n))+'</td><td class="r">'+e.s+'×'+e.lo+(e.hi!==e.lo?'–'+e.hi:'')+'</td><td class="r small">'+(e.rir!=null?'RIR '+e.rir:'')+(e.rest?'<br>'+fmtSec(e.rest):'')+'</td></tr>').join('')+'</table>';
    if(!skip && s.t!=='rest'){
      if(done) h += '<div class="small" style="margin-top:10px;display:flex;align-items:center">RPE sessie'+infoBtn('rpe')+'</div>'+infoBox('rpe')+'<div class="chips sm">'+[1,2,3,4,5,6,7,8,9,10].map(r => '<button class="chip'+(st.rpe===r?' on':'')+'" data-srpe="'+s.id+'" data-v="'+r+'">'+r+'</button>').join('')+'</div>';
      h += '<div class="row nw"><input class="num" type="text" inputmode="numeric" placeholder="min" data-min="'+s.id+'" value="'+esc(st.min||'')+'">';
      h += '<input type="text" placeholder="Notitie" data-note="'+s.id+'" value="'+esc(st.note||'')+'"></div>'; }
    const btns = [];
    if(['run','bike','swim','race'].includes(s.t) && !skip) btns.push('<button class="btn" data-cardio="'+s.id+'">'+(a?'RPE/voeding':'Log duur')+'</button>');
    if(s.t!=='rest') btns.push('<button class="btn'+(ui.menu[s.id]?' warn':'')+'" data-menu="'+s.id+'">Lukt niet ▾</button>');
    if(btns.length) h += '<div class="row">'+btns.join('')+'</div>';
    if(ui.menu[s.id]){
      const w = sessById(s.id).w; const alts = altOptions(s);
      if(alts.length) h += '<div class="small" style="margin-top:10px">Alternatief doen</div><div class="chips sm">'+alts.map((t,i) => '<button class="chip'+(st.alt===t?' on':'')+'" style="font-size:14px;text-align:left;flex:1 1 100%" data-alt="'+s.id+'" data-i="'+i+'">'+esc(t)+'</button>').join('')+'</div>';
      h += '<div class="small" style="margin-top:10px">Verplaats naar</div><div class="chips sm">'+[0,1,2,3,4,5,6].map(i => { const dd = addDays(w.start,i); return '<button class="chip'+(dd===it.date?' on':'')+'" data-move="'+s.id+'" data-to="'+dd+'">'+DAYS[i]+'</button>'; }).join('')+'</div>';
      h += '<div class="small" style="margin-top:10px">Niet uitvoeren omdat…</div><div class="chips sm">'+SKIPS.map(r => '<button class="chip'+(skip===r?' on':'')+'" data-skip="'+s.id+'" data-r="'+r+'">'+r+'</button>').join('')+'</div>';
      if(skip || st.alt || it.date!==it.orig) h += '<div class="row"><button class="btn sm" data-reset="'+s.id+'">Terug naar origineel</button></div>';
      h += '<div class="small" style="margin-top:6px">Gemiste training niet inhalen; kies liever een alternatief of laat hem vallen.</div>';
    }
  }
  return h+'</div></div>';
}

/* ---------- views ---------- */
function render(){
  { const par = {log:'vandaag', duur:'inzicht', check:'meer'}[ui.tab] || ui.tab; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab===par)); }
  { const lb = S.settings.lastBackup; const mb = document.querySelector('#tabs [data-tab="meer"]'); if(mb) mb.classList.toggle('dot', !lb || (Date.now()-lb) > 14*864e5); }
  const nav = ['week','check'].includes(ui.tab);
  $('prev').style.visibility = $('next').style.visibility = nav ? 'visible' : 'hidden';
  keepAwake(ui.tab==='log');
  $('back').style.display = ui.stack.length ? '' : 'none';
  $('back').textContent = nav ? '←' : '← Terug';
  $('prev').style.display = $('next').style.display = (!nav && ui.stack.length) ? 'none' : '';
  if(!PLAN && ui.tab!=='meer'){ $('view').innerHTML = '<div class="card">Plan kon niet geladen worden. Controleer je verbinding en herlaad.</div>'; return; }
  ({vandaag:rToday, week:rWeek, log:rLog, duur:rDuur, inzicht:rInsight, check:rCheck, meer:rMeer})[ui.tab]();
}

/* ---------- routines (mobiliteit, warming-up, cooldown, herstel) ---------- */
const RT = () => PLAN.routines || {};
const VID = q => 'https://www.youtube.com/results?search_query='+encodeURIComponent(q);
function exInfo(it){ const m = (PLAN.mobex||{})[it.k]; return m ? {n:m.n, how:m.how||[], q:m.q||m.n} : {n:it.n||'', how:it.cue?[it.cue]:[], q:it.n||''}; }
function diffD(a, b){ return Math.round((parseD(a)-parseD(b))/864e5); }
function mobHist(){ const h = {}; for(const [dt,x] of Object.entries(S.rt||{})) for(const k of Object.keys(x)){ const m = k.match(/^MOB_([A-Z]+)_[A-C]$/); if(m) (h[m[1]] = h[m[1]]||[]).push(dt); } return h; }
function mobNext(f, d){ const F = (PLAN.mobFocus||{})[f]; const n = ((mobHist()[f])||[]).filter(t => t < d).length; return F.v[n % F.v.length]; }
function mobLevel(id, d){ const m = id.match(/^MOB_([A-Z]+)_/); if(!m) return 0; return Math.min(2, Math.floor(((mobHist()[m[1]])||[]).filter(t => t < d).length / 6)); }
function dayItems(d){ return weekItems(weekByStart(mondayOf(d))).filter(i => i.date===d && !isSkipped(i.s.id)); }
/* kies het mobiliteitsgebied dat vandaag het meest oplevert: hoe lang geleden + wat je gisteren/vandaag/morgen traint */
function chooseMob(d){ const F = PLAN.mobFocus||{}; const x = S.rt[d]||{};
  const done = Object.keys(x).find(k => /^MOB_[A-Z]+_[A-C]$/.test(k)); if(done) return {id:done, why:['vandaag gedaan']};
  const hist = mobHist(); const T = dayItems(d), Y = dayItems(addDays(d,-1)), N = dayItems(addDays(d,1));
  const wk = it => (wuFor(it.s)||[])[0] || '';
  const has = (L, f) => L.some(f);
  const sc = {}; const why = {};
  for(const f of Object.keys(F)){ const last = (hist[f]||[]).filter(t => t < d).sort().pop(); const days = last ? diffD(d, last) : 9;
    sc[f] = Math.min(days, 7); why[f] = [last ? days+' dagen geleden' : 'nog niet gedaan']; if(days===1){ sc[f] -= 5; } }
  const add = (f, v, r) => { if(sc[f]==null) return; sc[f] += v; if(v > 0) why[f].push(r); };
  if(has([...T, ...N], i => ['WU_RUNQ','WU_PLYO','WU_LOWER','WU_RACE'].includes(wk(i)))) { add('ENKEL', 3, 'snelheid/plyo/lower vandaag of morgen'); add('HEUP', 1, 'beenwerk op komst'); }
  if(has(T, i => ['WU_UPPER','WU_HYROX'].includes(wk(i)) || i.s.t==='swim')) add('THOR', 3, 'upper/Hyrox/zwemmen vandaag');
  if(has([...Y, ...T], i => ['WU_LONG','WU_RACE','WU_LOWER'].includes(wk(i)))) { add('HEUP', 2, 'zware benen'); add('ACHTER', 2, 'zware benen'); }
  if(has([...Y, ...T], i => i.s.t==='bike' && (i.s.min||0) >= 90)) { add('HEUP', 2, 'lang fietsen: heupbuigers'); add('THOR', 1, 'lang fietsen'); }
  if(backPain(d) >= 4){ add('ACHTER', -4, ''); add('THOR', 1, 'rugvriendelijk'); }
  { const sw = staticWeek(mondayOf(d)), g = PLAN.staticGoal||{}; for(const [f, tgs] of Object.entries(FOCUS_TG)){ const low = tgs.filter(t => g[t] && (sw[t]||0) < g[t]/2); if(low.length) add(f, 2, low.join('/')+' nog weinig gerekt deze week'); } }
  const f = Object.keys(sc).sort((a,b) => sc[b]-sc[a])[0]; if(!f) return null;
  return {id: mobNext(f, d), focus: f, why: why[f]}; }
function rtDef(id, d){ d = d || today();
  if(id==='MOB_LANG'){ const ch = chooseMob(d); const fs = Object.keys(PLAN.mobFocus||{}).filter(f => !ch || f!==ch.focus);
    const hist = mobHist(); fs.sort((a,b) => ((hist[a]||[]).sort().pop()||'').localeCompare((hist[b]||[]).sort().pop()||'')); const parts = fs.slice(0,3).map(f => mobNext(f, d));
    return {n:'Mobiliteit compleet', min:6*parts.length, tag:'mob', parts, items: parts.flatMap(p => rtDef(p, d).items)}; }
  const r = RT()[id]; if(!r) return null; const lvl = mobLevel(id, d);
  if(!lvl) return r; return Object.assign({}, r, {lvl, items: r.items.map(it => it.sec ? Object.assign({}, it, {sec: it.sec + 10*lvl}) : it)}); }
function rtSteps(r){ const st = [];
  for(const it of r.items){ const ei = exInfo(it); const sets = it.sets||1, sides = it.side ? ['links','rechts'] : [null]; const n = sets*sides.length; let k = 0;
    for(let a=0;a<sets;a++) for(const sd of sides){ k++; st.push({n:ei.n, how:ei.how, q:ei.q, cue:it.cue||'', sec:it.sec||0, reps:it.reps||'', side:sd, set: sets>1 ? 'set '+(a+1)+'/'+sets : '', rest: (it.rest && k<n) ? it.rest : 0}); } }
  return st; }
function rtList(r){ return '<ol class="small" style="margin:6px 0 0 18px;padding:0">'+r.items.map(it => { const ei = exInfo(it); return '<li style="margin:4px 0">'+esc(ei.n)+' · '+esc(it.sec ? (it.sets?it.sets+' × ':'')+it.sec+' s' : (it.sets?it.sets+' × ':'')+(it.reps||''))+(it.side?' per kant':'')+' <a href="'+VID(ei.q)+'" target="_blank" rel="noopener">▶ video</a></li>'; }).join('')+'</ol>'; }
function rtDone(date, key){ return !!((S.rt[date]||{})[key]); }
function setRt(date, key, on){ const x = S.rt[date] || (S.rt[date] = {}); if(on) x[key] = Date.now(); else delete x[key]; enqueue('routine', date, date, x); }
function wuFor(s){ if(s.rt || s.t==='rest' || s.t==='mobility' || s.t==='swim') return null; const t = (s.title||'').toLowerCase();
  if(s.t==='race') return ['WU_RACE','CD_RUN'];
  if(s.t==='run'){ if(!/easy|herstel/.test(t) && /drempel|interval|×|tempo|heuvel|vo2|fartlek|marathontempo|\bmp\b|progressie/.test(t)) return ['WU_RUNQ','CD_RUN'];
    if(/lang|duur/.test(t) || (s.km||0) >= 18 || (s.min||0) >= 100) return ['WU_LONG','CD_LONG']; return ['WU_RUNE','CD_RUN']; }
  if(s.t==='strength') return [/lower|been|leg/.test(t) ? 'WU_LOWER' : 'WU_UPPER', null];
  if(s.t==='plyo') return ['WU_PLYO', null]; if(s.t==='hyrox') return ['WU_HYROX','CD_RUN']; if(s.t==='bike') return ['WU_BIKE', null]; return null; }
function dailyList(d){ const dow = (parseD(d).getDay()+6)%7; let l = ((PLAN.dailyRoutines||[])[dow] || []).slice();
  if(dayItems(d).some(i => i.s.rt && /^MOB/.test(i.s.rt))) l = l.filter(x => !/^MOB/.test(x));
  return l.map(x => x==='MOB' ? (chooseMob(d)||{}).id : x==='RUGX' ? chooseRug(d) : x).filter(Boolean); }
function rtChip(id, key, date, lbl){ const r = rtDef(id, date); if(!r) return ''; const on = rtDone(date, key);
  return '<button class="rtchip'+(on?' on':'')+'" data-rtstart="'+id+'" data-rtkey="'+key+'" data-rtdate="'+date+'">'+(on?'✓ ':'▶ ')+lbl+' '+r.min+'′</button>'; }
function backPain(d){ return ((dailyOf(d).pains)||{})['Onderrug'] || 0; }
/* rug & core: drie varianten die rouleren (bij onderrugpijn ≥4 altijd McGill) */
const RUGV = ['RUG','RUG_B','RUG_C'];
function chooseRug(d){ const x = S.rt[d]||{}; const done = RUGV.find(k => x[k]); if(done) return done; if(backPain(d) >= 4) return 'RUG';
  let n = 0; for(const [dt,y] of Object.entries(S.rt||{})) if(dt < d && RUGV.some(k => y[k])) n++; return RUGV[n % RUGV.length]; }
/* statisch rekken per doelspier, in minuten per kant, per week (doel 5–10 min: Ingram 2025) */
function staticWeek(mon){ const out = {}; for(let i=0;i<7;i++){ const dd = addDays(mon,i); for(const k of Object.keys(S.rt[dd]||{})){ if(k.includes('@') || k==='MOB_LANG') continue; const r = RT()[k]; if(!r || !r.items) continue; const lvl = mobLevel(k, dd);
    for(const it of r.items){ const m = (PLAN.mobex||{})[it.k]; if(!m || !m.tg || !it.sec) continue; out[m.tg] = (out[m.tg]||0) + (it.sets||1)*(it.sec + (/^MOB_/.test(k) ? 10*lvl : 0))/60; } } }
  return out; }
const FOCUS_TG = {HEUP:['heupbuiger','bil'], ENKEL:['kuit'], ACHTER:['hamstring','bil'], THOR:[]};
function dayKind(list){ const w = it => (wuFor(it.s)||[])[0] || '';
  return {q: list.some(i => ['WU_RUNQ','WU_PLYO','WU_RACE'].includes(w(i))), lower: list.some(i => w(i)==='WU_LOWER' || i.s.t==='hyrox' || sessEx(i.s).some(e => ['SQ','RDL','LP','BSS','HSQ','FSQ','SMS'].includes(cOf(i.s.id, e)))),
    long: list.some(i => ['WU_LONG','WU_RACE'].includes(w(i))), easy: list.some(i => ['WU_RUNE','WU_BIKE'].includes(w(i))), upper: list.some(i => w(i)==='WU_UPPER'), n: list.filter(i => !['rest','mobility'].includes(i.s.t)).length}; }
function weekCount(d, key){ const mon = mondayOf(d); let n = 0; for(let i=0;i<7;i++) if((S.rt[addDays(mon,i)]||{})[key]) n++; return n; }
function routinesCard(d, items){
  const bp = backPain(d); const act = items.filter(i => !isSkipped(i.s.id)); const K = dayKind(act); const tips = PLAN.recoveryTips || {};
  const cm = chooseMob(d); const late = K.q || K.lower; const Y = dayItems(addDays(d,-1)); const KY = dayKind(Y); const ad = advice(d); const x = dailyOf(d);
  const L = [];   // [key, icon, naam, minuten, routine-id of null, korte reden]
  for(const id of dailyList(d)){ const r = rtDef(id, d); if(!r) continue;
    if(/^RUG/.test(id)) L.push([id, '🧘', r.n.replace(/ \(.*\)/, ''), r.min, id, 'ochtend']);
    else L.push([id, '🤸', r.n.replace('Mobiliteit · ', 'Mobiliteit '), r.min, id, late ? 'na de training' : (cm && cm.why[1]) || 'ochtend']); }
  if(K.long){ L.push(['X_BOOTS','🦵','Compressieboots',25,null,'na de lange duur']); L.push(['X_GUN','💆','Massagegun benen',6,null,'’s avonds']); }
  else if(K.lower) L.push(['X_GUN','💆','Massagegun benen',6,null,'na kracht · geen ijsbad']);
  else if(KY.long){ L.push(['X_GUN','💆','Massagegun benen',6,null,'dag na lange duur']); L.push(['X_BOOTS','🦵','Compressieboots',25,null,'dag na lange duur']); }
  const saunaN = weekCount(d, 'X_SAUNA');
  if(!K.q && !K.long && (K.easy || K.upper || K.n===0) && (saunaN < 3 || rtDone(d,'X_SAUNA'))) L.push(['X_SAUNA','🧖','Sauna',30,null,'na training · '+saunaN+'/2–3 deze week']);
  if((ad && ad.lvl!=='groen') || K.n >= 2 || K.long){ const r = rtDef('REC_DOWN', d); L.push(['REC_DOWN','🌙','Ontspannen',r.min,'REC_DOWN', ad && ad.lvl!=='groen' ? 'advies '+ad.lvl : 'avond']); }
  const tot = L.reduce((p,z) => p + z[3], 0); const nDone = L.filter(z => rtDone(d, z[0])).length;
  let h = '<div class="card" id="rtcard"><div style="display:flex;align-items:baseline;gap:8px"><h3 style="margin:0;flex:1">Herstel & mobiliteit</h3><span class="small">'+nDone+'/'+L.length+' · ± '+tot+' min</span></div>';
  const recs = L.filter(z => !/^(RUG|MOB)/.test(z[0])); const rows = L.filter(z => /^(RUG|MOB)/.test(z[0]));
  for(const [key, icon, n, min, rid, why] of rows){ const on = rtDone(d, key);
    h += '<div class="rtrow"><button class="chk'+(on?' on':'')+'" data-rtchk="'+key+'" data-rtdate="'+d+'" aria-label="Afvinken">✓</button><div class="nm"'+(on?' style="opacity:.55"':'')+'><b>'+icon+' '+esc(n)+'</b><div class="small rtw">'+min+' min · '+esc(why)+'</div></div>'
      +(rid ? '<button class="btn sm'+(on?'':' pri')+'" data-rtstart="'+rid+'" data-rtkey="'+key+'" data-rtdate="'+d+'" aria-label="Start '+esc(n)+'">▶</button>' : '')+'</div>'; }
  if(recs.length) h += '<div class="rtchips" style="margin-top:8px">'+recs.map(([key, icon, n, min, rid]) => { const on = rtDone(d, key); return rid && !on ? '<button class="rtchip" data-rtstart="'+rid+'" data-rtkey="'+key+'" data-rtdate="'+d+'">'+icon+' '+esc(n)+' '+min+'′ ▶</button>' : '<button class="rtchip'+(on?' on':'')+'" data-rtchk="'+key+'" data-rtdate="'+d+'">'+(on?'✓ ':icon+' ')+esc(n)+' '+min+'′</button>'; }).join('')+'</div>';
  if(bp >= 4) h += '<div class="banner rood" style="margin:8px 0 0">Onderrug '+bp+'/8: rug & core A (McGill), side plank op je knieën, geen hamstringstretch. RDL en squat wisselen (knop in de sessie).</div>';
  const sw = staticWeek(mondayOf(d)); const goal = PLAN.staticGoal || {}; const lt = (S.mob||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).pop();
  h += '<details style="margin-top:6px"><summary class="small">Rekken deze week: '+Object.keys(goal).map(t => t.replace('heupbuiger','heup')+' '+Math.round(sw[t]||0)+'/'+goal[t]).join(' · ')+' min'+((!lt || diffD(d, lt.date) >= 28) ? ' · 📏 test open' : '')+'</summary>';
  if(!lt || diffD(d, lt.date) >= 28) h += '<div class="rtrow"><div class="nm"><b>📏 Mobiliteitstest</b><div class="small">5 min · elke 4 weken · '+(lt?'laatste '+fmtDay(lt.date):'nulmeting')+'</div></div><button class="btn sm" data-mobtest="1">Open</button></div>';
  for(const id of ['REC_ROLL','REC_DOWN'].filter(z => !L.some(q => q[0]===z))){ const r = rtDef(id, d); h += '<div class="rtrow"><div class="nm"><b>'+esc(r.n)+'</b><div class="small">'+r.min+' min · extra</div></div><button class="btn sm" data-rtstart="'+id+'" data-rtkey="'+id+'" data-rtdate="'+d+'">▶</button></div>'; }
  for(const f of Object.keys(PLAN.mobFocus||{})){ const id = mobNext(f, d); if(dailyList(d).includes(id)) continue; const r = rtDef(id, d); h += '<div class="rtrow"><div class="nm"><b>'+esc(r.n)+'</b><div class="small">'+r.min+' min · extra</div></div><button class="btn sm" data-rtstart="'+id+'" data-rtkey="'+id+'" data-rtdate="'+d+'">▶</button></div>'; }
  h += '<div class="small" style="margin-top:6px">'+['static','gun','boots','sauna','cold','sleep'].filter(k => tips[k]).map(k => '• '+esc(tips[k])).join('<br>')+'</div></details>';
  if((x.sl!=null && x.sl < 70)) h += '<div class="small" style="margin-top:6px">😴 Slaapscore '+x.sl+': vanavond extra vroeg naar bed weegt zwaarder dan elke andere hersteltool.</div>';
  h += '</div>'; return h; }
/* routinespeler */
function rpStart(id, key, date){ const r = rtDef(id, date); if(!r) return; unlockAudio();
  ui.rp = {id, key, date, r, steps: rtSteps(r), i: 0, phase:'', end:0, left:0, paused:false}; $('rp').classList.add('show'); keepAwake(true); rpEnter(0, false); clearInterval(ui.rpInt); ui.rpInt = setInterval(rpTick, 250); }
function rpEnter(i, afterRest){ const p = ui.rp; p.i = i; const st = p.steps[i]; if(!st) return rpFinish();
  if(st.sec){ if(afterRest){ p.phase = 'work'; p.end = Date.now() + st.sec*1000; } else { p.phase = 'prep'; p.end = Date.now() + 5000; } } else { p.phase = 'reps'; p.end = 0; }
  p.paused = false; rpRender(); }
function rpTick(){ const p = ui.rp; if(!p || p.paused || !p.end) return; const left = p.end - Date.now();
  if(left <= 0){ const st = p.steps[p.i];
    if(p.phase==='prep'){ beep(); p.phase = 'work'; p.end = Date.now() + st.sec*1000; }
    else if(p.phase==='work'){ beep(); if(st.rest){ p.phase = 'rest'; p.end = Date.now() + st.rest*1000; } else return rpEnter(p.i+1, false); }
    else if(p.phase==='rest'){ const nx = p.steps[p.i+1]; return rpEnter(p.i+1, !!(nx && nx.sec)); } }
  rpRender(); }
function rpNext(){ const p = ui.rp; const st = p.steps[p.i]; if(p.phase==='reps' && st.rest){ p.phase = 'rest'; p.end = Date.now() + st.rest*1000; rpRender(); return; } rpEnter(p.i+1, false); }
function rpPrev(){ rpEnter(Math.max(0, ui.rp.i-1), false); }
function rpPause(){ const p = ui.rp; if(!p.end) return; if(p.paused){ p.end = Date.now() + p.left; p.paused = false; } else { p.left = p.end - Date.now(); p.paused = true; } rpRender(); }
function rpClose(){ clearInterval(ui.rpInt); ui.rp = null; $('rp').classList.remove('show'); $('rp').innerHTML = ''; keepAwake(ui.tab==='log'); }
function rpFinish(){ const p = ui.rp; setRt(p.date, p.key, true); for(const pt of (p.r.parts||[])) setRt(p.date, pt, true);
  const ss = p.key.includes('@') ? null : (weekItems(weekByStart(mondayOf(p.date))).find(i => i.date===p.date && i.s.rt===p.id) || null);
  if(ss && !(S.done[ss.s.id]||{}).d) setDone(ss.s.id, {d:true, min:String(p.r.min)});
  beep(); toast(p.r.n+' afgerond ✓'); rpClose(); rerender(); }
function rpRender(){ const p = ui.rp; if(!p) return; const st = p.steps[p.i]; const nx = p.steps[p.i+1];
  const left = p.paused ? p.left : Math.max(0, p.end - Date.now()); const sec = Math.ceil(left/1000);
  const big = p.phase==='reps' ? '<div class="rpbig reps">'+esc(st.reps||'—')+'</div>' : '<div class="rpbig">'+(sec>=60 ? Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0') : sec)+'</div>';
  const ph = {prep:'Klaar maken…', work:'Houden / bezig', rest:'Rust · daarna: '+(nx?esc(nx.n)+(nx.side?' ('+nx.side+')':''):'klaar'), reps:'Tik op Volgende als je klaar bent'}[p.phase] + (p.paused?' · gepauzeerd':'');
  $('rp').innerHTML = '<div class="rpt"><span>'+esc(p.r.n)+' · '+(p.i+1)+'/'+p.steps.length+'</span><button class="btn sm" data-rp="stop">✕ Stop</button></div>'
    +'<div class="rpbar"><i style="width:'+Math.round(p.i/p.steps.length*100)+'%"></i></div>'
    +'<div class="rpn">'+esc(st.n)+'</div><div class="rps">'+[st.side, st.set].filter(Boolean).join(' · ')+'</div>'
    +'<div class="rpcue">'+(st.how.length ? '<ol style="margin:0 0 6px 18px;padding:0">'+st.how.map(x => '<li>'+esc(x)+'</li>').join('')+'</ol>' : '')+(st.cue && !st.how.includes(st.cue) ? '<div class="small">'+esc(st.cue)+'</div>' : '')+'<a class="btn sm" style="margin-top:8px;display:inline-flex;align-items:center" href="'+VID(st.q)+'" target="_blank" rel="noopener">▶ Bekijk video</a>'+(p.i===0 && p.r.note ? '<div class="small" style="margin-top:8px;color:var(--warn)">'+esc(p.r.note)+'</div>' : '')+'</div>'
    + big + '<div class="rpph">'+ph+'</div>'
    +'<div class="rpnext">'+(nx ? 'Hierna: '+esc(nx.n)+[nx.side, nx.set].filter(Boolean).map(z=>' · '+z).join('') : 'Laatste oefening')+'</div>'
    +'<div class="rpctl"><button class="btn" data-rp="prev">◀</button><button class="btn" data-rp="pause"'+(p.end?'':' disabled')+'>'+(p.paused?'Verder':'Pauze')+'</button><button class="btn pri" data-rp="next">'+(nx?'Volgende ▶':'Klaar ✓')+'</button></div>'; }
function rpeTodo(d){ const out = [];
  for(const dd of [addDays(d,-1), d]){ const w = weekByStart(mondayOf(dd)); if(!w) continue; const m = matchWeek(w);
    for(const it of weekItems(w).filter(i => i.date===dd && ['run','bike','race','hyrox','swim'].includes(i.s.t))){ const st = S.done[it.s.id]||{};
      if(m.by[it.s.id] && !st.rpe && !st.skip && !st.norpe) out.push(it); } }
  return out; }
function dailyCard(d, isT){ const x = dailyOf(d); const filled = x.rd!=null || x.sl!=null; let h = '';
  if(filled && !ui.dailyEdit[d]){ const ad0 = advice(d); const tone = ad0 ? ({groen:'g',oranje:'o',rood:'r'})[ad0.lvl] : '';
    h += '<div class="card" id="dailysum" style="display:flex;align-items:center;gap:8px"><div style="flex:1"><span class="small">Ochtendcheck'+(x.src==='oura'?' · uit Oura':'')+'</span><br>Readiness <b>'+(x.rd??'–')+'</b> · Slaap <b>'+(x.sl??'–')+'</b>'+(x.legs!=null?' · benen '+x.legs:'')+(x.pains?' · pijn: '+esc(Object.keys(x.pains).join(', ')):'')+(ad0?' <span class="pill '+tone+'">'+ad0.lvl+'</span>':'')+'</div><button class="btn sm" data-dailyedit="'+d+'">Wijzig</button></div>';
    if(isT && x.legs==null) h += '<div class="card legs" id="legsask" style="margin-top:-4px"><span class="small">Benen vandaag?</span><div class="chips xs">'+[1,2,3,4,5].map(v=>'<button class="chip" data-dlyc="legs" data-v="'+v+'">'+v+'</button>').join('')+'</div><button class="btn link" data-painopen="1" data-dailyedit="'+d+'">Pijn?</button></div>';
    if(ad0 && ad0.lvl!=='groen') h += '<div class="banner '+ad0.lvl+'" id="advice">'+ad0.txt+'</div>';
    return h; }
  h += '<div class="card" id="daily"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>Ochtendcheck</b><span class="small">'+(isT?'uit Oura · 20 sec':fmtDay(d))+'</span></div>';
  h += '<div class="dck" style="margin-top:6px"><label>Readiness<input type="text" inputmode="numeric" data-dly="rd" value="'+esc(x.rd??'')+'" placeholder="0–100"></label><label>Slaapscore<input type="text" inputmode="numeric" data-dly="sl" value="'+esc(x.sl??'')+'" placeholder="0–100"></label></div>';
  h += '<div class="legs"><span class="small">Benen</span><div class="chips xs">'+[1,2,3,4,5].map(v=>'<button class="chip'+(x.legs===v?' on':'')+'" data-dlyc="legs" data-v="'+v+'">'+v+'</button>').join('')+'</div></div>';
  const pains = x.pains || {};
  const hrvD = '<details style="flex:2"'+(x.hrv!=null||x.rhr!=null?' open':'')+'><summary class="small">HRV en rust-HF</summary><div class="dck"><label>HRV (ms)<input type="text" inputmode="numeric" data-dly="hrv" value="'+esc(x.hrv??'')+'"></label><label>Rust-HF<input type="text" inputmode="numeric" data-dly="rhr" value="'+esc(x.rhr??'')+'"></label></div></details>';
  if(!Object.keys(pains).length && !ui.painOpen) h += '<div class="row" style="margin-top:8px"><button class="btn sm" data-painopen="1">Pijn?</button>'+hrvD+'</div>';
  else { h += '<div class="row" style="margin-top:8px">'+hrvD+'</div>'; h += '<label class="f">Pijn? Tik de plek</label><div class="chips sm">'+PAIN_LOCS.map(l => '<button class="chip'+(pains[l]!=null?' on':'')+'" style="font-size:14px" data-ploc="'+esc(l)+'">'+esc(l)+'</button>').join('')+'</div>';
    for(const l of Object.keys(pains)) h += '<div style="margin-top:8px"><span class="small">'+esc(l)+' · hoe erg (1–8)?</span><div class="chips xs">'+[1,2,3,4,5,6,7,8].map(v => '<button class="chip'+(pains[l]===v?' on':'')+'" data-pscore="'+esc(l)+'" data-v="'+v+'">'+v+'</button>').join('')+'</div></div>'; }
  const ad = advice(d);
  if(ad) h += '<div class="banner '+ad.lvl+'" id="advice" style="margin-top:10px;margin-bottom:0"><b>'+ad.lvl.toUpperCase()+'</b>'+(ad.why.length?' · '+esc(ad.why.join(', ')):'')+'<br>'+ad.txt+'</div>';
  if(filled) h += '<div class="row"><button class="btn pri" data-dailydone="'+d+'">Klaar ✓</button></div>';
  return h+'</div>'; }
function rToday(){
  const t = today(); const d = ui.day || t; const isT = d===t;
  $('htitle').textContent = (isT ? 'Vandaag · ' : '')+fmtDay(d);
  let h = weekStrip(mondayOf(d), d, 'day');
  const chips = []; const nr = nextRace(); if(nr) chips.push(nr);
  const pv = PLAN.version+'/'+PLAN.updated; if(S.settings.seenPlan !== pv) chips.push('<button class="hchip info" data-seen="1">Plan bijgewerkt · '+esc(PLAN.updated)+' ✕</button>');
  if(chips.length) h += '<div class="hchips">'+chips.join('')+'</div>';
  const w = weekByStart(mondayOf(d)); const m = matchWeek(w);
  const items = weekItems(w).filter(i => i.date===d);
  h += '<div class="day today"><h2>Training '+(isT?'vandaag':fmtDay(d))+'</h2>';
  if(!w) h += '<div class="card mut">Geen plan voor deze week.</div>';
  else if(!items.length) h += '<div class="card mut">Niets gepland. Rust, of de routines hieronder.</div>';
  for(const it of items) h += sessCard(it, m, {});
  for(const a of m.extra.filter(x => x.date===d)) h += '<div class="strava"><b>Strava (niet gepland)</b> · '+esc(a.name)+'<div>'+actLine(a)+'</div></div>';
  h += '</div>';
  if(isT){ for(const it of rpeTodo(d)){ const a = matchWeek(weekByStart(mondayOf(it.date))).by[it.s.id];
      h += '<div class="card" id="rpeask_'+it.s.id+'"><div class="small">'+(it.date===d?'Vandaag':'Gisteren')+' · uit Strava: '+(a.km?fmtN(a.km)+' km · ':'')+fmtSec(a.el||a.sec)+'</div><b>Hoe zwaar was '+esc(it.s.title)+'?</b> <span class="small">RPE 1–10</span>'+infoBtn('rpe')+infoBox('rpe')+'<div class="chips xs" style="margin-top:6px">'+[1,2,3,4,5,6,7,8,9,10].map(r => '<button class="chip" data-srpe="'+it.s.id+'" data-v="'+r+'">'+r+'</button>').join('')+'</div><button class="btn link" data-norpe="'+it.s.id+'">Overslaan</button></div>'; }
    for(const it of fuelTodo()) h += '<div class="card"><b>Voeding loggen</b> <span class="small">'+esc(it.s.title)+' · '+fmtDay(it.date)+'</span><div class="small">Hoeveel g KH/uur en hoe ging je maag?</div><div class="row"><button class="btn sm" data-cardio="'+it.s.id+'">Log voeding</button></div></div>'; }
  h += dailyCard(d, isT);
  { const dow = (parseD(d).getDay()+6)%7; const wid = weekIdOf(mondayOf(d)); const ci = S.checkins[wid] || {};
    if(isT && dow >= 5 && !ci.cijfer && w) h += '<div class="card" id="checkcard" style="display:flex;align-items:center;gap:10px"><div style="flex:1"><b>Weekcheck-in</b><div class="small">1 minuut · cijfer, benen, richting en beschikbaarheid volgende week</div></div><button class="btn sm pri" data-tab="check">Start</button></div>'; }
  h += routinesCard(d, items);
  const tm = addDays(d,1); const items2 = weekItems(weekByStart(mondayOf(tm))).filter(i => i.date===tm);
  if(items2.length) h += '<div class="secttl">'+(isT?'Morgen':fmtDay(tm))+'</div><div class="card">'+items2.map(i => '<div style="display:flex;gap:8px;align-items:center;color:var(--tx2)">'+(TYPE_ICON[i.s.t]||'')+' <span>'+esc(i.s.title)+'</span><span class="small" style="margin-left:auto">'+esc(planLine(i.s))+'</span></div>').join('')+'</div>';
  if(!isT) h += '<div class="row"><button class="btn" data-strip="'+t+'" data-mode="day">↩ Terug naar vandaag</button></div>';
  $('view').innerHTML = h;
}

function rWeek(){
  const w = weekByStart(ui.week); const wid = weekIdOf(ui.week);
  $('htitle').textContent = 'Week '+wid.split('-W')[1]+' · '+fmtDay(ui.week);
  if(!w){ const acts = actsIn(ui.week, addDays(ui.week,6)); const sp = intensitySplit(acts); const km = acts.filter(a=>RUNS.includes(a.sport)).reduce((p,a)=>p+(a.km||0),0);
    let h = '<div class="card"><b>Vóór de start van het plan</b><div class="mut">Alleen wat Strava registreerde.</div>'+(acts.length?'<div class="kv"><span>Lopen</span><span><b>'+fmtN(km)+' km</b> · '+acts.length+' activiteiten · '+fmtH(acts.reduce((p,a)=>p+(a.sec||0),0))+'</span></div>':'')+(sp.tot?'<div class="small">Looptijd rustig/matig/hard: '+['rustig','matig','hard'].map(k=>Math.round(sp.t[k]/sp.tot*100)).join(' / ')+' %</div>':'')+'</div>';
    for(let i=0;i<7;i++){ const dd = addDays(ui.week,i); const da = acts.filter(a => a.date===dd); if(!da.length) continue;
      h += '<div class="day"><h2>'+fmtDay(dd)+'</h2>'+da.map(a => '<div class="strava"><b>'+esc(a.name)+'</b>'+(a.race?' 🏁':'')+'<div>'+actLine(a)+'</div></div>').join('')+'</div>'; }
    if(!acts.length) h += '<div class="card mut">Geen activiteiten bekend.</div>';
    $('view').innerHTML = h; return; }
  const t = today(); const m = matchWeek(w); let h = '';
  h += weekStrip(w.start, null, 'week');
  h += '<div class="hchips"><span class="hchip">'+esc(w.phase)+'</span><span class="pill '+(w.status==='concept'?'o':'g')+'" style="align-self:center">'+(w.status==='concept'?'Concept':'Definitief')+'</span></div>';
  const cf = availConflicts(w); if(cf.length) h += '<div class="banner oranje" id="availwarn"><b>Past niet in je beschikbaarheid</b><br>'+cf.map(esc).join('<br>')+'<div class="small" style="color:inherit;opacity:.8">Verplaats via “Lukt niet”, of laat het zondag aanpassen.</div></div>';
  if(w.days.length){ const wn = loadWarnings(w); if(wn.length) h += '<div class="banner oranje" id="loadwarn"><b>Let op opbouw</b><br>'+wn.map(esc).join('<br>')+'<details><summary class="small" style="color:inherit">Waarom?</summary><div class="small" style="color:inherit;opacity:.85">Grens: +30% loopvolume t.o.v. de weken ervoor. Bij beginnende lopers ging meer dan 30% erbij over 2 weken samen met meer overbelastingsblessures (Nielsen 2014); het bewijs is beperkt, dus een signaal, geen verbod.</div></details></div>'; }
  const items = weekItems(w);
  if(w.days.length) for(let i=0;i<7;i++){ const dd = addDays(w.start,i); const di = items.filter(x => x.date===dd);
    h += '<div class="day'+(dd===t?' today':'')+'" id="d_'+dd+'"><h2>'+fmtDay(dd)+(dd===t?' · vandaag':'')+'</h2>';
    if(!di.length) h += '<div class="card small">Geen sessie.</div>';
    for(const it of di) h += sessCard(it, m, {});
    for(const a of m.extra.filter(x => x.date===dd)) h += '<div class="strava"><b>Strava (niet gepland)</b> · '+esc(a.name)+'<div>'+actLine(a)+'</div></div>';
    h += '</div>'; }
  else h += '<div class="card mut">Nog niet uitgewerkt. Volgt na de check-in van de week ervoor.</div>';
  h += '<div class="secttl">Deze week</div>';
  if(w.note){ const nl = w.note.split('\n'); h += '<div class="card" id="coachnote"><div class="coachline">'+ic('progress',18)+'<div style="flex:1"><b>Coach</b><div class="det" style="margin-top:2px">'+esc(nl[0])+'</div>'+(nl.length > 1 ? '<details><summary class="small">Lees meer</summary><div class="det">'+esc(nl.slice(1).join('\n'))+'</div></details>' : '')+'</div></div><div class="small" style="margin-top:6px">'+esc(w.focus||'')+(w.status==='concept'?' · Concept: wordt definitief na je zondag-check-in.':'')+'</div></div>'; }
  { const rc = (PLAN.races||[]).find(r => r.date >= w.start && r.date <= addDays(w.start, 13) && !/Zevenheuvel/.test(r.name));
    if(rc){ const prevKm = [1,2,3,4].map(i => { const ww = weekByStart(addDays(w.start, -7*i)); return ww ? weekStats(ww).runPlan : 0; }); const peak = Math.max(...prevKm); const cur = weekStats(w).runPlan;
      if(peak > 0) h += '<div class="card" id="taper"><b>Taper richting '+esc(rc.name.split(' – ')[0])+'</b><div class="small">Loopvolume '+fmtN(cur)+' km = '+Math.round((1-cur/peak)*100)+'% minder dan de piekweek ('+fmtN(peak)+' km). Doel over 2 weken: 41–60% minder volume, intensiteit en frequentie houden (Bosquet 2007).</div></div>'; } }
  if(w.days.length) h += statsCard(w);
  $('view').innerHTML = h;
}

function setDone(sid, patch){
  const cur = S.done[sid] || {}; const n = Object.assign({}, cur, patch, {ts:Date.now()});
  for(const k in n) if(n[k]===null) delete n[k];
  S.done[sid] = n; const f = sessById(sid);
  enqueue('done', sid, f ? f.date : '', n);
}

function rLog(){
  $('htitle').textContent = 'Logger';
  let f = ui.sid && sessById(ui.sid);
  if(!f){
    const t0 = today(), mon = mondayOf(t0); const opts = [mon, addDays(mon,7)].flatMap(m => weekItems(weekByStart(m))).filter(i => hasEx(i.s) && !isSkipped(i.s.id) && i.date >= addDays(t0,-3) && i.date <= addDays(t0,7)).sort((a,b) => a.date.localeCompare(b.date));
    let h = '<div class="card"><h3>Kies een sessie</h3><div class="mut">Krachtsessies van de afgelopen 3 en komende 7 dagen.</div></div>';
    if(!opts.length) h += '<div class="card mut">Geen krachtsessies gevonden.</div>';
    for(const o of opts) h += '<button class="btn" style="width:100%;margin-bottom:8px;text-align:left" data-logger="'+o.s.id+'">'+(o.date===today()?'▶ ':'')+fmtDay(o.date)+' · '+esc(o.s.title)+'</button>';
    $('view').innerHTML = h; return;
  }
  const {s, date} = f;
  const ss = S.sets.filter(x => x.sid===s.id && !x.del).map(x=>x.ts); const dur = ss.length > 1 ? Math.round((Math.max(...ss)-Math.min(...ss))/60000) : 0;
  let h = '<div class="card"><span class="tag">'+(TYPE_LABEL[s.t]||s.t)+'</span><b>'+esc(s.title)+'</b><div class="mut">'+fmtDay(date)+' · scherm blijft aan'+(dur?' · bezig '+dur+' min':'')+'</div>';
  h += '<div class="row"><button class="btn sm" data-pick="1">Andere sessie</button><button class="btn sm '+((S.done[s.id]||{}).d?'pri':'')+'" data-done="'+s.id+'">'+((S.done[s.id]||{}).d?'✓ Afgerond':'Sessie afronden')+'</button></div></div>';
  h += groupStrip(s, date);
  const list = sessEx(s); const cnt = e => S.sets.filter(x => x.sid===s.id && x.code===cOf(s.id, e) && work(x)).length;
  let focus = ui.exFocus[s.id]; if(!list.some(e => e.c===focus) || S.exskip[s.id+'|'+focus]) focus = (list.find(e => !S.exskip[s.id+'|'+e.c] && cnt(e) < e.s) || {}).c; ui.exFocus[s.id] = focus;
  for(const e of list){
    const code = cOf(s.id, e), u = unitOf(code), X = EXN(code), timed = !!X.time;
    if(e.c!==focus && !S.exskip[s.id+'|'+e.c]){ const sets = S.sets.filter(x => x.sid===s.id && x.code===code && work(x)).sort((a,b)=>a.ts-b.ts); const dn = sets.length >= e.s;
      h += '<button class="exrow'+(dn?' done':'')+'" id="ex_'+e.c+'" data-exfocus="'+e.c+'"><span>'+(e.blk?'<span class="small">'+esc(e.lbl)+'</span><br>':'')+'<b>'+(dn?'✓ ':'')+esc(X.n)+'</b><br><span class="small">'+(sets.length ? sets.map(x => (x.kg?fmtKg(x.kg)+'×':'')+x.reps).join(', ') : e.s+' × '+e.lo+(e.hi!==e.lo?'–'+e.hi:'')+' '+(u==='kg'?'reps':u==='s'?'sec':u))+'</span></span><span class="small">'+sets.length+'/'+e.s+' ▾</span></button>'; continue; }
    if(S.exskip[s.id+'|'+e.c]){ h += '<div class="card small" id="ex_'+e.c+'" style="opacity:.6;display:flex;align-items:center;justify-content:space-between;gap:8px"><span><s>'+esc(X.n)+'</s> · overgeslagen</span><button class="btn sm" data-exskip="'+e.c+'">Toch doen</button></div>'; continue; }
    const now = S.sets.filter(x => x.sid===s.id && x.code===code && !x.del).sort((a,b)=>a.ts-b.ts);
    const prev = prevGroup(code, s.id, date); const sug = suggest(e, code, prev);
    const kk = 'kg_'+s.id+code; const kgVal = ui[kk] ?? (now.length ? (now[now.length-1].kg ?? '') : (sug.kg ?? ''));
    const rk = s.id+'|'+code; const rirSel = ui.rir[rk] ?? e.rir;
    h += '<div class="card exfocus" id="ex_'+e.c+'">'+(e.blk?'<div class="small up">'+esc(e.lbl)+'</div>':'')+'<b style="font-size:19px">'+esc(X.n)+'</b>'+(X.eq?' <span class="pill">'+EQ[X.eq]+'</span>':'')+(!e.blk && code!==e.c?' <span class="pill o">i.p.v. '+esc(EXN(e.c).n)+'</span>':'')+(e.add?' <span class="pill o">toegevoegd</span>':'');
    h += '<div class="presc"><span><b>'+e.s+'</b> sets</span><span><b>'+e.lo+(e.hi!==e.lo?'–'+e.hi:'')+'</b> '+(u==='kg'?'reps':u==='s'?'sec':u)+'</span>'+(e.rir!=null?'<span>RIR <b>'+e.rir+'</b> · RPE '+(10-e.rir)+'</span>':'')+(e.rest?'<span>rust <b>'+fmtSec(e.rest)+'</b></span>':'')+'</div>';
    if(e.blk) h += '<div class="chips sm optchips">'+e.opts.map(c => '<button class="chip'+(c===code?' on':'')+'" data-pickex="'+c+'" data-mode="swap" data-for="'+e.c+'">'+esc(EXN(c).n.replace(/ \(.*\)$/,''))+'</button>').join('')+'<button class="chip" data-swapopen="'+e.c+'">'+(ui.swap[e.c]?'▴':'Andere…')+'</button></div>';
    if(ui.swap[e.c]) h += pickerHtml(s, 'swap', e.c);
    if(e.note) h += '<div class="hint mut">'+esc(e.note)+'</div>';
    if(timed){
      if((X.inc||0) > 0) h += '<div class="small kgl">'+kgLabel(code)+'</div><div class="kg"><button class="btn" data-kgd="'+code+'" data-dir="-1">−</button><input type="text" inputmode="decimal" placeholder="kg" data-kg="'+code+'" value="'+esc(kgVal===null?'':String(kgVal).replace('.', ','))+'"><button class="btn" data-kgd="'+code+'" data-dir="1">+</button></div>';
      const run = ui.sw[code];
      h += '<div class="row"><button class="btn '+(run?'warn':'pri')+'" data-sw="'+code+'" '+(run?'data-swlive="'+code+'"':'')+'>'+(run?'■ Stop · 0:00':'▶ Start '+e.lo+' '+u)+'</button></div>';
      h += '<div class="row nw"><input class="num" type="text" inputmode="numeric" placeholder="m:ss" data-tm="s" autocomplete="off" data-secx="'+code+'"><button class="btn sm" data-secgo="'+code+'">✓ tijd loggen</button></div>';
      let wn = 0, kn = 0; h += '<div class="sets">'+now.map(x => { const n = x.wu ? 'W'+(++wn) : String(++kn); return '<span class="set">'+n+': '+(x.kg?fmtKg(x.kg)+' × ':'')+x.reps+(x.sec?' · '+fmtSec(x.sec):'')+'<button data-del="'+x.id+'" aria-label="Verwijder">×</button></span>'; }).join('')+'</div>';
    } else h += setTable(s, e, code, now, prev, sug);
    h += '<div class="hint sug">'+sug.txt+'</div>';
    if(timed) if(prev) h += '<div class="hint mut">Vorige keer ('+fmtDay(prev[0].date)+'): '+prev.map(x => (x.kg?fmtKg(x.kg)+'×':'')+x.reps+(x.rir!=null?'@'+x.rir:'')+(x.sec?' ('+fmtSec(x.sec)+')':'')).join(', ')+'</div>';
    h += '<div class="row" style="margin-top:4px">'+(e.blk?'':'<button class="btn link" data-swapopen="'+e.c+'">'+(ui.swap[e.c]?'Wissel ▴':'⇄ Wissel')+'</button>')+(e.add?'<button class="btn link" data-exdel="'+e.c+'">✕ Verwijder</button>':'<button class="btn link" data-exskip="'+e.c+'">Sla over</button>')+'</div>';
    h += '</div>';
  }
  h += '<div class="row"><button class="btn" data-addopen="1">'+(ui.addOpen?'Toevoegen ▴':'＋ Oefening toevoegen')+'</button></div>';
  if(ui.addOpen) h += pickerHtml(s, 'add', '');
  h += '<div class="small" style="margin:10px 2px">Geen zin om te loggen? Prima: tik “Sessie afronden” of vink hem af op Vandaag/Week.</div>';
  $('view').innerHTML = h; tick();
}

function pickerHtml(s, mode, forC){
  const be = mode==='swap' && sessEx(s).find(e => e.c===forC && e.blk);
  const grp = be ? be.g : mode==='swap' ? EXN(forC).g : null;
  const sug = be ? [] : mode==='swap' ? [forC].concat(EXN(forC).alt||[]).filter((c,i,a)=> a.indexOf(c)===i) : [];
  let h = '<div class="picker card" style="background:var(--card2);margin-top:10px">';
  if(sug.length>1) h += '<div class="small">Voorgesteld</div><div class="chips sm">'+sug.map(c => '<button class="chip" style="font-size:14px" data-pickex="'+c+'" data-mode="swap" data-for="'+forC+'">'+esc(EXN(c).n)+'</button>').join('')+'</div>';
  h += '<input type="search" data-exsearch="1" placeholder="Zoek oefening (bv. leg, row, curl)…" style="margin-top:8px">';
  const all = allExercises().filter(({x}) => !['plyo','hyrox'].includes(x.g) || mode!=='swap' || grp==='plyo' || grp==='hyrox');
  const ord = grp ? all.filter(o => o.x.g===grp).concat(all.filter(o => o.x.g!==grp)) : all;
  h += '<div class="exlist" style="max-height:300px;overflow:auto;margin-top:6px">'+ord.map(({c,x}, n) => (grp && n && x.g!==grp && ord[n-1].x.g===grp ? '<div class="small" style="margin:10px 0 2px">Andere spiergroepen</div>' : '')+'<button class="btn sm" style="width:100%;text-align:left;margin-top:4px;display:flex;justify-content:space-between;gap:8px" data-pickex="'+c+'" data-mode="'+mode+'" data-for="'+(forC||'')+'" data-name="'+esc((x.n+' '+(x.g||'')+' '+(EQ[x.eq]||'')+' '+c).toLowerCase())+'"><span>'+esc(x.n)+'</span><span class="small">'+esc((EQ[x.eq]?EQ[x.eq]+' · ':'')+(x.g||''))+'</span></button>').join('')+'</div>';
  h += '<details style="margin-top:10px"><summary class="small">Staat hij er niet tussen? Eigen oefening</summary>';
  h += '<input type="text" data-newname="1" placeholder="Naam, bv. Cable row eenarmig" style="margin-top:6px">';
  h += '<div class="row nw"><select data-neweq="1">'+Object.entries(EQ).map(([k,v]) => '<option value="'+k+'">'+v+'</option>').join('')+'</select><select data-newunit="1"><option value="kg">kg × reps</option><option value="reps">alleen reps</option><option value="s">seconden</option><option value="m">meters</option></select></div>';
  h += '<div class="row nw"><select data-newgroup="1">'+GROUPS.map(g=>'<option'+(g===grp?' selected':'')+'>'+g+'</option>').join('')+'</select><button class="btn sm pri" data-newex="1" data-mode="'+mode+'" data-for="'+(forC||'')+'">'+(mode==='swap'?'Maak en kies':'Maak en voeg toe')+'</button></div></details>';
  return h+'</div>';
}
/* sets als rijen (Hevy/Strong-patroon): vooraf ingevuld met vorige keer of suggestie, ✓ = set gelogd */
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
function plates(kg){ let r = (kg - 20)/2; if(!(r > 0)) return ''; const out = []; for(const p of PLATES){ while(r >= p - 1e-9){ out.push(p); r -= p; } } return r > 0.01 ? '' : 'stang 20 + per kant '+out.map(p => fmtKg(p)).join(' · '); }
function rowsFor(s, e, code, now, prev, sug){ const rk = s.id+'|'+code, u = unitOf(code), X = EXN(code);
  const hasKg = (X.inc||0) > 0 || (X.eq==='bw' && u==='kg'); const done = now.filter(work).length;
  const n = Math.max(0, (e.s||3) - done) + (ui.xrows[rk]||0); const R = ui.rv[rk] || (ui.rv[rk] = []);
  const lastKg = now.length ? now[now.length-1].kg : null; const pv = k => prev ? (prev[done + k] || prev[prev.length-1]) : null;
  for(let k = 0; k < n; k++) if(!R[k]){ const p = pv(k); const kg = hasKg ? (lastKg ?? sug.kg ?? (p ? p.kg : null)) : null;
    R[k] = {kg, reps: p && (!hasKg || Number(p.kg)===Number(kg)) ? p.reps : e.lo, wu:false}; }
  R.length = n; return {R, hasKg, rk}; }
function setTable(s, e, code, now, prev, sug){ const u = unitOf(code), X = EXN(code); const {R, hasKg, rk} = rowsFor(s, e, code, now, prev, sug);
  const ul = u==='kg' ? 'reps' : u==='s' ? 'sec' : u; let h = '';
  if(hasKg) h += '<div class="small kgl">'+kgLabel(code)+'</div>';
  h += '<div class="stab'+(hasKg?'':' nokg')+'"><div class="sh"><span>Set</span><span>Vorige</span>'+(hasKg?'<span>kg</span>':'')+'<span>'+ul+'</span><span></span></div>';
  let wn = 0, kn = 0; const pvStr = x => x ? (x.kg?fmtKg(x.kg)+'×':'')+x.reps : '–';
  for(const x of now){ const lab = x.wu ? 'W'+(++wn) : String(++kn); const p = prev && !x.wu ? prev[kn-1] : null;
    h += '<div class="sr ok'+(x.wu?' wu':'')+'"><span class="sn">'+lab+'</span><span class="pv">'+pvStr(p)+'</span>'+(hasKg?'<span class="v">'+(x.kg!=null?fmtKg(x.kg):'–')+'</span>':'')+'<span class="v">'+x.reps+(x.rir!=null?'<i>@'+x.rir+'</i>':'')+'</span><button class="sx" data-del="'+x.id+'" aria-label="Set verwijderen">×</button></div>'; }
  R.forEach((r, k) => { const p = prev ? prev[kn + k] || null : null; const lab = r.wu ? 'W' : String(kn + k + 1);
    h += '<div class="sr'+(r.wu?' wu':'')+'" data-row="'+rk+'|'+k+'"><button class="sn" data-rwu="'+rk+'|'+k+'" aria-label="Opwarmset aan/uit">'+lab+'</button><span class="pv">'+pvStr(p)+'</span>'+(hasKg?'<input type="text" inputmode="decimal" data-rkg="'+rk+'|'+k+'" value="'+esc(r.kg==null?'':String(r.kg).replace('.', ','))+'" placeholder="'+(X.eq==='bw'?'0':'kg')+'">':'')+'<input type="text" inputmode="numeric" data-rreps="'+rk+'|'+k+'" value="'+esc(r.reps==null?'':String(r.reps))+'"><button class="sok" data-rset="'+code+'" data-k="'+k+'" aria-label="Set loggen">✓</button></div>'; });
  h += '</div><div class="row" style="margin-top:6px"><button class="btn link" data-raddrow="'+rk+'">＋ Set</button><span class="small" style="flex:2">Tik het setnummer voor een opwarmset (W).</span></div>';
  if(u==='kg' && e.rir!==0){ const sel = ui.rir[rk] ?? e.rir; h += '<div class="rirrow"><span class="small">RIR volgende set'+infoBtn('rir')+'</span><div class="chips xs">'+[0,1,2,3,4].map(r => '<button class="chip'+(r===sel?' on':'')+'" data-rir="'+rk+'" data-v="'+r+'">'+r+'</button>').join('')+'</div></div>'+infoBox('rir'); }
  if(X.eq==='bb' && R[0] && R[0].kg > 20){ const pl = plates(Number(R[0].kg)); if(pl) h += '<div class="small plates">🏋 '+pl+'</div>'; }
  return h; }
function logSet(code, reps, extra, opt){
  const f = sessById(ui.sid); if(!f || reps==null || isNaN(reps)) return;
  const e = sessEx(f.s).find(x => cOf(f.s.id, x)===code) || {};
  const inp = document.querySelector('[data-kg="'+code+'"]'); const kg = opt ? opt.kg : inp ? num(inp.value) : null;
  const ts = Date.now(); const id = f.s.id+'|'+code+'|'+ts; const rk = f.s.id+'|'+code;
  const rec = Object.assign({id, date:f.date, sid:f.s.id, code, pc:e.c, kg, reps:Number(reps), ts}, extra||{});
  if(opt ? opt.wu : ui.wu[rk]) rec.wu = true;
  else if(unitOf(code)==='kg' && !EXN(code).time && e.rir!==0) rec.rir = ui.rir[rk] ?? e.rir;
  S.sets.push(rec); ui['kg_'+f.s.id+code] = kg ?? '';
  const n = S.sets.filter(x => x.sid===f.s.id && x.code===code && work(x)).length;
  if(e.s && n >= e.s){ const nx = sessEx(f.s).find(x => !S.exskip[f.s.id+'|'+x.c] && S.sets.filter(y => y.sid===f.s.id && y.code===cOf(f.s.id, x) && !y.del).length < x.s); ui.exFocus[f.s.id] = nx ? nx.c : null; }
  enqueue('set', id, f.date, rec);
  unlockAudio(); startTimer(rec.wu ? 60 : e.rest);
  const y = window.scrollY; rLog(); window.scrollTo(0, y);
  toast((kg?fmtKg(kg)+' kg × ':'')+reps+(rec.rir!=null?' @RIR '+rec.rir:'')+(rec.sec?' in '+fmtSec(rec.sec):'')+' gelogd');
}

function rDuur(){
  $('htitle').textContent = 'Duursessie loggen';
  const p = ui.prefill || {}; const sp = p.sport || 'run';
  let h = '<div class="card">';
  let sv = {}, isRace = false, longS = false;
  if(p.sid){ const f = sessById(p.sid); if(f){ h += '<div class="mut">Hoort bij: '+fmtDay(f.date)+' · '+esc(f.s.title)+'</div>'; isRace = f.s.t==='race'; longS = (f.s.min||0) > 75 || (f.s.km||0) >= 15; }
    const m = f ? matchWeek(f.w) : null; const a = m && m.by[p.sid];
    if(a){ sv = {km:a.km, sec:a.el||a.sec, hr:a.hr, w:a.w, hm:a.hm}; h += '<div class="banner info" style="margin-top:8px">Overgenomen uit Strava. Vul alleen RPE, voeding of correcties aan. Afstand en tijd tellen niet dubbel.</div>'; } }
  h += '<label class="f">Datum</label><input type="date" id="c_date" value="'+(p.date||today())+'">';
  h += '<label class="f">Sport</label><select id="c_sport">'+[['run','Hardlopen'],['trail','Trail'],['bike','Fiets'],['swim','Zwemmen'],['other','Anders']].map(o => '<option value="'+o[0]+'"'+(o[0]===sp?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  h += '<div class="row"><div><label class="f">Afstand (km)</label><input id="c_km" type="text" inputmode="decimal" placeholder="10,0" value="'+(sv.km?fmtN(sv.km,2):'')+'"></div><div><label class="f">Tijd · alleen cijfers</label><input id="c_time" type="text" inputmode="numeric" data-tm="h" placeholder="5230 → 52:30" autocomplete="off" value="'+(sv.sec?fmtSec(sv.sec):'')+'"><div class="small" id="c_time_h">Typ alleen cijfers</div></div></div>';
  h += '<div class="row nw"><div><label class="f">Gem. HF</label><input id="c_hr" type="text" inputmode="numeric" placeholder="bpm" value="'+(sv.hr||'')+'"></div><div id="c_wbox"'+(sp==='bike'?'':' style="display:none"')+'><label class="f">Gem. watt</label><input id="c_w" type="text" inputmode="numeric" placeholder="W" value="'+(sv.w||'')+'"></div><div><label class="f">Hoogtemeters</label><input id="c_hm" type="text" inputmode="numeric" placeholder="m" value="'+(sv.hm||'')+'"></div></div>';
  h += '<label class="f">RPE</label><div class="chips" id="c_rpe">'+[1,2,3,4,5,6,7,8,9,10].map(r => '<button class="chip" data-rpe="'+r+'">'+r+'</button>').join('')+'</div>';
  h += '<details class="card" style="background:var(--card2);margin-top:12px"'+(longS?' open':'')+'><summary><b>Voeding</b> <span class="small">(sessies > 75 min)</span></summary>';
  h += '<div class="row nw"><div><label class="f">KH g/uur</label><input id="c_kh" type="text" inputmode="numeric" placeholder="bv. 70"></div><div><label class="f">Wat</label><input id="c_wat" type="text" placeholder="2× Gel 100, 500 ml 320"></div></div>';
  h += '<label class="f">Maag (1 slecht – 5 perfect)</label><div class="chips sm">'+[1,2,3,4,5].map(v=>'<button class="chip" data-maag="'+v+'">'+v+'</button>').join('')+'</div></details>';
  h += '<label class="f">Notitie</label><input id="c_note" type="text" placeholder="Gevoel, terrein, splits…">';
  h += '<label class="f" style="display:flex;gap:10px;align-items:center"><input id="c_race" type="checkbox" style="width:28px;min-height:28px"'+(isRace?' checked':'')+'> Wedstrijd/test (telt mee voor records)</label>';
  h += '<div class="calc" id="c_calc"><span class="mut">Vul afstand en tijd in voor berekening.</span></div>';
  h += '<div class="row"><button class="btn pri" id="c_save">Opslaan</button></div></div>';
  const recent = S.cardio.filter(c=>!c.del).sort((a,b)=> b.date.localeCompare(a.date) || b.ts-a.ts).slice(0,15);
  h += '<div class="card"><h3>Handmatig gelogd</h3>'+(recent.length?'':'<div class="mut">Nog niets.</div>');
  for(const c of recent) h += '<div style="border-bottom:1px solid var(--line);padding:8px 0;display:flex;gap:8px"><div style="flex:1"><b>'+fmtDay(c.date)+' · '+c.sport+(c.race?' 🏁':'')+'</b><div class="small">'+(c.km?fmtN(c.km,2)+' km · ':'')+(c.sec?fmtSec(c.sec):'')+(c.hr?' · '+c.hr+' bpm':'')+(c.w?' · '+c.w+' W':'')+(c.hm?' · '+c.hm+' hm':'')+(c.rpe?' · RPE '+c.rpe:'')+(c.kh?' · '+c.kh+' g/u':'')+(c.maag?' · maag '+c.maag:'')+'</div><div class="small">'+calcCardio(c).join(' · ')+'</div>'+(c.note?'<div class="small">'+esc(c.note)+'</div>':'')+'</div><button class="btn sm bad" data-cdel="'+c.id+'">×</button></div>';
  h += '</div>';
  $('view').innerHTML = h; ui.rpe = null; ui.maag = null; if(sv.km || sv.sec) updCalc();
}
function cardioForm(){ const sec = tmParse($('c_time').value, 'h');
  return {date:$('c_date').value, sport:$('c_sport').value, km:num($('c_km').value), sec: isNaN(sec)?null:sec, hr:num($('c_hr').value), w:num($('c_w').value), hm:num($('c_hm').value),
    rpe:ui.rpe||null, kh:num($('c_kh').value), maag:ui.maag||null, wat:$('c_wat').value.trim(), note:$('c_note').value.trim(), race:$('c_race').checked}; }
function updCalc(){ const o = calcCardio(cardioForm());
  $('c_calc').innerHTML = o.length ? '<div class="small">Berekend door de app:</div>'+o.join('<br>') : '<span class="mut">Vul afstand en tijd in voor berekening.</span>'; }
