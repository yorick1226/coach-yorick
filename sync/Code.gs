/**
 * Coach → Google Sheet. Upsert op id per tabblad (set, cardio, done, checkin, daily, avail, body, …).
 * doGet?all=1 geeft alles terug voor 'Herstel uit Google Sheet' in de app.
 * Installeren: zie ONDERHOUD.md, paragraaf "Google Sheet-koppeling".
 */
const HEAD = ['id', 'date', 'ts', 'json'];

function doPost(e) {
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
