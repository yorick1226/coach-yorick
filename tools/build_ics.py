#!/usr/bin/env python3
"""Genereert ics/<week-id>.ics uit plan.json. Draai na elke planwijziging."""
import json, pathlib, datetime as dt

ROOT = pathlib.Path(__file__).resolve().parent.parent
LABEL = {"run":"Lopen","bike":"Fiets","swim":"Zwem","strength":"Kracht","plyo":"Plyo","hyrox":"Hyrox","mobility":"Mobiliteit","rest":"Rust","race":"Wedstrijd"}

BS = chr(92)  # backslash
def esc(s): return s.replace(BS, BS*2).replace(";", BS+";").replace(",", BS+",").replace("\n", BS+"n")
def fold(line):
    b = line.encode("utf-8"); out = []
    while len(b) > 74:
        cut = 74
        while (b[cut] & 0xC0) == 0x80: cut -= 1
        out.append(b[:cut].decode()); b = b[cut:]
    out.append(b.decode()); return "\r\n ".join(out)

def main():
    plan = json.loads((ROOT/"plan.json").read_text())
    ex = plan["exercises"]; stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    (ROOT/"ics").mkdir(exist_ok=True); n = 0
    for w in plan["weeks"]:
        if not w["days"]: continue
        L = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//coach//NL","CALSCALE:GREGORIAN","METHOD:PUBLISH",f"X-WR-CALNAME:Training {w['id']}"]
        for d in w["days"]:
            day = dt.date.fromisoformat(d["date"])
            for s in d["s"]:
                if s["t"] == "rest": continue
                title = ("[concept] " if w["status"]=="concept" else "") + f"{LABEL.get(s['t'],s['t'])}: {s['title']}"
                desc = s.get("detail","")
                if s.get("ex"):
                    desc += ("\n" if desc else "") + "\n".join(f"{ex.get(e['c'],{}).get('n',e['c'])} {e['s']}×{e['lo']}" + (f"–{e['hi']}" if e['hi']!=e['lo'] else "") + (f" @RIR{e['rir']}" if e['rir'] else "") for e in s["ex"])
                L += ["BEGIN:VEVENT", f"UID:{s['id']}@coach", f"DTSTAMP:{stamp}",
                      f"DTSTART;VALUE=DATE:{day:%Y%m%d}", f"DTEND;VALUE=DATE:{day+dt.timedelta(days=1):%Y%m%d}",
                      f"SUMMARY:{esc(title)}", f"DESCRIPTION:{esc(desc)}", "TRANSP:TRANSPARENT", "END:VEVENT"]
        L.append("END:VCALENDAR")
        (ROOT/"ics"/f"{w['id']}.ics").write_text("\r\n".join(fold(l) for l in L) + "\r\n", encoding="utf-8"); n += 1
    print(f"{n} ics-bestanden geschreven")

if __name__ == "__main__": main()
