#!/usr/bin/env python3
"""HF-drift (aerobe decoupling, Pa:HR) uit een Strava-streams-JSON (time, heart_rate, velocity_smooth, moving).
Gebruik: python3 tools/decoupling.py streams.json  → print het percentage (1 decimaal).
Methode: eerste 10 min (opwarmen) weg, alleen bewegende samples met snelheid > 1,5 m/s, run in twee gelijke tijdshelften;
efficiëntie = gem. snelheid / gem. HF per helft; drift = (EF1 − EF2) / EF1 × 100. Alleen zinvol op vlakke, gelijkmatige duurlopen."""
import json, sys
def drift(d):
    t, hr, v = d["time"], d["heart_rate"], d["velocity_smooth"]; mv = d.get("moving") or [True]*len(t)
    pts = [(t[i], hr[i], v[i]) for i in range(len(t)) if t[i] >= 600 and mv[i] and v[i] > 1.5 and hr[i] > 60]
    if len(pts) < 20: return None
    mid = (pts[0][0] + pts[-1][0]) / 2
    a = [p for p in pts if p[0] < mid]; b = [p for p in pts if p[0] >= mid]
    ef = lambda q: (sum(x[2] for x in q)/len(q)) / (sum(x[1] for x in q)/len(q))
    return round((ef(a) - ef(b)) / ef(a) * 100, 1)
if __name__ == "__main__":
    raw = json.load(open(sys.argv[1]))
    if isinstance(raw, list): raw = json.loads(raw[0]["text"])
    print(drift(raw))
