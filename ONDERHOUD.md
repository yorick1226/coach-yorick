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
11. **Eigen oefeningen** krijgen in de app een code `U_<base36-tijd>` (in `custom`). Plancodes beginnen nooit met `U_`. Toegevoegde oefeningen staan in `extra[sid]`, overgeslagen oefeningen in `exskip['sid|code']`. Wil de coach een eigen oefening opnemen in het plan, dan krijgt die een nieuwe plancode; de `U_`-historie blijft los staan.
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

## strava.json (v2.4)

Bouwen/bijwerken met `tools/strava_build.py <connector-lijst.json …> [--hr id=bpm …] [--best best.json]`. Bestaande `hr`/`laps` blijven behouden. Velden: `id, date, t, sport, name, km, sec (moving), el (elapsed, alleen als > 5% hoger), hm, hr, w, laps[{m,sec,hr}], race (bool), kind ('mobility'|'hyrox')`, plus `best` (Strava-beste prestaties per afstand). Zondag: lijst van de afgelopen week ophalen, HF + ronden van runs via `get_activity_performance`, best efforts bijwerken.

Plan-velden: `w.note` (coachnotitie bovenaan de week), sessie `tgt.pace = [snelst, langzaamst]` in s/km voor intervalbeoordeling op ronden.

## strava.json (formaat v2.0, nog geldig)

```json
{"updated":"2026-11-11","source":"Strava (opgehaald door coach)","activities":[
  {"id":"20930811055","date":"2026-11-10","sport":"Run","name":"…","km":10.01,"sec":3021,"hm":18,"hr":133,
   "laps":[{"m":1000,"sec":322,"hr":131}]}
]}
```
`sport` = Strava `sport_type`. `sec` = moving time. `w` alleen bij fietsen. De app koppelt een activiteit aan een geplande sessie op **datum + sporttype** (run/race ↔ Run/TrailRun, bike ↔ Ride, strength ↔ WeightTraining, hyrox ↔ Workout/HIIT/WeightTraining). Niet-gekoppelde activiteiten verschijnen als "niet gepland". Handmatige duurlogs die aan een Strava-gekoppelde sessie hangen, tellen niet dubbel in de weekcijfers.

## Plan-velden die de app gebruikt (v2.3)

- `setTargets`: harde sets per spiergroep per week (doel), getoond in de weekcijfers. Basis: dosis-respons tot ≥ 10 sets/spiergroep/week (Schoenfeld e.a. 2017, meta-analyse); benen bewust lager vanwege loopbelasting. Per blok bijsturen.
- `races`: de eerstvolgende wedstrijd wordt bovenaan Vandaag afgeteld.
- `updated` + `version`: wijzigen = banner "Plan bijgewerkt".
- Belastingwaarschuwing (vuistregel, geen harde grens): weekkm > 120% van het gemiddelde van de 3 weken ervoor, langste loop > 125% van de langste in 4 weken, hoogtemeters > 150% van het weekmaximum van 4 weken.

## Oura

Er is (nov 2026) geen Oura-connector. Scores worden handmatig ingevuld in de ochtendcheck. Advieslogica (vuistregel, geen diagnose): tot 21 ochtendchecks vaste grenzen (pijn ≥ 4 of readiness < 60 → rood; readiness < 70, slaap < 60, benen ≤ 2 of ≥ 10 onder 7-daags gemiddelde → oranje). Daarna persoonlijke baseline over 60 dagen: < gemiddelde − 2 sd → rood, < gemiddelde − 1 sd → oranje (slaap: − 1,5 sd). Pijn per plek staat in `daily[d].pains` ({plek: 1–8}); `daily[d].pain` = maximum, voor compatibiliteit.

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


## v2.5 (nov 2026)
- **Opwarmsets**: `wu:true` op een set. Tellen niet mee in suggesties, ‘vorige keer’, records, volume en weekcijfers (helper `work(x)`). In de export voorafgegaan door `W`.
- **Lichaam** (`S.body`, kind `body` in de Sheet): weekmeting via Check-in, InBody via formulier of importcode `YB1:` + base64(JSON-array). Echte metingen staan NOOIT in de repo (regel 7); de importcode gaat via de chat.
- **Blokrapport**: Inzicht → blokken op basis van `phase` (deel vóór ` · `, zonder taper/deload). Kopieerbaar.
- **Herstel uit Google Sheet**: vereist `doGet` in sync/Code.gs (opnieuw implementeren als nieuwe versie). App vraagt bevestiging, bewaart vorige stand in de undo-sleutel, instellingen blijven lokaal.
- **Vandaag compact**: ingevulde ochtendcheck = één regel (`#dailysum`, knop `data-dailyedit`); pijnchips achter `data-painopen`; afgeronde sessies ingeklapt.
- Tests bevatten nu rekenkern-unittests (suggest, altKm, weekIdOf, parseTime, num, advice, easyFlag, matchScore, intervalEval).

## v2.7 routines (nov 2026)
- `plan.json` → `routines` {ID: {n, min, tag rug|mob|wu|cd|rec, note, items[{n, sets, sec|reps, side, rest, cue}]} of `of:[ID…]`}, `dailyRoutines` (index 0 = maandag), `recoveryTips`.
- Sessie met `rt: ID` = routine-sessie (knop ▶ Start routine; afronden vinkt de sessie af). Op die dag vervalt de korte MOB-routine.
- Warming-up/cooldown per sessie via `wuFor(s)` (type + titel). Afvinken: `S.rt[datum][ID@sessieId]`; dagroutines: `S.rt[datum][ID]`. Sheet-kind `routine`.
- Onderrugpijn ≥ 4 in de ochtendcheck: rugadvies op Vandaag en knop RDL→HT, SQ→LP in krachtsessies.
- Zondag-export: regel "Routines: rug x/y · mobiliteit · warming-ups · herstel".
- v2.8: `mobex` = oefenbibliotheek {k: {n, how[], q (YouTube-zoekterm)}}; routine-items verwijzen met `k`. `mobFocus` = 4 gebieden × 3 varianten (A/B/C) die rouleren; `chooseMob(d)` kiest per dag op basis van dagen sinds laatst + trainingen gisteren/vandaag/morgen + onderrugpijn. Holds +10 s per 6 keer per gebied (max +20). `MOB_LANG` = 3 minst recente gebieden. `mobTests` + `S.mob` = maandelijkse test (check-in, inzicht).
- v2.9: beschikbaarheid = per dag {am, pm, no} (+ `slot` afgeleid via `slotOf`) en één bijzonderhedenveld. Planregel: lange trainingen altijd in het weekend; de coach plant de rest rond ochtend/avond.
- Tijdvelden (`data-tm`): alleen cijfers typen, de app zet ':' (5230 → 52:30). `tmParse(v,'h')`: losse cijfers = minuten; `'s'`: = seconden.
- v3.0: herstel & mobiliteit op maat. `RUGX` → `chooseRug` (RUG/RUG_B/RUG_C roteren; onderrug ≥4 → RUG). `mobex[k].tg` = doelspier statisch rekken; `staticWeek(maandag)` telt minuten per kant; `staticGoal` (8 min/week, Ingram 2025: 5–10). Tekort weegt mee in `chooseMob`. `dayKind` bepaalt herstel: lange duur → boots + gun + ontspannen; lower → gun, geen ijsbad; rustige dag → sauna (2–3×/wk). Afvinkbare herstelitems: `S.rt[datum].X_GUN/X_BOOTS/X_SAUNA`. Onderbouwing in `recoveryTips`.
- Coachprioriteit (Yorick): hardlopen en fietsen eerst, dan mobiliteit en fitheid; kracht is aanvullend.
- v3.1: Inzicht → sectienavigatie (`data-jump`), `perfCard` (Riegel-prognose uit beste race ≤ 240 d; tempo's als % drempelsnelheid; Coggan-fietszones), fietskaart, Mozart telt afdaal-/excentrische prikkels en gut-trainingsessies. Belastingswaarschuwing nu bij > +30% loopvolume (Nielsen 2014). Taperbanner in Week als een race binnen 14 dagen valt (doel −41–60% volume, Bosquet 2007). Vandaag: training eerst, herstel & mobiliteit eronder. Coachnotitie: eerste 2 regels, rest uitklapbaar.
- Planregel: loopvolume per week max ~30% boven het gemiddelde van de 3 weken ervoor.
- v3.4: `glance(s)` = doelregel op de dichte kaart (tempo/HF/watt/RIR uit tgt of detail). Zwift: sessie-veld `zwo` = [{min,pct} | {min,pct:[van,naar]} | {rep,on:{min,pct},off:{min,pct}}] (% FTP) → knop "Zwift-bestand" (.zwo). Alleen toevoegen bij intervaltrainingen op de fiets. HF-drift: strava.json-veld `dec` (%), berekend door tools/decoupling.py in de avondsync (vlakke runs ≥ 75 min, hm/km < 10). Check-in vragenset v3 (cijfer, benen, richting, opmerkingen); v1/v2 blijven leesbaar.

## v4.0.0 (18 nov 2026) — opgeschoond front-end, spiergroep-blokken
- Trainingskaarten ingeklapt: alleen titel, type en afstand/duur (of Strava-km/tijd). Alles anders (doel, warming-up, logger-knop, details) pas na uitklappen.
- Kracht: sessies kunnen `bl` (blokken) hebben i.p.v. `ex`: `{g, lbl, s, lo, hi, rir, rest, opts[], note}`. Het plan schrijft spiergroep + sets/reps/RIR/rust voor; Yorick kiest de oefening (laatst gekozen uit `opts` = standaard). Blok-id = `B0..Bn`, keuze in `S.swaps[sid|Bi]`. Gebruik altijd `cOf(sid, e)` om de echte oefeningcode te krijgen.
- Sjablonen staan in `plan.blockTemplates` (UA, UB, LA, LB). Oefeningen hebben `eq` (bb/db/m/c/bw/sm/kb/bal). Dumbbells: kg = per dumbbell.
- `setTargets` = harde sets/week; `groupTargets()` verlaagt benen ×0,75 bij ≥ 50 km lopen gepland en ×0,6 in een wedstrijdweek.
- Inzicht: tabbladen Overzicht/Lopen/Fietsen/Kracht/Lichaam (`ui.ins`), KPI-tegels bovenaan.

## v4.1.0 (18 nov 2026) — structuur, logger, coachlaag
- Code staat nu in `css/app.css` en `js/{core,views,insight,checkin,app}.js` (gewone scripts, gedeelde globale scope; volgorde in index.html is belangrijk). Nieuwe bestanden ook in `CORE` van sw.js zetten.
- 4 tabbladen: Vandaag, Plan (`week`), Voortgang (`inzicht`), Meer. Logger (`log`), duur (`duur`) en check-in (`check`) zijn schermen zonder tab; openen via kaarten/Meer.
- Logger: setrijen (`setTable`, `ui.rv[sid|code]` = openstaande rijen). ✓ = set loggen, setnummer = opwarmset, kg-wijziging loopt door naar volgende rijen. Schijvencalculator bij barbell.
- Rusttimer is een balk boven de tabbalk.
- `coachAdvice()` (Voortgang), `planVsDone()` (uitgeklapte duursessie), RPE-vraag op Vandaag na een Strava-sessie (`rpeTodo`, overslaan = `done.norpe`).
- Kleuren via CSS-variabelen; lichte modus volgt de systeeminstelling. Geen hex-kleuren meer in JS/CSS buiten :root.
- Release-regel: tests draaien maakt `tests/out/ui_{light,dark}_*.png`; bekijk die vóór elke push.

## v4.2.0 — Oura-koppeling
- Loopt via `sync/Code.gs` (Google Apps Script), niet rechtstreeks vanuit de app: het client-secret en de refresh-token staan alleen in de scripteigenschappen. Oura-data komt in tabblad `oura` van de eigen Sheet en in localStorage, nooit in de repo.
- App: knop "Verbind Oura" (Meer) → Oura-login → terug naar de app met `?code=` → app geeft de code aan het script (`?oura_code=`) → script wisselt in en bewaart tokens. Daarna haalt de app bij openen (max 1× per 20 min) `?oura=1` op; `applyOura()` vult alleen lege velden.
- Script: `installOuraTrigger()` éénmalig uitvoeren; haalt elk half uur tussen 05 en 12 u op. Redirect-URI in de Oura-app moet exact `https://yorick1226.github.io/coach-yorick/` zijn.
- Scopes die de app vraagt: `daily heartrate`.

## v4.3.0 — dag aanpassen + fitheid/vermoeidheid
- `adaptPlan(d, lvl)` (core.js): bij oranje/rood ochtendadvies voorstel per open sessie; knop "Pas vandaag aan" zet `done.alt` + `done.auto`; "Terug naar plan" wist die. Alleen voor vandaag; al gedane (of Strava-gekoppelde) sessies blijven staan.
- `loadSeries()/loadCard()` (insight.js): minuten × RPE (Foster); zonder RPE geschat uit gem. HF / drempel-HF. CTL 42 d, ATL 7 d. Vorm = (CTL−ATL)/CTL: < −0,3 zwaar, < −0,1 opbouw, < 0,15 in balans, anders fris. Alleen trend.

## v4.4.0 — kracht zonder invullen, vaste routinemomenten, drempelvoorstel, beveiligd script, CI
- Kracht: "✓ Hele sessie" / "✓ Rest zoals voorgesteld" (`logAsPlanned`, sets krijgen `pl:<batch>`, ongedaan via `data-unplan`). Afgevinkte of Strava-gekoppelde krachtsessie zonder sets telt in spiergroepen/export als gepland (`plannedSetsTicked`; bij alternatief: eerste 3 oefeningen × 2 sets).
- Routines: `plan.dailyRoutines` = vaste momenten (ma MOB, wo RUGX, zo MOB_LANG). Export telt per week.
- `tpSuggest()/tpCard()`: drempelvoorstel uit beste wedstrijd ≤ 10 weken (Riegel naar 60 min), afwijking ≥ 6 s/km; accepteren zet `settings.tpace`.
- Sheet-script: `APP_KEY` in scripteigenschappen; app stuurt `k` mee (`sheetU()`), sleutel in Meer → Instellingen. Zonder APP_KEY blijft het script open (oud gedrag). Volgorde bij instellen: nieuwe Code.gs + nieuwe versie implementeren → sleutel in app bewaren → APP_KEY zetten.
- Lege installatie: kaart op Vandaag om alles uit de Sheet terug te zetten (`restoreFromSheet`).
- CI: `.github/workflows/pages.yml` draait de releasetest (Chromium + WebKit, prev = HEAD~1) vóór publicatie. Cachenummer hoeft alleen omhoog als app-bestanden wijzigen (niet bij alleen strava.json/ics).

## v4.5.0 — coachschermen + alleen donker
- Nieuw `js/coach.js` (laden ná insight.js): `rBrief` (Training vooraf, knop "Vooraf ›" op elke sessiekaart), `rReview`/`reviewHtml` (weekevaluatie; knop onder Plan, compact op Voortgang), `seasonHtml` (tabblad Seizoen op Voortgang).
- Sessietype via `sessKind(s)`; standaardteksten in `KIND`. Per sessie te overschrijven in plan.json: `why`, `cues`, `ifthen` ([[als, dan]]), `success`. Per week: `review: {changes:[[input, actie]], focus}`.
- plan.json: `season` (fases met km-band) en `milestones` (kind: long | hmweek | weekkm | race; auto-afgevinkt uit Strava).
- App is altijd donker (geen licht thema meer); test controleert dat.

## v4.6.0 — nieuw ontwerp
- Palet in `:root` (css/app.css): leisteen/basalt, paars `--pur` = merkkleur (primaire knop, actief tabblad, vandaag), `--trail` oranje = wedstrijden, `--glac` = coach, `--moss` = gedaan.
- Lettertype Archivo (variabele breedte) zelf gehost in `fonts/archivo.woff2` (in sw CORE): smal/zwaar voor cijfers en titels, normaal voor tekst.
- Kopjes in zinsvorm, geen hoofdletterlabels. Vandaag: sessies als `.sess.hero` zonder kader; morgen als `.list`.
- Seizoen: volumeprofiel (`profileSvg`) + hoogtelijnen (`CONTOUR`). Afvinken: animatie `pop` (respecteert reduced motion).

## v4.7.0 — structuur
- Weekstrip = terrein: `sessLoad(s)` (minuten × intensiteit) bepaalt balkhoogte, paars gevuld = gedaan; statuslijn eronder (`.dot`).
- Plan: `sessCard(.., {compact:true})` = regels met rond vinkje; Vandaag blijft `hero`.
- Voortgang-overzicht: `#wkhero` (lopen vs plan + gemiddelde) i.p.v. 4 tegels; kop heet "Voortgang".
- Melding (`toast`) onderin; rustdag-toestand `#restday` met volgende training.
