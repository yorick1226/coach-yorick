#!/usr/bin/env python3
"""Releasetest. Gebruik: python3 tests/run_tests.py [--prev <git-ref>]
Zonder --prev wordt de huidige versie als 'vorige' gebruikt.
De invulfase gebruikt alleen selectors die sinds v1 stabiel zijn (zie ONDERHOUD.md)."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, threading, pathlib
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "out"
FAILS = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: FAILS.append(msg)

# ---------- statische checks ----------
def extract_js(html): return "\n".join(re.findall(r"<script>(.*?)</script>", html, re.S))
def static_checks(cur: pathlib.Path, prev: pathlib.Path):
    print("Syntax & plan")
    html = (cur/"index.html").read_text()
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f: f.write(extract_js(html)); js = f.name
    for p in (js, str(cur/"sw.js")):
        r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
        ok(r.returncode == 0, f"node --check {os.path.basename(p)} {r.stderr.strip()[:200]}")
    try: plan = json.loads((cur/"plan.json").read_text()); ok(True, "plan.json is geldige JSON")
    except Exception as e: ok(False, f"plan.json: {e}"); return
    try: st = json.loads((cur/"strava.json").read_text()); ok(isinstance(st.get("activities"), list), "strava.json geldig")
    except Exception as e: ok(False, f"strava.json: {e}")
    ids = [s["id"] for w in plan["weeks"] for d in w["days"] for s in d["s"]]
    ok(len(ids) == len(set(ids)), "sessie-id's uniek")
    ok(all(re.fullmatch(r"\d{4}-\d{2}-\d{2}-[a-z]", i) for i in ids), "sessie-id's hebben formaat datum-letter")
    ok(all(s["id"].startswith(d["date"]) for w in plan["weeks"] for d in w["days"] for s in d["s"]), "sessie-id hoort bij zijn dag")
    used = {e["c"] for w in plan["weeks"] for d in w["days"] for s in d["s"] for e in s.get("ex", [])}
    alts = {a for v in plan["exercises"].values() for a in v.get("alt", [])}
    ok((used | alts) <= set(plan["exercises"]), f"alle gebruikte oefening- en alternatiefcodes bestaan {sorted((used|alts) - set(plan['exercises']))}")
    starts = [w["start"] for w in plan["weeks"]]
    ok(starts == sorted(starts) and len(starts) == len(set(starts)), "weken uniek en op volgorde")
    pplan = json.loads((prev/"plan.json").read_text())
    gone = set(pplan["exercises"]) - set(plan["exercises"])
    ok(not gone, f"geen oefeningcodes verdwenen {sorted(gone)}")
    pids = {s["id"]: d["date"] for w in pplan["weeks"] for d in w["days"] for s in d["s"]}
    cids = {s["id"]: d["date"] for w in plan["weeks"] for d in w["days"] for s in d["s"]}
    ok(all(cids.get(k, v) == v for k, v in pids.items()), "bestaande sessie-id's niet naar andere datum verhuisd")
    phtml = (prev/"index.html").read_text()
    key = lambda h: re.search(r"const KEY = '([^']+)'", h).group(1)
    ok(key(html) == key(phtml), f"opslagsleutel ongewijzigd ({key(html)})")
    qs = lambda h: re.search(r"const QSETS = \{(.*?)\n\};", h, re.S).group(1)
    pq = re.findall(r"\n  (\d+): \[(.*?)\n  \]", qs(phtml), re.S); cq = dict(re.findall(r"\n  (\d+): \[(.*?)\n  \]", qs(html), re.S))
    ok(all(cq.get(v) == body for v, body in pq), "bestaande check-in-vragensets ongewijzigd")
    cache = lambda d: re.search(r"const CACHE = '([^']+)'", (d/"sw.js").read_text()).group(1)
    if cur != prev: ok(cache(cur) != cache(prev), f"cachenummer opgehoogd ({cache(prev)} → {cache(cur)})")
    for f in ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "ONDERHOUD.md", "ics/all.ics", "splash-1179x2556.png", "splash-1290x2796.png", "splash-1170x2532.png", "splash-1125x2436.png"]:
        ok((cur/f).exists(), f"{f} aanwezig")
    for w in plan["weeks"]:
        if w["days"]: ok((cur/"ics"/f"{w['id']}.ics").exists(), f"ics/{w['id']}.ics aanwezig")

# ---------- server met wisselbare map ----------
class Srv:
    def __init__(self):
        self.dir = None; srv = self
        class H(SimpleHTTPRequestHandler):
            def __init__(s, *a, **k): super().__init__(*a, directory=str(srv.dir), **k)
            def log_message(s, *a): pass
            def end_headers(s): s.send_header("Cache-Control", "no-store"); super().end_headers()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
    @property
    def url(self): return f"http://127.0.0.1:{self.port}/"

def store(pg): return json.loads(pg.evaluate("localStorage.getItem('yorick-coach')") or "{}")
def tab(pg, t): pg.click(f'[data-tab="{t}"]')
def focus(pg, c):
    """Oefening in de logger openklappen (focusmodus vanaf v2.3)."""
    if pg.locator(f'[data-exfocus="{c}"]').count(): pg.click(f'[data-exfocus="{c}"]')
def ensure_open(pg, sid):
    """Kaart uitklappen als de invulvelden ingeklapt zijn (vanaf v2.1)."""
    if pg.locator(f'[data-min="{sid}"]').count() == 0 and pg.locator(f'[data-open="{sid}"]').count():
        pg.click(f'[data-open="{sid}"]')

def fill_prev(pg):
    """Invullen met de VORIGE versie. Alleen stabiele selectors (bestaan sinds v1)."""
    tab(pg, "week"); pg.wait_for_selector(".sess")
    pg.click('[data-done="2026-11-17-a"]'); ensure_open(pg, "2026-11-17-a")
    pg.fill('[data-min="2026-11-17-a"]', "50"); pg.press('[data-min="2026-11-17-a"]', "Tab")
    pg.fill('[data-note="2026-11-17-a"]', "test-notitie"); pg.press('[data-note="2026-11-17-a"]', "Tab")
    pg.click('[data-logger="2026-11-17-b"]'); pg.wait_for_selector('[data-kg="SQ"]')
    pg.fill('[data-kg="SQ"]', "60"); pg.dispatch_event('[data-kg="SQ"]', "change")
    for r in ("6", "6", "5"): pg.click(f'[data-rep="SQ"][data-r="{r}"]')
    ok(pg.is_visible("#timer.show"), "rusttimer start automatisch na set (vorige versie)")
    tab(pg, "week"); ensure_open(pg, "2026-11-17-a"); pg.click('[data-cardio="2026-11-17-a"]')
    pg.fill("#c_km", "10"); pg.fill("#c_time", "50:00"); pg.fill("#c_hr", "150"); pg.click('[data-rpe="3"]'); pg.click("#c_save")
    tab(pg, "check"); pg.click('[data-ck="cijfer"][data-cv="7"]')
    pg.fill('[data-ct="pijn"]', "kuit links 2/10"); pg.dispatch_event('[data-ct="pijn"]', "change")
    pg.click('[data-ck="richting"][data-cvs="Zo laten"]')
    tab(pg, "meer"); pg.fill("#s_ftp", "228"); pg.click("#s_save")

def check_upgrade(pg, before):
    after = store(pg)
    ok(len([s for s in after["sets"] if not s.get("del")]) == 3, "3 sets bewaard na update")
    ok(len(after["cardio"]) == 1 and after["cardio"][0]["km"] == 10, "duursessie bewaard")
    ok(after["done"].get("2026-11-17-a", {}).get("note") == "test-notitie", "notitie bewaard")
    ok(any(after["checkins"].get(w, {}).get("a", {}).get("cijfer") == 7 for w in ("2026-W46", "2026-W47")), "check-in bewaard (oude vragenset)")
    ok(after["settings"]["ftp"] == 228, "instelling bewaard")
    ok(all(k in after for k in before), "geen velden verloren na migratie")

def features(pg, shots=True):
    """Nieuwe functies van v2 (huidige versie)."""
    # Vandaag + ochtendcheck
    tab(pg, "vandaag"); pg.wait_for_selector('[data-dly="rd"]')
    pg.fill('[data-dly="rd"]', "55"); pg.dispatch_event('[data-dly="rd"]', "change"); pg.fill('[data-dly="sl"]', "72"); pg.dispatch_event('[data-dly="sl"]', "change")
    pg.click('[data-dlyc="legs"][data-v="3"]')
    ok("ROOD" in pg.inner_text("#advice"), "ochtendcheck: readiness 55 → advies ROOD")
    pg.click('[data-painopen="1"]'); pg.click('[data-ploc="Kuit L"]'); pg.click('[data-pscore="Kuit L"][data-v="5"]')
    ok(store(pg)["daily"]["2026-11-17"]["pains"] == {"Kuit L": 5} and "Kuit L" in pg.inner_text("#advice"), "pijn per plek vastgelegd en in advies")
    ok(pg.locator(".strip button").count() == 7, "weekstrip zichtbaar")
    pg.click('[data-strip="2026-11-18"]'); ok("wo 18 nov" in pg.inner_text("#htitle"), "weekstrip: tik naar andere dag")
    pg.click('[data-strip="2026-11-17"]'); ok("Vandaag" in pg.inner_text("#htitle"), "terug naar vandaag")
    ok(pg.locator('[data-srpe="2026-11-17-a"]').count() == 0, "afgeronde sessie op Vandaag ingeklapt (compact)")
    ensure_open(pg, "2026-11-17-a"); pg.click('[data-info="rpe"]'); ok(pg.locator(".info").count() >= 1, "uitleg RPE via ⓘ")
    pg.click('[data-dailydone="2026-11-17"]'); ok(pg.locator("#dailysum").count() == 1, "Klaar klapt ochtendcheck in")
    pg.click('[data-dailyedit="2026-11-17"]'); pg.type('[data-dly="hrv"]', "48"); pg.reload(); pg.wait_for_selector("#tabs")
    ok(store(pg)["daily"]["2026-11-17"].get("hrv") == 48, "getypte waarde bewaard zonder veld te verlaten (app sluiten)")
    pg.reload(); pg.wait_for_selector("#tabs"); tab(pg, "vandaag")
    ok(pg.locator("#dailysum").count() == 1 and "55" in pg.inner_text("#dailysum") and pg.locator('[data-dly="rd"]').count() == 0, "ingevulde ochtendcheck klapt in tot één regel")
    pg.click('[data-dailyedit="2026-11-17"]'); ok(pg.locator('[data-dly="rd"]').count() == 1, "ochtendcheck weer te wijzigen")
    if shots: pg.screenshot(path=str(OUT/"vandaag.png"))
    # sessie-RPE + verplaatsen + overslaan
    tab(pg, "week"); pg.wait_for_selector("#stats")
    for sid in ("2026-11-17-a", "2026-11-19-a", "2026-11-18-b", "2026-11-21-a"): ensure_open(pg, sid)
    ok(pg.locator("#loadwarn").count() == 1, "waarschuwing bij snelle opbouw (W47 na rustige weken)")
    pg.fill('[data-min="2026-11-17-a"]', "90"); pg.press('[data-min="2026-11-17-a"]', "Tab")
    pg.click('[data-srpe="2026-11-17-a"][data-v="4"]')
    pg.click('[data-done="2026-11-16-a"]')
    pg.click('[data-menu="2026-11-19-a"]'); pg.click('[data-move="2026-11-19-a"][data-to="2026-11-20"]')
    ok(store(pg)["moves"].get("2026-11-19-a") == "2026-11-20", "sessie verplaatst naar vrijdag")
    pg.click('[data-menu="2026-11-18-b"]'); pg.click('[data-skip="2026-11-18-b"][data-r="Agenda"]')
    ok(store(pg)["done"]["2026-11-18-b"].get("skip") == "Agenda", "sessie overgeslagen met reden")
    pg.click('[data-menu="2026-11-21-a"]'); pg.click('[data-alt="2026-11-21-a"][data-i="0"]')
    ok(store(pg)["done"]["2026-11-21-a"].get("alt", "").startswith("Ingekort"), "alternatief gekozen voor lange duurloop")
    ok("Alternatief: Ingekort" in pg.inner_text("#s_2026-11-21-a"), "alternatief zichtbaar op de kaart")
    pg.click('[data-logger="2026-11-18-a"]'); pg.wait_for_selector('[data-rep="POGO"]')
    ok(pg.locator('[data-kg="POGO"]').count() == 0 and pg.locator('[data-kg="BOX"]').count() == 0, "geen kg-veld bij plyo")
    focus(pg, "BOX"); pg.click('[data-rep="BOX"][data-r="3"]'); bx = [x for x in store(pg)["sets"] if x["code"] == "BOX"][-1]
    ok(bx.get("kg") is None and bx["reps"] == 3, "box jump gelogd zonder kg")
    tab(pg, "week")
    ok("sessies" in pg.inner_text("#stats"), "compacte weekcijfers zichtbaar")
    pg.click('[data-stats="1"]'); ok("Belasting" in pg.inner_text("#stats") and "Harde sets per spiergroep" in pg.inner_text("#stats"), "weekcijfers uitklapbaar, met sets per spiergroep vs doel")
    tab(pg, "vandaag"); ok("Voeding loggen" in pg.inner_text("#view"), "voedingsherinnering bij sessie > 75 min")
    if shots:
        pg.evaluate("""()=>{const m=document.querySelector('#view');const T=x=>new Touch({identifier:1,target:m,clientX:x,clientY:400});m.dispatchEvent(new TouchEvent('touchstart',{touches:[T(320)],bubbles:true}));m.dispatchEvent(new TouchEvent('touchend',{changedTouches:[T(80)],bubbles:true}));}""")
        ok("wo 18 nov" in pg.inner_text("#htitle"), "vegen naar volgende dag")
    tab(pg, "week")
    if shots: pg.screenshot(path=str(OUT/"week.png"), full_page=False)
    # Strava-koppeling vorige week
    pg.click("#prev"); pg.wait_for_selector("#s_2026-11-10-a")
    ok("10,01 km" in pg.inner_text("#s_2026-11-10-a"), "Strava gekoppeld aan geplande sessie (di 10 nov)")
    ok("done" in pg.get_attribute("#s_2026-11-10-a", "class"), "Strava-sessie automatisch als gedaan getoond")
    ensure_open(pg, "2026-11-10-a"); pg.click('[data-laps="2026-11-10-a"]'); ok("4:38" in pg.inner_text("#s_2026-11-10-a"), "rondetijden uit Strava zichtbaar")
    ok("werkronden" in pg.inner_text("#s_2026-11-10-a"), "intervalbeoordeling op basis van ronden + doeltempo")
    pg.click("#prev"); ok("Vóór de start van het plan" in pg.inner_text("#view") and "Benen loslopen" in pg.inner_text("#view"), "week vóór het plan toont Strava-activiteiten")
    pg.click("#next"); pg.click("#next")
    ok(pg.locator("#coachnote").count() == 1, "coachnotitie zichtbaar in de week")
    pg.evaluate("""() => { STRAVA.activities.push({id:'t1',date:'2026-11-17',t:'09:00',sport:'Run',name:'Ochtendloop',km:8.1,sec:2600,hr:152}); render(); }""")
    ensure_open(pg, "2026-11-17-a"); ok("Te hard voor een rustige run" in pg.inner_text("#s_2026-11-17-a"), "rustige run met HF 152 wordt gemarkeerd")
    st = pg.inner_text("#stats"); ok("/33," in st or "/33 " in st, f"geplande km gecorrigeerd voor alternatief (21 → 65%) [{st.splitlines()[1] if len(st.splitlines())>1 else st}]")
    # Logger: komma, RIR, wissel
    pg.click("#next"); pg.click('[data-logger="2026-11-24-b"]'); pg.wait_for_selector('[data-kg="SQ"]')
    ok("Vorige keer" in pg.inner_text("#ex_SQ") and "60" in pg.inner_text("#ex_SQ"), "‘vorige keer’ + suggestie in volgende sessie")
    pg.fill('[data-kg="SQ"]', "62,5"); pg.dispatch_event('[data-kg="SQ"]', "change")
    pg.click('[data-rir="2026-11-24-b|SQ"][data-v="1"]'); pg.click('[data-rep="SQ"][data-r="5"]')
    last = [s for s in store(pg)["sets"] if s["sid"] == "2026-11-24-b"][-1]
    ok(last["kg"] == 62.5 and last["rir"] == 1, f"komma-invoer 62,5 en RIR 1 opgeslagen ({last.get('kg')}, {last.get('rir')})")
    ok("timeron" in (pg.get_attribute("body", "class") or ""), "extra ruimte onder de timer zodat niets wegvalt")
    nb = len([x for x in store(pg)["sets"] if x["sid"] == "2026-11-24-b" and x["code"] == "SQ"])
    pg.click('[data-wu="2026-11-24-b|SQ"]'); pg.fill('[data-kg="SQ"]', "40"); pg.dispatch_event('[data-kg="SQ"]', "change"); pg.click('[data-rep="SQ"][data-r="5"]')
    w = [x for x in store(pg)["sets"] if x["sid"] == "2026-11-24-b" and x["code"] == "SQ"][-1]
    ok(w.get("wu") is True and "rir" not in w and "W1:" in pg.inner_text("#ex_SQ") and "1/" in pg.inner_text("#ex_SQ"), "opwarmset gelogd, telt niet mee als werkset")
    ok(pg.evaluate("prevGroup('SQ','x','2026-12-31').every(x => !x.wu)"), "opwarmset telt niet mee in ‘vorige keer’")
    pg.click('[data-wu="2026-11-24-b|SQ"]')
    focus(pg, "RDL"); pg.click('[data-swapopen="RDL"]'); pg.locator('[data-pickex="HT"][data-mode="swap"]').first.click()
    ok("Hip thrust" in pg.inner_text("#ex_RDL"), "oefening gewisseld (RDL → hip thrust)")
    pg.fill('[data-kg="HT"]', "80"); pg.dispatch_event('[data-kg="HT"]', "change"); pg.click('[data-rep="HT"][data-r="8"]')
    ht = [s for s in store(pg)["sets"] if s["code"] == "HT"][-1]; ok(ht["pc"] == "RDL", "set gelogd onder vervangende code, met verwijzing naar origineel")
    # vrij wisselen via zoeken, toevoegen, eigen oefening, overslaan
    focus(pg, "BSS"); pg.click('[data-swapopen="BSS"]'); pg.fill('[data-exsearch]', "leg pr")
    vis = pg.locator('.exlist [data-pickex]:visible'); ok(vis.count() >= 1 and vis.count() < 6, f"zoeken filtert de lijst ({vis.count()} treffers)")
    pg.locator('.exlist [data-pickex="LP"]').click(); ok("Leg press" in pg.inner_text("#ex_BSS"), "wissel naar willekeurige oefening via zoeken")
    pg.click('[data-addopen="1"]'); pg.fill('[data-exsearch]', "face"); pg.locator('.exlist [data-pickex="FP"]').click()
    ok(pg.locator("#ex_FP").count() == 1, "oefening toegevoegd aan sessie")
    pg.fill('[data-kg="FP"]', "20"); pg.dispatch_event('[data-kg="FP"]', "change"); pg.click('[data-rep="FP"][data-r="12"]')
    fp = [x for x in store(pg)["sets"] if x["code"] == "FP"][-1]; ok(fp["kg"] == 20 and fp["reps"] == 12, "set gelogd op toegevoegde oefening")
    pg.click('[data-addopen="1"]'); pg.fill('[data-newname]', "Sled drag"); pg.select_option('[data-newunit]', "m"); pg.click('[data-newex="1"]')
    cust = store(pg)["custom"]; code = next((k for k, v in cust.items() if v["n"] == "Sled drag"), None)
    ok(code and code.startswith("U_") and pg.locator(f"#ex_{code}").count() == 1 and pg.locator(f'[data-kg="{code}"]').count() == 0, "eigen oefening aangemaakt (zonder kg bij meters)")
    focus(pg, "CR"); pg.click('[data-exskip="CR"]'); ok(store(pg)["exskip"].get("2026-11-24-b|CR") is True and "overgeslagen" in pg.inner_text("#ex_CR"), "oefening overgeslagen")
    if shots: pg.screenshot(path=str(OUT/"logger.png"))
    # Hyrox tijd
    tab(pg, "week"); pg.click("#prev"); pg.click('[data-logger="2026-11-20-a"]'); pg.wait_for_selector('[data-secx="SKI"]')
    pg.fill('[data-secx="SKI"]', "1:55"); pg.click('[data-secgo="SKI"]')
    sk = [s for s in store(pg)["sets"] if s["code"] == "SKI"][-1]; ok(sk["sec"] == 115 and sk["reps"] == 500, "Hyrox-station met tijd gelogd")
    # Duur met voeding + hoogtemeters
    tab(pg, "inzicht"); pg.click('[data-manual="1"]'); pg.fill("#c_km", "25"); pg.fill("#c_time", "4:10:00"); pg.fill("#c_hm", "900")
    pg.fill("#c_kh", "75"); pg.click('[data-maag="4"]'); pg.click("#c_save")
    tab(pg, "inzicht"); ins = pg.inner_text("#view")
    ok("Richting Mozart" in ins and "Voedingslog" in ins and "75" in ins, "inzicht: Mozart-voortgang + voedingslog")
    ok(pg.locator("svg").count() >= 3, "trendgrafieken getekend")
    ok(pg.locator("#mzprog").count() == 1 and "Mozart-prognose" in pg.inner_text("#mzprog"), "Mozart-prognose op basis van klimsessie")
    ok("3:25" in ins and "Wedstrijden" in ins and "Cauberg" in ins, "records en wedstrijden uit Strava")
    pg.click('[data-range="52"]'); ok("rustig / matig / hard" in pg.inner_text("#view"), "bereik 1 jaar + intensiteitsverdeling")
    ok("Back squat" in pg.inner_text("#recstr"), "krachtrecord zichtbaar")
    ok(pg.locator("#volins").count() == 1 and "doel" in pg.inner_text("#volins"), "krachtvolume per week en per spiergroep vs doel")
    ok(pg.locator("#blockrep").count() == 1 and "BLOKRAPPORT" in pg.inner_text("#blockrep") and "Naleving" in pg.inner_text("#blockrep"), "blokrapport zichtbaar")
    if shots: pg.screenshot(path=str(OUT/"inzicht.png"))
    # Check-in v2 + beschikbaarheid
    tab(pg, "check")
    if "week 46" in pg.inner_text("#htitle"):
        ok(True, "check-in opent op dinsdag de vorige week als die nog open staat"); pg.click("#next")
    pg.click('[data-slot="2×"][data-i="0"]'); pg.click('[data-slot="Niet"][data-i="1"]')
    pg.fill('[data-avmin][data-i="0"]', "90"); pg.dispatch_event('[data-avmin][data-i="0"]', "change")
    pg.click("#x_sunday"); txt = pg.input_value("#x_out")
    ok("BESCHIKBAARHEID 2026-W48" in txt and "2× · max 90 min" in txt, "beschikbaarheid in zondag-export")
    good = bool(re.search(r"Back squat: 60×6(@\d)?, 60×6(@\d)?, 60×5(@\d)?", txt)) and ("Cijfer voor deze week: 7" in txt or "2026-W46" in store(pg)["checkins"])
    if not good: print(txt[:2500])
    ok(good, "export bevat sets en check-in")
    ok("niet uitgevoerd: Agenda" in txt and "ALTERNATIEF: Ingekort" in txt and "verplaatst van" in txt and "RPE 4" in txt, "export bevat niet-uitvoeren, alternatief, verplaatsen en RPE")
    ok("SAMENVATTING" in txt and "Rustige runs te hard:" in txt and txt.index("SAMENVATTING") < txt.index("DI 17 NOV"), "export begint met samenvatting")
    ok("Oura readiness 55" in txt and "pijn Kuit L 5" in txt, "export bevat Oura-ochtendcheck en pijn per plek")
    ok("(afgevinkt zonder te loggen)" in txt, "afvinken zonder loggen is prima en staat in de export")
    if shots: pg.screenshot(path=str(OUT/"checkin.png"))
    # Lichaam: weekmeting + InBody-import (testdata, geen echte metingen in de repo)
    pg.fill("#b_w", "76,8"); pg.fill("#b_waist", "80"); pg.click("#b_save")
    bd = store(pg)["body"]; ok(bd and bd[-1]["w"] == 76.8 and bd[-1]["waist"] == 80, "gewicht en taille bewaard")
    code = pg.evaluate("""() => 'YB1:'+btoa(unescape(encodeURIComponent(JSON.stringify([
      {date:'2026-06-01',src:'InBody',w:70,ssm:35,fatkg:7,fatp:10},{date:'2026-10-01',src:'InBody',w:71,ssm:36,fatkg:6.5,fatp:9.2,seg:{arm:120,trunk:110,leg:100}}]))))""")
    pg.click("#bodycard summary"); pg.fill("#ib_code", code); pg.click("#ib_import")
    ok(len([x for x in store(pg)["body"] if x.get("src") == "InBody"]) == 2, "InBody-importcode ingelezen")
    tab(pg, "inzicht"); bi = pg.inner_text("#bodyins"); ok("SSM +1" in bi and "benen 100%" in bi, "lichaamstrend + segmenten in inzicht")
    pg.goto(pg.url.split("#")[0] + "#ib=" + code.replace("YB1:", "YB1%3A")); pg.reload(); pg.wait_for_selector("#bodyins")
    ok("#ib=" not in pg.url and len([x for x in store(pg)["body"] if x.get("src") == "InBody"]) == 2, "importlink: metingen ingelezen zonder dubbelingen, hash gewist")
    tab(pg, "check")
    tab(pg, "week"); pg.click("#next"); ok(pg.locator("#availwarn").count() == 1 and "di 24 nov" in pg.inner_text("#availwarn"), "conflict beschikbaarheid ↔ plan zichtbaar"); pg.click("#prev")
    # Terug-knop
    tab(pg, "week"); pg.click('[data-logger="2026-11-24-b"]') if pg.locator('[data-logger="2026-11-24-b"]').count() else pg.locator('[data-logger]').first.click()
    ok(pg.is_visible("#back"), "terug-knop zichtbaar na openen logger"); pg.click("#back"); pg.wait_for_timeout(300)
    ok(pg.get_attribute('[data-tab="week"]', "class") and "on" in pg.get_attribute('[data-tab="week"]', "class"), "terug-knop brengt je terug naar Week")
    tab(pg, "inzicht"); pg.click("#back"); pg.wait_for_timeout(300); ok("on" in (pg.get_attribute('[data-tab="week"]', "class") or ""), "terug werkt ook na wisselen van tabblad")
    # Back-up, herstel, ongedaan maken
    tab(pg, "meer"); pg.click("#x_json"); code = pg.input_value("#x_out"); ok(code.startswith("YC1:"), "back-upcode gemaakt")
    ok(store(pg)["settings"]["lastBackup"], "laatste back-up vastgelegd")
    n = len(store(pg)["sets"])
    pg.evaluate("localStorage.removeItem('yorick-coach')"); pg.reload(); tab(pg, "meer")
    pg.fill("#r_in", code); pg.click("#r_go"); pg.click("#r_go")
    ok(len(store(pg)["sets"]) == n, "herstel uit back-upcode werkt")
    tab(pg, "meer"); ok(pg.is_visible("#r_undo"), "‘herstel ongedaan maken’ beschikbaar")
    ok("ics/all.ics" in (pg.get_attribute("#ics_sub", "href") or "") and pg.get_attribute("#ics_sub", "href").startswith("webcal:"), "abonneerbare agenda-link")
    if shots: pg.screenshot(path=str(OUT/"meer.png"))
    # Herstel uit Google Sheet (gemockt)
    sheet = {"set": [{"id": "s1", "date": "2026-11-17", "data": json.dumps({"id": "s1", "date": "2026-11-17", "sid": "2026-11-17-b", "code": "SQ", "kg": 70, "reps": 5, "ts": 1})}],
             "done": [{"id": "2026-11-17-a", "date": "2026-11-17", "data": {"d": True, "min": "40"}}],
             "move": [{"id": "2026-11-19-a", "date": "2026-11-20", "data": {"to": "2026-11-20"}}]}
    pg.route("https://sheet.test/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(sheet)))
    pg.fill("#s_url", "https://sheet.test/exec"); pg.click("#s_save"); tab(pg, "meer")
    pg.click("#r_sheet"); pg.click("#r_sheet"); pg.wait_for_function("JSON.parse(localStorage.getItem('yorick-coach')).sets.length === 1")
    st = store(pg); ok(st["sets"][0]["kg"] == 70 and st["done"]["2026-11-17-a"]["min"] == "40" and st["moves"]["2026-11-19-a"] == "2026-11-20" and st["settings"]["sheetUrl"], "herstel uit Google Sheet (instellingen blijven)")
    pg.unroute("https://sheet.test/**")
    # Rekenkern (unit)
    u = pg.evaluate("""() => { const r = {}; const S0 = S; S = blank();
      const e = {s:3, lo:6, hi:8, rir:2}; const mk = (kg,reps,rir) => ({kg,reps,rir});
      r.up = suggest(e,'SQ',[mk(60,8,2),mk(60,8,2),mk(60,8,3)]).kg; r.stay = suggest(e,'SQ',[mk(60,8,0),mk(60,8,1),mk(60,8,1)]).kg;
      r.down = suggest(e,'SQ',[mk(60,4,0),mk(60,4,0),mk(60,3,0)]).kg; r.first = suggest(e,'SQ',null).kg;
      r.alt = [altKm({km:20},'Ingekort tot 65%'), altKm({km:20},'Fiets KICKR'), altKm({km:20},'Easy 30–42 min'), altKm({km:20},null)];
      r.wk = [weekIdOf('2026-11-17'), weekIdOf('2027-01-01'), weekIdOf('2026-12-28')]; r.t = [parseTime('1:55'), parseTime('4:10:00'), parseTime('50')];
      r.num = [num('62,5'), num(''), num('x')];
      S.daily['2026-11-30'] = {rd:58}; r.adv1 = advice('2026-11-30').lvl; S.daily['2026-11-30'] = {rd:80, sl:85}; r.adv2 = advice('2026-11-30').lvl;
      S.daily['2026-11-30'] = {rd:80, pain:5}; r.adv3 = advice('2026-11-30').lvl;
      const ses = {t:'run', title:'Easy 8 km', date:'2026-11-30', km:8}; r.ez = [!!easyFlag(ses,{sport:'Run',km:8,sec:2700,hr:152}), !!easyFlag(ses,{sport:'Run',km:8,sec:2700,hr:135})];
      r.ms = matchScore({t:'run', title:'Easy', date:'2026-11-30'}, {sport:'Run', date:'2026-11-30', name:'x'}) > matchScore({t:'run', title:'Easy', date:'2026-11-30'}, {sport:'Ride', date:'2026-11-30', name:'x'});
      const iv = intervalEval({tgt:{pace:[280,285]}}, {laps:[{m:1000,sec:282},{m:1000,sec:283},{m:400,sec:200},{m:1000,sec:300}]}); r.iv = iv ? [iv.txt.startsWith('3 werkronden'), iv.good] : null;
      S = S0; return r; }""")
    ok(u["up"] == 62.5 and u["stay"] == 60 and u["down"] == 57.5 and u["first"] is None, f"unit: dubbele progressie {u['up'],u['stay'],u['down'],u['first']}")
    ok(u["alt"][0] == 13 and u["alt"][1] == 0 and u["alt"][3] == 20, f"unit: altKm {u['alt']}")
    ok(u["wk"] == ["2026-W47", "2026-W53", "2026-W53"], f"unit: weeknummers ISO {u['wk']}")
    ok(u["t"][0] == 115 and u["t"][1] == 15000, f"unit: parseTime {u['t']}")
    ok(u["num"][0] == 62.5 and u["num"][1] is None, f"unit: num {u['num']}")
    ok([u["adv1"], u["adv2"], u["adv3"]] == ["rood", "groen", "rood"], f"unit: advies {u['adv1'],u['adv2'],u['adv3']}")
    ok(u["ez"] == [True, False] and u["ms"], f"unit: easyFlag/matchScore {u['ez'], u['ms']}")
    ok(u["iv"] == [True, False], f"unit: intervalbeoordeling {u['iv']}")

def browser_tests(cur, prev):
    from playwright.sync_api import sync_playwright
    import datetime as dt
    OUT.mkdir(parents=True, exist_ok=True)
    srv = Srv(); FIXED = dt.datetime(2026, 11, 17, 10, 0)
    with sync_playwright() as p:
        print("Regressie Chromium (vorige → nieuwe versie)")
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers="block")
        pg = ctx.new_page(); pg.clock.set_fixed_time(FIXED)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        srv.dir = prev; pg.goto(srv.url); pg.wait_for_selector("#tabs")
        fill_prev(pg); before = store(pg)
        srv.dir = cur; pg.reload(); pg.wait_for_selector("#tabs"); pg.wait_for_timeout(300)
        check_upgrade(pg, before)
        print("Nieuwe functies (Chromium)")
        features(pg, shots=True)
        ok(not errs, f"geen JS-fouten {errs[:3]}")
        ctx.close()
        print("Offline (service worker)")
        ctx2 = b.new_context(viewport={"width": 390, "height": 844}); pg2 = ctx2.new_page()
        pg2.goto(srv.url); pg2.wait_for_selector("#tabs"); pg2.evaluate("navigator.serviceWorker.ready"); pg2.reload(); pg2.wait_for_selector(".card")
        ctx2.set_offline(True); pg2.reload(); pg2.wait_for_selector(".card", timeout=5000)
        ok("Plan kon niet" not in pg2.inner_text("#view"), "app + plan laden offline uit cache")
        ctx2.close(); b.close()
        print("WebKit (Safari-engine)")
        try:
            wb = p.webkit.launch()
            wctx = wb.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, service_workers="block")
            wp = wctx.new_page(); wp.clock.set_fixed_time(FIXED); werrs = []; wp.on("pageerror", lambda e: werrs.append(str(e)))
            srv.dir = prev; wp.goto(srv.url); wp.wait_for_selector("#tabs"); fill_prev(wp); before = store(wp)
            srv.dir = cur; wp.reload(); wp.wait_for_selector("#tabs"); wp.wait_for_timeout(300)
            check_upgrade(wp, before); features(wp, shots=False)
            ok(not werrs, f"geen JS-fouten in WebKit {werrs[:3]}")
            wb.close()
        except Exception as e:
            ok(False, f"WebKit-run: {str(e)[:300]}")
    srv.httpd.shutdown()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--prev"); a = ap.parse_args()
    tmp = None
    if a.prev:
        tmp = pathlib.Path(tempfile.mkdtemp())
        subprocess.run(f"git -C {ROOT} archive {a.prev} | tar -x -C {tmp}", shell=True, check=True); prev = tmp
    else: prev = ROOT
    static_checks(ROOT, prev)
    browser_tests(ROOT, prev)
    if tmp: shutil.rmtree(tmp)
    print(f"\n{'GESLAAGD' if not FAILS else 'MISLUKT: ' + str(len(FAILS))} — screenshots in tests/out/")
    sys.exit(1 if FAILS else 0)

if __name__ == "__main__": main()
