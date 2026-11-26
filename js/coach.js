'use strict';
/* ---------- coachschermen: training vooraf, weekevaluatie, seizoen ---------- */
/* Alles wordt afgeleid uit plan.json + Strava + eigen logs. Optionele sessievelden in plan.json overschrijven de standaardteksten:
   s.why (tekst), s.cues ([tekst]), s.ifthen ([[als, dan]]), s.success (tekst). Week: w.review = {changes:[[jouw input, wat ik deed]], focus:'…'}. */
const lthrOf = () => Number(setting('lthr')) || (PLAN.athlete||{}).lthr || 173;
const tpOf = () => Number(setting('tpace')) || (PLAN.athlete||{}).tpace || 275;
function sessKind(s){ const ti = s.title||'', all = ti+' '+(s.detail||'');
  if(s.t==='race') return 'race';
  if(s.t==='run'){
    if(/heuvel|bergop|hill/i.test(ti)) return 'heuvel';
    if(/drempel|threshold|tempoblok/i.test(ti)) return 'drempel';
    if(/shake|racegevoel|reisdag|activatie/i.test(ti)) return 'activatie';
    if(/wandel|powerhike/i.test(ti)) return 'herstel';
    if(s.tgt && s.tgt.pace) return s.tgt.pace[0] >= tpOf()*0.96 ? 'drempel' : 'interval';
    if(/×|interval|vo2/i.test(ti)) return 'interval';
    if(/lange|long|trail/i.test(ti) || (s.km||0) >= 16) return 'lang';
    return 'easy'; }
  if(s.t==='bike') return /×|interval|sweet|drempel|vo2|over-?under/i.test(ti) ? 'fietskwal' : 'fietsz2';
  return s.t; }
const KIND = {
  easy:{l:'Rustig', rpe:'2–3', why:'Aerobe basis en herstel: meer haarvaten en mitochondriën zonder de vermoeidheid van een harde dag. Hier bouw je de motor, en het maakt je harde dagen beter.',
    ok:'Hartslag het hele stuk onder {ez} en je had zin in meer.', cues:['Praattempo. Loopt de hartslag op: langzamer, of even wandelen. Tempo maakt niet uit.','Strides (als gepland) aan het eind: 20 s soepel snel, volledig herstel ertussen.']},
  herstel:{l:'Herstel', rpe:'1–2', why:'Doorbloeding zonder nieuwe belasting. Het doel is morgen frisser zijn, niet trainen.', ok:'Je voelt je na afloop beter dan ervoor.', cues:['Echt rustig. Twijfel je, dan korter.']},
  lang:{l:'Lange duur', rpe:'3–4', why:'Duurvermogen: je hart, vetverbranding en benen wennen aan uren belasting. De basis onder Parijs én Mozart.',
    ok:'Laatste kwartier even soepel als het eerste, HF-drift onder 5%.', cues:['Eerste 30 min bewust traag; de run begint pas halverwege.','Voeding vanaf 45 min, daarna elke 20–30 min. Oefen wat je in de wedstrijd neemt.']},
  drempel:{l:'Drempel', rpe:'7', why:'Je drempel omhoog: langer een hoog tempo vasthouden zonder te verzuren. Dit is de motor achter je 10 km, je halve en Parijs.',
    ok:'Alle blokken binnen {pace}, hartslag aan het eind van een blok niet boven {lt}.', cues:['Blok 1 bewust aan de trage kant. De laatste moet net zo snel kunnen als de eerste.','Herstel joggend, niet stilstaan: stilstaan maakt elk blok een nieuwe start.']},
  interval:{l:'Interval', rpe:'8', why:'VO2max en snelheid: hoge zuurstofopname en loopeconomie op hoog tempo. Maakt je 5 en 10 km sneller.',
    ok:'Alle herhalingen binnen {pace}, geen verval van meer dan 5 s/km van eerste naar laatste.', cues:['De eerste herhaling is de rem: niet sneller dan het doel.','Techniek houden: rechtop, ontspannen schouders, snelle voet.']},
  heuvel:{l:'Heuvels', rpe:'8', why:'Kracht en loopeconomie bergop zonder veel impact. Specifiek voor trail en Mozart, en het helpt je vlakke snelheid.',
    ok:'Laatste herhaling even krachtig als de eerste; terug naar beneden rustig.', cues:['Kort, krachtig, rechtop. Armen actief, korte passen.','Bergaf rustig joggen of wandelen: het herstel hoort bij de training.']},
  activatie:{l:'Activatie', rpe:'2–4', why:'Benen wakker maken zonder vermoeidheid. Vlak voor een wedstrijd haal je hier niets meer, je kunt alleen verliezen.',
    ok:'Je voelt je na afloop frisser dan ervoor.', cues:['Versnellingen soepel, niet maximaal.']},
  race:{l:'Wedstrijd', rpe:'9–10', why:'Uitvoeren wat je hebt opgebouwd.', ok:'Gelijkmatige of negatieve split, voeding volgens plan.',
    cues:['Start gecontroleerd: het eerste kwart is voor de rest van de race.','Voeding op tijd, niet pas als je het nodig hebt.']},
  fietsz2:{l:'Fiets duur', rpe:'3', why:'Extra aerobe uren zonder loopimpact. Je motor groeit, je benen herstellen.', ok:'Hartslag en vermogen stabiel, geen piekjes.', cues:['Cadans 85–95.','Bij duurritten > 90 min: 60–80 g koolhydraten per uur.']},
  fietskwal:{l:'Fiets kwaliteit', rpe:'7–8', why:'Hoge intensiteit op de fiets: dezelfde motorprikkel, minder belasting voor je benen dan lopen.', ok:'Alle blokken op het doelvermogen, het laatste even sterk.', cues:['Eerste blok aan de onderkant van het vermogen.']},
  strength:{l:'Kracht', rpe:'RIR 1–3', why:'Sterkere, belastbaardere benen en romp: betere loopeconomie, minder blessures, en het fysiek dat je wilt.',
    ok:'Alle werksets binnen de RIR, techniek gelijk tot de laatste herhaling.', cues:['1–2 opwarmsets per hoofdoefening.','Rust voluit bij de zware sets; de lichte oefeningen mogen sneller.']},
  plyo:{l:'Plyometrie', rpe:'5–6', why:'Peesstijfheid en reactiekracht: elke pas levert meer terug. Kwaliteit boven kwantiteit.', ok:'Elk contact kort en stil, geen verval.', cues:['Stop zodra contacten langer of luider worden.']},
  hyrox:{l:'Hyrox', rpe:'7–8', why:'Lopen onder vermoeidheid en functionele kracht: specifiek voor de relay, en een stevige motorprikkel.', ok:'Lopen tussen de stations blijft binnen 10 s/km van je openingstempo.', cues:['Stations gecontroleerd; de winst zit in het lopen erna.']},
  swim:{l:'Zwemmen', rpe:'3–5', why:'Techniek en zwemconditie onderhouden zonder belasting voor je benen.', ok:'Lange slag, ontspannen ademhaling, techniek houdt tot het eind.', cues:['Focus op één techniekpunt per sessie.']},
  mobility:{l:'Mobiliteit', rpe:'1–2', why:'Bewegingsruimte in enkels, heupen en rug: soepeler lopen en minder klachten.', ok:'Gedaan, zonder forceren.', cues:[]}
};
const QUALK = ['drempel','interval','heuvel','fietskwal','hyrox','race'];
const fill = (t, s) => t.replace('{ez}', easyHr()).replace('{lt}', lthrOf()).replace('{pace}', (() => { const p = planPace(s); return p ? fmtPace(p[0])+'–'+fmtPace(p[1])+'/km' : 'het doeltempo'; })());
function prevOfKind(s, date){ const k = sessKind(s); let best = null;
  for(const w of PLAN.weeks){ if(w.start > date) break; const m = matchWeek(w);
    for(const it of weekItems(w)) if(it.date < date && it.s.id!==s.id && sessKind(it.s)===k && (m.by[it.s.id] || (S.done[it.s.id]||{}).d) && (!best || it.date > best.it.date)) best = {it, a:m.by[it.s.id]}; }
  return best; }
function briefRules(s, d, k){ const r = []; const lt = lthrOf(); const isT = d===today(); const y = dailyOf(d);
  const hit = c => c ? ' hit' : '';
  if(QUALK.includes(k) && k!=='race'){ const lo = y.rd!=null && y.rd < 65; r.push(['Readiness onder 65 of slecht geslapen'+(isT && y.rd!=null ? ' (vandaag '+y.rd+')' : ''), 'Easy 40 min, kwaliteit naar later in de week', hit(isT && lo)]); }
  if(k==='drempel') r.push(['HF boven '+lt+' al in blok 1', '5 s/km langzamer, de rest van de sessie ook', '']);
  if(k==='interval') r.push(['Herhaling 2 al trager dan het doel', 'Herhalingen inkorten of 1 minder; geen gevecht', '']);
  if(['easy','lang'].includes(k)) r.push(['Benen zwaar of spierpijn', k==='lang' ? 'Korter (−25%), tempo blijft rustig' : 'Zelfde duur fietsen in Z2', ''], ['Hartslag boven '+easyHr()+' bij rustig tempo', 'Wandelpauze van 1 min, daarna verder', '']);
  if(['run','race','hyrox'].includes(s.t)) r.push(['Harde wind of warm', 'Stuur op hartslag en gevoel; tempo mag 5–10 s/km trager', '']);
  const pains = Object.entries(y.pains||{}).filter(([,v]) => v >= 4);
  r.push(['Pijn die tijdens de sessie erger wordt'+(isT && pains.length ? ' (vandaag '+pains.map(([l,v]) => l+' '+v).join(', ')+')' : ''), 'Stoppen of omzetten naar fietsen; geen pijn wegtrainen', hit(isT && pains.length)]);
  const al = altOptions(s); if(al.length && QUALK.includes(k)) r.push(['Geen tijd of geen heuvel/loopband', al[0], '']);
  return (s.ifthen||[]).map(x => [x[0], x[1], '']).concat(r).slice(0, 5); }
function rBrief(){ const f = sessById(ui.sid); $('htitle').textContent = 'Training vooraf';
  if(!f){ $('view').innerHTML = '<div class="card mut">Sessie niet gevonden.</div>'; return; }
  const s = f.s, d = f.date, k = sessKind(s), K = KIND[k] || KIND.easy; const st = S.done[s.id]||{}; const a = matchWeek(f.w).by[s.id];
  const pp = planPace(s); const rpe = ((s.detail||'').match(/RPE\s*([\d–-]+)/)||[])[1] || K.rpe;
  let h = '<div class="brief" id="brief"><div class="bhd" style="--tc:'+(TYPE_COLOR[s.t]||'#6b7280')+'"><span class="meta-l">'+fullDay(d)+', '+esc(K.l.toLowerCase())+'</span><h2>'+esc(s.title)+'</h2>';
  const stat = []; if(s.km) stat.push([fmtN(s.km), 'km']); if(s.min) stat.push([String(s.min), 'min']); if(s.hm) stat.push([String(s.hm), 'hm']); stat.push([rpe, /RIR/.test(rpe) ? '' : 'RPE']);
  h += '<div class="bstats">'+stat.map(([v,l]) => '<div><b>'+esc(v)+'</b><span>'+l+'</span></div>').join('')+'</div></div>';
  if(s.detail) h += '<div class="card"><span class="eyebrow">Opbouw</span><div class="det">'+esc(s.detail)+'</div>'+(hasEx(s) ? '<div class="small" style="margin-top:6px">'+sessEx(s).length+' oefeningen, details in de logger.</div>' : '')+'</div>';
  h += '<div class="card coach"><span class="eyebrow">Waarom deze training</span><div>'+esc(s.why || K.why)+'</div></div>';
  const lim = []; if(pp) lim.push(['Tempo', fmtPace(pp[0])+'–'+fmtPace(pp[1]), 'per km']);
  const hd = (s.detail||'').match(/HF\s*[≤<]\s*(\d{3})/); const lt = lthrOf();
  if(hd) lim.push(['Hartslag', '≤ '+hd[1], 'gemiddeld']);
  else if(k==='drempel') lim.push(['Hartslag', (lt-8)+'–'+(lt-1), 'eind blok']);
  else if(['easy','lang','herstel','fietsz2'].includes(k)) lim.push(['Hartslag', '≤ '+(k==='fietsz2' ? Math.min(140, easyHr()) : easyHr()), 'hele sessie']);
  else if(k==='interval') lim.push(['Hartslag', '> '+(lt-3), 'mag, eind rep']);
  const w = (s.detail||'').match(/(\d{2,3})\s*[–-]\s*(\d{2,3})\s*W\b/); if(w) lim.push(['Vermogen', w[1]+'–'+w[2], 'watt']);
  lim.push(['Gevoel', rpe, /RIR/.test(rpe) ? 'reps in reserve' : k==='drempel' ? 'korte zinnen' : k==='interval' ? 'losse woorden' : ['easy','lang','herstel','fietsz2'].includes(k) ? 'praattempo' : 'RPE']);
  h += '<div class="card"><span class="eyebrow">Binnen deze grenzen</span><div class="lims">'+lim.map(([l,v,u]) => '<div><span>'+l+'</span><b>'+esc(v)+'</b><i>'+esc(u)+'</i></div>').join('')+'</div></div>';
  const pv = prevOfKind(s, d); const cues = (s.cues || K.cues).slice();
  let pvIv = null; if(pv && pv.a){ pvIv = intervalEval(pv.it.s, pv.a);
    if(pvIv && !pvIv.good && /te snel/.test(pvIv.txt)) cues.unshift('Vorige keer te snel gestart. Vandaag blok 1 op '+(pp ? fmtPace(pp[1]) : 'de trage kant')+' en pas vanaf de helft naar het midden van de range.');
    if(['easy','lang'].includes(k) && easyFlag(pv.it.s, pv.a)) cues.unshift('Vorige keer te hard voor rustig (gem. HF '+Math.round(pv.a.hr)+'). Vandaag hartslagscherm op je horloge.');
    if(k==='lang' && pv.a.dec != null && pv.a.dec >= 5) cues.unshift('Vorige lange duur liep de hartslag '+fmtN(pv.a.dec)+'% op. Begin langzamer en eet eerder.'); }
  if(cues.length) h += '<div class="card"><span class="eyebrow">Let op</span><ol class="cues">'+cues.slice(0,3).map(c => '<li>'+esc(c)+'</li>').join('')+'</ol></div>';
  const rules = briefRules(s, d, k);
  h += '<div class="card"><span class="eyebrow">Als het anders loopt</span><div class="ifs">'+rules.map(([x,y,c]) => '<div class="if'+c+'"><span>'+esc(x)+'</span><b>'+esc(y)+'</b></div>').join('')+'</div></div>';
  if(pv) h += '<div class="card" id="bprev"><span class="eyebrow">Vorige keer: '+esc(pv.it.s.title)+'</span><span class="meta-l">'+fullDay(pv.it.date)+'</span>'+(pv.a ? '<div class="small" style="margin-top:4px">'+actLine(pv.a)+'</div>' : '<div class="small">Afgevinkt, geen Strava-data.</div>')+(pvIv ? '<div class="banner '+(pvIv.good?'groen':'oranje')+'" style="margin:8px 0 0;padding:6px 10px;font-size:14px">'+esc(pvIv.txt)+'</div>' : '')+((S.done[pv.it.s.id]||{}).rpe ? '<div class="small">RPE '+S.done[pv.it.s.id].rpe+'</div>' : '')+'</div>';
  h += '<div class="card ok" id="bok"><span class="eyebrow">Geslaagd als</span><div>'+esc(fill(s.success || K.ok, s))+'</div></div>';
  if(a){ const iv = intervalEval(s, a), ef = easyFlag(s, a); h += '<div class="card"><span class="eyebrow">Uitgevoerd</span><div class="small">'+actLine(a)+'</div>'+(iv ? '<div class="banner '+(iv.good?'groen':'oranje')+'" style="margin:8px 0 0;padding:6px 10px;font-size:14px">'+esc(iv.txt)+'</div>' : '')+(ef ? '<div class="banner rood" style="margin:8px 0 0;padding:6px 10px;font-size:14px">'+esc(ef)+'</div>' : '')+planVsDone(s, a)+'</div>'; }
  const done = !st.skip && (st.d || !!a);
  h += '<div class="row"><button class="btn'+(done?'':' pri')+'" data-done="'+s.id+'">'+(done ? '✓ Gedaan' : 'Afvinken')+'</button>'+(hasEx(s) ? '<button class="btn" data-logger="'+s.id+'">Logger</button>' : '')+'</div>';
  $('view').innerHTML = h+'</div>'; }

/* ---------- weekevaluatie ---------- */
function weekReview(a){ const w = weekByStart(a); if(!w || !w.days.length) return null;
  const b = addDays(a,6), t = today(), st = weekStats(w), m = matchWeek(w), items = weekItems(w); const plus = [], minus = [], act = [];
  const partial = t <= b; const runs = items.filter(i => ['run','race'].includes(i.s.t) && !isSkipped(i.s.id)).map(i => ({i, a:m.by[i.s.id], k:sessKind(i.s)}));
  for(const r of runs){ if(!r.a) continue; const T = r.i.s.title;
    if(r.k==='race') plus.push(['Wedstrijd', esc(T.split(' – ')[0])+': '+actLine(r.a)]);
    if(r.k==='lang' && r.a.dec != null){ if(r.a.dec < 5) plus.push(['Lange duur', fmtN(r.a.km)+' km in '+fmtSec(r.a.sec/r.a.km)+'/km bij HF '+Math.round(r.a.hr||0)+', drift '+fmtN(r.a.dec)+'%. Je aerobe basis staat.']);
      else { minus.push(['Lange duur', 'hartslag liep '+fmtN(r.a.dec)+'% op ('+fmtN(r.a.km)+' km).']); act.push('Lange duur nog niet verlengen tot de drift onder 5% zit; eerste half uur trager en eerder eten.'); } }
    if(['drempel','interval'].includes(r.k)){ const iv = intervalEval(r.i.s, r.a); if(!iv) continue;
      const nx = Number((T.match(/(\d+)\s*×/)||[])[1]), got = Number(iv.txt.split(' ')[0]); if(nx && got < nx) continue; /* ronden niet goed te herkennen: geen oordeel */
      if(iv.good) plus.push([KIND[r.k].l, esc(T)+': '+iv.txt+'.']);
      else { minus.push([KIND[r.k].l, esc(T)+': '+iv.txt+'.']); act.push(/te snel/.test(iv.txt) ? 'Volgende kwaliteitssessie: eerste blok op de trage kant van de range.' : 'Doeltempo was te ambitieus voor de dag; volgende keer de range iets trager of herhalingen korter.'); } } }
  const easyRuns = runs.filter(r => r.a && ['easy','lang','herstel'].includes(r.k));
  if(st.easyFlags.length){ minus.push(['Rustig', st.easyFlags.length+'× te hard: '+st.easyFlags.map(f => fmtDay(f.date).split(' ')[0]).join(', ')+' (HF > '+easyHr()+').']); act.push('Rustige runs op hartslag lopen, niet op tempo. Langzamer op rustige dagen = beter op harde dagen.'); }
  else if(easyRuns.length >= 2) plus.push(['Rustig', 'rustige runs écht rustig (HF ≤ '+easyHr()+').']);
  const sp = st.split; if(sp.tot > 2*3600){ const r = Math.round(sp.t.rustig/sp.tot*100); if(r < 70){ minus.push(['Verdeling', r+'% van je looptijd rustig (richting 75–80%).']); act.push('Meer van je looptijd echt rustig: rustige runs op hartslag (≤ '+easyHr()+'), kwaliteit blijft kwaliteit.'); } else if(r >= 75 && !st.easyFlags.length) plus.push(['Verdeling', r+'% van je looptijd rustig.']); }
  const cr = st.sessPlan ? st.sessDone/st.sessPlan : 0;
  if(!partial){ if(cr >= 0.9) plus.push(['Consistentie', st.sessDone+'/'+st.sessPlan+' sessies gedaan.']); else if(cr < 0.7) minus.push(['Consistentie', st.sessDone+'/'+st.sessPlan+' sessies gedaan'+(st.skipped ? ', '+st.skipped+' bewust vervallen' : '')+'.']);
    if(st.runPlan > 5){ const kr = st.runDone/st.runPlan; if(kr > 1.15){ minus.push(['Volume', fmtN(st.runDone)+' km gelopen tegen '+fmtN(st.runPlan)+' gepland.']); act.push('Volgende week niet verder opbouwen dan gepland.'); } else if(kr < 0.75) minus.push(['Volume', fmtN(st.runDone)+' van '+fmtN(st.runPlan)+' km.']); } }
  for(const x of loadWarnings(w)){ minus.push(['Opbouw', esc(x)]); act.push('De sprong in belasting eerst laten landen: volgende week gelijk of lager.'); }
  const pl = {}; for(let i=0;i<7;i++) for(const [l,v] of Object.entries(dailyOf(addDays(a,i)).pains||{})) pl[l] = Math.max(pl[l]||0, v);
  const bad = Object.entries(pl).filter(([,v]) => v >= 4); if(bad.length){ minus.push(['Pijn', bad.map(([l,v]) => l+' tot '+v+'/10').join(', ')+'.']); act.push('Pijnplek ≥ 4: belasting erop verlagen en volgen. Wordt het erger of verandert je looppas: laten nakijken.'); }
  const rd = []; for(let i=0;i<7;i++){ const y = dailyOf(addDays(a,i)); rd.push({d:addDays(a,i), rd:y.rd, sl:y.sl}); }
  const rv = rd.filter(x => x.rd!=null); const base = baseline(a, 'rd');
  const low = rv.filter(x => x.rd < 65); if(low.length >= 2){ minus.push(['Herstel', low.length+' dagen readiness onder 65.']); act.push('Slaap en eten voorop; kwaliteit alleen als de warming-up goed voelt.'); }
  let score = 7 + Math.min(2, plus.length*0.5) - Math.min(3, minus.length*0.75) + (!partial && cr >= 0.9 ? 0.5 : 0); score = Math.max(3, Math.min(10, Math.round(score)));
  const head = partial ? 'Week loopt nog' : score >= 9 ? 'Sterke week' : score >= 7 ? (minus.length ? 'Goede week, '+(minus.length===1 ? 'één aandachtspunt' : minus.length+' aandachtspunten') : 'Goede week') : score >= 5 ? 'Wisselende week' : 'Lastige week';
  const ci = (S.checkins[weekIdOf(a)]||{}).a || {};
  return {w, st, plus, minus, act:[...new Set(act)], score, head, partial, rd, base, ci, m}; }
function reviewHtml(a, compact){ const R = weekReview(a); if(!R) return ''; const {w, st} = R; const b = addDays(a,6);
  let h = '<div class="card review" id="review'+(compact?'c':'')+'"><span class="meta-l">Week '+weekIdOf(a).split('-W')[1]+', '+fmtDay(a)+' t/m '+fmtDay(b)+'</span>';
  h += '<div class="rvhd"><b>'+R.head+'</b><div class="grade"><b>'+(R.partial ? '…' : R.score)+'</b><span>coach</span></div>'+(R.ci.cijfer ? '<div class="grade you"><b>'+R.ci.cijfer+'</b><span>jij</span></div>' : '')+'</div>';
  h += R.plus.map(([l,x]) => '<div class="pm p"><i>+</i><div><b>'+l+'</b> '+x+'</div></div>').join('') + R.minus.map(([l,x]) => '<div class="pm m"><i>−</i><div><b>'+l+'</b> '+x+'</div></div>').join('');
  if(!R.plus.length && !R.minus.length) h += '<div class="small">Nog te weinig data voor een oordeel.</div>';
  if(R.act.length) h += '<div class="pm a"><i>→</i><div>'+R.act.slice(0, compact ? 1 : 3).map(esc).join('<br>')+'</div></div>';
  if(compact) return h+'<div class="row"><button class="btn sm" data-review="'+a+'">Bekijk hele evaluatie</button></div></div>';
  h += '</div>';
  const prev = [1,2,3].map(i => weekDone(addDays(a,-7*i))); const avg3 = prev.reduce((p,x)=>p+x.km,0)/3; const wd = weekDone(a);
  const ls = loadSeries(90).find(x => x.d===b) || null; const sp = st.split; const pc = k => sp.tot ? Math.round(sp.t[k]/sp.tot*100) : 0;
  const rows = [['Lopen', fmtN(st.runDone)+' km', 'plan '+fmtN(st.runPlan)+' · gem. 3 wk '+fmtN(avg3)],
    ['Hoogtemeters', Math.round(st.vertDone)+' m', st.vertPlan ? 'plan '+st.vertPlan : 'max. vorige 3 wk '+Math.round(Math.max(...prev.map(x=>x.hm)))],
    ['Langste loop', fmtN(wd.long)+' km', 'max. vorige 3 wk '+fmtN(Math.max(...prev.map(x=>x.long)))],
    ['Sessies', st.sessDone+'/'+st.sessPlan, st.skipped ? st.skipped+' vervallen' : ''],
    ['Rustig / matig / hard', sp.tot ? pc('rustig')+' / '+pc('matig')+' / '+pc('hard')+' %' : '–', 'doel ≥ 75% rustig'],
    ['Trainingstijd', fmtH(st.secDone), 'plan '+fmtH(st.minPlan*60)]];
  if(ls) rows.push(['Fitheid / vermoeidheid', Math.round(ls.ctl)+' / '+Math.round(ls.atl), (ls.ctl-ls.atl >= 0 ? 'fris' : 'vermoeid')+' ('+Math.round(ls.ctl-ls.atl)+')']);
  const hs = Object.entries(st.groups).filter(([g]) => !['plyo','hyrox','overig'].includes(g)).reduce((p,[,v])=>p+v,0); if(hs) rows.push(['Krachtsets (hard)', String(hs), 'gelogd + afgevinkt']);
  h += '<div class="card" id="rvmeet"><span class="eyebrow">In cijfers</span>'+rows.map(([l,v,n]) => '<div class="kv"><span>'+l+(n?'<div class="small">'+n+'</div>':'')+'</span><b>'+v+'</b></div>').join('')+'</div>';
  if(R.rd.some(x => x.rd!=null)){ const lo = R.rd.filter(x => x.rd!=null).sort((p,q)=>p.rd-q.rd)[0];
    h += '<div class="card" id="rvrec"><span class="eyebrow">Herstel per dag</span><div class="rdbars">'+R.rd.map((x,i) => '<div><i style="height:'+(x.rd!=null ? Math.max(8, x.rd) : 0)+'%;background:'+(x.rd==null ? 'transparent' : x.rd < 65 ? 'var(--warn)' : x.rd >= 80 ? 'var(--acc2)' : '#3b8f5c')+'"></i><b>'+(x.rd ?? '–')+'</b><span>'+DAYS[i]+'</span></div>').join('')+'</div>'
      +'<div class="small">Laagste: '+fmtDay(lo.d)+' ('+lo.rd+')'+(R.base ? ' · normaal ± '+Math.round(R.base.m) : '')+'. Bron: Oura of je ochtendcheck.</div></div>'; }
  const ch = ((w.review||{}).changes || []).slice(); const nw = weekByStart(addDays(a,7));
  if(R.ci.richting || R.ci.opm) ch.unshift([(R.ci.richting ? 'Richting: '+R.ci.richting : '')+(R.ci.opm ? (R.ci.richting ? ' · ' : '')+'“'+R.ci.opm+'”' : ''), nw && nw.note ? nw.note.split('\n')[0] : 'Wordt verwerkt in het schema van volgende week.']);
  if(ch.length) h += '<div class="card" id="rvin"><span class="eyebrow">Jouw input en wat ik ermee deed</span>'+ch.map(([x,y]) => '<div class="io"><span>'+esc(x)+'</span><b>'+esc(y)+'</b></div>').join('')+'</div>';
  if(nw && nw.days.length){ const key = weekItems(nw).filter(i => QUALK.includes(sessKind(i.s)) || sessKind(i.s)==='lang');
    h += '<div class="card coach" id="rvnext"><span class="eyebrow">Volgende week'+(nw.status==='concept' ? ' (concept)' : '')+'</span><div>'+esc((w.review||{}).focus || nw.focus || '')+'</div>'+(key.length ? '<div class="keys">'+key.map(i => '<div><span>'+fmtDay(i.date).split(' ')[0]+'</span>'+esc(i.s.title)+'</div>').join('')+'</div>' : '')+'</div>'; }
  return h; }
function rReview(){ const a = ui.week; $('htitle').textContent = 'Weekevaluatie';
  const h = reviewHtml(a, false); const nav = '<div class="row nw"><button class="btn sm" data-rvweek="'+addDays(a,-7)+'">Vorige week</button>'+(addDays(a,7) <= today() ? '<button class="btn sm" data-rvweek="'+addDays(a,7)+'">Volgende week</button>' : '')+'</div>';
  $('view').innerHTML = (h || '<div class="card mut">Geen plan voor deze week.</div>') + nav; }
/* welke week tonen we op Voortgang: ma/di de vorige week, anders de lopende */
function reviewWeek(){ const t = today(), mon = mondayOf(t), dow = (parseD(t).getDay()+6)%7; return dow <= 1 && weekByStart(addDays(mon,-7)) ? addDays(mon,-7) : mon; }

/* ---------- seizoen: op weg naar Mozart ---------- */
const PH_COL = {herstel:'#3A4350', basis:'#2F4566', snelheid:'#5B3F9A', marathon:'#3E5E46', trail:'#7A4527', taper:'#3A4350'};
function msStatus(x){ const acts = (STRAVA.activities||[]).filter(a => RUNS.includes(a.sport) && a.date <= x.by && a.date >= (x.from||'2026-11-30'));
  let met = false, val = null;
  if(x.kind==='long'){ val = Math.max(0, ...acts.map(a => a.km||0)); met = val >= x.v; }
  else if(x.kind==='hmweek'){ const wk = {}; for(const a of acts){ const m = mondayOf(a.date); wk[m] = (wk[m]||0) + (a.hm||0); } val = Math.max(0, ...Object.values(wk)); met = val >= x.v; }
  else if(x.kind==='race'){ const r = acts.filter(a => a.race && a.date >= addDays(x.by,-1) && Math.abs((a.km||0) - x.km) <= x.km*0.06); if(r.length){ const T = Math.min(...r.map(a => a.el||a.sec)); val = T; met = T <= x.v; } }
  else if(x.kind==='weekkm'){ const wk = {}; for(const a of acts){ const m = mondayOf(a.date); wk[m] = (wk[m]||0) + (a.km||0); } val = Math.max(0, ...Object.values(wk)); met = val >= x.v; }
  return {met, val, missed: !met && today() > x.by}; }
function seasonHtml(){ const SE = PLAN.season||[]; if(!SE.length) return ''; const t = today(); const a0 = SE[0].from, z = SE[SE.length-1].to;
  const span = diffD(z, a0)+1, pos = d => Math.max(0, Math.min(100, diffD(d, a0)/span*100));
  const MZ = (PLAN.races||[]).find(r => /Mozart/.test(r.name)); const dl = MZ ? diffD(MZ.date, t) : null;
  const ph = SE.find(x => x.from <= t && t <= x.to); const pi = ph ? SE.indexOf(ph) : -1;
  let h = '<div class="card season" id="season">'+CONTOUR+'<span class="eyebrow">Op weg naar Mozart</span><div class="sshd"><b>'+(dl!=null ? dl : '–')+'</b><span>dagen<br>84 km · 4800 hm</span></div>';
  h += profileSvg(SE, t)+'</div>';
  if(ph){ const wk = Math.floor(diffD(t, ph.from)/7)+1, nwk = Math.ceil((diffD(ph.to, ph.from)+1)/7);
    const mon = mondayOf(t); const last = [1,2,3].map(i => weekDone(addDays(mon,-7*i)).km); const av = last.reduce((p,q)=>p+q,0)/3;
    const tone = av < ph.km[0]*0.85 ? 'onder' : av > ph.km[1]*1.1 ? 'boven' : 'binnen';
    h += '<div class="card coach" id="phasenow"><span class="meta-l">Fase '+(pi+1)+' van '+SE.length+', week '+wk+' van '+nwk+'</span><b class="pn">'+esc(ph.name)+'</b><div>'+esc(ph.goal)+'</div>'
      +'<div class="kv" style="margin-top:8px"><span>Lopen per week (doel '+ph.km[0]+'–'+ph.km[1]+')</span><b>'+fmtN(av)+' km <span class="small">gem. 3 wk · '+tone+'</span></b></div>'
      +(SE[pi+1] ? '<div class="small">Daarna: '+esc(SE[pi+1].name)+' vanaf '+fmtDay(SE[pi+1].from)+'</div>' : '')+'</div>'; }
  { const br = bestRace(); const tp = tpOf(); let rows = '';
    if(br){ const T = br.el||br.sec; const p10 = riegel(T, br.km, 10), pm = riegel(T, br.km, 42.195, 1.07);
      const vp = (PLAN.races||[]).find(r => /Vondel/.test(r.name)), pa = (PLAN.races||[]).find(r => /Paris/.test(r.name));
      const g10 = 45*60+40, gm = 3.5*3600; const row = (l, v, g, gl) => '<div class="kv"><span>'+l+'<div class="small">doel '+gl+'</div></span><b style="color:'+(v <= g ? 'var(--acc)' : v <= g*1.03 ? 'var(--warn)' : 'var(--bad)')+'">'+fmtSec(v)+'</b></div>';
      if(vp && vp.date >= t) rows += row('10 km (Vondelpark)', p10, g10, 'onder 45:40');
      if(pa && pa.date >= t) rows += row('Marathon (Parijs)', pm, gm, '3:30:00 · 4:58/km');
      rows += '<div class="small">Schatting uit '+esc(br.name)+' ('+fmtDay(br.date)+', '+fmtN(br.km)+' km in '+fmtSec(T)+') met de Riegel-formule; voor de marathon iets strenger (exponent 1,07). Zegt niets over je duurvermogen: dat moeten de lange duurlopen laten zien.</div>'; }
    const need = Math.round(gm_tp()); h += '<div class="card" id="formcheck"><span class="eyebrow">Vormcheck</span><div class="kv"><span>Drempeltempo nu<div class="small">instelling, herijkt na races</div></span><b>'+fmtPace(tp)+'/km</b></div><div class="kv"><span>Drempel voor een comfortabele 3:30<div class="small">vuistregel: marathontempo ± 12% trager dan drempel</div></span><b>'+fmtPace(need)+'/km</b></div>'+rows+'</div>'; }
  const MS = PLAN.milestones||[]; if(MS.length){ h += '<div class="card" id="miles"><span class="eyebrow">Mijlpalen</span>'+MS.map(x => { const s = msStatus(x);
      const v = s.val==null ? '' : x.kind==='race' ? fmtSec(s.val) : x.kind==='hmweek' ? Math.round(s.val)+' hm' : fmtN(s.val)+' km';
      return '<div class="ms '+(s.met?'met':s.missed?'miss':'')+'"><i>'+(s.met?'✓':s.missed?'✕':'')+'</i><div><b>'+esc(x.t)+'</b><span>uiterlijk '+fmtDay(x.by)+' '+x.by.slice(0,4)+(v && !s.met ? ' · nu '+v : s.met ? ' · '+v : '')+'</span></div></div>'; }).join('')+'<div class="small">Automatisch afgevinkt uit Strava zodra je het haalt.</div></div>'; }
  h += '<div class="card" id="phases"><span class="eyebrow">Alle fases</span>'+SE.map((x,i) => '<details'+(i===pi?' open':'')+'><summary><i style="background:'+(PH_COL[x.id]||'#333')+'"></i><b>'+(i+1)+' · '+esc(x.name)+'</b><span>'+fmtDay(x.from).slice(3)+' – '+fmtDay(x.to).slice(3)+'</span></summary><div class="small">'+esc(x.goal)+'<br>Lopen '+x.km[0]+'–'+x.km[1]+' km/week</div></details>').join('')+'</div>';
  return h; }
/* drempel 4:25 → MP 4:58 is ±12%; gangbare vuistregel MP ≈ drempel × 1,06–1,12. Wij tonen het drempeltempo dat 4:58 comfortabel maakt. */
function gm_tp(){ return (3.5*3600/42.195)/1.12; }

const DAGEN = ['maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag','zondag'], MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
function fullDay(d){ const x = parseD(d); const s = DAGEN[(x.getDay()+6)%7]+' '+x.getDate()+' '+MAANDEN[x.getMonth()]; return s[0].toUpperCase()+s.slice(1); }
/* hoogtelijnen als textuur: alleen in de kop van Seizoen */
const CONTOUR = (() => { let p = ''; for(let k=0;k<9;k++){ const y = 18+k*16, a = 6+k*1.5; p += '<path d="M-10 '+y+' C 60 '+(y-a)+', 110 '+(y+a*1.6)+', 180 '+(y-a*0.4)+' S 300 '+(y+a)+', 370 '+(y-a*0.8)+'" fill="none" stroke="#B7A3FF" stroke-width="1"/>'; }
  return '<svg class="contour" viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true">'+p+'</svg>'; })();
/* volumeprofiel: km per week van seizoensstart tot Mozart. Gelopen = gevuld paars, gepland = gestippelde lijn. Wedstrijden als vlaggen. */
function profileSvg(SE, t){ const a0 = mondayOf(SE[0].from), z = SE[SE.length-1].to; const weeks = []; for(let m = a0; m <= z; m = addDays(m,7)) weeks.push(m);
  const val = weeks.map(m => { const ph = SE.find(x => x.from <= addDays(m,3) && addDays(m,3) <= x.to) || SE[SE.length-1]; const pw = weekByStart(m);
    const plan = pw && pw.days.length ? weekStats(pw).runPlan : (ph.km[0]+ph.km[1])/2; const done = addDays(m,6) < t || m <= t ? weekDone(m).km : null;
    return {m, plan, done: m <= t ? done : null, ph}; });
  const W = 340, H = 150, top = 30, base = 112, max = Math.max(60, ...val.map(v => Math.max(v.plan, v.done||0)))*1.08;
  const X = i => 6 + i*(W-12)/(weeks.length-1), Y = v => base - (v/max)*(base-top);
  const line = pts => pts.map((p,i) => (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const planPts = val.map((v,i) => [X(i), Y(v.plan)]); const donePts = val.map((v,i) => v.done!=null ? [X(i), Y(v.done)] : null).filter(Boolean);
  let g = '<svg class="prof" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Loopvolume per week tot Mozart">';
  g += '<line x1="6" x2="'+(W-6)+'" y1="'+base+'" y2="'+base+'" stroke="#2E3641"/>';
  for(const k of [20,40,60]) if(k < max) g += '<line x1="6" x2="'+(W-6)+'" y1="'+Y(k)+'" y2="'+Y(k)+'" stroke="#2E3641" stroke-dasharray="2 4"/><text x="8" y="'+(Y(k)-3)+'">'+k+'</text>';
  g += '<path d="'+line(planPts)+'" fill="none" stroke="#B7A3FF" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="3 3"/>';
  if(donePts.length > 1) g += '<path d="'+line(donePts)+' L'+donePts[donePts.length-1][0].toFixed(1)+' '+base+' L'+donePts[0][0].toFixed(1)+' '+base+' Z" fill="#7B5CE6" fill-opacity=".35"/><path d="'+line(donePts)+'" fill="none" stroke="#B7A3FF" stroke-width="2.2" stroke-linejoin="round"/>';
  /* fases als lint onder de as */
  SE.forEach((x,i) => { const xa = 6 + Math.max(0, diffD(x.from, a0))/7*(W-12)/(weeks.length-1), xb = 6 + Math.min(diffD(z, a0)+1, diffD(x.to, a0)+1)/7*(W-12)/(weeks.length-1);
    g += '<rect x="'+xa.toFixed(1)+'" y="'+(base+6)+'" width="'+Math.max(2, xb-xa-2).toFixed(1)+'" height="7" rx="2" fill="'+(PH_COL[x.id]||'#333')+'"/>';
    g += '<text x="'+((xa+xb)/2).toFixed(1)+'" y="'+(base+26)+'" text-anchor="middle"'+(x.from <= t && t <= x.to ? ' class="fl"' : '')+'>'+(i+1)+'</text>'; });
  /* wedstrijden als vlaggen */
  const RC = (PLAN.races||[]).filter(r => r.date >= SE[0].from && r.date <= z); const xd = d => 6 + diffD(d, a0)/7*(W-12)/(weeks.length-1);
  RC.forEach((r, i) => { const x = xd(r.date); const A = r.prio==='A'; const y0 = A ? 8 : (i%2 ? 22 : 12);
    const nm = r.name.split(/ [–(]| \d+ km| relay/)[0].replace('Marathon de ','').replace('Vondelparkloop','Vondelpark').replace(' Ultra','');
    g += '<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+y0+'" y2="'+base+'" stroke="#F26B3A" stroke-width="'+(A?1.6:1)+'" stroke-opacity="'+(A?1:.7)+'"/><path d="M'+x.toFixed(1)+' '+y0+' l'+(A?9:7)+' 3.5 l-'+(A?9:7)+' 3.5 Z" fill="#F26B3A"/>';
    g += '<text class="fl" x="'+(x + (x > W-60 ? -4 : 10)).toFixed(1)+'" y="'+(y0+7)+'"'+(x > W-60 ? ' text-anchor="end"' : '')+'>'+esc(nm)+'</text>'; });
  if(t >= a0 && t <= z){ const i = Math.min(val.length-1, Math.floor(diffD(t, a0)/7)); const y = Y(val[i].done!=null ? val[i].done : val[i].plan);
    g += '<circle cx="'+X(i).toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" fill="#12161B" stroke="#fff" stroke-width="2"/>'; }
  g += '<text x="8" y="'+(top-8)+'">km per week</text></svg>';
  g += '<div class="small">Gevuld: gelopen. Stippellijn: gepland. Vlaggen: wedstrijden. Cijfers onder de lijn: de 6 fases.</div>';
  return g; }
