'use strict';
/* ---------- check-in + beschikbaarheid ---------- */
function bodyCard(){
  const b = S.body.slice().sort((p,q)=> p.date.localeCompare(q.date)); const last = b.filter(x=>x.w).pop(); const ib = b.filter(x=>x.ssm).pop();
  let h = '<div class="card" id="bodycard"><details id="bodydet"'+(ui.bodyOpen?' open':'')+'><summary id="bodysum"><b>Lichaam</b> <span class="small">'+(last?'laatst '+fmtN(last.w)+' kg':'gewicht wekelijks')+'</span></summary>';
  h += '<div class="row nw"><div><label class="f">Gewicht (kg)</label><input type="text" inputmode="decimal" id="b_w" placeholder="'+(last?fmtN(last.w):'77,0')+'"></div><div><label class="f">Taille (cm)</label><input type="text" inputmode="decimal" id="b_waist" placeholder="opt."></div></div>';
  h += '<div class="row nw"><div><label class="f">Borst</label><input type="text" inputmode="decimal" id="b_chest" placeholder="opt."></div><div><label class="f">Arm</label><input type="text" inputmode="decimal" id="b_arm" placeholder="opt."></div><div><label class="f">Bovenbeen</label><input type="text" inputmode="decimal" id="b_thigh" placeholder="opt."></div></div>';
  h += '<div class="row"><button class="btn pri" id="b_save">Bewaar meting</button></div>';
  h += '<div class="small" style="margin-top:6px">'+(last?'Laatste: '+fmtN(last.w)+' kg ('+fmtDay(last.date)+')':'Nog geen gewicht')+(ib?' · InBody '+fmtDay(ib.date)+': SSM '+fmtN(ib.ssm)+' kg, vet '+fmtN(ib.fatp)+'%':'')+'</div>';
  h += '<details style="margin-top:8px"><summary class="small">InBody-meting toevoegen of importcode plakken</summary>';
  h += '<div class="row nw"><div><label class="f">Datum</label><input type="date" id="ib_d" value="'+today()+'"></div><div><label class="f">Gewicht</label><input type="text" inputmode="decimal" id="ib_w"></div></div>';
  h += '<div class="row nw"><div><label class="f">SSM (kg)</label><input type="text" inputmode="decimal" id="ib_ssm"></div><div><label class="f">Vet (kg)</label><input type="text" inputmode="decimal" id="ib_fk"></div><div><label class="f">Vet %</label><input type="text" inputmode="decimal" id="ib_fp"></div></div>';
  h += '<div class="row"><button class="btn" id="ib_save">Bewaar InBody</button></div><label class="f">Importcode (begint met YB1:)</label><textarea id="ib_code"></textarea><div class="row"><button class="btn" id="ib_import">Importeer</button></div></details></details></div>';
  return h; }
function addBody(rec){ rec.ts = Date.now(); rec.id = rec.id || 'b|'+rec.date+'|'+(rec.src||'')+'|'+rec.ts; const i = S.body.findIndex(x => x.date===rec.date && (x.src||'')===(rec.src||''));
  if(i>=0) S.body[i] = Object.assign({}, S.body[i], rec); else S.body.push(rec); enqueue('body', rec.id, rec.date, rec); }
function importBody(code){ try { let c = String(code).trim(); if(c.startsWith('YB1:')) c = c.slice(4); const arr = JSON.parse(decodeURIComponent(escape(atob(c)))); arr.forEach(addBody); toast(arr.length+' metingen geïmporteerd'); return arr.length; } catch(e){ toast('Ongeldige code'); return 0; } }
function mobCard(){ const T = PLAN.mobTests||[]; if(!T.length) return ''; const L = (S.mob||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)); const last = L[L.length-1], first = L[0];
  const due = !last || diffD(today(), last.date) >= 28;
  let h = '<div class="card" id="mobcard"><details'+(ui.mobOpen?' open':'')+'><summary><b>Mobiliteitstest</b> <span class="small">elke 4 weken · '+(last?'laatste '+fmtDay(last.date):'nulmeting')+'</span></summary>';
  for(const t of T) h += '<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:6px"><b style="font-size:15px">'+esc(t.n)+'</b> <span class="small">doel '+esc(t.goal)+(last && last[t.k]!=null ? ' · vorige '+fmtN(last[t.k])+' '+t.u : '')+'</span><div class="small">'+esc(t.how)+' <a href="'+VID(t.q)+'" target="_blank" rel="noopener">▶ video</a></div><input type="text" inputmode="decimal" id="mt_'+t.k+'" placeholder="'+t.u+'"></div>';
  h += '<div class="row"><button class="btn pri" id="mt_save">Bewaar test</button></div>';
  if(first && last && first!==last) h += '<div class="small" style="margin-top:6px">Sinds '+fmtDay(first.date)+': '+T.filter(t => first[t.k]!=null && last[t.k]!=null).map(t => t.n.split(' (')[0]+' '+(last[t.k]-first[t.k]>=0?'+':'')+fmtN(last[t.k]-first[t.k])+' '+t.u).join(' · ')+'</div>';
  return h+'</details></div>'; }
function rCheck(){
  if(!ui.chkWeek){ const t = today(), mon = mondayOf(t), dow = (parseD(t).getDay()+6)%7; const prev = addDays(mon,-7);
    ui.chkWeek = (dow <= 1 && !S.checkins[weekIdOf(prev)]) ? prev : mon; }
  const wid = weekIdOf(ui.chkWeek); $('htitle').textContent = 'Check-in week '+wid.split('-W')[1];
  const ci = S.checkins[wid]; const qv = ci ? ci.qv : QV_CURRENT; const a = (ci && ci.a) || {};
  let h = '<div class="card"><div class="mut">Week van '+fmtDay(ui.chkWeek)+' t/m '+fmtDay(addDays(ui.chkWeek,6))+'. Trainingen, Strava, ochtendchecks en pijn gaan automatisch mee; jij geeft alleen je oordeel.</div></div>';
  if(qv >= 3){ h += '<div class="card" id="ckq">';
    for(const q of QSETS[qv]){ h += '<div style="margin-bottom:10px"><b style="font-size:15px">'+esc(q.q)+'</b>';
      if(q.t==='scale'){ h += '<div class="chips sm">'; for(let i=q.min;i<=q.max;i++) h += '<button class="chip'+(a[q.k]===i?' on':'')+'" data-ck="'+q.k+'" data-cv="'+i+'">'+i+'</button>'; h += '</div>'; }
      else if(q.t==='pick') h += '<div class="chips">'+q.opts.map(o => '<button class="chip'+(a[q.k]===o?' on':'')+'" style="flex:1;font-size:15px" data-ck="'+q.k+'" data-cvs="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>';
      else if(q.t==='area') h += '<textarea data-ct="'+q.k+'" style="margin-top:6px;min-height:60px" placeholder="Bijv. iets wat opviel, wensen voor volgende week">'+esc(a[q.k]||'')+'</textarea>';
      h += '</div>'; }
    h += '</div>'; }
  else for(const q of QSETS[qv]){
    if(q.t==='avail') continue; // v1-beschikbaarheid: oude antwoorden blijven in export; invoer loopt via het blok hieronder
    h += '<div class="card"><b>'+esc(q.q)+'</b>';
    if(q.t==='scale'){ h += '<div class="chips">'; for(let i=q.min;i<=q.max;i++) h += '<button class="chip'+(a[q.k]===i?' on':'')+'" data-ck="'+q.k+'" data-cv="'+i+'">'+i+'</button>'; h += '</div>'; }
    else if(q.t==='pick') h += '<div class="chips">'+q.opts.map(o => '<button class="chip'+(a[q.k]===o?' on':'')+'" style="flex:1;font-size:15px" data-ck="'+q.k+'" data-cvs="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>';
    else if(q.t==='text') h += '<input type="text" data-ct="'+q.k+'" value="'+esc(a[q.k]||'')+'" style="margin-top:8px">';
    else if(q.t==='area') h += '<textarea data-ct="'+q.k+'" style="margin-top:8px">'+esc(a[q.k]||'')+'</textarea>';
    h += '</div>';
  }
  h += availHtml(addDays(ui.chkWeek,7));
  h += mobCard();
  h += bodyCard();
  const w = weekByStart(ui.chkWeek); const st = w && w.days.length ? weekStats(w) : null;
  if(st) h += '<div class="card small">Automatisch: sessies '+st.sessDone+'/'+st.sessPlan+' · '+fmtN(st.runDone)+' km · '+Math.round(st.vertDone)+' hm · belasting '+Math.round(st.load)+(st.rd.length?' · Oura readiness gem. '+avg(st.rd):'')+(st.sl.length?' · slaap '+avg(st.sl):'')+'</div>';
  h += '<div class="row"><button class="btn pri" id="x_sunday">📋 Kopieer zondag-export</button></div><textarea id="x_out" readonly style="margin-top:10px;min-height:90px" placeholder="Export verschijnt hier; plak hem in de chat."></textarea>';
  $('view').innerHTML = h;
}
const SLOT_SHORT = {'Alleen ochtend':'Ochtend', 'Alleen avond':'Avond'};
/* beschikbaarheid: per dag alleen ochtend / avond / niet. Lange trainingen plant de coach altijd in het weekend. */
function slotOf(x){ if(!x) return null; if(x.no) return 'Niet'; if(x.am && x.pm) return '2×'; if(x.am) return 'Alleen ochtend'; if(x.pm) return 'Alleen avond'; return x.slot || null; }
function availHtml(nextMon){
  const nid = weekIdOf(nextMon); const av = S.avail[nid] || {d:{}, n:''};
  let h = '<div class="card" id="avail"><b>Beschikbaarheid week '+nid.split('-W')[1]+'</b><div class="small">Tik wanneer je kunt. Niets aangetikt = zoals gewoonlijk. Ik plan de trainingen; lange trainingen altijd in het weekend.</div>';
  for(let i=0;i<7;i++){ const dd = addDays(nextMon,i); const x = (av.d||{})[i] || {};
    const c = (k, lbl) => '<button class="chip'+(x[k]?' on':'')+'" data-avt="'+k+'" data-av="'+nid+'" data-i="'+i+'">'+lbl+'</button>';
    h += '<div class="avday"><b>'+fmtDay(dd)+'</b><div class="avrow3">'+c('am','Ochtend')+c('pm','Avond')+c('no','Niet')+'</div></div>'; }
  h += '<label class="f">Bijzonderheden (optioneel)</label><input type="text" data-avn="'+nid+'" value="'+esc(av.n||'')+'" placeholder="bijv. do pas na 20:00, za bruiloft"></div>';
  return h;
}
function availConflicts(w){ const av = S.avail[w.id]; if(!av || !av.d) return []; const out = [];
  for(let i=0;i<7;i++){ const x0 = av.d[i]; const x = x0 && Object.assign({}, x0, {slot: slotOf(x0)}); if(!x || (!x.slot && !x.min)) continue; const dd = addDays(w.start,i);
    const its = weekItems(w).filter(it => it.date===dd && !['rest'].includes(it.s.t) && !isSkipped(it.s.id)); const mins = its.reduce((p,it)=>p+(it.s.min||0),0);
    if(x.slot==='Niet' && its.length) out.push(fmtDay(dd)+': niet beschikbaar, maar '+its.length+' sessie(s) gepland.');
    else if(['1×','Alleen ochtend','Alleen avond'].includes(x.slot) && its.filter(it=>it.s.t!=='mobility').length > 1) out.push(fmtDay(dd)+': '+x.slot+', maar '+its.length+' sessies gepland.');
    if(num(x.min) && mins > num(x.min)) out.push(fmtDay(dd)+': max '+x.min+' min, gepland ± '+mins+' min.'); }
  return out; }
function setAvail(nid, i, patch){ const av = S.avail[nid] || (S.avail[nid] = {d:{}, n:''}); if(i==null) Object.assign(av, patch); else av.d[i] = Object.assign({}, av.d[i]||{}, patch); av.ts = Date.now(); enqueue('avail', nid, nid, av); }
function setAns(k, v){ const wid = weekIdOf(ui.chkWeek); const ci = S.checkins[wid] || (S.checkins[wid] = {qv:QV_CURRENT, a:{}});
  ci.a[k] = v; ci.ts = Date.now(); enqueue('checkin', wid, ui.chkWeek, ci); }
function setPains(d, p){ const x = S.daily[d] || (S.daily[d] = {}); if(Object.keys(p).length){ x.pains = p; x.pain = Math.max(...Object.values(p)); } else { delete x.pains; delete x.pain; } x.ts = Date.now(); enqueue('daily', d, d, x); }
function setDaily(d, k, v){ const x = S.daily[d] || (S.daily[d] = {}); if(v===null) delete x[k]; else x[k] = v; x.ts = Date.now(); enqueue('daily', d, d, x); }

/* ---------- export ---------- */
function weekText(start){
  const w = weekByStart(start); const wid = weekIdOf(start); const end = addDays(start, 6); const L = []; const m = matchWeek(w);
  L.push('WEEK '+wid+' ('+fmtDay(start)+' – '+fmtDay(end)+')'+(w?' · '+w.phase+' · '+w.status:'')+' · app '+APP_VERSION);
  if(w && w.days.length){ const st = weekStats(w); const sp = st.split; const pains = {}; for(let i=0;i<7;i++){ const y = dailyOf(addDays(start,i)); for(const [k,v] of Object.entries(y.pains||{})) pains[k] = Math.max(pains[k]||0, v); }
    L.push(''); L.push('SAMENVATTING');
    L.push('- Naleving: '+st.sessDone+'/'+st.sessPlan+' sessies'+(st.skipped?' ('+st.skipped+' vervallen)':'')+' · lopen '+fmtN(st.runDone)+'/'+fmtN(st.runPlan)+' km · '+Math.round(st.vertDone)+' hm · '+fmtH(st.secDone));
    if(sp.tot) L.push('- Looptijd rustig/matig/hard: '+['rustig','matig','hard'].map(k=>Math.round(sp.t[k]/sp.tot*100)).join('/')+' %');
    L.push('- Rustige runs te hard: '+(st.easyFlags.length ? st.easyFlags.map(f => fmtDay(f.date)+' ('+f.txt.replace(/^.*?: /,'')+')').join('; ') : 'geen'));
    if(st.intv.length) L.push('- Intervallen: '+st.intv.map(x => fmtDay(x.date)+': '+x.iv.txt).join(' | '));
    L.push('- Pijn: '+(Object.keys(pains).length ? Object.entries(pains).map(([k,v])=>k+' max '+v).join(', ') : 'geen gemeld'));
    { let rp = 0, rd = 0, mp = 0, md = 0, wp = 0, wd = 0, rec = 0; for(let i=0;i<7;i++){ const dd = addDays(start,i); const dl = dailyList(dd); const x = S.rt[dd]||{};
        if(dl.some(k => /^RUG/.test(k))){ rp++; if(RUGV.some(k => x[k])) rd++; } for(const k of dl.filter(k => /^MOB/.test(k))){ mp++; if(x[k]) md++; }
        for(const it of weekItems(w).filter(z => z.date===dd)){ if(it.s.rt){ mp++; if(x[it.s.rt]) md++; } const wc = wuFor(it.s); if(wc && (S.done[it.s.id]||{}).d){ wp++; if(x[wc[0]+'@'+it.s.id]) wd++; } }
        rec += Object.keys(x).filter(k => /^(REC|X_)/.test(k)).length; }
      { const sw = staticWeek(start), g = PLAN.staticGoal||{}; if(Object.keys(g).length) L.push('- Statisch rekken (min/kant, doel '+Object.values(g)[0]+'): '+Object.keys(g).map(t => t+' '+fmtN(sw[t]||0)).join(', ')); }
      if(rp || mp) L.push('- Routines (vaste momenten): rug '+rd+'/'+rp+' · mobiliteit '+md+'/'+mp+' · warming-ups '+wd+'/'+wp+' (bij afgevinkte trainingen) · herstel '+rec+'×'); }
    if(st.rd.length||st.sl.length) L.push('- Oura gem.: readiness '+(avg(st.rd)??'–')+', slaap '+(avg(st.sl)??'–'));
    const cf = availConflicts(weekByStart(addDays(start,7))||{id:''}); if(cf.length) L.push('- Conflicten volgende week: '+cf.join(' '));
    L.push(''); }
  L.push('Legenda: [x] afgevinkt · [S] alleen in Strava · [A] alternatief gekozen, niet afgevinkt · [–] niet uitgevoerd · [ ] niet gedaan');
  for(let i=0;i<7;i++){ const dd = addDays(start,i); const its = weekItems(w).filter(x => x.date===dd); const y = dailyOf(dd);
    const ex = m.extra.filter(x => x.date===dd); const hasD = y.rd!=null||y.sl!=null||y.legs!=null||y.pain!=null;
    if(!its.length && !ex.length && !hasD) continue;
    L.push(''); L.push(fmtDay(dd).toUpperCase()+(hasD ? '  [Oura readiness '+(y.rd??'–')+', slaap '+(y.sl??'–')+(y.hrv!=null?', HRV '+y.hrv:'')+(y.rhr!=null?', rust-HF '+y.rhr:'')+(y.legs!=null?', benen '+y.legs+'/5':'')+(y.pains?', pijn '+Object.entries(y.pains).map(([k,v])=>k+' '+v).join(', '):(y.pain!=null?', pijn '+y.pain+'/10':''))+']' : ''));
    for(const it of its){ const s = it.s, st = S.done[s.id] || {}, a = m.by[s.id];
      const mark = st.skip ? '[–]' : st.d ? '[x]' : a ? '[S]' : st.alt || st.inst ? '[A]' : '[ ]';
      L.push(mark+' '+s.title+(s.km?' (gepland '+fmtN(s.km)+' km)':'')+(it.date!==it.orig?' · verplaatst van '+fmtDay(it.orig):'')+(st.skip?' · niet uitgevoerd: '+st.skip:'')+(st.alt?' · ALTERNATIEF: '+st.alt:'')+(st.inst?' · ANDERS GEDAAN: '+instLine(st.inst):'')+(st.rpe?' · RPE '+st.rpe:'')+(st.min?' · '+st.min+' min':'')+(st.note?' · "'+st.note+'"':''));
      const efx = easyFlag(s, a), ivx = intervalEval(s, a); if(efx) L.push('    ⚠ '+efx); if(ivx) L.push('    Interval: '+ivx.txt);
      if(a){ L.push('    Strava: '+actLine(a)); if(a.laps) L.push('    Ronden: '+a.laps.map(l => l.m+'m '+fmtSec(l.sec)+(l.hr?'@'+l.hr:'')).join(', ')); }
      const sets = S.sets.filter(x => x.sid===s.id && !x.del).sort((a,b)=>a.ts-b.ts);
      if(sets.length){ const g = {}; for(const x of sets) (g[x.code] = g[x.code] || []).push((x.wu?'W ':'')+(x.kg?fmtKg(x.kg)+'×':'')+x.reps+(x.rir!=null?'@'+x.rir:'')+(x.sec?' ('+fmtSec(x.sec)+')':''));
        for(const c in g){ const pc = sets.find(x=>x.code===c).pc; const added = (S.extra[s.id]||[]).some(x=>x.c===pc); const bk = blocksOf(s).find(b => b.c===pc); L.push('    '+(bk ? bk.lbl+': ' : '')+EXN(c).n+(added?' (toegevoegd)':'')+(pc && pc!==c && !bk?' (i.p.v. '+EXN(pc).n+')':'')+': '+g[c].join(', ')); } }
      const skipped = sessEx(s).filter(e => S.exskip[s.id+'|'+e.c]).map(e => e.blk ? e.lbl : EXN(e.c).n); if(skipped.length) L.push('    Overgeslagen oefeningen: '+skipped.join(', '));
      if((st.d || m.by[s.id]) && hasEx(s) && !sets.length){ const L2 = sessEx(s).filter(e => !S.exskip[s.id+'|'+e.c]); L.push('    (afgevinkt zonder te loggen; telt als gepland: '+(st.alt ? 'eerste 3 oefeningen × 2 sets' : L2.map(e => EXN(cOf(s.id, e)).n.replace(/ \(.*\)$/,'')+' '+e.s+'×'+e.lo+(e.hi!==e.lo?'–'+e.hi:'')).join(', '))+')'); } }
    for(const a of ex) L.push('[+] Niet gepland, Strava: '+a.name+' · '+actLine(a));
  }
  const cs = S.cardio.filter(c => !c.del && c.date>=start && c.date<=end).sort((a,b)=>a.date.localeCompare(b.date));
  if(cs.length){ L.push(''); L.push('HANDMATIG GELOGD'); for(const c of cs) L.push('- '+fmtDay(c.date)+' '+c.sport+(c.race?' (wedstrijd/test)':'')+': '+[c.km?fmtN(c.km,2)+' km':'', c.sec?fmtSec(c.sec):'', c.hr?c.hr+' bpm':'', c.w?c.w+' W':'', c.hm?c.hm+' hm':'', c.rpe?'RPE '+c.rpe:''].filter(Boolean).join(' ')+(c.kh||c.wat?' · voeding '+(c.kh?c.kh+' g/u ':'')+(c.wat||'')+(c.maag?' maag '+c.maag+'/5':''):'')+(c.note?' · '+c.note:'')+' | berekend: '+calcCardio(c).join('; ').replace(/<[^>]+>/g,'')); }
  if(w && w.days.length){ const st = weekStats(w); L.push(''); L.push('WEEKCIJFERS (gepland → gedaan)');
    L.push('Sessies '+st.sessPlan+' → '+st.sessDone+' · Lopen '+fmtN(st.runPlan)+' → '+fmtN(st.runDone)+' km · Hoogtemeters '+st.vertPlan+' → '+Math.round(st.vertDone)+' · Tijd '+fmtH(st.minPlan*60)+' → '+fmtH(st.secDone)+' · sRPE '+Math.round(st.load));
    L.push('Krachtsets per groep: '+(Object.entries(st.groups).map(([g,n])=>g+' '+n).join(', ')||'–'));
    if(st.rd.length||st.sl.length) L.push('Oura gemiddeld: readiness '+(avg(st.rd)??'–')+', slaap '+(avg(st.sl)??'–')); }
  const ci = S.checkins[wid];
  L.push(''); if(ci){ L.push('CHECK-IN (vragenset v'+ci.qv+')'); for(const q of QSETS[ci.qv]){ let v = ci.a[q.k];
      if(q.t==='avail'){ if(!v) continue; const nm = addDays(start,7); v = [0,1,2,3,4,5,6].map(i => fmtDay(addDays(nm,i)).split(' ')[0]+': '+(v[i]||'–')).join(', ')+(v.n?' · '+v.n:''); }
      L.push('- '+q.q+': '+(v===undefined||v===''?'–':v)); } }
  else L.push('CHECK-IN: niet ingevuld');
  const nm = addDays(start,7), nid = weekIdOf(nm), av = S.avail[nid];
  L.push(''); L.push('BESCHIKBAARHEID '+nid);
  if(av){ for(let i=0;i<7;i++){ const x = (av.d||{})[i] || {}; L.push('- '+fmtDay(addDays(nm,i))+': '+(slotOf(x)||'zoals gewoonlijk')+(x.min?' · max '+x.min+' min':'')+(x.note?' · '+x.note:'')); } if(av.n) L.push('- Algemeen: '+av.n); }
  else L.push('- niet ingevuld');
  return L.join('\n');
}
/* Bouw de app-stand opnieuw op uit Sheet-rijen: {kind: [data, …]} (zie sync/Code.gs doGet). */
function fromSheet(d){ const o = blank(); const R = k => (d[k]||[]).map(r => ({id: r.id, x: typeof r.data==='string' ? JSON.parse(r.data) : r.data})).filter(r => r.id && r.x);
  for(const r of R('set')) o.sets.push(r.x);
  for(const r of R('cardio')) o.cardio.push(r.x);
  for(const r of R('body')) o.body.push(r.x);
  for(const [k, dst] of [['done','done'],['checkin','checkins'],['avail','avail'],['daily','daily'],['custom','custom']]) for(const r of R(k)) o[dst][r.id] = r.x;
  for(const r of R('move')) if(r.x.to) o.moves[r.id] = r.x.to;
  for(const r of R('sessmod')){ Object.assign(o.swaps, r.x.swaps||{}); if(r.x.extra && r.x.extra.length) o.extra[r.id] = r.x.extra; Object.assign(o.exskip, r.x.exskip||{}); }
  return migrate(o); }
function backupCode(){ const j = JSON.stringify(S); return 'YC1:'+btoa(unescape(encodeURIComponent(j))); }
function parseBackup(code){ code = code.trim(); if(code.startsWith('YC1:')) code = code.slice(4);
  const j = code.startsWith('{') ? code : decodeURIComponent(escape(atob(code))); const o = JSON.parse(j);
  if(!o || typeof o!=='object' || !('sets' in o)) throw new Error('Geen geldige back-up'); return migrate(o); }

function rMeer(){
  $('htitle').textContent = 'Meer';
  const st = S.settings; const wk = mondayOf(today());
  const base = location.href.replace(/[#?].*$/,'').replace(/[^/]*$/,'');
  let h = '<div class="card"><button class="btn" style="width:100%;margin-bottom:8px;text-align:left" data-tab="check">Weekcheck-in en beschikbaarheid</button><button class="btn" style="width:100%;margin-bottom:8px;text-align:left" data-tab="log">Krachtsessie loggen</button><button class="btn" style="width:100%;text-align:left" data-manual="1">Duursessie handmatig loggen</button></div>';
  { const on = !!st.oura; h += '<div class="card" id="ouracard"><h3>Oura</h3>';
    if(!st.sheetUrl) h += '<div class="mut">Werkt via je Google Sheet-script: vul eerst onder Instellingen de web-app-URL in.</div>';
    else h += '<div class="mut">'+(on ? 'Verbonden. Readiness, slaap, HRV en rust-HF komen elke ochtend vanzelf in je ochtendcheck'+(st.ouraLast?' (laatst opgehaald '+new Date(st.ouraLast).toLocaleString('nl-NL',{weekday:'short',hour:'2-digit',minute:'2-digit'})+')':'')+'. Zelf ingevulde waarden worden nooit overschreven.' : 'Niet verbonden. Na verbinden vult de app je ochtendcheck zelf in.')+'</div><div class="row"><button class="btn '+(on?'':'pri')+'" data-oura="1">'+(on?'Opnieuw verbinden':'Verbind Oura')+'</button>'+(on?'<button class="btn" data-ourapull="1">Nu ophalen</button>':'')+'</div>';
    h += '</div>'; }
  h += '<div class="card"><h3>Week exporteren</h3><div class="mut">Zondag: plak dit in de chat (of gebruik de knop op Check-in).</div>';
  h += '<div class="row"><select id="x_week">'+[-1,0].map(o => { const s = addDays(wk, o*7); return '<option value="'+s+'"'+(o===0?' selected':'')+'>Week '+weekIdOf(s).split('-W')[1]+' ('+fmtDay(s)+')</option>'; }).join('')+'</select></div>';
  h += '<div class="row"><button class="btn pri" id="x_text">Kopieer weektekst</button><button class="btn" id="x_json">Kopieer back-upcode</button></div>';
  h += '<textarea id="x_out" readonly style="margin-top:10px;min-height:120px" placeholder="Hier verschijnt de export."></textarea>';
  h += '<div class="small">Laatste back-up: '+(st.lastBackup?fmtDay(iso(new Date(st.lastBackup))):'nooit')+'</div></div>';
  h += '<div class="card"><h3>Agenda</h3><div class="mut">Eén keer abonneren; je agenda werkt zichzelf bij (iPhone ververst periodiek, niet direct).</div>';
  h += '<div class="row"><a class="btn pri" id="ics_sub" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="'+base.replace(/^https?:/,'webcal:')+'ics/all.ics">📆 Abonneer op trainingsagenda</a></div></div>';
  h += '<div class="card"><h3>Herstellen</h3><div class="mut">Plak een back-upcode (begint met YC1:).</div><textarea id="r_in" style="margin-top:8px"></textarea>';
  h += '<div class="row"><button class="btn '+(ui.restoreArmed?'bad':'warn')+'" id="r_go">'+(ui.restoreArmed?'Bevestig: alles vervangen':'Herstel back-up')+'</button></div>';
  if(st.sheetUrl) h += '<div class="row"><button class="btn" id="r_sheet">'+(ui.sheetArmed?'Bevestig: vervangen door Sheet-data':'Herstel uit Google Sheet')+'</button></div>';
  if(localStorage.getItem(KEY+'.undo')) h += '<div class="row"><button class="btn" id="r_undo">↶ Laatste herstel ongedaan maken</button></div>';
  h += '</div>';
  h += '<div class="card"><h3>Instellingen</h3><div class="small">Leeg = waarde uit het plan.</div>';
  h += '<div class="row"><div><label class="f">FTP (W)</label><input id="s_ftp" type="text" inputmode="numeric" placeholder="'+(PLAN?PLAN.athlete.ftp:'')+'" value="'+esc(st.ftp??'')+'"></div><div><label class="f">LTHR (bpm)</label><input id="s_lthr" type="text" inputmode="numeric" placeholder="'+(PLAN?PLAN.athlete.lthr:'')+'" value="'+esc(st.lthr??'')+'"></div></div>';
  h += '<label class="f">Grens rustige run: max gem. HF</label><input id="s_easy" type="text" inputmode="numeric" placeholder="145" value="'+esc(st.easyHr??'')+'">';
  h += '<label class="f">Drempeltempo (m:ss /km)</label><input id="s_tpace" type="text" inputmode="numeric" data-tm="s" autocomplete="off" placeholder="'+(PLAN?fmtSec(PLAN.athlete.tpace):'')+'" value="'+(st.tpace?fmtSec(st.tpace):'')+'">';
  h += '<label class="f">Google Sheet web-app-URL (optioneel)</label><input id="s_url" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="'+esc(st.sheetUrl||'')+'">';
  h += '<label class="f">Geheime sleutel (zelfde als APP_KEY in je script)</label><div class="row nw"><input id="s_key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(st.sheetKey||'')+'" placeholder="nog geen sleutel"><button class="btn sm" id="s_newkey">Maak</button></div>';
  if(st.sheetUrl && !st.sheetKey) h += '<div class="banner oranje" style="margin-top:8px">Je Sheet-script is nog open voor iedereen met de URL. Maak een sleutel, zet hem als APP_KEY in je script en bewaar hier.</div>';
  h += '<div class="row"><button class="btn pri" id="s_save">Bewaar instellingen</button><button class="btn" id="s_sync">Sync nu ('+S.queue.length+')</button></div>';
  h += '<div class="small" style="margin-top:8px">Wachtrij: '+S.queue.length+' item(s). Versturen gaat zonder ontvangstbevestiging (no-cors). Leidend blijft je back-upcode.</div></div>';
  h += '<div class="card"><h3>Handmatig loggen</h3><div class="row"><button class="btn" data-manual="1">＋ Duursessie zonder Strava</button></div></div>';
  h += '<div class="card small">App '+APP_VERSION+' · plan v'+(PLAN?PLAN.version+' ('+PLAN.updated+')':'–')+' · Strava '+esc(STRAVA.updated||'–')+' · opslag "'+KEY+'" ('+(ui.persist===true?'blijvend':ui.persist===false?'niet blijvend':'?')+') · '+S.sets.length+' sets, '+S.cardio.length+' duurlogs, '+Object.keys(S.daily).length+' ochtendchecks</div>';
  $('view').innerHTML = h;
}
async function copy(txt){ const o = $('x_out'); if(o) o.value = txt; try { await navigator.clipboard.writeText(txt); toast('Gekopieerd'); } catch(e){ if(o){ o.select(); try { document.execCommand('copy'); toast('Gekopieerd'); } catch(_){ toast('Selecteer en kopieer handmatig'); } } } }

/* ---------- sync naar Google Sheet ---------- */
let syncT = null;
function scheduleSync(){ clearTimeout(syncT); syncT = setTimeout(flush, 2000); }
async function flush(){
  const url = S.settings.sheetUrl; if(!url || !S.queue.length || !navigator.onLine) return;
  const batch = S.queue.slice(0, 50);
  try { await fetch(sheetU(''), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(batch)});
    const sent = new Set(batch.map(b => b.kind+'|'+b.id+'|'+b.ts)); S.queue = S.queue.filter(q => !sent.has(q.kind+'|'+q.id+'|'+q.ts)); save();
    if(S.queue.length) scheduleSync(); if(ui.tab==='meer') rMeer();
  } catch(e){ /* offline: blijft in wachtrij */ }
}
window.addEventListener('online', scheduleSync);
