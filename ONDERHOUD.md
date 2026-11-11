# ONDERHOUD — regels voor elke wijziging

Deze regels gelden voor elke release, ook kleine. Ze beschermen de data op de telefoon.

## Harde regels

1. **Opslagsleutel nooit wijzigen.** `KEY = 'yorick-coach'` in `index.html`. Een nieuwe sleutel = lege app.
2. **Oefeningcodes nooit wijzigen of hergebruiken.** Codes (`BP`, `SQ`, `RDL`, …) staan in `plan.json → exercises`. Hernoemen mag alleen via het veld `n` (weergavenaam). Een nieuwe oefening krijgt een nieuwe code. Een code die niet meer gebruikt wordt, blijft in de lijst staan.
3. **Sessie-id's zijn datum + letter** (`2026-11-17-a`) en worden nooit hergebruikt voor een andere sessie. Data hangt aan id's en datums, nooit aan posities in een lijst.
4. **Check-invragen van een lopende of afgesloten week niet aanpassen.** Elke check-in bewaart zijn vragensetversie (`qv`). Een bestaande versie in `QSETS` wordt nooit bewerkt. Voor wijzigingen voeg je een nieuwe versie toe en hoog je `QV_CURRENT` op. Dat doe je alleen op een maandag, voordat er iets voor die week is ingevuld.
5. **Cachenummer ophogen bij elke release.** `const CACHE = 'coach-vN'` in `sw.js` en `APP_VERSION` in `index.html`.
6. **`migrate()` alleen uitbreiden**: velden toevoegen met een standaardwaarde, nooit velden verwijderen of hernoemen. Onbekende velden blijven bewaard.
7. **Geen gezondheidsdetails in `plan.json`.** De repo en de site zijn openbaar.

## Weekritme

- **Zondag:** Yorick plakt in de chat de weektekst uit *Meer → Kopieer weektekst*, plus zijn agenda.
- De coach evalueert de week (Strava + export) en werkt de volgende week in `plan.json` uit: `status: "definitief"`.
- Toekomstige weken blijven `concept`. Komt er geen update, dan opent de app gewoon de conceptweek met een gele banner.
- Daarna: `python3 tools/build_ics.py` → regressietest → push.

## Releasechecklist (verplicht vóór elke push)

```
python3 tools/build_ics.py
python3 tests/run_tests.py --prev <vorige-commit-of-tag>
```

De test doet het volgende:
1. Syntaxcheck van de inline-JS in `index.html` (`node --check`), plus `sw.js` en een JSON-validatie van `plan.json`.
2. Planchecks: unieke sessie-id's, alle gebruikte oefeningcodes bestaan, en geen bestaande code verdwenen ten opzichte van de vorige versie.
3. **Regressietest (Playwright):** start de *vorige* versie, vult data in (sets, duursessie, afvinken, notitie, check-in en instellingen), laadt daarna de *nieuwe* versie op dezelfde origin en controleert dat alles er nog is. De test controleert ook de export, de back-up en het herstel.
4. Telefoon-screenshots (iPhone-formaat) in `tests/out/`.

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
| `ics/<week>.ics` | Agenda per week (gegenereerd) |
| `tools/build_ics.py` | ICS-generator |
| `tests/run_tests.py` | Releasetest |
| `sync/Code.gs` | Google Apps Script voor de sheet |
