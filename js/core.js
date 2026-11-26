'use strict';
/* ==== VASTE AFSPRAKEN — zie ONDERHOUD.md. NOOIT WIJZIGEN: KEY, oefeningcodes, bestaande QSETS-versies. ==== */
const KEY = 'yorick-coach';
const APP_VERSION = '4.7.0';
const SCHEMA = 2;

/* Check-in vragen per versie. Een bestaande versie NOOIT aanpassen; voeg een nieuwe versie toe. */
const QSETS = {
  1: [
    {k:'cijfer', q:'Cijfer voor deze week', t:'scale', min:1, max:10},
    {k:'zwaarte', q:'Zwaarte van de week (gem. sessie-RPE)', t:'scale', min:1, max:10},
    {k:'herstel', q:'Slaap & herstel (1 slecht – 5 top)', t:'scale', min:1, max:5},
    {k:'oura', q:'Oura: gem. HRV / rust-HF (optioneel)', t:'text'},
    {k:'pijn', q:'Pijntjes: waar, 0–10, wanneer (leeg = geen)', t:'area'},
    {k:'besch', q:'Beschikbaarheid volgende week', t:'avail'},
    {k:'richting', q:'Volgende week', t:'pick', opts:['Tandje erbij','Zo laten','Terug']},
    {k:'opm', q:'Overig voor de coach', t:'area'}
  ],
  2: [
    {k:'cijfer', q:'Cijfer voor deze week', t:'scale', min:1, max:10},
    {k:'benen', q:'Benen aan het eind van de week (1 kapot – 5 fris)', t:'scale', min:1, max:5},
    {k:'pijn', q:'Pijntjes: waar, 0–10, wanneer (leeg = geen)', t:'area'},
    {k:'richting', q:'Volgende week', t:'pick', opts:['Tandje erbij','Zo laten','Terug']},
    {k:'opm', q:'Overig voor de coach', t:'area'}
  ]
};
QSETS[3] = [
  {k:'cijfer', q:'Cijfer voor deze week', t:'scale', min:1, max:10},
  {k:'benen', q:'Benen aan het eind van de week (1 kapot – 5 fris)', t:'scale', min:1, max:5},
  {k:'richting', q:'Volgende week', t:'pick', opts:['Tandje erbij','Zo laten','Terug']},
  {k:'opm', q:'Opmerkingen voor de coach (optioneel)', t:'area'}
];
const QV_CURRENT = 3;
const TYPE_LABEL = {run:'Lopen',bike:'Fiets',swim:'Zwem',strength:'Kracht',plyo:'Plyo',hyrox:'Hyrox',mobility:'Mobiliteit',rest:'Rust',race:'Wedstrijd'};
const DAYS = ['ma','di','wo','do','vr','za','zo'];
const SLOTS = ['Niet','1×','2×','Alleen ochtend','Alleen avond','Lang'];
const SKIPS = ['Ziek','Agenda','Vermoeid','Pijn','Weer','Anders'];
const ICO = {today:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h6"/>',progress:'<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4"/>',more:'<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>',run:'<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 11l3-3h4l3 4 3 1M11 15l2-5"/>',bike:'<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5L9 9h6l3.5 7.5M9 9l3 7.5h-6.5M14 5h2.5l-1.5 4"/>',swim:'<path d="M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5"/><circle cx="16" cy="6" r="2"/><path d="M5 11l5-4 4 3"/>',strength:'<path d="M6 8v8M3.5 10v4M18 8v8M20.5 10v4M6 12h12"/>',plyo:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',hyrox:'<path d="M12 22c4 0 7-2.7 7-6.5 0-3.5-2.5-5.5-4-8-1 2-2 3-3.5 3.5C11 8 10 5 8 2.5 7.5 6 5 9 5 15.5 5 19.3 8 22 12 22z"/>',mobility:'<circle cx="12" cy="4.5" r="2"/><path d="M4 9l8 2 8-2M12 11v5l-4 5M12 16l4 5"/>',rest:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',race:'<path d="M5 22V4M5 4h11l-2 4 2 4H5"/>'};
const ic = (k, sz) => '<svg class="ico" viewBox="0 0 24 24" width="'+(sz||18)+'" height="'+(sz||18)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[k]||'')+'</svg>';
const TYPE_ICON = new Proxy({}, {get: (o, k) => ICO[k] ? ic(k, 15) : ''});
const TYPE_COLOR = {run:'#4ade80',bike:'#60a5fa',swim:'#22d3ee',strength:'#a78bfa',plyo:'#f472b6',hyrox:'#fb923c',mobility:'#2dd4bf',rest:'#6b7280',race:'#f5b942'};
const PAIN_LOCS = ['Kuit L','Kuit R','Scheen L','Scheen R','Achilles/hiel L','Achilles/hiel R','Knie L','Knie R','Heup/lies','Onderrug','Voet','Schouder','Anders'];
const INFO = {
  rpe:'Sessie-RPE (schaal 0–10), ± 30 min na afloop: hoe zwaar was de héle training? 1–2 heel licht · 3–4 rustig, praten gaat · 5–6 stevig · 7–8 zwaar · 9 bijna maximaal · 10 maximaal. RPE × minuten = belasting.',
  rir:'RIR = reps in reserve: hoeveel nette herhalingen had je nog gekund? 0 = falen · 1 = nog één · 2 = nog twee · 3–4 = ruim over. Doel staat bij de oefening; eerlijk inschatten is belangrijker dan zwaar.'
};
/* Standaard-alternatieven per sessietype. Het plan kan per sessie eigen 'alts' meegeven. */
function altOptions(s){
  if(Array.isArray(s.alts) && s.alts.length) return s.alts;
  const long = (s.km||0) >= 18;
  return ({
    run: long ? ['Ingekort: 60–70% van de afstand, zelfde rustige tempo','KICKR 2 u Z2 (60–70% FTP) i.p.v. lopen','Easy 45–60 min, HF ≤ 145']
              : ['Ingekort: helft van de hoofdset, zelfde tempo','Easy 30–40 min, HF ≤ 145','KICKR 45–60 min Z2 i.p.v. lopen'],
    bike: ['Ingekort: 45 min Z2','Easy run 30–40 min, HF ≤ 145','Zwemmen 1500 m rustig'],
    swim: ['KICKR 45 min Z2','Mobiliteit 20 min'],
    strength: ['Mini: eerste 3 oefeningen, 2 werksets, zelfde gewicht','Thuis 25 min: push-ups, split squats, elastiek-rows, calf raises, 3 rondes'],
    plyo: ['Alleen pogo’s 2×15 + 3 box jumps','Overslaan, alleen warming-up + loopscholing'],
    hyrox: ['Engine op KICKR: 6 × 3 min hard / 2 min rustig','Mini: 2 rondes i.p.v. 4','Upper B + core i.p.v. Hyrox'],
    mobility: ['Kort: 5 min couch stretch + 90/90'],
    race: []
  })[s.t] || [];
}
/* "Pas vandaag aan": zet open sessies van een dag om naar de rustige variant, op basis van het ochtendadvies */
const QUAL_RX = /×|drempel|heuvel|interval|tempo|vo2|strides?\b.*×|fartlek|progress/i;
function isQuality(s){ return (s.t==='run' && (QUAL_RX.test(s.title) || (s.tgt && s.tgt.pace))) || s.t==='hyrox' || s.t==='plyo'; }
function adaptPlan(d, lvl){ const out = []; const w = weekByStart(mondayOf(d)); const m = matchWeek(w);
  for(const it of weekItems(w).filter(i => i.date===d)){ const s = it.s, st = S.done[s.id]||{};
    if(st.d || m.by[s.id] || st.skip || st.alt || s.t==='race' || s.t==='rest' || s.t==='mobility') continue;
    const long = s.t==='run' && (s.km||0) >= 18; let alt = null;
    if(lvl==='oranje'){
      if(s.t==='run' && isQuality(s)) alt = 'Ingekort: helft van de hoofdset, zelfde tempo';
      else if(long) alt = 'Ingekort: 60–70% van de afstand, zelfde rustige tempo';
      else if(s.t==='hyrox') alt = 'Mini: 2 rondes i.p.v. 4';
      else if(s.t==='plyo') alt = 'Alleen pogo’s 2×15 + 3 box jumps'; }
    else if(lvl==='rood'){
      if(s.t==='run') alt = long ? 'Easy 45–60 min, HF ≤ 145' : isQuality(s) ? 'Easy 30–40 min, HF ≤ 145' : 'KICKR 45–60 min Z2 i.p.v. lopen';
      else if(s.t==='hyrox') alt = 'Easy 30–45 min fietsen Z1–Z2 i.p.v. Hyrox';
      else if(s.t==='strength') alt = 'Mini: eerste 3 oefeningen, 2 werksets, zelfde gewicht';
      else if(s.t==='plyo') alt = 'Overslaan, alleen warming-up + loopscholing';
      else if(s.t==='bike' && /interval|×|ftp|vo2|drempel/i.test(s.title)) alt = 'Ingekort: 45 min Z2'; }
    if(alt) out.push({it, alt}); }
  return out; }
const MAIN_LIFTS = ['SQ','RDL','BSS','HT','BP','OHP','PU','LP'];
const SPORTMAP = {run:['Run','TrailRun','VirtualRun'], race:['Run','TrailRun','VirtualRun'], bike:['Ride','VirtualRide','GravelRide','MountainBikeRide'],
  swim:['Swim'], strength:['WeightTraining'], hyrox:['Workout','HighIntensityIntervalTraining','Crossfit','WeightTraining'], mobility:['WeightTraining','Yoga']};
const RUNS = ['Run','TrailRun','VirtualRun'];

/* ---------- Oura (via eigen Google Apps Script; client-secret staat alleen in het script) ---------- */
const OURA_CLIENT_ID = 'fd8a9b7a-c1bb-4291-90e1-217c981b902a';
const APP_URL = 'https://yorick1226.github.io/coach-yorick/';
function ouraAuthUrl(){ const st = Math.random().toString(36).slice(2); sessionStorage.setItem('ouraState', st);
  return 'https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id='+OURA_CLIENT_ID+'&redirect_uri='+encodeURIComponent(APP_URL)+'&scope='+encodeURIComponent('daily heartrate')+'&state='+st; }
/* vult de ochtendcheck aan met Oura-waarden; zelf ingevulde waarden worden nooit overschreven */
function applyOura(days){ let n = 0;
  for(const o of days||[]){ if(!o.day) continue; const x = S.daily[o.day] || (S.daily[o.day] = {}); let ch = false;
    for(const [k, v] of [['rd',o.rd],['sl',o.sl],['hrv',o.hrv!=null?Math.round(o.hrv):null],['rhr',o.rhr]]) if(v!=null && x[k]==null){ x[k] = v; ch = true; }
    if(o.temp!=null) x.temp = o.temp;
    if(ch){ x.src = 'oura'; x.ts = Date.now(); enqueue('daily', o.day, o.day, x); n++; } }
  return n; }
/* alle verkeer naar je eigen Sheet-script gaat met je geheime sleutel (APP_KEY in het script) */
function sheetU(params, url, key){ url = url || S.settings.sheetUrl; key = key ?? S.settings.sheetKey; if(!url) return '';
  return url + (url.includes('?') ? '&' : '?') + (key ? 'k='+encodeURIComponent(key) + (params ? '&' : '') : '') + (params||''); }
function newKey(){ const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join(''); }
function isFresh(){ return !S.sets.length && !Object.keys(S.done).length && !Object.keys(S.daily).length && !S.cardio.length; }
async function restoreFromSheet(url, key){ const r = await fetch(sheetU('all=1', url, key)); const d = await r.json(); if(d && d.error) throw new Error(d.error);
  const o = fromSheet(d); try { localStorage.setItem(KEY+'.undo', JSON.stringify(S)); } catch(_){} o.settings = Object.assign({}, S.settings, {sheetUrl:url, sheetKey:key||''}); S = o; save(); return S; }
async function ouraPull(force){ const url = S.settings.sheetUrl; if(!url || !S.settings.oura || !navigator.onLine) return;
  const last = Number(sessionStorage.getItem('ouraPull')||0); if(!force && Date.now()-last < 20*60000) return; sessionStorage.setItem('ouraPull', Date.now());
  try { const d = await (await fetch(sheetU('oura=1&days=21'))).json(); if(d && d.error){ toast('Sheet: '+d.error); return null; } S.settings.ouraLast = Date.now();
    const n = applyOura(d.days); save(); if(n && typeof rerender==='function') rerender(); return d; } catch(e){ return null; } }
/* ---------- opslag ---------- */
function blank(){ return {schema:SCHEMA, done:{}, moves:{}, swaps:{}, extra:{}, exskip:{}, custom:{}, body:[], rt:{}, mob:[], sets:[], cardio:[], checkins:{}, avail:{}, daily:{},
  settings:{ftp:null,lthr:null,tpace:null,sheetUrl:'',lastBackup:null,seenPlan:null}, queue:[]}; }
function migrate(o){
  const b = blank();
  if(!o || typeof o !== 'object') return b;
  for(const k of Object.keys(b)) if(o[k] === undefined || o[k] === null) o[k] = b[k];
  if(typeof o.settings!=='object') o.settings = b.settings;
  for(const k of Object.keys(b.settings)) if(o.settings[k] === undefined) o.settings[k] = b.settings[k];
  for(const k of ['sets','cardio','queue','body','mob']) if(!Array.isArray(o[k])) o[k] = [];
  o.schema = Math.max(o.schema||1, SCHEMA);
  return o; // onbekende velden blijven bewaard
}
function load(){ try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch(e){ return blank(); } }
let S = load();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ toast('Opslaan mislukt: '+e.message); } }
function enqueue(kind, id, date, data){
  S.queue = S.queue.filter(q => !(q.kind===kind && q.id===id));
  S.queue.push({kind, id, date, data, ts:Date.now()});
  save(); scheduleSync();
}

/* ---------- data ---------- */
let PLAN = null, STRAVA = {activities:[]};
async function loadData(){
  try { const r = await fetch('plan.json', {cache:'no-cache'}); PLAN = await r.json(); } catch(e){ PLAN = null; }
  try { const r = await fetch('strava.json', {cache:'no-cache'}); if(r.ok) STRAVA = await r.json(); } catch(e){}
}
const EXN = c => (PLAN && PLAN.exercises[c]) || (S.custom||{})[c] || {n:c, inc:2.5};
const GROUPS = ['borst','rug','schouders','biceps','triceps','quads','hamstrings','bilspieren','adductoren','kuiten','scheen','core','plyo','hyrox','overig'];
/* Oefeningen van een sessie = plan + zelf toegevoegd. Wissels via S.swaps; overgeslagen via S.exskip. */
const hasEx = s => !!((s.ex&&s.ex.length) || (s.bl&&s.bl.length));
function sessEx(s){ return (s.ex||[]).concat(blocksOf(s), (S.extra[s.id]||[])); }
/* spiergroep-blokken: plan schrijft groep + reps/RIR/rust voor, jij kiest de oefening (laatst gekozen = standaard) */
function blocksOf(s){ return (s.bl||[]).map((b, i) => Object.assign({c:'B'+i, blk:true, dflt: lastPick(b)}, b)); }
/* harde sets per spiergroep deze week vs doel; benendoelen lager in weken met veel loopbelasting of een wedstrijd */
const MG = [['borst','Borst'],['rug','Rug'],['schouders','Schouders'],['biceps','Biceps'],['triceps','Triceps'],['quads','Quads'],['hamstrings','Hamstrings'],['bilspieren','Bil'],['kuiten','Kuiten'],['adductoren','Adductoren'],['core','Core']];
function groupTargets(wstart){ const tg = Object.assign({}, PLAN.setTargets||{}); const w = weekByStart(wstart); if(!w) return {tg, why:''};
  const its = weekItems(w); const km = its.reduce((p,i) => p + (['run','race'].includes(i.s.t) ? (i.s.km||0) : 0), 0); const race = its.some(i => i.s.t==='race');
  let f = 1, why = ''; if(race){ f = 0.6; why = 'wedstrijdweek'; } else if(km >= 50){ f = 0.75; why = fmtN(km)+' km lopen gepland'; }
  if(f < 1) for(const g of ['quads','hamstrings','bilspieren','adductoren']) if(tg[g]) tg[g] = Math.round(tg[g]*f);
  return {tg, why}; }
function weekGroupSets(wstart){ const b = addDays(wstart,6), per = {}; for(const x of S.sets) if(work(x) && x.date>=wstart && x.date<=b && (x.rir==null||x.rir<=4)){ const g = EXN(x.code).g; if(g) per[g] = (per[g]||0)+1; }
  for(const [g, n] of Object.entries(plannedSetsTicked(wstart))) per[g] = (per[g]||0)+n; return per; }
/* afgevinkte (of via Strava gekoppelde) krachtsessie zonder gelogde sets telt als uitgevoerd volgens plan; bij een gekozen alternatief: eerste 3 oefeningen × max 2 sets */
function plannedSetsTicked(wstart){ const w = weekByStart(wstart); const per = {}; if(!w) return per; const m = matchWeek(w);
  for(const it of weekItems(w)){ const s = it.s, st = S.done[s.id]||{}; if(!hasEx(s) || st.skip || !(st.d || m.by[s.id])) continue;
    if(S.sets.some(x => x.sid===s.id && !x.del)) continue;
    let L = sessEx(s).filter(e => !S.exskip[s.id+'|'+e.c]); if(st.alt) L = L.slice(0,3);
    for(const e of L){ const g = EXN(cOf(s.id, e)).g; if(!g || ['plyo','hyrox'].includes(g)) continue; per[g] = (per[g]||0) + (st.alt ? Math.min(2, e.s||2) : (e.s||0)); } }
  return per; }
function groupStrip(s, date){ const ws = mondayOf(date); const {tg, why} = groupTargets(ws); const per = weekGroupSets(ws); const mine = new Set(sessEx(s).map(e => EXN(cOf(s.id, e)).g));
  const cells = MG.filter(([g]) => tg[g]).map(([g,n]) => { const v = per[g]||0, t = tg[g]; return '<div class="gs'+(mine.has(g)?' me':'')+'"><span>'+n+'</span><b>'+v+'<i>/'+t+'</i></b><div class="bar"><i style="width:'+Math.min(100, Math.round(v/t*100))+'%'+(v>=t?';background:var(--acc)':'')+'"></i></div></div>'; }).join('');
  return '<details class="card"'+(ui.gsOpen?' open':'')+' data-gsopen="1"><summary><b>Spiergroepen deze week</b> <span class="small">harde sets / doel'+(why?' · benen lager: '+esc(why):'')+'</span></summary><div class="gsg">'+cells+'</div><div class="small" style="margin-top:6px">Omlijnd = deze sessie. Richtlijn 6–10+ harde sets per spiergroep per week voor groei; benen lager omdat lopen en fietsen ze al belasten.</div></details>'; }
function lastPick(b){ let best = null; for(const x of S.sets) if(!x.del && b.opts.includes(x.code) && (!best || x.ts > best.ts)) best = x; return best ? best.code : b.opts[0]; }
function cOf(sid, e){ return S.swaps[sid+'|'+e.c] || e.dflt || e.c; }
const EQ = {bb:'Barbell', db:'Dumbbells', m:'Machine', c:'Kabel', bw:'Lichaamsgewicht', sm:'Smith', kb:'Kettlebell', bal:'Bal'};
function kgLabel(code){ const q = EXN(code).eq; return q==='db' ? 'kg per dumbbell' : q==='bb' ? 'kg totaal (incl. stang)' : q==='sm' ? 'kg op de stang' : q==='bw' ? '+ extra kg' : q==='kb' ? 'kg per kettlebell' : 'kg'; }
function allExercises(){ const all = Object.assign({}, (PLAN&&PLAN.exercises)||{}, S.custom||{}); return Object.keys(all).map(c => ({c, x:all[c]})).sort((a,b)=> a.x.n.localeCompare(b.x.n)); }
function defaultsFor(code){ const u = unitOf(code); return u==='kg' ? {s:3,lo:8,hi:12,rir:2,rest:90} : u==='s' ? {s:3,lo:30,hi:45,rir:0,rest:45} : u==='m' ? {s:3,lo:20,hi:40,rir:0,rest:60} : {s:3,lo:8,hi:12,rir:0,rest:60}; }
const unitOf = c => EXN(c).u || 'kg';
const setting = k => S.settings[k] ?? (PLAN && PLAN.athlete[k]);
const work = x => !x.del && !x.wu; // werksets: niet verwijderd, geen opwarmset
const num = v => { if(v===null || v===undefined) return null; const s = String(v).trim().replace(',', '.'); if(s==='') return null; const n = Number(s); return isNaN(n) ? null : n; };

/* ---------- datum ---------- */
const pad = n => String(n).padStart(2,'0');
function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function today(){ return iso(new Date()); }
function parseD(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d, 12); }
function addDays(s, n){ const d = parseD(s); d.setDate(d.getDate()+n); return iso(d); }
function weekIdOf(s){ const d = parseD(s); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = (t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-dn+3); const fy = t.getUTCFullYear();
  const f = new Date(Date.UTC(fy,0,4)); const w = 1 + Math.round(((t - f)/864e5 - 3 + ((f.getUTCDay()+6)%7))/7);
  return fy+'-W'+pad(w); }
function mondayOf(s){ const d = parseD(s); const dn = (d.getDay()+6)%7; return addDays(s, -dn); }
const MND = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
function fmtDay(s){ const d = parseD(s); return DAYS[(d.getDay()+6)%7]+' '+d.getDate()+' '+MND[d.getMonth()]; }
function fmtPace(sec){ sec = Math.round(sec); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'); }
function fmtSec(t){ t = Math.round(t); const h = Math.floor(t/3600), m = Math.floor(t%3600/60), s = t%60; return h ? h+':'+pad(m)+':'+pad(s) : m+':'+pad(s); }
const fmtN = (n, d=1) => (Math.round(n*Math.pow(10,d))/Math.pow(10,d)).toString().replace('.', ',');
const fmtH = sec => fmtN(sec/3600)+' u';
const fmtKg = k => fmtN(k, 2);
/* tijdvelden: alleen cijfers typen (numeriek toetsenbord heeft geen ':'), de app zet de dubbele punten zelf. 5230 → 52:30, 14512 → 1:45:12 */
function tmFormat(v){ const d = String(v).replace(/\D/g, '').replace(/^0+(?=\d{3})/, '').slice(0, 6); if(d.length <= 2) return d; if(d.length <= 4) return d.slice(0,-2)+':'+d.slice(-2); return d.slice(0,-4)+':'+d.slice(-4,-2)+':'+d.slice(-2); }
/* mode h: losse 1–2 cijfers = minuten (duur); mode s: = seconden (holds, tempo) */
function tmParse(v, mode){ const t = String(v||'').trim(); if(!t) return NaN; if(!t.includes(':')){ const n = Number(t.replace(',', '.')); return isNaN(n) ? NaN : (mode==='s' ? n : n*60); } return parseTime(t); }
function tmHint(sec){ if(isNaN(sec)) return 'Typ alleen cijfers'; const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), x = Math.round(sec%60); return '= '+[h?h+' u':'', m?m+' min':'', x?x+' s':''].filter(Boolean).join(' '); }
function parseTime(str){ if(!str) return NaN; const p = String(str).trim().replace(',', '.').split(':').map(Number); if(p.some(isNaN)) return NaN;
  return p.length===3 ? p[0]*3600+p[1]*60+p[2] : p.length===2 ? p[0]*60+p[1] : p[0]*60; }

/* ---------- plan-hulpfuncties ---------- */
function weekByStart(start){ return PLAN && PLAN.weeks.find(w => w.start === start); }
function sessById(sid){ if(!PLAN) return null; for(const w of PLAN.weeks) for(const d of w.days) for(const s of d.s) if(s.id===sid) return {w, d, s, date:S.moves[sid]||d.date}; return null; }
function weekItems(w){ const out = []; if(!w) return out;
  for(const d of w.days) for(const s of d.s) out.push({s, orig:d.date, date:S.moves[s.id]||d.date});
  return out.sort((a,b)=> a.date.localeCompare(b.date) || a.s.id.localeCompare(b.s.id)); }
const isSkipped = sid => !!(S.done[sid]||{}).skip;

/* ---------- Strava-koppeling ---------- */
function actsIn(a, b){ return (STRAVA.activities||[]).filter(x => x.date>=a && x.date<=b); }
const KW = ['push','pull','upper','lower','leg','benen','chest','borst','rug','back','hyrox','hrx','interval','drempel','tempo','lange','long','easy','recovery','trail','zwem','swim'];
function matchScore(s, a){
  if(!SPORTMAP[s.t] || !SPORTMAP[s.t].includes(a.sport)) return -1;
  if(a.kind==='mobility' && s.t!=='mobility') return -1;
  let sc = 1; const tn = s.title.toLowerCase(), an = (a.name||'').toLowerCase();
  if(s.t==='hyrox' && a.kind==='hyrox') sc += 3; if(s.t==='strength' && a.kind==='hyrox') sc -= 2;
  if(s.t==='hyrox' && a.sport!=='WeightTraining') sc += 1;
  for(const k of KW) if(tn.includes(k) && an.includes(k)) sc += 2;
  if(s.km && a.km) sc += Math.max(0, 2 - Math.abs(a.km - s.km)/Math.max(3, s.km*0.25));
  return sc;
}
function matchWeek(w){
  const res = {by:{}, extra:[]}; if(!w) return res;
  const acts = actsIn(w.start, addDays(w.start,6)); const used = new Set();
  const items = weekItems(w).filter(i => SPORTMAP[i.s.t] && !isSkipped(i.s.id));
  const pairs = [];
  for(const it of items) for(const a of acts) if(a.date===it.date){ const sc = matchScore(it.s, a); if(sc > 0) pairs.push({it, a, sc}); }
  pairs.sort((x,y)=> y.sc - x.sc);
  for(const p of pairs) if(!used.has(p.a.id) && !res.by[p.it.s.id]){ used.add(p.a.id); res.by[p.it.s.id] = p.a; }
  res.extra = acts.filter(x => !used.has(x.id)).sort((a,b)=> a.date.localeCompare(b.date));
  return res;
}
/* Intensiteit per run (grof: gemiddelde HF per sessie, of tempo als HF ontbreekt). */
const EASY_RX = /easy|rustig|recovery|herstel|lange duur|shake|loslopen|z2/i;
function easyHr(){ return Number(S.settings.easyHr) || 145; }
function runClass(a){ if(!RUNS.includes(a.sport) || !a.sec) return null; const tp = Number(setting('tpace'))||263;
  if(a.hr) return a.hr <= easyHr() ? 'rustig' : a.hr >= 160 ? 'hard' : 'matig';
  if(!a.km) return null; const p = a.sec/a.km; return p >= tp*1.17 ? 'rustig' : p <= tp*1.05 ? 'hard' : 'matig'; }
function easyFlag(s, a){ if(!a || !['run'].includes(s.t) || !EASY_RX.test(s.title)) return null;
  if(a.hr && a.hr > easyHr()) return 'Te hard voor een rustige run: gem. HF '+Math.round(a.hr)+' (> '+easyHr()+')';
  if(!a.hr && a.km && a.sec && a.sec/a.km < (Number(setting('tpace'))||263)*1.13) return 'Mogelijk te snel voor rustig: '+fmtSec(a.sec/a.km)+'/km';
  return null; }
function lapClass(l, tp){ const p = l.sec/(l.m/1000); if(p <= tp*1.03) return 'hard'; if(p <= tp*1.12) return 'matig'; return (l.hr && l.hr > easyHr()) ? 'matig' : 'rustig'; }
function intensitySplit(acts){ const t = {rustig:0, matig:0, hard:0}; const tp = Number(setting('tpace'))||263;
  for(const a of acts){ if(!RUNS.includes(a.sport)) continue;
    if(a.laps && a.laps.length > 2){ for(const l of a.laps) if(l.m > 50) t[lapClass(l, tp)] += l.sec; }
    else { const c = runClass(a); if(c) t[c] += a.sec; } }
  const tot = t.rustig+t.matig+t.hard; return {t, tot}; }
/* B8: intervalbeoordeling op basis van ronden en doeltempo uit het plan (tgt.pace = [snelst, langzaamst] in s/km). */
function intervalEval(s, a){ if(!s.tgt || !s.tgt.pace || !a || !a.laps) return null; const [lo, hi] = s.tgt.pace;
  /* bewegende tijd (mv) als die er is: stilstaan in de pauze telt niet mee; een herhaling die over een auto-lap heen loopt (1000 m + rest) wordt samengevoegd */
  const t = l => l.mv || l.sec, q = l => l.m >= 150 && t(l)/(l.m/1000) <= hi*1.06; const reps = [];
  a.laps.forEach((l, i) => { if(!q(l)) return; const prev = i && q(a.laps[i-1]) && a.laps[i-1].m >= 990 ? reps[reps.length-1] : null;
    if(prev) { prev.m += l.m; prev.s += t(l); } else reps.push({m:l.m, s:t(l)}); });
  if(!reps.length) return null;
  const pc = reps.map(r => r.s/(r.m/1000)); const fast = [], slow = []; let ok = 0;
  pc.forEach((v,i) => { if(v < lo-3) fast.push(i+1); else if(v > hi+3) slow.push(i+1); else ok++; });
  const drift = pc.length>1 ? pc[pc.length-1]-pc[0] : 0;
  let txt = reps.length+' werkronden · '+ok+' binnen '+fmtSec(lo)+'–'+fmtSec(hi);
  if(fast.length) txt += ' · te snel: rep '+fast.join(', ')+' ('+fast.map(i=>fmtSec(pc[i-1])).join(', ')+')';
  if(slow.length) txt += ' · te langzaam: rep '+slow.join(', ');
  if(Math.abs(drift) >= 5) txt += ' · '+(drift>0?'verval':'versnelling')+' '+Math.round(Math.abs(drift))+' s/km van eerste naar laatste';
  return {txt, good: !fast.length && !slow.length}; }
function actLine(a){
  const p = [];
  if(a.km) p.push(fmtN(a.km,2)+' km'); if(a.sec) p.push(fmtSec(a.sec));
  if(a.km && a.sec && RUNS.includes(a.sport)) p.push(fmtSec(a.sec/a.km)+'/km');
  if(a.km && a.sec && a.sport.includes('Ride')) p.push(fmtN(a.km/(a.sec/3600))+' km/u');
  if(a.hr) p.push('HF '+Math.round(a.hr)); if(a.w) p.push(a.w+' W'); if(a.hm) p.push(a.hm+' hm');
  if(a.dec != null) p.push('HF-drift '+fmtN(a.dec)+'%');
  return p.join(' · ');
}
/* gepland ↔ uitgevoerd voor duursessies */
function planPace(s){ if(s.tgt && s.tgt.pace) return s.tgt.pace; const m = (s.detail||'').match(/(\d):(\d\d)\s*[–-]\s*(\d):(\d\d)\s*\/km/); return m ? [m[1]*60+ +m[2], m[3]*60+ +m[4]] : null; }
function planVsDone(s, a){ if(!a || !['run','bike'].includes(s.t)) return ''; const rows = [];
  if(s.km && a.km){ const r = a.km/s.km; rows.push(['Afstand', fmtN(s.km)+' km', fmtN(a.km,1)+' km', r >= 0.9 && r <= 1.15]); }
  else if(s.min && (a.el||a.sec)){ const mm = (a.el||a.sec)/60; rows.push(['Duur', s.min+' min', Math.round(mm)+' min', mm >= s.min*0.85 && mm <= s.min*1.2]); }
  const pp = planPace(s); const iv = /×/.test(s.title) || (s.zwo && s.zwo.some(b => b.rep));
  if(s.t==='run' && pp && !iv && a.km && a.sec){ const p = a.sec/a.km; rows.push(['Tempo', fmtPace(pp[0])+'–'+fmtPace(pp[1]), fmtPace(p)+'/km', p >= pp[0]-10 && p <= pp[1]+15]); }
  const hm = (s.detail||'').match(/HF\s*[≤<]\s*(\d{3})/); if(hm && a.hr) rows.push(['Hartslag', '≤ '+hm[1], Math.round(a.hr)+' gem.', a.hr <= Number(hm[1])+2]);
  const wm = (s.detail||'').match(/(\d{2,3})\s*[–-]\s*(\d{2,3})\s*W\b/); if(s.t==='bike' && wm && a.w) rows.push(['Vermogen', wm[1]+'–'+wm[2]+' W', a.w+' W', a.w >= wm[1]*0.95 && a.w <= wm[2]*1.05]);
  if(!rows.length) return '';
  return '<div class="cmp"><span class="h"></span><span class="h">Plan</span><span class="h">Gedaan</span>'+rows.map(([l,p,d,ok]) => '<span>'+l+'</span><span>'+p+'</span><b class="'+(ok?'good':'off')+'">'+d+(ok?' ✓':'')+'</b>').join('')+'</div>'; }
/* één coachadvies voor de week, op basis van wat er echt gebeurde */
function coachAdvice(){ const t = today(), mon = mondayOf(t), w = weekByStart(mon); const out = [];
  const dow = (parseD(t).getDay()+6)%7; const lw = weekByStart(addDays(mon,-7));
  const nr = (PLAN.races||[]).find(r => r.date >= t); const nd = nr ? Math.round((parseD(nr.date)-parseD(t))/864e5) : 99;
  if(nd <= 7) out.push('Raceweek '+esc(nr.name.split(' – ')[0])+': niets nieuws meer proberen, rustige runs écht rustig en vroeg naar bed. Kwaliteit zit erin, vermoeidheid moet eruit.');
  const st = w ? weekStats(w) : null, ls = lw ? weekStats(lw) : null;
  const flags = (st ? st.easyFlags.length : 0) + (dow <= 1 && ls ? ls.easyFlags.length : 0);
  if(flags) out.push('Rustige runs te hard ('+flags+'×): houd de hartslag onder '+easyHr()+'. Langzamer lopen op rustige dagen maakt de harde dagen beter.');
  const sp = intensitySplit(actsIn(addDays(mon,-14), t)); if(sp.tot > 3*3600){ const r = Math.round(sp.t.rustig/sp.tot*100); if(r < 70) out.push('Afgelopen 2 weken '+r+'% van je looptijd rustig; richting 75–80%. Minder grijze zone, meer echt rustig.'); }
  if(w){ const wn = loadWarnings(w); if(wn.length) out.push(esc(wn[0])+'. Houd de rest van de week rustig.'); }
  if(dow >= 3){ const {tg} = groupTargets(mon), per = weekGroupSets(mon); const low = MG.filter(([g]) => tg[g] && (per[g]||0) < tg[g]*0.4).map(([,n]) => n);
    if(low.length >= 2) out.push('Kracht loopt achter: '+low.slice(0,3).join(', ')+' nog onder 40% van het weekdoel. Geen inhaalslag, wel de volgende sessie(s) afmaken.'); }
  const rd = []; for(let i=0;i<3;i++){ const y = dailyOf(addDays(t,-i)); if(y.rd!=null) rd.push(y.rd); }
  if(rd.length >= 2){ const avg = rd.reduce((a,b)=>a+b,0)/rd.length; if(avg < 65) out.push('Readiness gemiddeld '+Math.round(avg)+' de laatste dagen: kwaliteit pas doen als de warming-up goed voelt, anders easy.'); }
  if(!out.length && st) out.push('Op schema: '+st.sessDone+'/'+st.sessPlan+' sessies en '+fmtN(st.runDone)+' van '+fmtN(st.runPlan)+' km. Zo doorgaan.');
  return out.slice(0,2); }
function lapsTable(a){
  if(!a.laps) return '';
  return '<table style="margin-top:6px"><tr><th>#</th><th class="r">m</th><th class="r">tijd</th><th class="r">tempo</th><th class="r">HF</th></tr>'+a.laps.map((l,i)=>
    '<tr><td>'+(i+1)+'</td><td class="r">'+l.m+'</td><td class="r">'+fmtSec(l.sec)+'</td><td class="r">'+(l.m?fmtSec(l.sec/(l.m/1000)):'')+'</td><td class="r">'+(l.hr||'')+'</td></tr>').join('')+'</table>';
}

/* ---------- UI-status ---------- */
const ui = {rv:{}, xrows:{}, stack:[], dailyEdit:{}, painOpen:false, wu:{}, tab:'vandaag', week:mondayOf(today()), day:null, sid:null, prefill:null, chkWeek:null, restoreArmed:false, open:{}, menu:{}, laps:{}, swap:{}, rir:{}, sw:{}, exFocus:{}, info:{}};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){ const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(()=> t.style.display='none', 1800); }

/* ---------- rusttimer, flits, scherm aan ---------- */
let tEnd = 0, tInt = null, actx = null, wake = null;
function beep(){ try { actx = actx || new (window.AudioContext||window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.value = 880; o.connect(g); g.connect(actx.destination); g.gain.value = .25; o.start(); o.stop(actx.currentTime + .4); } catch(e){} }
function unlockAudio(){ try { actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); } catch(e){} }
let tDur = 0;
function startTimer(sec){ if(!sec) return; document.body.classList.add('timeron'); tDur = sec; sessionStorage.setItem('tDur', sec); tEnd = Date.now() + sec*1000; sessionStorage.setItem('tEnd', tEnd); $('timer').classList.add('show'); $('timer').classList.remove('end'); tick(); startTicker(); }
function startTicker(){ clearInterval(tInt); tInt = setInterval(tick, 250); }
function tick(){
  if(tEnd){ const left = Math.ceil((tEnd - Date.now())/1000);
    if(left <= 0){ $('tval').textContent = 'Go!'; if(!$('timer').classList.contains('end')){ $('timer').classList.add('end'); beep(); if(navigator.vibrate) navigator.vibrate([200,100,200]);
      const f = $('flash'); f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); setTimeout(()=> f.classList.remove('show'), 1700); }
      if(left <= -10) stopTimer(); }
    else $('tval').textContent = fmtSec(left);
    const dur = tDur || Number(sessionStorage.getItem('tDur')) || 90; $('tfill').style.width = (100*Math.max(0,left)/dur)+'%'; }
  document.querySelectorAll('[data-swlive]').forEach(el => { const t0 = ui.sw[el.dataset.swlive]; if(t0) el.textContent = '■ Stop · '+fmtSec((Date.now()-t0)/1000); });
}
function stopTimer(){ document.body.classList.remove('timeron'); tEnd = 0; sessionStorage.removeItem('tEnd'); $('timer').classList.remove('show','end'); }
async function keepAwake(on){ try { if(on && 'wakeLock' in navigator && !wake){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', ()=> wake = null); }
  else if(!on && wake){ await wake.release(); wake = null; } } catch(e){} }
document.addEventListener('visibilitychange', ()=> { if(document.visibilityState==='visible'){ if(ui.tab==='log') keepAwake(true); ouraPull(); } });

/* ---------- zones (berekend) ---------- */
function hrZone(hr){ const l = Number(setting('lthr')); if(!hr || !l) return null; const p = hr/l*100;
  const z = p<85?'Z1 herstel':p<90?'Z2 aeroob':p<95?'Z3 tempo':p<100?'Z4 sub-drempel':p<=102?'Z5a drempel':p<=106?'Z5b VO2':'Z5c anaeroob';
  return z+' ('+Math.round(p)+'% LTHR)'; }
function paceZone(sec){ const t = Number(setting('tpace')); if(!sec || !t) return null; const r = sec/t;
  return r>1.29?'Z1 herstel':r>1.13?'Z2 aeroob':r>1.05?'Z3 tempo':r>1.00?'Z4 sub-drempel':r>=0.97?'Z5a drempel':r>=0.90?'Z5b VO2':'Z5c snelheid'; }
function powZone(w){ const f = Number(setting('ftp')); if(!w || !f) return null; const p = w/f*100;
  const z = p<=55?'Z1 herstel':p<=75?'Z2 duur':p<=90?'Z3 tempo':p<=105?'Z4 drempel':p<=120?'Z5 VO2':p<=150?'Z6 anaeroob':'Z7';
  return z+' ('+Math.round(p)+'% FTP)'; }
function calcCardio(c){
  const out = []; const sec = c.sec, km = c.km; const sp = c.sport==='trail' ? 'run' : c.sport;
  if(sec && km){ if(sp==='bike') out.push('Snelheid <b>'+fmtN(km/(sec/3600))+' km/u</b>');
    else if(sp==='swim') out.push('Tempo <b>'+fmtSec(sec/(km*10))+' /100 m</b>');
    else { const p = sec/km; out.push('Tempo <b>'+fmtSec(p)+' /km</b>'); const pz = paceZone(p); if(pz) out.push('Tempozone '+pz+' <span class="small">(vlak)</span>'); } }
  const hz = hrZone(c.hr); if(hz) out.push('HF-zone '+hz);
  const pw = powZone(c.w); if(pw && sp==='bike') out.push('Vermogen '+pw);
  if(c.rpe && sec) out.push('Belasting (RPE × min) <b>'+Math.round(c.rpe*sec/60)+'</b>');
  return out;
}

/* ---------- ochtendcheck (Oura) ---------- */
const dailyOf = d => S.daily[d] || {};
function baseline(d, k){ const v = []; for(let i=1;i<=60;i++){ const y = dailyOf(addDays(d,-i)); if(y[k]!=null) v.push(y[k]); }
  if(v.length < 21) return null; const m = v.reduce((a,b)=>a+b,0)/v.length; const sd = Math.sqrt(v.reduce((a,b)=>a+(b-m)*(b-m),0)/(v.length-1)); return {m, sd:Math.max(sd, 3), n:v.length}; }
function advice(d){
  const x = dailyOf(d); if(x.rd==null && x.sl==null && x.legs==null && x.pain==null) return null;
  const prev = []; for(let i=1;i<=7;i++){ const y = dailyOf(addDays(d,-i)); if(y.rd!=null) prev.push(y.rd); }
  const av = prev.length ? prev.reduce((a,b)=>a+b,0)/prev.length : null; const why = [];
  let lvl = 'groen'; const up = l => { if(l==='rood' || (l==='oranje' && lvl==='groen')) lvl = l; };
  const bR = baseline(d,'rd'), bS = baseline(d,'sl'); let basis = 'vaste grenzen (60/70) tot er 21 ochtendchecks zijn';
  if(x.pain!=null && x.pain>=4){ up('rood'); why.push('pijn '+x.pain+'/10'+(x.pains?' ('+Object.entries(x.pains).filter(([,v])=>v>=4).map(([k])=>k).join(', ')+')':'')); }
  if(x.rd!=null){ if(bR){ basis = 'jouw baseline: readiness '+Math.round(bR.m)+' ± '+Math.round(bR.sd)+' ('+bR.n+' dagen)';
      if(x.rd < bR.m-2*bR.sd || x.rd<55){ up('rood'); why.push('readiness '+x.rd+' (ver onder jouw normaal)'); } else if(x.rd < bR.m-bR.sd){ up('oranje'); why.push('readiness '+x.rd+' (onder jouw normaal)'); } }
    else if(x.rd<60){ up('rood'); why.push('readiness '+x.rd); } else if(x.rd<70){ up('oranje'); why.push('readiness '+x.rd); } }
  if(x.sl!=null){ if(bS ? x.sl < bS.m-1.5*bS.sd : x.sl<60){ up('oranje'); why.push('slaap '+x.sl); } }
  if(x.legs!=null && x.legs<=2){ up('oranje'); why.push('benen '+x.legs+'/5'); }
  if(av!=null && x.rd!=null && x.rd <= av-10){ up('oranje'); why.push('readiness '+Math.round(av-x.rd)+' onder je 7-daags gemiddelde'); }
  const txt = {groen:'Plan uitvoeren zoals geschreven.',
    oranje:'Plan uitvoeren, maar kwaliteit op de onderkant van de tempo’s en RPE max. 1 lager. Voelt de warming-up zwaar: kwaliteit vervangen door easy.',
    rood:'Kwaliteit vandaag schrappen: 30–45 min easy (fiets/zwem) of rust. Bij pijn ≥ 4: niet belasten op die plek en melden in de notitie.'}[lvl];
  return {lvl, txt, why, basis};
}

/* ---------- dubbele progressie met RIR ---------- */
function prevGroup(code, sid, date){
  const xs = S.sets.filter(x => x.code===code && x.sid!==sid && x.date<=date && work(x));
  if(!xs.length) return null;
  const last = xs.reduce((a,b)=> a.date>b.date || (a.date===b.date && a.ts>b.ts) ? a : b);
  return S.sets.filter(x => x.code===code && x.sid===last.sid && work(x)).sort((a,b)=>a.ts-b.ts);
}
function suggest(e, code, prev){
  const u = unitOf(code), inc = EXN(code).inc, tgt = e.rir ?? 2;
  if(!prev && EXN(code).eq==='bw' && u==='kg') return {kg:null, txt:'Eerste keer: lichaamsgewicht (kg leeg laten). Haal je '+e.hi+' reps bij RIR '+tgt+', voeg dan gewicht toe.'};
  if(!prev) return {kg:null, txt: u==='kg' && !EXN(code).time ? 'Eerste keer: kies een gewicht waarmee je '+e.lo+'–'+e.hi+' haalt bij RIR '+tgt+'.' : 'Doel: '+e.lo+(e.hi!==e.lo?'–'+e.hi:'')+' '+(u==='kg'?'reps':u)+'.'};
  if(EXN(code).time){ const t = prev.filter(x=>x.sec).map(x=>x.sec); return {kg: Math.max(...prev.map(x=>Number(x.kg)||0)) || null, txt: t.length ? 'Vorige keer '+t.map(fmtSec).join(', ')+'. Doel: gelijk of sneller bij zelfde RPE.' : 'Doel: '+e.lo+' '+u+'.'}; }
  const kg = Math.max(...prev.map(x=>Number(x.kg)||0));
  const top = prev.filter(x => (Number(x.kg)||0)===kg); const rir = x => x.rir ?? tgt;
  const minR = Math.min(...top.map(x=>x.reps)); const minRir = Math.min(...top.map(rir)), maxRir = Math.max(...top.map(rir));
  if(u!=='kg') return {kg: kg||null, txt:'Vorige keer '+top.map(x=>x.reps).join(', ')+' '+u+(kg?' @ '+fmtKg(kg)+' kg':'')+'. Doel: gelijk of +1.'};
  if(!inc) return {kg: kg||null, txt:'Vorige keer '+top.map(x=>x.reps).join(', ')+'. Doel +1 rep per set.'};
  const allHi = top.length >= e.s && top.every(x => x.reps >= e.hi);
  if(allHi && minRir >= tgt) return {kg: +(kg+inc).toFixed(2), txt:'Alle sets op '+e.hi+' bij RIR ≥ '+tgt+' → <b>'+fmtKg(kg+inc)+' kg</b> × '+e.lo+'–'+e.hi};
  if(minR >= e.lo && top.every(x => rir(x) >= tgt+2)) return {kg: +(kg+inc).toFixed(2), txt:'Te licht (RIR '+maxRir+') → <b>'+fmtKg(kg+inc)+' kg</b>'};
  if(allHi && minRir < tgt) return {kg, txt:'Reps gehaald maar zwaarder dan bedoeld (RIR '+minRir+'). Blijf op <b>'+fmtKg(kg)+' kg</b> tot het op RIR '+tgt+' lukt.'};
  if(minR < e.lo && minRir <= 0) return {kg: Math.max(0, +(kg-inc).toFixed(2)), txt:'Onder het bereik op falen → <b>'+fmtKg(Math.max(0,kg-inc))+' kg</b>'};
  return {kg: kg||null, txt:'Zelfde gewicht <b>'+fmtKg(kg)+' kg</b>, mik op '+Math.min(e.hi, minR+1)+'+ reps bij RIR '+tgt};
}

/* ---------- weekcijfers ---------- */
function altKm(s, alt){ const km = s.km||0; if(!alt) return km; if(/helft/i.test(alt)) return km*0.5; if(/^Ingekort/i.test(alt)) return km*0.65;
  const mm = alt.match(/Easy (\d+)–(\d+) min/i); if(mm) return Math.round((+mm[1] + +mm[2])/2/6); return /KICKR|fiets|zwem|Upper|Mobiliteit/i.test(alt) ? 0 : km; }
function manualUnlinked(a, b, m){ return S.cardio.filter(c => !c.del && c.date>=a && c.date<=b && !(c.sid && m.by[c.sid])); }
function weekStats(w){
  const a = w.start, b = addDays(w.start,6), m = matchWeek(w), items = weekItems(w);
  const st = {runPlan:0, runDone:0, vertPlan:w.vert||0, vertDone:0, minPlan:0, secDone:0, sessPlan:0, sessDone:0, load:0, groups:{}, rd:[], sl:[]};
  st.easyFlags = []; st.intv = [];
  for(const it of items){ const s = it.s; if(['rest','mobility'].includes(s.t)) continue; const dn = S.done[s.id]||{};
    if(dn.skip){ st.skipped = (st.skipped||0)+1; continue; }
    st.sessPlan++; if(dn.d || m.by[s.id]) st.sessDone++;
    if(['run','race'].includes(s.t)) st.runPlan += altKm(s, dn.alt);
    st.minPlan += s.min||0;
    const ef = easyFlag(s, m.by[s.id]); if(ef) st.easyFlags.push({date:it.date, s, txt:ef});
    const iv = intervalEval(s, m.by[s.id]); if(iv) st.intv.push({date:it.date, s, iv});
    const d = S.done[s.id]||{}; const mins = num(d.min) || (m.by[s.id] ? m.by[s.id].sec/60 : 0); if(d.rpe && mins) st.load += d.rpe*mins; }
  for(const x of actsIn(a,b)){ st.secDone += x.sec||0; if(RUNS.includes(x.sport)){ st.runDone += x.km||0; st.vertDone += x.hm||0; } }
  for(const c of manualUnlinked(a,b,m)){ st.secDone += c.sec||0; if(['run','trail'].includes(c.sport)) st.runDone += c.km||0; st.vertDone += c.hm||0;
    if(c.rpe && c.sec && !(c.sid && (S.done[c.sid]||{}).rpe)) st.load += c.rpe*c.sec/60; }
  for(const x of S.sets) if(work(x) && x.date>=a && x.date<=b && (x.rir==null || x.rir<=4)){ const g = EXN(x.code).g || 'overig'; st.groups[g] = (st.groups[g]||0)+1; }
  for(const [g, n] of Object.entries(plannedSetsTicked(a))) st.groups[g] = (st.groups[g]||0)+n;
  for(let i=0;i<7;i++){ const y = dailyOf(addDays(a,i)); if(y.rd!=null) st.rd.push(y.rd); if(y.sl!=null) st.sl.push(y.sl); }
  st.split = intensitySplit(actsIn(a,b));
  return st;
}
const avg = xs => xs.length ? Math.round(xs.reduce((p,q)=>p+q,0)/xs.length) : null;
function statsCard(w){
  const st = weekStats(w); const pct = (d,p) => p ? Math.min(100, Math.round(d/p*100)) : (d?100:0);
  let h = '<div class="card" id="stats"><div class="kv" style="border:0;padding:0;align-items:center"><span><b>Week</b> <span class="small">gedaan / gepland (na wijzigingen)</span><br>'+st.sessDone+'/'+st.sessPlan+' sessies · '+fmtN(st.runDone)+'/'+fmtN(st.runPlan)+' km'+(st.vertPlan?' · '+Math.round(st.vertDone)+'/'+st.vertPlan+' hm':'')+'</span><button class="btn link" data-stats="1">'+(ui.stats?'▴':'Meer ▾')+'</button></div>';
  if(!ui.stats) return h+'</div>';
  const kv = (l, p, d) => '<div class="kv"><span>'+l+'</span><span>'+p+' → <b>'+d+'</b></span></div>';
  h += kv('Sessies', st.sessPlan+(st.skipped?' <span class="small">(+'+st.skipped+' vervallen)</span>':''), st.sessDone);
  if(st.split.tot){ const p = k => Math.round(st.split.t[k]/st.split.tot*100); h += '<div class="kv"><span>Looptijd rustig / matig / hard</span><span><b>'+p('rustig')+'</b> / '+p('matig')+' / '+p('hard')+' %</span></div><div class="bar" style="display:flex"><i style="width:'+p('rustig')+'%;background:#22c55e"></i><i style="width:'+p('matig')+'%;background:#f5b942"></i><i style="width:'+p('hard')+'%;background:#f87171"></i></div>'; }
  h += kv('Hardlopen', fmtN(st.runPlan)+' km', fmtN(st.runDone)+' km'); h += '<div class="bar"><i style="width:'+pct(st.runDone,st.runPlan)+'%"></i></div>';
  h += kv('Hoogtemeters', st.vertPlan+' m', Math.round(st.vertDone)+' m'); if(st.vertPlan) h += '<div class="bar"><i style="width:'+pct(st.vertDone,st.vertPlan)+'%"></i></div>';
  h += kv('Tijd', fmtH(st.minPlan*60), fmtH(st.secDone));
  h += '<div class="kv"><span>Belasting (sRPE)</span><span><b>'+Math.round(st.load)+'</b></span></div>';
  const tg = PLAN.setTargets || {}; const gk = Object.keys(tg).concat(Object.keys(st.groups).filter(g => !(g in tg) && !['plyo','hyrox'].includes(g)));
  h += '<div style="margin-top:8px"><b style="font-size:15px">Harde sets per spiergroep</b> <span class="small">gedaan / doel</span>';
  for(const g of gk){ const n = st.groups[g]||0, t = tg[g]||0; h += '<div class="kv" style="padding:3px 0;border:0"><span>'+g+'</span><span>'+n+(t?' / '+t:'')+'</span></div>'+(t?'<div class="bar" style="height:6px;margin-top:0"><i style="width:'+Math.min(100,Math.round(n/t*100))+'%;background:'+(n>=t?'#22c55e':'#f5b942')+'"></i></div>':''); }
  h += '<div class="small">Richtlijn ≥ 10 harde sets/spiergroep/week voor spiergroei (Schoenfeld e.a. 2017); benen lager omdat lopen al belast. Alleen gelogde sets tellen.</div></div>';
  if(st.rd.length || st.sl.length) h += '<div class="kv"><span>Oura gem.</span><span>Readiness <b>'+(avg(st.rd)??'–')+'</b> · Slaap <b>'+(avg(st.sl)??'–')+'</b></span></div>';
  h += '<div class="small" style="margin-top:6px">Gedaan = Strava (bijgewerkt '+esc(STRAVA.updated||'–')+') + handmatige logs die niet aan een Strava-sessie gekoppeld zijn.</div></div>';
  return h;
}

/* ---------- weekstrip ---------- */
function dayStatus(date){
  const w = weekByStart(mondayOf(date)); if(!w) return 'rest'; const m = matchWeek(w);
  const its = weekItems(w).filter(i => i.date===date && !['rest','mobility'].includes(i.s.t)); if(!its.length) return 'rest';
  let done = 0, alt = 0, skip = 0; for(const i of its){ const st = S.done[i.s.id]||{}; if(st.skip) skip++; else if(st.d || m.by[i.s.id]) done++; else if(st.alt) alt++; }
  if(done === its.length) return 'ok'; if(skip === its.length) return 'miss';
  if(date < today()){ return done+alt ? 'part' : 'miss'; } if(alt && !done) return 'alt'; return done ? 'part' : 'todo';
}
/* geplande belasting per sessie: minuten × intensiteit (ruwe schatting, alleen voor de vorm van de week) */
function sessLoad(s){ if(['rest','mobility'].includes(s.t) || s.rt) return 0; const k = typeof sessKind==='function' ? sessKind(s) : s.t;
  const min = s.min || (s.km ? s.km*5.6 : s.t==='strength' ? 60 : 45);
  const f = {race:2, drempel:1.6, interval:1.7, heuvel:1.6, fietskwal:1.4, hyrox:1.6, lang:1.15, strength:1.1, plyo:0.9, easy:1, herstel:0.5, activatie:0.7, fietsz2:0.75, swim:0.8}[k] ?? 1; return min*f; }
function weekStrip(start, sel, mode){
  const t = today(); let h = '<div class="strip">';
  const L = []; for(let i=0;i<7;i++){ const d = addDays(start,i); const its = dayItems(d).filter(x => !isSkipped(x.s.id)); const w = weekByStart(mondayOf(d)); const m = w ? matchWeek(w) : {by:{}};
    L.push({d, pl: its.reduce((p,x) => p+sessLoad(x.s), 0), dn: its.filter(x => (S.done[x.s.id]||{}).d || m.by[x.s.id]).reduce((p,x) => p+sessLoad(x.s), 0)}); }
  const mx = Math.max(60, ...L.map(x => x.pl));
  for(let i=0;i<7;i++){ const {d, pl, dn} = L[i]; const st = dayStatus(d); const hp = pl ? Math.max(10, pl/mx*100) : 0;
    h += '<button data-strip="'+d+'" data-mode="'+mode+'" class="'+(d===sel?'sel ':'')+(d===t?'td':'')+'">'+DAYS[i]+'<b>'+parseD(d).getDate()+'</b><span class="terr">'+(pl ? '<i style="height:'+hp.toFixed(0)+'%"><u style="height:'+Math.min(100, dn/pl*100).toFixed(0)+'%"></u></i>' : '')+'</span><span class="dot '+st+(ui.popDay===d?' pop':'')+'"></span></button>'; }
  return h+'</div>';
}
function nextRace(){ const t = today(); const r = (PLAN.races||[]).filter(x => x.date>=t).sort((a,b)=>a.date.localeCompare(b.date))[0]; if(!r) return '';
  const n = Math.round((parseD(r.date)-parseD(t))/864e5); return '<span class="race">'+ic('race',14)+' '+esc(r.name.split(' (')[0])+' · '+(n===0?'vandaag':n===1?'morgen':'over '+n+' dagen')+'</span>'; }
function infoBtn(k){ return '<button class="ib" data-info="'+k+'" aria-label="Uitleg">i</button>'; }
function infoBox(k){ return ui.info[k] ? '<div class="info">'+INFO[k]+'</div>' : ''; }
/* Voedingsherinnering: lange sessies (> 75 min) zonder gelogde koolhydraten, vandaag of gisteren. */
function fuelTodo(){ const out = []; const t = today();
  for(const d of [addDays(t,-1), t]){ const w = weekByStart(mondayOf(d)); if(!w) continue; const m = matchWeek(w);
    for(const it of weekItems(w).filter(i => i.date===d && ['run','bike','race'].includes(i.s.t))){ const st = S.done[it.s.id]||{}; const a = m.by[it.s.id];
      const mins = a ? a.sec/60 : (num(st.min) || 0); if(!(st.d || a) || st.skip || mins <= 75) continue;
      if(S.cardio.some(c => !c.del && c.sid===it.s.id && (c.kh || c.wat))) continue; out.push(it); } }
  return out; }
/* Belastingwaarschuwing (vuistregels): weekkm, langste duurloop en hoogtemeters t.o.v. de weken ervoor. */
function weekDone(a){ const b = addDays(a,6); const pw = weekByStart(a); const m = matchWeek(pw); let km = 0, hm = 0, long = 0;
  for(const x of actsIn(a,b)) if(RUNS.includes(x.sport)){ km += x.km||0; hm += x.hm||0; long = Math.max(long, x.km||0); }
  for(const c of manualUnlinked(a,b,m)) if(['run','trail'].includes(c.sport)){ km += c.km||0; hm += c.hm||0; long = Math.max(long, c.km||0); }
  return {km, hm, long}; }
function loadWarnings(w){
  const st = weekStats(w); const prev = [1,2,3,4].map(i => weekDone(addDays(w.start, -7*i))); const out = [];
  const avg3 = (prev[0].km + prev[1].km + prev[2].km)/3; const base = Math.max(st.runPlan, st.runDone);
  if(avg3 > 0 && base > avg3*1.3 && base - avg3 > 5) out.push('Lopen: '+fmtN(base)+' km deze week tegen gem. '+fmtN(avg3)+' km in de 3 weken ervoor (+'+Math.round((base/avg3-1)*100)+'%).');
  const longPlan = Math.max(0, ...weekItems(w).filter(i => ['run','race'].includes(i.s.t)).map(i => i.s.km||0)); const longPrev = Math.max(...prev.map(x=>x.long));
  if(longPlan > 15 && longPrev > 0 && longPlan > longPrev*1.25) out.push('Langste loop '+fmtN(longPlan)+' km tegen max. '+fmtN(longPrev)+' km in de 4 weken ervoor.');
  const vb = Math.max(st.vertPlan, st.vertDone), vp = Math.max(...prev.map(x=>x.hm));
  if(vb > 400 && vb > vp*1.5) out.push('Hoogtemeters '+Math.round(vb)+' m tegen max. '+Math.round(vp)+' m per week in de 4 weken ervoor.');
  return out; }
