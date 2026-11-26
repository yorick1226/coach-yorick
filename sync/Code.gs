/**
 * Coach → Google Sheet. Upsert op id per tabblad (set, cardio, done, checkin, daily, avail, body, …).
 * doGet?all=1 geeft alles terug voor 'Herstel uit Google Sheet' in de app.
 * Installeren: zie ONDERHOUD.md, paragraaf "Google Sheet-koppeling".
 */
const HEAD = ['id', 'date', 'ts', 'json'];

/* Beveiliging: zet scripteigenschap APP_KEY (dezelfde sleutel als in de app onder Meer → Instellingen).
 * Zonder APP_KEY blijft het script open (oude werking). */
function keyOk_(e) { const k = PropertiesService.getScriptProperties().getProperty('APP_KEY'); return !k || ((e && e.parameter && e.parameter.k) === k); }

function doPost(e) {
  if (!keyOk_(e)) return ContentService.createTextOutput('sleutel onjuist');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const items = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const byKind = {};
    items.forEach(it => (byKind[it.kind] = byKind[it.kind] || []).push(it));
    Object.keys(byKind).forEach(kind => {
      let sh = ss.getSheetByName(kind);
      if (!sh) { sh = ss.insertSheet(kind); sh.appendRow(HEAD); }
      const n = sh.getLastRow();
      const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])) : [];
      byKind[kind].forEach(it => {
        const row = [it.id, it.date || '', new Date(it.ts), JSON.stringify(it.data)];
        const i = ids.indexOf(String(it.id));
        if (i >= 0) sh.getRange(i + 2, 1, 1, HEAD.length).setValues([row]);
        else { sh.appendRow(row); ids.push(String(it.id)); }
      });
    });
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (!keyOk_(e)) return json_({ error: 'sleutel onjuist of ontbreekt' });
  const q = (e && e.parameter) || {};
  if (q.oura_code) return json_(ouraConnect_(q.oura_code));
  if (q.oura) { try { ouraSync(); } catch (err) {} return json_(ouraRows_(Number(q.days) || 21)); }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = {};
  ss.getSheets().forEach(sh => {
    const n = sh.getLastRow();
    if (n < 2 || sh.getRange(1, 1).getValue() !== 'id') return;
    out[sh.getName()] = sh.getRange(2, 1, n - 1, HEAD.length).getValues()
      .map(r => ({ id: String(r[0]), date: r[1], data: r[3] }));
  });
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ================= Oura =================
 * Scripteigenschappen (Projectinstellingen → Scripteigenschappen):
 *   OURA_CLIENT_ID      = client-ID van je Oura-app
 *   OURA_CLIENT_SECRET  = client-secret van je Oura-app (nooit in de app of repo)
 * Daarna éénmalig de functie installOuraTrigger uitvoeren (ophalen elk half uur, 05–12 u).
 * Tokens (OURA_ACCESS/OURA_REFRESH/OURA_EXP) beheert het script zelf.
 */
const OURA_REDIRECT = 'https://yorick1226.github.io/coach-yorick/';
const OURA_API = 'https://api.ouraring.com';

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }

function ouraToken_(params) {
  const P = props_();
  params.client_id = P.getProperty('OURA_CLIENT_ID');
  params.client_secret = P.getProperty('OURA_CLIENT_SECRET');
  if (!params.client_id || !params.client_secret) throw new Error('OURA_CLIENT_ID/OURA_CLIENT_SECRET ontbreken in scripteigenschappen');
  const r = UrlFetchApp.fetch(OURA_API + '/oauth/token', { method: 'post', payload: params, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Oura token ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  const t = JSON.parse(r.getContentText());
  P.setProperty('OURA_ACCESS', t.access_token);
  if (t.refresh_token) P.setProperty('OURA_REFRESH', t.refresh_token); // refresh-tokens zijn eenmalig: altijd de nieuwe bewaren
  P.setProperty('OURA_EXP', String(Date.now() + (Number(t.expires_in) || 86400) * 1000 - 120000));
  return t.access_token;
}
function ouraConnect_(code) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { ouraToken_({ grant_type: 'authorization_code', code: code, redirect_uri: OURA_REDIRECT }); ouraSync(28); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
  finally { lock.releaseLock(); }
}
function ouraAccess_() {
  const P = props_();
  if (P.getProperty('OURA_ACCESS') && Date.now() < Number(P.getProperty('OURA_EXP') || 0)) return P.getProperty('OURA_ACCESS');
  const rt = P.getProperty('OURA_REFRESH'); if (!rt) throw new Error('Oura nog niet verbonden');
  return ouraToken_({ grant_type: 'refresh_token', refresh_token: rt });
}
function ouraGet_(path, start, end) {
  const r = UrlFetchApp.fetch(OURA_API + '/v2/usercollection/' + path + '?start_date=' + start + '&end_date=' + end,
    { headers: { Authorization: 'Bearer ' + ouraAccess_(), 'User-Agent': 'CoachYorick/1.0' }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return [];
  return JSON.parse(r.getContentText()).data || [];
}
function iso_(d) { return Utilities.formatDate(d, 'Europe/Amsterdam', 'yyyy-MM-dd'); }

/** Haalt readiness, slaapscore, HRV en rust-HF op en zet ze in tabblad 'oura' (één rij per dag). */
function ouraSync(days) {
  const P = props_(); if (!P.getProperty('OURA_REFRESH') && !P.getProperty('OURA_ACCESS')) return;
  const end = new Date(Date.now() + 864e5), start = new Date(Date.now() - (days || 3) * 864e5);
  const s = iso_(start), e = iso_(end), by = {};
  const row = d => (by[d] = by[d] || { day: d });
  ouraGet_('daily_readiness', s, e).forEach(x => { const o = row(x.day); o.rd = x.score; o.temp = x.temperature_deviation; });
  ouraGet_('daily_sleep', s, e).forEach(x => { row(x.day).sl = x.score; });
  ouraGet_('sleep', s, e).forEach(x => { const o = row(x.day); const len = x.total_sleep_duration || 0;
    if (x.type === 'long_sleep' || len > (o._len || 0)) { o._len = len; o.hrv = x.average_hrv; o.rhr = x.lowest_heart_rate; } });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('oura'); if (!sh) { sh = ss.insertSheet('oura'); sh.appendRow(['day', 'json', 'ts']); }
  const n = sh.getLastRow(); const have = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0]).slice(0, 10)) : [];
  Object.keys(by).forEach(d => { const o = by[d]; delete o._len; if (o.rd == null && o.sl == null) return;
    const vals = ["'" + d, JSON.stringify(o), new Date()]; // apostrof: Sheets maakt er anders een datum van const i = have.indexOf(d);
    if (i >= 0) sh.getRange(i + 2, 1, 1, 3).setValues([vals]); else { sh.appendRow(vals); have.push(d); } });
}
function ouraRows_(days) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('oura'); if (!sh || sh.getLastRow() < 2) return { connected: !!props_().getProperty('OURA_REFRESH'), days: [] };
  const from = iso_(new Date(Date.now() - days * 864e5));
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().map(r => JSON.parse(r[1])).filter(o => o.day >= from);
  return { connected: true, days: rows };
}
/** Eénmalig uitvoeren vanuit de editor. */
function installOuraTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'ouraCron').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ouraCron').timeBased().everyMinutes(30).create();
}
function ouraCron() { const h = Number(Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'H')); if (h >= 5 && h < 12) ouraSync(3); }
