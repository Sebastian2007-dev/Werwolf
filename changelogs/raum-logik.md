# Changelog – Raum-Logik

## [2026-06-16 22:15] Spielende: "Neue Karten" leitet zurück in die Lobby (selbe Spieler)
- **server.js**: `reset-to-lobby`-Event setzt Raum auf Lobby-Zustand zurück (Phase, Spieler-Ready, Karten-Anfragen); sendet jedem Spieler `back-to-lobby` mit Name, isHost, RaumCode; `rejoin-lobby`-Event reconnectet Spieler mit aktueller Socket-ID in bestehenden Raum
- **lobby.js**: `rejoin`-URL-Param erkannt → emittiert `rejoin-lobby` statt `create-room`/`join-room`; Guard für Doppel-Join funktioniert weiterhin
- **narrator.js/game.js**: `back-to-lobby`-Event leitet alle zu `/html/lobby.html?rejoin=CODE&name=NAME` weiter; Host bekommt zusätzlich `host=1`
- **narrator.html**: Button "Neue Karten →" (war "Neue Lobby →")

## [2026-06-16 22:00] Spielende: Neustart- und Neue-Lobby-Optionen
- **server.js**: `restart-game`-Event — neustart mit gleichen Karten (neu gemischt), selbe Spieler; `end-session`-Event — emittiert `session-ended` an alle und löscht den Raum
- **narrator.html/js**: Nach Spielende zwei Buttons sichtbar: "Nochmal spielen" und "Neue Lobby →"; Bugfix: `updateButtons` zeigte "Nacht beginnt →" bei `game-over` (nun korrekt versteckt); `game-started`-Handler leitet Erzähler zur narrator.html weiter; `session-ended`-Handler leitet zur Startseite
- **game.js**: `game-started`-Handler leitet Spieler zur game.html mit neuer Karte; `session-ended`-Handler leitet zur Startseite
- **narrator.css**: `.game-over-actions` mit Einblend-Animation

## [2026-06-16 21:30] Tagesrunde: Anklage + Abstimmung implementiert
- **Lobby**: "Max. Anklagen"-Einstellung (Host only, Standard 3, 1–10) in Footer; `set-max-accusations`-Event
- **server.js**: Neue Phasen `day-accusation` → `day-voting` → `day-result`; `startDay` ruft `startDayAccusation` auf; `day-vote`-Phase entfernt; neue Funktionen `startDayAccusation`, `processDayNominations`, `startDayVoting`, `processDayVotes`, `endDay`; neue Socket-Events `day-nominate`, `day-vote-cast`, `set-max-accusations`
- **narrator.js/html**: PHASE_LABELS für neue Phasen; Anklage/Abstimmungs-Fortschritt in Phase-Karte; Tag-Ergebnis-Modal mit "Nächste Nacht →"
- **game.js/html/css**: Tag-Panel (aus Boden hochfährt); Anklage-UI mit Spielerliste + Überspringen; Abstimmungs-UI mit Angeklagten-Liste + Bestätigen; Ergebnis-Text im Warte-Zustand; tote Spieler sehen kein Panel

## [2026-06-16 21:00] Morgenbildschirm + Nacht-Zusammenfassung implementiert
- `server.js` (`endNight`): sendet alle lebenden Spielernamen im `phase-changed night-summary`-Event
- `server.js` (`phase-advance`): emittiert `morning-reveal` mit Todesliste, ruft `startDay` mit 2,5s Verzögerung auf
- `narrator.js`: `narrator-update`-Handler öffnet nun das Zusammenfassungs-Modal wenn `phase === 'night-summary'` und `summary` vorhanden; totes `night-summary`-Handler entfernt
- `game.html`: neues `#morning-overlay`-Div mit Kartengrid und Todestextzeile
- `game.css`: Stile für `.morning-overlay`, `.morning-grid`, `.morning-card` (Flip-Animation, Name, Todesmarkierung)
- `game.js`: `phase-changed night-summary` zeigt Morgenbildschirm mit allen Karten (verdeckt); `morning-reveal` deckt tote Karten auf und zeigt Rollenbild; `phase-changed day-vote` blendet Morgenbildschirm aus

## [2026-06-16 20:20] Bugfix: "Wartet auf: X" verrät aktiven Spieler entfernt
- `game.js`: `night-waiting`-Handler zeigt kein `waitingFor` mehr — nur noch "Schließe deine Augen…"
- `server.js`: `waitingFor`-Feld aus dem `night-waiting`-Emit entfernt

## [2026-06-16 20:15] Bugfix: Aktive Rolle sieht Warteschirm + Karten-Peek-Button

### Bugfix: Aktive Rolle sieht "Schließe deine Augen" statt ihrer Aktion
- **Ursache**: `night-waiting` wurde per `io.to(code).emit(...)` an ALLE Spieler gesendet, auch den aktiven — das hat die kurz zuvor gesendete `your-night-turn`-Aktion überschrieben
- `backend/server.js`: `night-waiting`-Emit enthält jetzt zusätzlich `waitingFor` (Spielernamen als String) neben dem schon vorhandenen `activePlayers` (ID-Array)
- `frontend/js/game.js`: `night-waiting`-Handler prüft `activePlayers.includes(socket.id)` — ist man selbst aktiv, wird das Event ignoriert

### Feature: Karte während der Nacht ansehen
- `game.html`: Button `#night-card-peek` (oben-rechts auf dem Nacht-Overlay) hinzugefügt
- `game.js`: Button öffnet dasselbe Info-Modal wie der normale ℹ-Button (Rollenname + Beschreibung); gemeinsame `openCardModal()`-Funktion
- `game.css`: `.night-card-peek` — halbtransparenter Button, positioniert absolute oben-rechts

## [2026-06-16 19:45] Bugfix: Erzähler-Seite zeigt "Verbindung zum Raum fehlt"

### Ursachen
1. `lobby.js` `connect`-Handler rief bei Socket-Reconnects erneut `create-room` → neuer leerer Raum, original Raum verwaist
2. Narrator-Check `socket.id === narratorId` schlägt fehl wenn Socket-ID zwischen Raumgründung und Spielstart wechselte → Erzähler landet auf `game.html` statt `narrator.html`
3. Bei Reconnect auf `narrator.html`/`game.html` wurde die alte URL-`playerId` benutzt, die der Server nicht mehr kennt

### Fixes
- `lobby.js`: `lobbyJoined`-Flag verhindert doppeltes `create-room` / `join-room` bei Reconnect
- `lobby.js`: Narrator-Erkennung auf `!assignments[pid]` (kein Karten-Assignment) statt `socket.id === narratorId` → robuster gegen ID-Wechsel
- `lobby.js`: Schreibt `ww_roomCode` und `ww_playerId` in `sessionStorage` vor Redirect → Fallback falls URL-Params fehlen
- `narrator.js`: Liest `roomCode`/`playerId` aus URL-Params **oder** `sessionStorage`
- `narrator.js` + `game.js`: `currentPlayerId` wird nach `resume-ok` auf aktuelle `socket.id` aktualisiert → Reconnects nutzen immer die zuletzt bekannte ID

## [2026-06-16 19:15] Werwölfe: Mehrheitsvote-System implementiert

### Backend (backend/server.js)
- Neue Hilfsfunktionen: `getVoteCounts`, `getMajorityTarget`, `broadcastWolfVotes`
- `startNight`: `g.wolfVotes` und `g.wolfConfirms` pro Nacht initialisiert
- `advanceNight`: Wolf-Zielliste filtert alle Werwölfe raus (nur Nicht-Wölfe wählbar)
- `processNightAction` (kill): vollständig umgebaut:
  - `{ vote: targetId }` → Stimme registriert, alle Confirms zurückgesetzt, sofortiger Broadcast
  - `{ confirm: true }` → nur gültig wenn Mehrheitsziel existiert und Wolf dafür gestimmt hat; bei genug Confirms wird Opfer gesperrt
  - Opfer gesperrt → `night-turn-done` an alle Wölfe, Erzähler-Update mit `done: true`
  - Erzähler erhält bei jedem Vote-Update Zusammenfassung (`wolfVoteSummary`)
- `night-action` Socket-Handler: `processNightAction` gibt `true/false` zurück; `night-turn-done` nur bei `true` (Wölfe steuern es selbst)

### Frontend (frontend/js/game.js + game.html + game.css)
- `kill`-Branch aus generischem `else` herausgelöst — eigener UI-Pfad für Werwölfe
- Vote: Klick auf Ziel sendet `{ vote: targetId }`, selektiert den Button visuell
- `wolf-vote-update`: aktualisiert Stimm-Badges (rote Kreis-Zahl pro Ziel), hebt eigene Wahl hervor, zeigt "Bestätigen"-Button sobald Mehrheit für eigenes Ziel, deaktiviert Button nach eigenem Confirm
- `wolf-status`-Zeile zeigt `"X hat die Mehrheit — N/M bestätigt"` bzw. `"Noch keine Mehrheit"`
- `game.html`: `#wolf-status` ergänzt
- `game.css`: `.wolf-status`, `.vote-badge` ergänzt

## [2026-06-16 18:45] Hexe: Toggle-Confirm-Flow implementiert

### Frontend (frontend/js/game.js + game.html + game.css)
- Hexe-UI umgebaut von "Klick = sofort" auf "Wählen → Bestätigen":
  - "Heilen" toggelt `is-active`-Klasse (visuelles Feedback, kein sofortiger Emit)
  - "Vergiften…" klappt Zielliste ein/aus; Ziel-Klick selektiert (rückgängig durch erneutes Klicken auf "Vergiften")
  - "Bestätigen" sendet beides gemeinsam: `{ heal: true, poisonTargetId: '...' }` (beliebige Kombination)
  - "Nichts tun" sendet leeres Payload (kein Trank)
- `game.html`: `#witch-confirm`-Button + `witch-ui__actions`-Wrapper ergänzt; "Nichts tun" dorthin verschoben
- `game.css`: `.witch-btn--confirm`, `.witch-btn--heal.is-active`, `.witch-ui__actions` ergänzt
- `game.js`: `witchConfirm`-Referenz + `nightState.witchHealSelected`/`witchPoisonTarget` in Reset initialisiert

## [2026-06-16 18:15] Dorfmatratze vollständig implementiert + Hexe-Bugfixes

### Backend (backend/server.js)
- `NIGHT_ORDER`: Dorfmatratze vor Seherin verschoben (muss vor den Werwölfen wählen)
- `startNight`: `g.dorfmatraze_sleep` und `g.dorfmatraze_protected` pro Nacht initialisiert
- `advanceNight`: Hexe erhält `extra.victim = null` wenn Werwölfe die Dorfmatratze direkt angriffen (nur Erzähler erfährt davon); `targets` → `players` im Emit umbenannt (war Feldname-Mismatch mit Frontend)
- `advanceNight`: Hexe erhält `extra.canHeal` und `extra.canPoison` Flags
- `processNightAction` (Hexe): payload-Parser auf beide API-Varianten erweitert (`heal: true` und `action:'heal'`; `poisonTargetId` und `action:'poison'`)
- `processNightAction` (Dorfmatratze): neuer Case — speichert `g.dorfmatraze_sleep` aus `payload.targetId`
- `endNight`: Dorfmatratze-Sterbelogik implementiert:
  - Wölfe wählen Dorfmatratze direkt → `dorfmatraze_protected = true`, niemand stirbt
  - Wölfe wählen Person wo Dorfmatratze schläft → beide sterben; auch wenn Hexe das Primäropfer heilt stirbt die Dorfmatratze trotzdem
- `endNight`: Zusammenfassung unterscheidet drei Szenarien (Schutz / Mitsterben / normal)

### Frontend (frontend/js/game.js)
- `your-night-turn` Handler: `players` statt `targets`, `extra` statt `nightVictim` destrukturiert
- Hexe: `witchHeal` sendet `{ heal: true }` statt `{ action: 'heal', targetId }`
- Hexe: Giftliste sendet `{ poisonTargetId: p.id }` statt `{ action: 'poison', targetId }`
- Hexe: `witchHeal.hidden` und `witchPoison.hidden` reagieren auf `extra.canHeal` / `extra.canPoison`

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

## [2026-06-16 19:45] Seitenwechsel-Reconnect fuer laufende Spiele repariert
- `backend/server.js`: `resume-game` Socket-Event ergaenzt; Spieler- und Erzaehler-Socket-IDs werden nach dem Wechsel von Lobby zu Spiel-/Erzaehlerseite ersetzt
- Disconnects werden 15 Sekunden verzoegert entfernt, damit normale Seitenwechsel den Raum nicht sofort zerstoeren
- Aktueller Spielzustand wird nach dem Reconnect erneut an Erzaehler oder Spieler gesendet
- `frontend/js/lobby.js`: Raumcode und bisherige Spieler-ID werden beim Wechsel auf `game.html`/`narrator.html` mitgegeben
- `frontend/js/narrator.js` und `frontend/js/game.js`: Zielseiten melden sich mit `resume-game` beim Server zurueck
- Root-`package.json` ergaenzt, damit `npm start` direkt im Projektordner das Backend startet
- README-Startanleitung auf den Root-Startbefehl aktualisiert
