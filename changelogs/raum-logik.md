# Changelog – Raum-Logik

## [2026-06-16 17:30] Amor vollständig implementiert + Siegbedingungen

### Backend (backend/server.js)
- `endNight`: Liebespaar-Tod-Verkettung — stirbt ein Liebender in der Nacht, stirbt der andere mit (wird ins `pendingDeaths`-Set eingetragen, tritt erst zu Tagesbeginn in Kraft)
- `checkWinCondition(room)`: neue Funktion prüft nach jeder Todeszuweisung drei Bedingungen:
  - Liebespaar-Sieg: beide Liebenden leben und sind die letzten zwei Spieler
  - Werwolf-Sieg: Anzahl Wölfe ≥ Anzahl Nicht-Wölfe (mind. 1 Wolf)
  - Dorfbewohner-Sieg: alle Wölfe beseitigt
- `startDay`: ruft `checkWinCondition` auf; bei Spielende → `game-over`-Event an alle + `narrator-update` mit Phase `game-over`; sonst normaler Tagesstart
- `processNightAction` (Amor): emittiert `you-are-lovers` mit `partnerName` an beide Liebenden

### Frontend – Spielerseite (frontend/js/game.js + game.html + game.css)
- `you-are-lovers`-Event: zeigt Love-Panel mit Partnername und aktiviert ♥-Recall-Button
- Love-Panel (`#love-panel`): persistent sichtbar, per ♥-Button ein-/ausklappbar
- `game-over`-Event: blendet Night-Overlay aus, zeigt vollflächiges Game-Over-Overlay mit Siegergruppe + Nachricht
- `game.html`: `#love-panel`, `#love-recall-btn`, `#game-over-overlay` hinzugefügt
- `game.css`: `.love-panel`, `.game-btn--love`, `.game-over-overlay` und `.game-over-box` gestylt

### Frontend – Erzählerseite (frontend/js/narrator.js)
- `game-over`-Event: aktualisiert Phase-Karte auf "Spielende", blendet Weiter/Überspringen-Buttons aus

## [2026-06-16 16:45] Spielseite: Rollenname und Tab-Titel versteckt wenn Karte verdeckt
- Karte startet jetzt face-down (Rückseite sichtbar), Knopf = "Karte zeigen"
- Name und Fraktion unterhalb der Karte sind versteckt solange die Karte verdeckt ist
- Browser-Tab zeigt "Deine Rolle – Werwolf" solange Karte verdeckt; erst nach Aufdecken den Rollennamen
- Beim Zurückflip (Karte verdecken): Name/Fraktion wieder verstecken, Tab-Titel zurücksetzen

## [2026-06-16 16:00] Karten: Mindestauswahl statt Exaktauswahl, Balance-Auto-Reduktion
- `server.js`: `n = players.length - (narratorMode ? 1 : 0)` — Erzähler korrekt rausgerechnet
- `server.js`: Neue Funktion `pickBalanced(selectedCards, n)` — wählt zufällig genau `n` Karten aus der Auswahl; Werwölfe werden auf `floor(n/3)` gekappt, Rest wird mit zufälligen Dorfbewohnern aufgefüllt; gibt Fehlermeldung zurück falls unmöglich
- `server.js`: `selectedCards.length !== n` → `< n` (Mindest- statt Exaktprüfung)
- `server.js`: Requested-Card-Check prüft ob die gewünschte Karte im `picked`-Set ist (nicht nur in `selectedCards`)
- `lobby.js`: Counter `is-match` bei `>= total` statt `=== total`
- `lobby.js`: Warnung bei zu vielen Werwölfen zeigt jetzt Info statt Fehler: „X Werwölfe gewählt — zufällig werden Y davon genutzt"
- `lobby.js`: `cardOk` prüft `>= needed` statt `=== needed`

## [2026-06-16 15:30] Frontend nach Dateityp reorganisiert
- `frontend/` aufgeteilt in drei Unterordner: `css/`, `js/`, `html/`
- Alle 5 CSS-Dateien → `frontend/css/`
- Alle 7 JS-Dateien → `frontend/js/` (imports auf `/js/roles.js` aktualisiert)
- Alle 6 HTML-Dateien → `frontend/html/` (CSS/JS-Pfade auf absolute Pfade `/css/` und `/js/` aktualisiert)
- Seitenlinks in JS aktualisiert: `lobby.html` → `/html/lobby.html` etc.
- `backend/server.js`: Root `/` leitet auf `/html/index.html` weiter

## [2026-06-16 14:45] Bugfix: Spielleiter-Modus-Toggle für Mitspieler ausgeblendet
- `lobby.css`: `.narrator-toggle[hidden] { display: none; }` ergänzt — `display: flex` in der Klasse überschrieb das HTML-`hidden`-Attribut für Nicht-Host-Spieler

## [2026-06-16 14:30] Bugfix: Erzähler wird im Kartenzähler nicht mehr mitgezählt
- `lobby.js renderCards`: `total` zieht 1 ab wenn `narratorMode` aktiv → Zähler zeigt z.B. 4 statt 5
- `lobby.js updateFooter`: `needed = players.length - (narratorMode ? 1 : 0)` → "Spiel starten" wird erst aktiv wenn die richtige Anzahl Karten gewählt ist
- `lobby.js updateFooter`: `allReady` prüft nur Nicht-Host-Spieler (`p.isHost || p.isReady`), da Host im Erzähler-Modus keinen Bereit-Status hat

## [2026-06-16 14:00] Erzähler-Modus + Nacht-Spiellogik implementiert

### Backend (backend/server.js) – vollständige Überarbeitung
- Phasensteuerung: `day-prep` → `night` → `night-summary` → `day-vote` → Schleife
- `NIGHT_ORDER`-Array (12 Einträge) mit firstNightOnly/everySecondNight-Varianten und actionType
- Spielleiter kann jetzt als `Mitspieler` (bekommt Rolle) oder `Erzähler` (kein Rollenkartenlose Steuerung) starten
- `game-started`-Event enthält `narratorMode` und `narratorId`
- Nacht-Engine: `startNight` → `advanceNight` → `your-night-turn` / `night-waiting` / `narrator-update`
- Nacht-Auswertung: `endNight` berechnet Todesfälle (Wölfe minus Hexe-Heilung plus Hexe-Gift)
- `night-summary` an Erzähler mit Zusammenfassung; `startDay` entfernt Tote und beginnt Tagesrunde
- Socket-Events: `phase-advance`, `phase-skip`, `night-action`, `set-narrator-mode`
- Wolf-Koordination: erstes eingehendes Kill-Vote gewinnt, andere Wölfe sehen `wolf-vote-update`
- Seherin: Ergebnis via `view-result` (enthält roleId)

### Frontend – Erzähler-Seite (frontend/narrator.html + narrator.css + narrator.js)
- 2-Spalten-Layout: links Phasenkarte + Spielergitter + Weiter/Überspringen-Buttons; rechts Ereignisprotokoll
- Phasenkarte wechselt visuell für Nacht (`is-night`-Klasse, lila Akzent)
- Spielerstatus-Grid: lebend (grün) / tot (rot, durchgestrichen)
- Nacht-Zusammenfassungs-Modal nach jeder Nacht (mit "Tag beginnt →")
- Reagiert auf: `narrator-update`, `night-summary`, `phase-changed`

### Frontend – Lobby (frontend/lobby.html + lobby.css + lobby.js)
- Erzähler-Toggle im Footer (nur für Host): Mitspieler / Erzähler
- `game-started`-Handler leitet Erzähler auf `narrator.html` weiter, alle anderen auf `game.html?card=...`

### Frontend – Spielseite Nacht (frontend/game.html + game.css + game.js)
- Night-Overlay (#night-overlay): Warte-Zustand mit Mond-Animation; Aktions-Zustand mit Rollenbeschreibung
- Nacht-Aktions-Handler je actionType:
  - `kill` / generisch: Ziel-Buttons, Bestätigen
  - `witch`: Heilen / Vergiften (mit Zielliste) / Nichts tun
  - `view-result`: Seherin sieht Karte mit Rollenbild
  - `select-two`: Multi-Select für 2 Spieler
  - `optional` / `optional-kill`: Bestätigen ohne Zwang
- Wolf-Abstimmungs-Update via `wolf-vote-update` in der Wartezeile sichtbar
- Overlay versteckt sich bei `phase-changed` (Tag)

## [2026-06-16 11:30] Bugfix: Spieler können jetzt alle Karten requesten (auch inaktive)
- `lobby.js`: `is-clickable` gilt jetzt für alle Karten (nicht nur ausgewählte); inaktive Karten ohne eigenen Request bleiben visuell gedimmt, sind aber klickbar
- `server.js`: Guard `!room.selectedCards.includes(cardId)` entfernt — Server akzeptiert Request auf jede Karte, nicht nur auf bereits ausgewählte


## [2026-06-16 11:00] Vollständige Raum-Logik implementiert

### Backend (backend/)
- `package.json` erstellt (Node.js + Express + Socket.IO)
- `server.js` erstellt:
  - In-Memory Raumverwaltung (Map), kein Datenbankzwang
  - Raum-Code-Generator (6-stellig, ambiguitätsfrei: kein O/0/I/1)
  - Socket.IO Events: `create-room`, `join-room`, `toggle-card`, `request-card`, `set-ready`, `send-message`, `start-game`, `disconnect`
  - Balanceprüfung: min. 1 Werwolf, max. floor(n/3) Werwölfe für n Spieler
  - Kartenvergabe: Wunschkarten (requests) bevorzugt, Rest zufällig
  - Host-Übergabe bei Disconnect des Spielleiters
  - Statisches Serving von `frontend/` und `/assets`

### Frontend (frontend/)
- `roles.js` — zentrale Rollendaten (26 Rollen, Bilder, Beschreibungen, Fraktionen)
- `form.css` — geteilte Styles für start/join-Seiten
- `start.html` + `start.js` — Spielleiter gibt Namen ein, landet in Lobby
- `join.html` + `join.js` — Spieler gibt Code + Name ein, landet in Lobby (Code wird automatisch uppercase/gefiltert)
- `lobby.html` + `lobby.css` + `lobby.js`:
  - 3-Spalten-Layout: Spielerliste / Kartengitter / Chat
  - Spielleiter: Karten ein-/ausschalten (Toggle), Kartenanzahl-Zähler, Balance-Warnung
  - Spieler: Wunschkarte durch Klick anfordern (♥-Badge), Bereit-Button
  - Echtzeit-Chat via Socket.IO
  - Raum-Code-Anzeige mit Kopieren-Button
  - Verbindungs-Overlay mit Spinner und Fehleranzeige
  - Responsive (mobile: stacked)
- `game.html` + `game.css` + `game.js`:
  - Zeigt die zugewiesene Rollenkarte groß
  - Karte umdrehen (3D-Flip-Animation, zeigt backside.jpeg)
  - Info-Button öffnet Modal mit Rollenbeschreibung
  - Titel-Tag zeigt Rollenname

### Starten (lokal & Server)
```
cd backend
npm install
npm start       # Produktion
npm run dev     # Entwicklung (Node.js >= 18.11 für --watch)
```
Dann: http://localhost:3000/
