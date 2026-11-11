#!/usr/bin/env python3
"""Releasetest. Gebruik: python3 tests/run_tests.py [--prev <git-ref>]
Zonder --prev (eerste release) wordt de huidige versie als 'vorige' gebruikt."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, threading, pathlib, functools
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
    ids = [s["id"] for w in plan["weeks"] for d in w["days"] for s in d["s"]]
    ok(len(ids) == len(set(ids)), "sessie-id's uniek")
    ok(all(re.fullmatch(r"\d{4}-\d{2}-\d{2}-[a-z]", i) for i in ids), "sessie-id's hebben formaat datum-letter")
    ok(all(s["id"].startswith(d["date"]) for w in plan["weeks"] for d in w["days"] for s in d["s"]), "sessie-id hoort bij zijn dag")
    used = {e["c"] for w in plan["weeks"] for d in w["days"] for s in d["s"] for e in s.get("ex", [])}
    ok(used <= set(plan["exercises"]), f"alle gebruikte oefeningcodes bestaan {sorted(used - set(plan['exercises']))}")
    starts = [w["start"] for w in plan["weeks"]]
    ok(starts == sorted(starts) and len(starts) == len(set(starts)), "weken uniek en op volgorde")
    for w in plan["weeks"]:
        if w["days"] and w["status"] not in ("concept", "definitief"): ok(False, f"status {w['id']}")
    # vergelijk met vorige versie
    pplan = json.loads((prev/"plan.json").read_text())
    gone = set(pplan["exercises"]) - set(plan["exercises"])
    ok(not gone, f"geen oefeningcodes verdwenen {sorted(gone)}")
    phtml = (prev/"index.html").read_text()
    key = lambda h: re.search(r"const KEY = '([^']+)'", h).group(1)
    ok(key(html) == key(phtml), f"opslagsleutel ongewijzigd ({key(html)})")
    qs = lambda h: re.search(r"const QSETS = \{(.*?)\n\};", h, re.S).group(1)
    pq = re.findall(r"\n  (\d+): \[(.*?)\n  \]", qs(phtml), re.S); cq = dict(re.findall(r"\n  (\d+): \[(.*?)\n  \]", qs(html), re.S))
    ok(all(cq.get(v) == body for v, body in pq), "bestaande check-in-vragensets ongewijzigd")
    cache = lambda d: re.search(r"const CACHE = '([^']+)'", (d/"sw.js").read_text()).group(1)
    if cur != prev: ok(cache(cur) != cache(prev), f"cachenummer opgehoogd ({cache(prev)} → {cache(cur)})")
    for f in ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "ONDERHOUD.md"]:
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

def browser_tests(cur, prev):
    from playwright.sync_api import sync_playwright
    import datetime as dt
    print("Regressie (vorige → nieuwe versie)")
    OUT.mkdir(parents=True, exist_ok=True)
    srv = Srv(); srv.dir = prev
    FIXED = dt.datetime(2026, 11, 17, 10, 0)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers="block")
        pg = ctx.new_page(); pg.clock.set_fixed_time(FIXED)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(srv.url); pg.wait_for_selector(".sess")
        # --- data invullen met de VORIGE versie ---
        pg.click('[data-done="2026-11-17-a"]')
        pg.fill('[data-min="2026-11-17-a"]', "50"); pg.press('[data-min="2026-11-17-a"]', "Tab")
        pg.fill('[data-note="2026-11-17-a"]', "test-notitie"); pg.press('[data-note="2026-11-17-a"]', "Tab")
        pg.click('[data-logger="2026-11-17-b"]'); pg.wait_for_selector('[data-kg="SQ"]')
        pg.fill('[data-kg="SQ"]', "60"); pg.dispatch_event('[data-kg="SQ"]', "change")
        pg.click('[data-rep="SQ"][data-r="6"]'); pg.click('[data-rep="SQ"][data-r="6"]'); pg.click('[data-rep="SQ"][data-r="5"]')
        ok(pg.is_visible("#timer.show"), "rusttimer start automatisch na set")
        pg.screenshot(path=str(OUT/"logger.png"), full_page=False)
        pg.click('[data-tab="duur"]'); pg.fill("#c_km", "10"); pg.fill("#c_time", "50:00"); pg.fill("#c_hr", "150")
        pg.click('[data-rpe="3"]')
        calc = pg.inner_text("#c_calc"); ok("5:00 /km" in calc and "LTHR" in calc, f"tempo/zone berekend ({calc.splitlines()[1] if len(calc.splitlines())>1 else calc})")
        pg.screenshot(path=str(OUT/"duur.png"))
        pg.click("#c_save")
        pg.click('[data-tab="check"]'); pg.click('[data-ck="cijfer"][data-cv="7"]')
        pg.fill('[data-ct="pijn"]', "kuit links 2/10"); pg.dispatch_event('[data-ct="pijn"]', "change")
        pg.click('[data-ck="richting"][data-cvs="Zo laten"]')
        pg.screenshot(path=str(OUT/"checkin.png"))
        pg.click('[data-tab="meer"]'); pg.fill("#s_ftp", "228"); pg.click("#s_save")
        before = pg.evaluate("localStorage.getItem('yorick-coach')")
        # --- NIEUWE versie laden, zelfde origin ---
        srv.dir = cur; pg.reload(); pg.wait_for_selector("#tabs")
        after = json.loads(pg.evaluate("localStorage.getItem('yorick-coach')"))
        bj = json.loads(before)
        ok(len([s for s in after["sets"] if not s.get("del")]) == 3, "3 sets bewaard")
        ok(len(after["cardio"]) == 1 and after["cardio"][0]["km"] == 10, "duursessie bewaard")
        ok(after["done"].get("2026-11-17-a", {}).get("note") == "test-notitie", "notitie bewaard")
        ok(after["checkins"].get("2026-W47", {}).get("a", {}).get("cijfer") == 7, "check-in bewaard")
        ok(after["settings"]["ftp"] == 228, "instelling bewaard")
        ok(all(k in after for k in bj), "geen velden verloren na migratie")
        pg.click('[data-tab="week"]'); pg.wait_for_selector(".sess")
        ok("done" in pg.get_attribute("#s_2026-11-17-a", "class"), "afgevinkt zichtbaar in weekoverzicht")
        pg.screenshot(path=str(OUT/"week.png"))
        pg.click('[data-logger="2026-11-17-b"]')
        ok("60 × 6" in pg.inner_text("#ex_SQ"), "gelogde sets zichtbaar in logger")
        pg.click('[data-tab="week"]'); pg.click("#next"); pg.click('[data-logger="2026-11-24-b"]')
        sq = pg.inner_text("#ex_SQ"); ok("Vorige keer" in sq and "60" in sq, "‘vorige keer’ + suggestie in volgende sessie")
        pg.click('[data-tab="rec"]'); ok("Back squat" in pg.inner_text("#view"), "krachtrecord zichtbaar")
        pg.click('[data-tab="meer"]'); pg.select_option("#x_week", "2026-11-16"); pg.click("#x_text")
        txt = pg.input_value("#x_out"); ok("Back squat: 60×6, 60×6, 60×5" in txt and "Cijfer voor deze week: 7" in txt, "weekexport bevat sets en check-in")
        pg.click("#x_json"); code = pg.input_value("#x_out"); ok(code.startswith("YC1:"), "back-upcode gemaakt")
        pg.evaluate("localStorage.clear()"); pg.reload(); pg.click('[data-tab="meer"]')
        pg.fill("#r_in", code); pg.click("#r_go"); pg.click("#r_go")
        rest = json.loads(pg.evaluate("localStorage.getItem('yorick-coach')"))
        ok(len(rest["sets"]) == 3 and rest["checkins"]["2026-W47"]["a"]["cijfer"] == 7, "herstel uit back-upcode werkt")
        pg.screenshot(path=str(OUT/"meer.png"))
        ok(not errs, f"geen JS-fouten {errs[:3]}")
        ctx.close()
        # --- offline (service worker) ---
        print("Offline")
        ctx2 = b.new_context(viewport={"width": 390, "height": 844})
        pg2 = ctx2.new_page(); pg2.goto(srv.url); pg2.wait_for_selector("#tabs")
        pg2.evaluate("navigator.serviceWorker.ready"); pg2.reload(); pg2.wait_for_selector(".sess, .card")
        ctx2.set_offline(True); pg2.reload(); pg2.wait_for_selector(".sess, .card", timeout=5000)
        ok("Plan kon niet" not in pg2.inner_text("#view"), "app + plan laden offline uit cache")
        ctx2.close(); b.close()
    srv.httpd.shutdown()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--prev"); a = ap.parse_args()
    tmp = None
    if a.prev:
        tmp = pathlib.Path(tempfile.mkdtemp());
        subprocess.run(f"git -C {ROOT} archive {a.prev} | tar -x -C {tmp}", shell=True, check=True); prev = tmp
    else: prev = ROOT
    static_checks(ROOT, prev)
    browser_tests(ROOT, prev)
    if tmp: shutil.rmtree(tmp)
    print(f"\n{'GESLAAGD' if not FAILS else 'MISLUKT: ' + str(len(FAILS))} — screenshots in tests/out/")
    sys.exit(1 if FAILS else 0)

if __name__ == "__main__": main()
