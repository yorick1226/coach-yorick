/**
 * Coach → Google Sheet. Upsert op id per tabblad (sets, cardio, done, checkin).
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
