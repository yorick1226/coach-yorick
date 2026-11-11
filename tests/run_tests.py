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
    for f in ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "ONDERHOUD.md", "ics/all.ics"]:
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

def fill_prev(pg):
    """Invullen met de VORIGE versie. Alleen stabiele selectors (bestaan sinds v1)."""
    tab(pg, "week"); pg.wait_for_selector(".sess")
    pg.click('[data-done="2026-11-17-a"]')
    pg.fill('[data-min="2026-11-17-a"]', "50"); pg.press('[data-min="2026-11-17-a"]', "Tab")
    pg.fill('[data-note="2026-11-17-a"]', "test-notitie"); pg.press('[data-note="2026-11-17-a"]', "Tab")
    pg.click('[data-logger="2026-11-17-b"]'); pg.wait_for_selector('[data-kg="SQ"]')
    pg.fill('[data-kg="SQ"]', "60"); pg.dispatch_event('[data-kg="SQ"]', "change")
    for r in ("6", "6", "5"): pg.click(f'[data-rep="SQ"][data-r="{r}"]')
    ok(pg.is_visible("#timer.show"), "rusttimer start automatisch na set (vorige versie)")
    tab(pg, "week"); pg.click('[data-cardio="2026-11-17-a"]')
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
    ok(after["checkins"].get("2026-W47", {}).get("a", {}).get("cijfer") == 7, "check-in bewaard (oude vragenset)")
    ok(after["settings"]["ftp"] == 228, "instelling bewaard")
    ok(all(k in after for k in before), "geen velden verloren na migratie")

def features(pg, shots=True):
    """Nieuwe functies van v2 (huidige versie)."""
    # Vandaag + ochtendcheck
    tab(pg, "vandaag"); pg.wait_for_selector('[data-dly="rd"]')
    pg.fill('[data-dly="rd"]', "55"); pg.dispatch_event('[data-dly="rd"]', "change"); pg.fill('[data-dly="sl"]', "72"); pg.dispatch_event('[data-dly="sl"]', "change")
    pg.click('[data-dlyc="legs"][data-v="3"]')
    ok("ROOD" in pg.inner_text("#advice"), "ochtendcheck: readiness 55 → advies ROOD")
    if shots: pg.screenshot(path=str(OUT/"vandaag.png"))
    # sessie-RPE + verplaatsen + overslaan
    tab(pg, "week"); pg.wait_for_selector("#stats")
    pg.click('[data-srpe="2026-11-17-a"][data-v="4"]')
    pg.click('[data-menu="2026-11-19-a"]'); pg.click('[data-move="2026-11-19-a"][data-to="2026-11-20"]')
    ok(store(pg)["moves"].get("2026-11-19-a") == "2026-11-20", "sessie verplaatst naar vrijdag")
    pg.click('[data-menu="2026-11-18-b"]'); pg.click('[data-skip="2026-11-18-b"][data-r="Agenda"]')
    ok(store(pg)["done"]["2026-11-18-b"].get("skip") == "Agenda", "sessie overgeslagen met reden")
    ok("Belasting" in pg.inner_text("#stats"), "weekcijfers zichtbaar")
    if shots: pg.screenshot(path=str(OUT/"week.png"), full_page=False)
    # Strava-koppeling vorige week
    pg.click("#prev"); pg.wait_for_selector("#s_2026-11-10-a")
    ok("10,01 km" in pg.inner_text("#s_2026-11-10-a"), "Strava gekoppeld aan geplande sessie (di 10 nov)")
    pg.click('[data-laps="2026-11-10-a"]'); ok("4:38" in pg.inner_text("#s_2026-11-10-a"), "rondetijden uit Strava zichtbaar")
    pg.click("#next")
    # Logger: komma, RIR, wissel
    pg.click("#next"); pg.click('[data-logger="2026-11-24-b"]'); pg.wait_for_selector('[data-kg="SQ"]')
    ok("Vorige keer" in pg.inner_text("#ex_SQ") and "60" in pg.inner_text("#ex_SQ"), "‘vorige keer’ + suggestie in volgende sessie")
    pg.fill('[data-kg="SQ"]', "62,5"); pg.dispatch_event('[data-kg="SQ"]', "change")
    pg.click('[data-rir="2026-11-24-b|SQ"][data-v="1"]'); pg.click('[data-rep="SQ"][data-r="5"]')
    last = [s for s in store(pg)["sets"] if s["sid"] == "2026-11-24-b"][-1]
    ok(last["kg"] == 62.5 and last["rir"] == 1, f"komma-invoer 62,5 en RIR 1 opgeslagen ({last.get('kg')}, {last.get('rir')})")
    pg.click('[data-swapopen="RDL"]'); pg.click('[data-swap="RDL"][data-to="HT"]')
    ok("Hip thrust" in pg.inner_text("#ex_RDL"), "oefening gewisseld (RDL → hip thrust)")
    pg.fill('[data-kg="HT"]', "80"); pg.dispatch_event('[data-kg="HT"]', "change"); pg.click('[data-rep="HT"][data-r="8"]')
    ht = [s for s in store(pg)["sets"] if s["code"] == "HT"][-1]; ok(ht["pc"] == "RDL", "set gelogd onder vervangende code, met verwijzing naar origineel")
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
    ok("Back squat" in pg.inner_text("#recstr"), "krachtrecord zichtbaar")
    if shots: pg.screenshot(path=str(OUT/"inzicht.png"))
    # Check-in v2 + beschikbaarheid
    tab(pg, "check"); pg.click('[data-slot="2×"][data-i="0"]')
    pg.fill('[data-avmin][data-i="0"]', "90"); pg.dispatch_event('[data-avmin][data-i="0"]', "change")
    pg.click("#x_sunday"); txt = pg.input_value("#x_out")
    ok("BESCHIKBAARHEID 2026-W48" in txt and "2× · max 90 min" in txt, "beschikbaarheid in zondag-export")
    ok("Back squat: 60×6, 60×6, 60×5" in txt and "Cijfer voor deze week: 7" in txt, "export bevat sets en check-in")
    ok("overgeslagen: Agenda" in txt and "verplaatst van" in txt and "RPE 4" in txt, "export bevat overslaan, verplaatsen en RPE")
    ok("Oura readiness 55" in txt, "export bevat Oura-ochtendcheck")
    if shots: pg.screenshot(path=str(OUT/"checkin.png"))
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
