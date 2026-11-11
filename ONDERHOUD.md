# ONDERHOUD — regels voor elke wijziging

Deze regels gelden voor elke release, ook kleine. Ze beschermen de data op de telefoon.

## Harde regels

1. **Opslagsleutel nooit wijzigen.** `KEY = 'yorick-coach'` in `index.html`. Een nieuwe sleutel = lege app.
2. **Oefeningcodes nooit wijzigen of hergebruiken.** Codes (`BP`, `SQ`, `RDL`, …) staan in `plan.json → exercises`. Hernoemen mag alleen via het veld `n` (weergavenaam). Een nieuwe oefening krijgt een nieuwe code. Een code die niet meer gebruikt wordt, blijft in de lijst staan.
3. **Sessie-id's zijn datum + letter** (`2026-11-17-a`) en worden nooit hergebruikt voor een andere sessie. Data hangt aan id's en datums, nooit aan posities in een lijst.
4. **Check-invragen van een lopende of afgesloten week niet aanpassen.** Elke check-in bewaart zijn vragensetversie (`qv`). Een bestaande versie in `QSETS` wordt nooit bewerkt. Voor wijzigingen voeg je een nieuwe versie toe en hoog je `QV_CURRENT` op. Dat doe je alleen op een maandag, voordat er iets voor die week is ingevuld.
5. **Cachenummer ophogen bij elke release.** `const CACHE = 'coach-vN'` in `sw.js` en `APP_VERSION` in `index.html`.
6. **`migrate()` alleen uitbreiden**: velden toevoegen met een standaardwaarde, nooit velden verwijderen of hernoemen. Onbekende velden blijven bewaard.
7. **Geen gezondheidsdetails in `plan.json` of `strava.json`.** De repo en de site zijn openbaar. Strava-namen/omschrijvingen met persoonlijke info weglaten.
8. **Test-selectors stabiel houden.** De regressietest vult de *vorige* versie in met: `data-tab`, `data-done`, `data-min`, `data-note`, `data-logger`, `data-kg`, `data-rep`/`data-r`, `data-cardio`, `#c_km #c_time #c_hr #c_save`, `data-rpe`, `data-ck`/`data-cv`/`data-cvs`, `data-ct`, `#s_ftp #s_save`. Deze nooit hernoemen. Sinds v2.1 staan invulvelden achter `data-open` ("Details & invullen"); de test klapt die zelf uit.
10. **Alternatieven:** per sessie kan het plan `"alts": ["…"]` meegeven; anders gelden de standaardalternatieven per type in `altOptions()`. Gekozen alternatief staat in `done[sid].alt`.
9. **Neven-sleutel** `yorick-coach.undo` bevat alleen de stand vóór het laatste herstel. Geen andere sleutels toevoegen.

## Weekritme (zondag)

**Yorick, in de app:**
1. Elke ochtend: *Vandaag → Ochtendcheck* (Oura Readiness + Slaap, benen, pijn).
2. Na elke sessie: RPE tikken; kracht via de Logger (kg × reps, RIR).
3. Zondag: *Check-in* invullen, inclusief **Beschikbaarheid volgende week** (per dag Niet / 1× / 2× / Alleen ochtend / Alleen avond / Lang + max. minuten), dan **Kopieer zondag-export** → plakken in de chat.

**Coach:**
1. Strava ophalen (Strava-connector): activiteiten van de afgelopen week, plus details (HF, ronden) van kwaliteitssessies.
2. `strava.json` bijwerken (formaat hieronder). `updated` = datum van ophalen.
3. Evalueren: gepland vs. Strava vs. export; Oura-trend; pijntjes; beschikbaarheid.
4. Volgende week in `plan.json` uitwerken → `status: "definitief"`; `updated` ophogen (dan ziet de app "Plan bijgewerkt"). Sessies krijgen `km`/`hm`/`min` waar zinvol; week krijgt `vert` (doel hoogtemeters).
5. `python3 tools/build_ics.py` → `python3 tests/run_tests.py --prev <vorige commit>` → push → live check.

Toekomstige weken blijven `concept`. Komt er geen update, dan opent de app gewoon de conceptweek met een gele banner.

## strava.json

```json
{"updated":"2026-11-11","source":"Strava (opgehaald door coach)","activities":[
  {"id":"20930811055","date":"2026-11-10","sport":"Run","name":"…","km":10.01,"sec":3021,"hm":18,"hr":133,
   "laps":[{"m":1000,"sec":322,"hr":131}]}
]}
```
`sport` = Strava `sport_type`. `sec` = moving time. `w` alleen bij fietsen. De app koppelt een activiteit aan een geplande sessie op **datum + sporttype** (run/race ↔ Run/TrailRun, bike ↔ Ride, strength ↔ WeightTraining, hyrox ↔ Workout/HIIT/WeightTraining). Niet-gekoppelde activiteiten verschijnen als "niet gepland". Handmatige duurlogs die aan een Strava-gekoppelde sessie hangen, tellen niet dubbel in de weekcijfers.

## Oura

Er is (nov 2026) geen Oura-connector. Scores worden handmatig ingevuld in de ochtendcheck. Advieslogica (vuistregel, geen diagnose): pijn ≥ 4 of readiness < 60 → rood; readiness < 70, slaap < 60, benen ≤ 2 of readiness ≥ 10 onder 7-daags gemiddelde → oranje.

## Releasechecklist (verplicht vóór elke push)

```
python3 tools/build_ics.py
python3 tests/run_tests.py --prev <vorige-commit-of-tag>
```

De test doet het volgende:
1. Syntaxcheck van de inline-JS in `index.html` (`node --check`), `sw.js`, en JSON-validatie van `plan.json` en `strava.json`.
2. Planchecks: unieke sessie-id's, alle gebruikte oefeningcodes bestaan, en geen bestaande code verdwenen ten opzichte van de vorige versie.
3. **Regressietest (Playwright), in Chromium én WebKit (Safari-engine):** start de *vorige* versie, vult data in, laadt de *nieuwe* versie op dezelfde origin en controleert dat alles er nog is. Daarna alle functies: ochtendcheck/advies, RPE, verplaatsen/overslaan, Strava-koppeling + ronden, komma-invoer, RIR, oefening wisselen, Hyrox-tijd, voeding, inzicht, beschikbaarheid, zondag-export, back-up/herstel/ongedaan maken, agenda-link.
4. Offline-check (service worker) en telefoon-screenshots (iPhone-formaat) in `tests/out/`.

Git-tags worden door de koppeling niet gepusht; gebruik commit-hashes voor `--prev`.

Faalt iets, dan wordt er niet gepusht.

## Google Sheet-koppeling (optioneel)

1. Maak een nieuwe Google Sheet aan en kies *Extensies → Apps Script*.
2. Plak `sync/Code.gs` en sla op.
3. Kies *Implementeren → Nieuwe implementatie → Web-app*. Uitvoeren als: **ik**. Toegang: **iedereen**.
4. Kopieer de `/exec`-URL naar de app via *Meer → Instellingen → Google Sheet web-app-URL*.

De app verstuurt met `no-cors` en krijgt dus geen bevestiging. Items blijven in de wachtrij tot `fetch` slaagt. Dubbel versturen kan geen kwaad door de upsert op `id`. Verwijderde items komen in de sheet met `"del":true`.

Let op: iedereen met de URL kan naar je sheet schrijven. Deel de URL niet.

## Bestanden

| Bestand | Rol |
|---|---|
| `index.html` | De hele app (HTML, CSS en JS inline) |
| `plan.json` | Plan, oefeningen, records-startwaarden |
| `sw.js` | Offline: netwerk eerst, cache als terugval |
| `manifest.webmanifest`, `*.png` | Beginscherm-app |
| `strava.json` | Uitgevoerde activiteiten, door de coach uit Strava gezet |
| `ics/<week>.ics`, `ics/all.ics` | Agenda per week en abonneerbare feed (gegenereerd) |
| `tools/build_ics.py` | ICS-generator |
| `tests/run_tests.py` | Releasetest |
| `sync/Code.gs` | Google Apps Script voor de sheet |
