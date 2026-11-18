'use strict';
/* ---------- events ---------- */
/* ---------- terug-navigatie: eigen stapel + browsergeschiedenis (Android-terugknop, iOS-veeggebaar in Safari) ---------- */
function snap(){ return {tab:ui.tab, day:ui.day, week:ui.week, sid:ui.sid, chkWeek:ui.chkWeek, y:window.scrollY}; }
function go(mut){ const before = snap(); mut(); if(before.tab===ui.tab && before.day===ui.day && before.sid===ui.sid) { render(); return; }
  ui.stack.push(before); if(ui.stack.length > 30) ui.stack.shift(); try { history.pushState({coach:ui.stack.length}, ''); } catch(e){}
  window.scrollTo(0,0); render(); }
function goBack(){ const p = ui.stack.pop(); if(!p) return false; Object.assign(ui, {tab:p.tab, day:p.day, week:p.week, sid:p.sid, chkWeek:p.chkWeek}); render(); window.scrollTo(0, p.y||0); return true; }
/* app wordt weggeklikt: veld verlaten zodat alles is bewaard */
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='hidden' && document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
window.addEventListener('popstate', () => { goBack(); });
function rerender(){ const y = window.scrollY; render(); window.scrollTo(0, y); }
function exFor(code){ const f = sessById(ui.sid); return f && sessEx(f.s).find(x => cOf(f.s.id, x)===code); }
function applyPickNoop(){ const sid = ui.sid; enqueue('sessmod', sid, (sessById(sid)||{}).date||'', {extra:S.extra[sid]||[], exskip:Object.fromEntries(Object.entries(S.exskip).filter(([k])=>k.startsWith(sid+'|')))}); }
function applyPick(code, mode, forC){
  const sid = ui.sid;
  if(mode==='swap'){ const k = sid+'|'+forC; if(code===forC) delete S.swaps[k]; else S.swaps[k] = code; ui.swap[forC] = false; toast('Gewisseld: '+EXN(code).n); }
  else { const list = S.extra[sid] || (S.extra[sid] = []); if(list.some(x => x.c===code) || sessEx(sessById(sid).s).some(x => cOf(sid, x)===code)){ toast('Staat al in deze sessie'); return; }
    list.push(Object.assign({c:code, add:true}, defaultsFor(code))); ui.addOpen = false; ui.exFocus[sid] = code; toast('Toegevoegd: '+EXN(code).n); }
  enqueue('sessmod', sid, (sessById(sid)||{}).date||'', {swaps:Object.fromEntries(Object.entries(S.swaps).filter(([k])=>k.startsWith(sid+'|'))), extra:S.extra[sid]||[], exskip:Object.fromEntries(Object.entries(S.exskip).filter(([k])=>k.startsWith(sid+'|')))});
  rerender(); setTimeout(()=>{ const el = document.getElementById('ex_'+(mode==='swap'?forC:code)); if(el) el.scrollIntoView({block:'center'}); }, 30);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if(!b) return; const ds = b.dataset;
  if(ds.tab){ go(() => { ui.tab = ds.tab; if(ds.tab==='vandaag') ui.day = null; if(ds.tab==='log' && !ui.sid){ const it = weekItems(weekByStart(mondayOf(today()))).find(i => i.date===today() && hasEx(i.s) && !isSkipped(i.s.id)); if(it) ui.sid = it.s.id; } }); return; }
  if(ds.done){ const cur = (S.done[ds.done]||{}).d;
    if(!cur && !(S.done[ds.done]||{}).min){ const ss = S.sets.filter(x => x.sid===ds.done && !x.del).map(x=>x.ts); if(ss.length > 1) setDone(ds.done, {min: String(Math.round((Math.max(...ss)-Math.min(...ss))/60000) + 5)}); } const f = sessById(ds.done); const auto = f && matchWeek(f.w).by[ds.done];
    if(auto && !cur){ toast('Al gedaan volgens Strava'); return; } setDone(ds.done, {d:!cur}); rerender(); return; }
  if(ds.norpe){ setDone(ds.norpe, {norpe:true}); rerender(); return; }
  if(ds.srpe){ const cur = (S.done[ds.srpe]||{}).rpe, v = Number(ds.v); setDone(ds.srpe, {rpe: cur===v ? null : v}); rerender(); return; }
  if(ds.open){ ui.open[ds.open] = b.dataset.isopen!=='1'; rerender(); return; }
  if(b.id==='ring'){ $('timer').classList.toggle('ctl'); return; }
  if(ds.strip){ if(ds.mode==='day'){ go(() => { ui.day = ds.strip===today() ? null : ds.strip; ui.tab = 'vandaag'; }); }
    else { const el = document.getElementById('d_'+ds.strip); if(el) window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 70, behavior:'smooth'}); } return; }
  if(ds.info){ ui.info[ds.info] = !ui.info[ds.info]; rerender(); return; }
  if(ds.exfocus){ ui.exFocus[ui.sid] = ds.exfocus; rerender(); setTimeout(()=>{ const el = document.getElementById('ex_'+ds.exfocus); if(el) el.scrollIntoView({block:'start'}); }, 20); return; }
  if(ds.mobtest){ ui.mobOpen = true; go(() => { ui.tab = 'check'; }); setTimeout(() => { const e = $('mobcard'); if(e) e.scrollIntoView({block:'start'}); }, 50); return; }
  if(ds.zwo){ const f = sessById(ds.zwo); if(!f || !f.s.zwo) return; const blob = new Blob([zwoXml(f.s)], {type:'application/xml'}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = ds.zwo+'.zwo'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Zet het bestand in Documenten/Zwift/Workouts'); return; }
  if(ds.rtstart){ rpStart(ds.rtstart, ds.rtkey, ds.rtdate); return; }
  if(ds.rtchk){ setRt(ds.rtdate, ds.rtchk, !rtDone(ds.rtdate, ds.rtchk)); rerender(); return; }
  if(ds.rp){ ({stop: rpClose, prev: rpPrev, next: rpNext, pause: rpPause})[ds.rp](); return; }
  if(ds.backswap){ const sid = ds.backswap; const s0 = sessById(sid).s; for(const [a,b] of [['RDL','HT'],['SQ','LP']]) for(const e of sessEx(s0)) if(cOf(sid, e)===a) S.swaps[sid+'|'+e.c] = b;
    enqueue('sessmod', sid, sessById(sid).date, {swaps:Object.fromEntries(Object.entries(S.swaps).filter(([k])=>k.startsWith(sid+'|'))), extra:S.extra[sid]||[], exskip:Object.fromEntries(Object.entries(S.exskip).filter(([k])=>k.startsWith(sid+'|')))}); toast('Gewisseld naar rugvriendelijke varianten'); rerender(); return; }
  if(ds.dailyedit){ ui.dailyEdit[ds.dailyedit] = true; if(ds.painopen) ui.painOpen = true; rerender(); return; }
  if(ds.dailydone){ ui.dailyEdit[ds.dailydone] = false; ui.painOpen = false; window.scrollTo(0,0); render(); return; }
  if(ds.painopen){ ui.painOpen = true; rerender(); return; }
  if(ds.ploc){ const d = ui.day || today(); const x = S.daily[d] || (S.daily[d] = {}); const p = Object.assign({}, x.pains||{}); if(p[ds.ploc]!=null) delete p[ds.ploc]; else p[ds.ploc] = 2; setPains(d, p); rerender(); return; }
  if(ds.pscore){ const d = ui.day || today(); const p = Object.assign({}, (dailyOf(d).pains)||{}); p[ds.pscore] = Number(ds.v); setPains(d, p); rerender(); return; }
  if(ds.stats){ ui.stats = !ui.stats; rerender(); return; }
  if(ds.jump){ const e = $(ds.jump); if(e) e.scrollIntoView({behavior:'smooth', block:'start'}); else toast('Nog geen gegevens voor dit onderdeel'); return; }
  if(ds.block){ ui.block = Number(ds.block); rerender(); return; }
  if(ds.ins){ ui.ins = ds.ins; rerender(); window.scrollTo(0,0); return; }
  if(ds.range){ ui.range = Number(ds.range); rerender(); return; }
  if(ds.laps){ ui.laps[ds.laps] = !ui.laps[ds.laps]; rerender(); return; }
  if(ds.menu){ ui.menu[ds.menu] = !ui.menu[ds.menu]; rerender(); return; }
  if(ds.move){ const f = sessById(ds.move); if(ds.to===f.d.date) delete S.moves[ds.move]; else S.moves[ds.move] = ds.to; enqueue('move', ds.move, ds.to, {to:ds.to, from:f.d.date}); rerender(); toast('Verplaatst naar '+fmtDay(ds.to)); return; }
  if(ds.skip){ const cur = (S.done[ds.skip]||{}).skip; setDone(ds.skip, cur===ds.r ? {skip:null} : {skip:ds.r, d:false, alt:null}); ui.menu[ds.skip] = false; rerender(); return; }
  if(ds.alt){ const f = sessById(ds.alt); const t = altOptions(f.s)[Number(ds.i)]; const cur = (S.done[ds.alt]||{}).alt; setDone(ds.alt, cur===t ? {alt:null} : {alt:t, skip:null}); ui.menu[ds.alt] = false; rerender(); toast(cur===t ? 'Alternatief weggehaald' : 'Alternatief gekozen'); return; }
  if(ds.reset){ delete S.moves[ds.reset]; setDone(ds.reset, {skip:null, alt:null}); enqueue('move', ds.reset, '', {to:null}); rerender(); return; }
  if(ds.logger){ go(() => { ui.sid = ds.logger; ui.tab = 'log'; }); return; }
  if(ds.pick){ ui.sid = null; rLog(); return; }
  if(ds.cardio){ const f = sessById(ds.cardio); go(() => { ui.prefill = {sid:ds.cardio, date:f.date, sport:({bike:'bike',swim:'swim'})[f.s.t]||'run'}; ui.tab='duur'; }); return; }
  if(ds.oura){ location.href = ouraAuthUrl(); return; }
  if(ds.ourapull){ ouraPull(true).then(d => toast(d ? (d.days||[]).length+' dagen uit Oura' : 'Ophalen mislukt')); return; }
  if(ds.manual){ go(() => { ui.prefill = null; ui.tab = 'duur'; }); return; }
  if(ds.seen){ S.settings.seenPlan = PLAN.version+'/'+PLAN.updated; save(); rerender(); return; }
  if(ds.kgd){ const inp = document.querySelector('[data-kg="'+ds.kgd+'"]'); const inc = EXN(ds.kgd).inc || 1; const v = (num(inp.value)||0) + inc*Number(ds.dir);
    inp.value = String(Math.max(0, +v.toFixed(2))).replace('.', ','); ui['kg_'+ui.sid+ds.kgd] = inp.value; return; }
  if(ds.wu){ ui.wu[ds.wu] = !ui.wu[ds.wu]; rerender(); return; }
  if(ds.rir){ ui.rir[ds.rir] = Number(ds.v); document.querySelectorAll('[data-rir="'+ds.rir+'"]').forEach(c => c.classList.toggle('on', c===b)); return; }
  if(ds.rep){ logSet(ds.rep, Number(ds.r)); return; }
  if(ds.rset){ const c = ds.rset, k = Number(ds.k), rk = ui.sid+'|'+c; const R = ui.rv[rk] || []; const r = R[k] || {};
    const row = b.closest('.sr'); const ki = row && row.querySelector('[data-rkg]'), ri = row && row.querySelector('[data-rreps]');
    const kg = ki ? num(ki.value) : null, reps = num(ri && ri.value); if(reps==null){ toast('Vul '+(unitOf(c)==='kg'?'reps':'een waarde')+' in'); return; }
    R.splice(k, 1); if(ui.xrows[rk] && R.length < ui.xrows[rk]) ui.xrows[rk] = R.length; logSet(c, reps, null, {kg: ki ? kg : null, wu: !!r.wu}); return; }
  if(ds.rwu){ const [sid, c, k] = ds.rwu.split('|'); const R = ui.rv[sid+'|'+c] || []; if(R[k]){ R[k].wu = !R[k].wu; if(R[k].wu){ const p = Number(R[k].kg); if(p) R[k].kg = Math.round(p*0.5/2.5)*2.5 || p; } } rerender(); return; }
  if(ds.raddrow){ ui.xrows[ds.raddrow] = (ui.xrows[ds.raddrow]||0) + 1; rerender(); return; }
  if(ds.repgo){ const i = document.querySelector('[data-repx="'+ds.repgo+'"]'); const v = num(i && i.value); if(v!=null) logSet(ds.repgo, v); return; }
  if(ds.swapopen){ ui.swap[ds.swapopen] = !ui.swap[ds.swapopen]; rerender(); return; }
  if(ds.pickex){ applyPick(ds.pickex, ds.mode, ds.for); return; }
  if(ds.newex){ const box = b.closest('.picker'); const n = box.querySelector('[data-newname]').value.trim(); if(!n){ toast('Geef een naam'); return; }
    const u = box.querySelector('[data-newunit]').value, g = box.querySelector('[data-newgroup]').value, eq = box.querySelector('[data-neweq]').value;
    const code = 'U_'+Date.now().toString(36); S.custom[code] = Object.assign({n, g, eq, inc: u==='kg' ? (eq==='db'||eq==='kb' ? 1 : 2.5) : 0}, u==='kg' ? {} : {u}); enqueue('custom', code, today(), S.custom[code]); applyPick(code, ds.mode, ds.for); return; }
  if(ds.addopen){ ui.addOpen = !ui.addOpen; rerender(); return; }
  if(ds.exskip){ const k = ui.sid+'|'+ds.exskip; if(S.exskip[k]) delete S.exskip[k]; else S.exskip[k] = true; applyPickNoop(); rerender(); return; }
  if(ds.exdel){ const list = S.extra[ui.sid]||[]; const has = S.sets.some(x => x.sid===ui.sid && x.code===cOf(ui.sid, (S.extra[ui.sid]||[]).find(e => e.c===ds.exdel) || {c:ds.exdel}) && !x.del);
    if(has){ toast('Heeft al sets; verwijder die eerst of laat hem staan'); return; } S.extra[ui.sid] = list.filter(x => x.c!==ds.exdel); applyPickNoop(); rerender(); return; }
  if(ds.swap){ const k = ui.sid+'|'+ds.swap; if(ds.to===ds.swap) delete S.swaps[k]; else S.swaps[k] = ds.to; save(); ui.swap[ds.swap] = false; rerender(); toast('Oefening: '+EXN(ds.to).n); return; }
  if(ds.sw){ const c = ds.sw; const e = exFor(c);
    if(!ui.sw[c]){ ui.sw[c] = Date.now(); sessionStorage.setItem('sw', JSON.stringify(ui.sw)); unlockAudio(); stopTimer(); startTicker(); rerender(); }
    else { const sec = Math.round((Date.now()-ui.sw[c])/1000); ui.sw[c] = null; sessionStorage.setItem('sw', JSON.stringify(ui.sw)); logSet(c, e.lo, {sec}); } return; }
  if(ds.secgo){ const i = document.querySelector('[data-secx="'+ds.secgo+'"]'); const sec = tmParse(i && i.value, 's'); const e = exFor(ds.secgo); if(!isNaN(sec) && e) logSet(ds.secgo, e.lo, {sec}); return; }
  if(ds.del){ const x = S.sets.find(s => s.id===ds.del); if(x){ x.del = true; x.ts2 = Date.now(); enqueue('set', x.id, x.date, x); } rerender(); return; }
  if(ds.rpe){ ui.rpe = Number(ds.rpe); document.querySelectorAll('[data-rpe]').forEach(c => c.classList.toggle('on', c===b)); updCalc(); return; }
  if(ds.maag){ ui.maag = Number(ds.maag); document.querySelectorAll('[data-maag]').forEach(c => c.classList.toggle('on', c===b)); return; }
  if(ds.cdel){ const c = S.cardio.find(x => x.id===ds.cdel); if(c){ c.del = true; enqueue('cardio', c.id, c.date, c); } rDuur(); return; }
  if(ds.ck){ setAns(ds.ck, ds.cv!==undefined ? Number(ds.cv) : ds.cvs); rerender(); return; }
  if(ds.dlyc){ const d = ui.day || today(); const v = Number(ds.v); const cur = dailyOf(d)[ds.dlyc]; setDaily(d, ds.dlyc, cur===v ? null : v); rerender(); return; }
  if(ds.avt){ const cur = ((S.avail[ds.av]||{}).d||{})[ds.i] || {}; const on = !cur[ds.avt]; const patch = {[ds.avt]: on};
    if(on && ds.avt==='no') Object.assign(patch, {am:false, pm:false}); if(on && ds.avt!=='no') patch.no = false;
    const nx = Object.assign({}, cur, patch); patch.slot = slotOf(nx); setAvail(ds.av, ds.i, patch); rerender(); return; }
  if(ds.slot){ const cur = (((S.avail[ds.av]||{}).d||{})[ds.i]||{}).slot; setAvail(ds.av, ds.i, {slot: cur===ds.slot ? null : ds.slot}); rerender(); return; }
  if(ds.tadd){ if(tEnd){ tEnd += Number(ds.tadd)*1000; $('timer').classList.remove('end'); tick(); } return; }
  switch(b.id){
    case 'back': if(ui.stack.length){ try { history.back(); } catch(e){ goBack(); } } return;
    case 'prev': case 'next': { const n = b.id==='next' ? 7 : -7; if(ui.tab==='check') ui.chkWeek = addDays(ui.chkWeek||mondayOf(today()), n); else ui.week = addDays(ui.week, n); render(); return; }
    case 'tstop': stopTimer(); return;
    case 'c_save': { const c = cardioForm(); if(!c.date || (!c.km && !c.sec && !c.rpe && !c.kh)){ toast('Vul minstens afstand, tijd, RPE of voeding in'); return; }
      c.ts = Date.now(); c.id = 'c|'+c.date+'|'+c.ts;
      if(ui.prefill && ui.prefill.sid){ c.sid = ui.prefill.sid; const cur = S.done[c.sid]||{}; const patch = {}; if(!cur.d) patch.d = true; if(c.sec && !cur.min) patch.min = String(Math.round(c.sec/60)); if(c.rpe && !cur.rpe) patch.rpe = c.rpe; if(Object.keys(patch).length) setDone(c.sid, patch); }
      S.cardio.push(c); enqueue('cardio', c.id, c.date, c); ui.prefill = null; toast('Opgeslagen'); rDuur(); return; }
    case 'mt_save': { const r = {date: today()}; for(const t of (PLAN.mobTests||[])){ const v = num($('mt_'+t.k).value); if(v!=null) r[t.k] = v; }
      if(Object.keys(r).length < 2){ toast('Vul minstens één test in'); return; } S.mob = (S.mob||[]).filter(x => x.date!==r.date); S.mob.push(r); enqueue('mob', r.date, r.date, r); ui.mobOpen = false; toast('Mobiliteitstest bewaard'); rerender(); return; }
    case 'b_save': { const r = {date: today(), src:'weekly'}; for(const [k,id] of [['w','b_w'],['waist','b_waist'],['chest','b_chest'],['arm','b_arm'],['thigh','b_thigh']]){ const v = num($(id).value); if(v!=null) r[k] = v; }
      if(Object.keys(r).length <= 2){ toast('Vul minstens één waarde in'); return; } addBody(r); toast('Meting bewaard'); rerender(); return; }
    case 'ib_save': { const r = {date: $('ib_d').value, src:'InBody', w:num($('ib_w').value), ssm:num($('ib_ssm').value), fatkg:num($('ib_fk').value), fatp:num($('ib_fp').value)}; if(!r.w && !r.ssm){ toast('Vul gewicht of SSM in'); return; } addBody(r); toast('InBody bewaard'); rerender(); return; }
    case 'ib_import': importBody($('ib_code').value); rerender(); return;
    case 'x_block': copy(blockReport(blocks()[Number(b.dataset.bi)])); return;
    case 'x_text': copy(weekText($('x_week').value)); return;
    case 'x_sunday': copy(weekText(ui.chkWeek||mondayOf(today()))); return;
    case 'x_json': S.settings.lastBackup = Date.now(); save(); copy(backupCode()); return;
    case 'r_go': { if(!ui.restoreArmed){ try { parseBackup($('r_in').value); } catch(e){ toast('Ongeldige code'); return; } ui.restoreArmed = true; const v = $('r_in').value; rMeer(); $('r_in').value = v; return; }
      try { const o = parseBackup($('r_in').value); try { localStorage.setItem(KEY+'.undo', JSON.stringify(S)); } catch(_){} S = o; save(); ui.restoreArmed = false; toast('Hersteld'); render(); } catch(e){ toast('Ongeldige code'); } return; }
    case 'r_sheet': { if(!ui.sheetArmed){ ui.sheetArmed = true; rMeer(); return; } ui.sheetArmed = false;
      fetch(S.settings.sheetUrl+(S.settings.sheetUrl.includes('?')?'&':'?')+'all=1').then(r => r.json()).then(d => { const o = fromSheet(d); try { localStorage.setItem(KEY+'.undo', JSON.stringify(S)); } catch(_){} o.settings = S.settings; S = o; save(); toast('Hersteld uit Sheet'); render(); }).catch(e => toast('Sheet niet bereikbaar: '+e.message)); return; }
    case 'r_undo': { try { S = migrate(JSON.parse(localStorage.getItem(KEY+'.undo'))); save(); localStorage.removeItem(KEY+'.undo'); toast('Herstel ongedaan gemaakt'); render(); } catch(e){ toast('Niets om terug te zetten'); } return; }
    case 's_save': { S.settings.ftp = num($('s_ftp').value); S.settings.lthr = num($('s_lthr').value); S.settings.easyHr = num($('s_easy').value);
      const tp = tmParse($('s_tpace').value, 's'); S.settings.tpace = isNaN(tp) ? null : tp; S.settings.sheetUrl = $('s_url').value.trim(); save(); toast('Bewaard'); scheduleSync(); return; }
    case 's_sync': flush().then(()=> toast(S.queue.length ? 'Nog '+S.queue.length+' in wachtrij' : 'Verstuurd')); return;
  }
});
document.addEventListener('change', ev => { const t = ev.target, ds = t.dataset;
  if(t.id==='c_sport'){ $('c_wbox').style.display = t.value==='bike' ? '' : 'none'; updCalc(); }
  if(ds.min) setDone(ds.min, {min:t.value});
  if(ds.note) setDone(ds.note, {note:t.value});
  if(ds.ct) setAns(ds.ct, t.value);
  if(ds.dly){ ui.dailyEdit[ui.day || today()] = true; setDaily(ui.day || today(), ds.dly, num(t.value)); if(['rd','sl'].includes(ds.dly)) rerender(); }
  if(ds.avmin) setAvail(ds.avmin, ds.i, {min:t.value});
  if(ds.avnote) setAvail(ds.avnote, ds.i, {note:t.value});
  if(ds.avn) setAvail(ds.avn, null, {n:t.value});
  if(ds.kg) ui['kg_'+ui.sid+ds.kg] = t.value;
  if(t.id && t.id.startsWith('c_')) updCalc();
});
document.addEventListener('toggle', e => { const t = e.target; if(t.dataset && t.dataset.gsopen) ui.gsOpen = t.open; }, true);
document.addEventListener('input', ev => { const t = ev.target, ds = t.dataset || {};
  if(ds.rkg || ds.rreps){ const [sid, c, k] = (ds.rkg || ds.rreps).split('|'); const R = ui.rv[sid+'|'+c] || []; const r = R[k]; if(!r) return;
    if(ds.rreps){ r.reps = num(t.value); r.er = true; return; }
    r.kg = num(t.value); r.ek = true; for(let q = Number(k)+1; q < R.length; q++) if(!R[q].ek && !R[q].wu){ R[q].kg = r.kg; const el = document.querySelector('[data-rkg="'+sid+'|'+c+'|'+q+'"]'); if(el) el.value = t.value; } return; }
  if(ds.tm){ const f = tmFormat(t.value); if(f !== t.value){ t.value = f; try { t.setSelectionRange(f.length, f.length); } catch(e){} } if(t.id==='c_time') $('c_time_h').textContent = tmHint(tmParse(f, 'h')); }
  if(ds.dly){ ui.dailyEdit[ui.day || today()] = true; setDaily(ui.day || today(), ds.dly, num(t.value)); }
  if(ds.min) setDone(ds.min, {min:t.value});
  if(ds.note) setDone(ds.note, {note:t.value});
  if(ds.ct) setAns(ds.ct, t.value);
  if(ds.avmin) setAvail(ds.avmin, ds.i, {min:t.value});
  if(ds.avnote) setAvail(ds.avnote, ds.i, {note:t.value});
  if(ds.avn) setAvail(ds.avn, null, {n:t.value});
  if(t.id && t.id.startsWith('c_')) updCalc();
  if(t.dataset && t.dataset.exsearch){ const q = t.value.trim().toLowerCase(); t.closest('.picker').querySelectorAll('.exlist [data-name]').forEach(b => b.style.display = !q || b.dataset.name.includes(q) ? '' : 'none'); } });
document.addEventListener('keydown', ev => { const t = ev.target; if(ev.key==='Enter' && t.dataset && t.dataset.repx){ const v = num(t.value); if(v!=null) logSet(t.dataset.repx, v); } });

/* ---------- vegen: dagen (Vandaag) en weken (Week/Check-in) ---------- */
let sx = null, sy = null;
document.addEventListener('touchstart', ev => { const t = ev.target; if(t.closest('input,textarea,select,.exlist,.chips,svg,table')) { sx = null; return; } sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; }, {passive:true});
document.addEventListener('touchend', ev => { if(sx===null) return; const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy; sx = null;
  if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.5) return; const n = dx < 0 ? 1 : -1;
  if(ui.tab==='vandaag'){ ui.day = addDays(ui.day || today(), n); if(ui.day===today()) ui.day = null; render(); }
  else if(ui.tab==='week'){ ui.week = addDays(ui.week, 7*n); render(); window.scrollTo(0,0); }
  else if(ui.tab==='check'){ ui.chkWeek = addDays(ui.chkWeek||mondayOf(today()), 7*n); render(); } }, {passive:true});

/* ---------- start ---------- */
(async function(){
  await loadData();
  try { Object.assign(ui.sw, JSON.parse(sessionStorage.getItem('sw')||'{}')); if(Object.values(ui.sw).some(Boolean)) startTicker(); } catch(e){}
  const te = Number(sessionStorage.getItem('tEnd')); if(te > Date.now()){ tEnd = te; tDur = Number(sessionStorage.getItem('tDur')) || 90; $('timer').classList.add('show'); startTicker(); tick(); }
  if(PLAN && !weekByStart(ui.week)){ const t = today(); const w = PLAN.weeks.filter(w => w.start<=t).pop() || PLAN.weeks[0]; ui.week = w.start; }
  if(PLAN && S.settings.seenPlan===null && !S.sets.length && !Object.keys(S.done).length){ S.settings.seenPlan = PLAN.version+'/'+PLAN.updated; save(); }
  /* #ib=YB1:… : importlink voor lichaamsmetingen. De hash gaat nooit naar de server en wordt direct gewist. */
  const hm = location.hash.match(/^#ib=(.+)$/); if(hm){ history.replaceState(null, '', location.pathname); if(importBody(decodeURIComponent(hm[1]))){ ui.tab = 'inzicht'; ui.ins = 'lichaam'; } }
  { const q = new URLSearchParams(location.search); const code = q.get('code');
    if(code && q.get('state') && q.get('state')===sessionStorage.getItem('ouraState')){ history.replaceState(null, '', location.pathname); ui.tab = 'meer';
      if(!S.settings.sheetUrl) toast('Eerst je Google Sheet-URL invullen onder Meer'); else {
        toast('Oura verbinden…'); fetch(S.settings.sheetUrl+(S.settings.sheetUrl.includes('?')?'&':'?')+'oura_code='+encodeURIComponent(code)).then(r => r.json())
          .then(d => { if(d.ok){ S.settings.oura = true; save(); toast('Oura verbonden ✓'); ouraPull(true); } else toast('Oura mislukt: '+(d.error||'onbekend')); rerender(); })
          .catch(() => toast('Oura verbinden mislukt (geen verbinding met je script)')); } }
    else if(q.get('error')){ history.replaceState(null, '', location.pathname); toast('Oura: '+q.get('error')); } }
  render(); scheduleSync(); ouraPull();
  try { if(navigator.storage && navigator.storage.persist){ ui.persist = await navigator.storage.persisted() || await navigator.storage.persist(); } } catch(e){}
  if('serviceWorker' in navigator){
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', ()=> { if(had) toast('App bijgewerkt naar de nieuwste versie'); });
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();
