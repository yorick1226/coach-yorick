#!/usr/bin/env python3
"""Bouwt strava.json uit opgehaalde Strava-lijsten (JSON van de connector) + bestaand strava.json.
Gebruik: python3 tools/strava_build.py <lijst1.json> [<lijst2.json> ...] [--hr id=bpm ...] [--best best.json]
Bestaande velden (hr, laps) blijven behouden; nieuwe activiteiten worden toegevoegd. Geen omschrijvingen (privacy)."""
import json, re, sys, pathlib, datetime as dt
ROOT = pathlib.Path(__file__).resolve().parent.parent
RACE_RX = re.compile(r"marathon|half|trail 2026|dam tot dam|utmb|ultra trail|challenge|70\.3|ironman|zevenheuvel|hyrox relay|grit event|wedstrijd|race", re.I)
NOT_RACE_RX = re.compile(r"shake ?out|brick|testing|recovery", re.I)
def kind(a):
    n = a["name"].lower()
    if a["sport"] == "WeightTraining" and re.search(r"mobil|stretch|yoga", n): return "mobility"
    if re.search(r"hrx|hyrox", n): return "hyrox"
    return None
def main(argv):
    files, hr, best = [], {}, None
    it = iter(argv)
    for x in it:
        if x == "--hr": k, v = next(it).split("="); hr[k] = float(v)
        elif x == "--best": best = json.load(open(next(it)))
        else: files.append(x)
    cur = json.loads((ROOT/"strava.json").read_text()) if (ROOT/"strava.json").exists() else {"activities": []}
    by = {a["id"]: a for a in cur["activities"]}
    for f in files:
        raw = open(f).read(); j = json.loads(raw)
        if isinstance(j, list): j = json.loads(j[0]["text"])
        for a in j["activities"]:
            s = a["summary"]; d = a["start_local"][:10]
            n = {"id": a["id"], "date": d, "t": a["start_local"][11:16], "sport": a["sport_type"], "name": a["name"][:80], "sec": s["moving_time"]}
            if s.get("elapsed_time") and s["elapsed_time"] > s["moving_time"]*1.05: n["el"] = s["elapsed_time"]
            dist = s.get("distance") or 0
            if dist: n["km"] = round(dist/1000 if dist > 400 or a["sport_type"] != "Swim" else dist/1000, 3)
            if s.get("elevation_gain"): n["hm"] = round(s["elevation_gain"])
            old = by.get(a["id"], {})
            for k in ("hr", "w", "laps"):
                if k in old: n[k] = old[k]
            by[a["id"]] = {**old, **n}
    for k, v in hr.items():
        if k in by: by[k]["hr"] = round(v)
    for a in by.values():
        if a["sport"] in ("Run", "TrailRun", "VirtualRun", "Ride", "Swim") and RACE_RX.search(a["name"]) and not NOT_RACE_RX.search(a["name"]): a["race"] = True
        k = kind(a)
        if k: a["kind"] = k
    acts = sorted(by.values(), key=lambda a: (a["date"], a.get("t", "")))
    out = {"updated": dt.date.today().isoformat(), "source": "Strava (opgehaald door coach)", "activities": acts}
    if best is not None: out["best"] = best
    elif "best" in cur: out["best"] = cur["best"]
    (ROOT/"strava.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(len(acts), "activiteiten;", sum(1 for a in acts if a.get("race")), "wedstrijden;", sum(1 for a in acts if a.get("hr")), "met HF")
if __name__ == "__main__": main(sys.argv[1:])
