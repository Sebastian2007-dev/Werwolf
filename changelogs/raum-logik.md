# Changelog – Raum-Logik

## [2026-06-17 22:15] Fix: Auto-Skip-Timer wird durch Chat-Aktivität zurückgesetzt
- Wenn ein Spieler während seiner Nachtrunde im Chat tippt, wird der 30s-Auto-Skip-Timer neu gestartet
- Client sendet `game-activity` Event bei Tastatureingabe im Chat (gedrosselt auf 1x/3s)
- Server-Handler prüft ob Sender der aktive Nachtspieler ist, setzt dann `startAutoTurnTimer` zurück
- Betrifft: `server.js`, `game.js`

## [2026-06-17 21:45] Feature: In-Game Chat mit Dorf- und Rudel-Tab
- Floating Chat-Button (💬) erscheint während Tagphasen für alle Spieler; für Wölfe immer sichtbar
- "Dorf"-Tab: alle Spieler können tagsüber Nachrichten schreiben (Eingabe deaktiviert bei Nacht/als Toter)
- "Rudel 🐺"-Tab: nur für Wölfe (inkl. transformierte WildesKind & JackTheRipper) sichtbar; immer schreibbar
- Ungelesene-Badge auf dem Toggle-Button (getrennt je Tab)
- Chat-Historie wird bei Reconnect wiederhergestellt (Wolf-Chat nur für Wölfe)
- Server: `game-chat` Handler, `villageChat`/`wolfChat` Arrays im Game-State, `game-chat-history` bei Resume
- Betrifft: `server.js`, `game.html`, `game.css`, `game.js`

## [2026-06-17 21:30] Bugfix: "Noch nicht alle Spieler sind bereit" nach Neue-Karten-Neustart
- `reset-to-lobby` setzte `isReady = false` für ALLE Spieler einschließlich Host — Host klickt aber nie Bereit
- `start-game`-Check prüfte `p.isReady` für alle Spieler (Server), während der Client korrekt `p.isHost || p.isReady` verwendet
- Fix 1: `reset-to-lobby` setzt `p.isReady = p.isHost` statt `false`
- Fix 2: `start-game` prüft jetzt `p.isHost || p.isReady` (wie der Client)
- Betrifft: `server.js`

## [2026-06-17 21:15] Host-Aktionen im Spielende-Screen (Auto-Modus)
- Alle drei `game-over`-Emits auf dem Server senden jetzt `hostId`
- Spielende-Overlay zeigt dem Host zwei Schaltflächen: "Nochmal spielen ↺" und "Neue Karten →"
- Buttons triggern `restart-game` / `reset-to-lobby` (serverseitig bereits auf Host beschränkt)
- Betrifft: `server.js`, `game.html`, `game.css`, `game.js`

## [2026-06-17 21:00] Bugfix: Jäger wurde am Tag eliminiert – Werwölfe gewannen sofort ohne Schuss
- `endDay` prüfte `checkWinCondition` BEVOR der Jäger-Schuss ausgelöst wurde → wenn Wölfe durch den Jäger-Tod gewannen, endete das Spiel sofort
- Fix: Jäger-Block in `endDay` vor den `checkWinCondition`-Aufruf verschoben; Win-Check läuft jetzt im `hunter-shot`-Handler nach dem Schuss
- Betrifft: `server.js`

## [2026-06-17 20:45] Anklage-Phase: Live-Tally + Skip-Bestätigung
- Server emittiert `day-accusation-update` an alle Spieler nach jeder Nominierung (Tally + Skip-Anzahl)
- Client zeigt `.vote-badge` auf Anklageschaltflächen (wie Wolfabstimmung) und Statuszeile `X/Y reagiert · Z überspringen`
- Wartetext zeigt ebenfalls Fortschritt sobald der Spieler bereits nominiert hat
- Überspringen-Schaltfläche erfordert jetzt Bestätigung: 1. Klick → "Wirklich überspringen?", 2. Klick → sendet; 3s Timeout zum Zurücksetzen
- Betrifft: `server.js`, `game.html`, `game.css`, `game.js`

## [2026-06-17 20:30] Bugfix: Auto-Modus – Werwölfe rücken nach Abstimmung nicht automatisch vor
- `processNightAction` für `kill`-Typ emittiert `night-turn-done` direkt an alle Wölfe, gibt aber immer `false` zurück → der Auto-Advance-Timer im Socket-Handler wurde nie gesetzt
- Fix: Wenn `entry.done = true` (Schwelle erreicht) und `g.autoMode`, wird der 800ms-`advanceNight`-Timer direkt im Wolf-Confirm-Block gesetzt
- Betrifft: `server.js`

## [2026-06-17 20:15] Bugfix: Auto-Modus – Tagphase startet nach Countdown nicht
- `startDay()` setzte `g.phase` nie auf `'day-prep'` vor dem 5s-Timer
- Der Guard `phase === 'day-prep'` im Timer-Callback schlug deshalb immer fehl → `startDayAccusation` wurde nie aufgerufen
- Fix: `g.phase = 'day-prep'` direkt nach `clearAutoTimers(g)` im autoMode-Block setzen
- Betrifft: `server.js`

## [2026-06-17 20:00] Hexe UI – Redesign passend zum Nacht-UI-Stil
- `.witch-ui__victim` ist jetzt schlicht-kursiver Muted-Text ohne Box
- `.witch-btn--heal` / `.witch-btn--poison` nutzen denselben Basis-Stil wie `.target-btn`: semi-transparenter Hintergrund, `3px`-Akzentbalken links, verschiebt sich beim Hover (statt `opacity`-Effekt)
- Aktiver Zustand (`.is-active`) zeigt farbigen Balken + getönten Hintergrund (grün für Heilen, rot für Vergiften)
- `.witch-btn--confirm` übernimmt den Stil des `night-confirm`-Buttons (Gold-Akzent, `Cinzel`-Schrift)
- `.witch-btn--pass` ist dezent sekundär (sehr gedämpft, `Cinzel`-Schrift)
- Betrifft: `game.css`

## [2026-06-17] Bugfix: Mitspieler-Modus startet nicht mehr (Auto-Modus sofort aktiv)
- `g.autoMode = !narratorPlayerId` in beiden Spielstart-Blöcken — kein Erzähler = sofort Auto-Modus
- 3s nach `game-started` → `auto-day-starting { countdown: 5, label: 'Nacht beginnt in' }` → nach 5s startet die erste Nacht automatisch
- `reset-to-lobby` prüft jetzt Host ODER Erzähler (war zuvor nur Erzähler → Host im Mitspieler-Modus konnte Lobby nicht resetten)
- Betrifft: `server.js`, `game.js`, `game.html`

## [2026-06-17] Host-Verwaltung + Auto-Pilot-Modus
- **Kick**: Host sieht ✕-Button neben Spielern → `kick-player` → Spieler wird zur Startseite weitergeleitet
- **Erzähler zuweisen**: Host kann 📖-Button klicken → designierter Spieler wird Erzähler (kein Karte), Host spielt mit; `room.designatedNarrator`
- **Auto-Pilot** wenn Erzähler das Spiel verlässt: `g.autoMode = true`; Banner, 5s Tag-Countdown, automatische Phasen-Übergänge (Night→Tag 3,5s, Day-Result→Nacht 4s), 30s Spieler-Inaktivität → 10s Warnung → Skip; atmosphärische Status-Meldungen (`autoStatusMsg`) an wartende Spieler
- Betrifft: `server.js`, `lobby.js`, `lobby.css`, `game.js`, `game.html`, `game.css`, `narrator.js`

## [2026-06-17] Bugfix: Raum-Code bleibt bei Seiten-Reload erhalten
- Nach `room-created` schreibt der Host den Code via `history.replaceState()` in die URL (`?code=XXXXXX`) — kein Seiten-Reload
- Beim Reload: wenn `isHost` und `code` im URL-Param → `rejoin-lobby` statt `create-room` → gleicher Raum, aktualisierte Socket-ID
- Fallback: falls der Server neu gestartet wurde und der Raum nicht mehr existiert, erstellt der Host automatisch einen neuen Raum (Code wird aus URL entfernt)
- Betrifft: `frontend/js/lobby.js`

## [2026-06-17] QR-Code-Button in Lobby
- Neuer "QR"-Button neben dem Kopieren-Button im Lobby-Header
- Klick öffnet Modal mit QR-Code der direkten Join-URL (`/html/join.html?code=ROOMCODE`)
- Spieler können den QR-Code abscannen und landen direkt auf der Beitrittsseite mit vorausgefülltem Code
- Bibliothek: `qrcodejs@1.0.0` via jsDelivr CDN (kein Build-Schritt)
- Schließen per Schließen-Button, Klick auf Backdrop oder Escape-Taste
- Betrifft: `lobby.html`, `lobby.css`, `lobby.js`

## [2026-06-17] Bugfix: Kopieren-Button funktioniert auf HTTP-Servern
- `navigator.clipboard.writeText()` erfordert HTTPS — schlägt auf plain-HTTP-Servern lautlos fehl
- Fallback auf `document.execCommand('copy')` via temporäres Textarea-Element wenn `window.isSecureContext` nicht gesetzt ist
- Betrifft: `frontend/js/lobby.js`, Copy-Button für Raum-Code

## [2026-06-16] Easter Egg: Alle Spieler tot

- `checkWinCondition()`: erster Check — `g.alive.size === 0` → `{ winner: 'everyone-dead', message: 'XD' }`
- Ohne diesen Check würde der Dorfbewohner-Check greifen (wolves.length === 0 wenn alle tot sind)
- Client: `game-over` mit winner `'everyone-dead'` zeigt `'XD'`...

## [2026-06-16] Tote Spieler: Graue Karte + Zuschauer-Modus mit Ereignis-Log

- Wenn ein Spieler stirbt, wird seine Karte grau (CSS `filter: grayscale(90%)`, `is-dead`-Klasse auf `card-scene`)
- Ein scrollbares Ereignis-Log-Panel erscheint unten ("Zuschauer-Modus")
- Todes-Erkennung im Client:
  - `morning-reveal` / `morning-full-reveal`: prüft ob `currentPlayerId` in den Toten oder `hunterShot` ist
  - `phase-changed` (day-result): prüft `eliminated.id` und `hunterShot.id`
  - Reconnect: Server erkennt toten Spieler in `pushCurrentGameState` → sendet `you-are-dead` + `narrator-update`
- `setDead()`: setzt `isDead = true`, graut Karte, zeigt Panel, versteckt Day-Panel, emittiert `join-spectator`
- Server: `narratorPush` leitet Ereignisse auch an `g.spectators` weiter (toter Spieler bekommt gleiche `narrator-update`-Events wie Erzähler)
- Server: `g.spectators = new Set()` in beiden Spielstart-Blöcken; `replacePlayerSocket` aktualisiert Spectator-IDs
- `join-spectator`-Handler: fügt Spieler zu `g.spectators` hinzu (nur wenn tot)
- Tote Spieler sehen keine Tagesabstimmungs-UI mehr (Day-Panel wird versteckt)

## [2026-06-16] 6 Rollen vollständig implementiert: Dieb, Silberschmied, EinsamerWolf, JackTheRipper, Gendarm, Glöckner

- **Dieb**: `g.diebOptions` (2 zufällige nicht-vergebene Rollen) wird bei Spielstart generiert; `advanceNight` schickt Rollen-IDs als Ziel-Buttons; bei Auswahl → `room.assignments[diebId] = chosenRole` + `role-changed`-Event an Client; Client aktualisiert angezeigte Karte sofort; Dieb-Optionen in beiden `room.game`-Initialisierungen
- **Silberschmied**: Schutz (`g.silberschmied_protected`) wird in `processNightAction` gesetzt und bleibt dauerhaft; in `endNight` als dritter Fall im Wolf-Angriffs-Block: Opfer überlebt, zufälliger Werwolf stirbt stattdessen; Silber-Fall auch in Summary-Zeilen
- **EinsamerWolf**: `g.einsamerWolf_target` in `processNightAction`; nur Wölfe als Ziel-Buttons (via `advanceNight`-Override); in `endNight` → Ziel in `pendingDeaths` wenn Wolf; Win-Bedingung: letzter Überlebender (`g.alive.size === 1`) → `winner: 'einsamer-wolf'`
- **JackTheRipper**: `g.jack_target` in `processNightAction`; in `endNight`: Dorfmatratze stirbt wenn sie bei Jack oder Jacks Ziel schläft; `g.jack_isWolf = true` → `jack-transformed`-Event an Client; Jack tritt ab nächster Nacht dem Wolfsrudel bei (`startNight`-Logik); `buildNightQueue` überspringt Jacks Einzelzug wenn transformiert; `isWolf()` berücksichtigt `jack_isWolf`
- **Gendarm**: `g.gendarm_target` + `g.gendarm_used = true` in `processNightAction`; `buildNightQueue` überspringt Gendarm nach erstem Einsatz; in `endNight`: Ziel stirbt; wenn Unschuldiger → Gendarm stirbt ebenfalls; Summary-Zeile je nach Wolf/Unschuldig
- **Glöckner**: `g.gloeckner_used` wie Gendarm; `advanceNight` liefert `[{ id: '__ring__', name: 'Glocken läuten' }]` statt Spielerliste; in `processNightAction`: wenn `__ring__` gewählt → Werwölfe-Eintrag aus `nightQueue` entfernt; `buildNightQueue` überspringt Glöckner nach Einsatz
- Neue Felder in `room.game`: `silberschmied_protected`, `einsamerWolf_target`, `jack_target`, `jack_isWolf`, `gendarm_target`, `gendarm_used`, `gloeckner_used`, `diebOptions` — in beiden game-Initialisierungen
- `replacePlayerSocket` um neue Spieler-ID-Felder erweitert
- Nacht-Reset in `startNight`: `einsamerWolf_target`, `jack_target`, `gendarm_target` werden pro Nacht zurückgesetzt
- Frontend (game.html): Jack-Overlay (wildeskind-Overlay-CSS wiederverwendet)
- Frontend (game.js): `jack-transformed`-Handler, `role-changed`-Handler (Dieb), `einsamer-wolf` in game-over-Labels

## [2026-06-16] Narr implementiert

- Kein Nacht-Zug, passiv
- Darf nicht abstimmen/anklagen: `day-nominate` und `day-vote-cast` blockiert; in `startDayAccusation` als Überspringen vorregistriert
- `totalVoters` in Abstimmung um Narr (+ ggf. Händler-Away) reduziert (keine Doppelzählung wenn Narr selbst away)
- Narr-Immunität: wenn Narr die meisten Stimmen erhält → `narrSurvived = true`, Eliminierung gecancelt, eigene Meldung
- `narrSurvived` in `phase-changed` (day-result) übermittelt; Frontend zeigt "Der Narr überlebt — Narrenfreiheit!"
- Narr-Spieler sieht tagsüber "Du bist der Narr — du darfst nicht abstimmen." (showDayNoVote)
- Wölfe können Narr normal töten

## [2026-06-16] Katz und Maus implementiert

- Kein Nacht-Zug, passiv
- `pushCurrentGameState`: sendet `you-are-katz-maus { role, partnerName }` an Katze- und Maus-Spieler bei jedem (Re-)Connect
- Gewinnen normal mit den Dorfbewohnern (kein eigener Win-Check)
- Frontend: `katz-maus-panel` + `katz-maus-recall-btn` in game.html/css/js; amber-farbene Variante des love-panel

## [2026-06-16] Alter implementiert

- Passiver Effekt — kein Nacht-Zug
- `alter_lives: 2` in beiden Game-State-Initialisierungen (start-game, restart-game)
- `endNight`: Alter überlebt NUR einen direkten Wolfsangriff (`nightVictim === alterId`), still und ohne Meldung
- Hexe-Gift und Liebespaar-Kaskade töten ihn normal (auch mit 2 Leben)
- Reihenfolge: Händler-Schutz → Alter-Check → Liebespaar; stirbt sein Liebster, wird er danach re-added → stirbt
- Nur Erzähler-Nachtlog: "Alter überlebt Wolfsangriff (X Leben übrig, geheim)"
- Tagesabstimmung: stirbt sofort (normales Verhalten)

## [2026-06-16] Händler implementiert

- NIGHT_ORDER: Händler zwischen Seherin und Werwölfen eingetragen (select-one)
- Nacht: Händler wählt einen Spieler; dieser wird als `g.haendler_away` gespeichert
- Nachtauswertung: Away-Spieler wird aus `pendingDeaths` entfernt (Wolfsangriff + Hexengift)
- Sonderfälle: Wölfe greifen away-Spieler an → eigene Morgen-Meldung; Hexe vergiftet away-Spieler → eigene Meldung
- Taganklage: Away-Spieler wird vorab als Überspringen eingetragen; kann weder anklagen noch selbst angeklagt werden
- Tagesabstimmung: Away-Spieler ist blockiert (server-seitig); totalVoters für Trigger und Anzeige um 1 reduziert
- `awayPlayerId` in `phase-changed` (day-accusation, day-voting) an Clients übermittelt
- Frontend: Away-Spieler sieht "Du bist heute einkaufen" statt Anklage-/Abstimmungs-UI
- replacePlayerSocket: `g.haendler_away` wird bei Reconnect korrekt ersetzt

## [2026-06-16] Seherin: acknowledged-Bug behoben

- `processNightAction` view-Branch: ignoriert `{ acknowledged: true }` und leere targetId statt sie als neue Auswahl zu verarbeiten
- Verhindert, dass ein zweites view-result mit leeren Werten an die Seherin gesendet wird

## [2026-06-16] Auto-Fill: fehlende Karten mit Dorfbewohnern auffüllen

- `start-game` und `restart-game` füllen `selectedCards` vor `pickBalanced` mit 'Dorfbewohner' auf wenn weniger Karten als Spieler
- Werwolf-Pflicht bleibt: mindestens 1 Werwolf muss ausgewählt sein (sonst Fehlermeldung)
- Lobby: Startbutton aktiv sobald ≥1 Wolf gewählt (nicht mehr an Kartenanzahl gebunden)
- Lobby: Hinweistext "X fehlende Karten werden automatisch mit Dorfbewohnern aufgefüllt."

## [2026-06-17] Wildes Kind implementiert
- **server.js**: `wildesKind_idol` + `wildesKind_isWolf` im Spielzustand; `processNightAction` speichert Idol; `tryWildesKindTransform(code, room, deadId)` — wenn Idol stirbt: `wildesKind_isWolf = true`, `wildeskind-transform` an Spieler gesendet; aufgerufen in `startDay`, `endDay`, `hunter-shot`; `isWolf(room, id)` — zentraler Wolf-Check (WOLF_IDS + transformiertes Wildes Kind); `checkWinCondition` und `advanceNight` (kill/kill-wolf Target-Filter) nutzen `isWolf`; `startNight` fügt transformiertes Wildes Kind der Werwolf-Nachtrunde hinzu
- **game.js**: `wildeskind-transform`-Event — zeigt Overlay "Dein Idol ist gestorben — du bist jetzt ein Werwolf", aktualisiert Fraktions-Label auf der Karte
- **game.html**: `#wildeskind-overlay`
- **game.css**: `.wildeskind-overlay` (z-index 80, düsterer Grün-Ton)

## [2026-06-16] Ergebene Magd: Rollen-Reset bei Übernahme
- **server.js** `tryMagdTransform`: Wenn die Magd die Hexe übernimmt, werden `hexeUsedHeal` und `hexeUsedPoison` zurückgesetzt — sie hat beide Tränke frisch, unabhängig davon was die ursprüngliche Hexe verbraucht hat. (Alter, Glöckner, Gendarm: Reset folgt wenn diese Rollen implementiert werden.)

## [2026-06-16] Ergebene Magd implementiert
- **server.js**: NIGHT_ORDER — neue erste Nacht-Karte "Ergebene Magd" (actionType: select-one); `magd_herr` im Spielzustand; `tryMagdTransform(code, room, deadId)` — wenn der Herr stirbt, übernimmt die lebende Magd automatisch seine Rolle, emittiert `magd-transform` an sie; aufgerufen in `startDay` (Nacht-Tote), `endDay` (Tag-Eliminierung, vor Gewinncheck), `hunter-shot`-Handler (Schuss-Opfer); `processNightAction` speichert `g.magd_herr`; `replacePlayerSocket` aktualisiert `g.magd_herr` bei Reconnect
- **game.js**: `currentCardId` (veränderbar, für Rollen-Transformation); `openCardModal` nutzt `currentCardId` statt const `cardId`; `magd-transform`-Event — zeigt Overlay mit Herren-Name + neuer Rollenkarte, nach Bestätigung: Karte auf Hauptseite in-place aktualisiert
- **game.html**: `#magd-overlay` mit Herren-Name, Rollenbild, Fraktionsanzeige, Bestätigungs-Button
- **game.css**: `.magd-overlay` (z-index 80, goldener Akzent-Stil)

## [2026-06-16] Jäger-Rolle implementiert
- **server.js**: `findPlayerByRole(room, roleId)` — sucht Socket-ID per Rollenzuweisung
- **server.js**: `phase-advance` (night-summary) — prüft ob Jäger in den Nacht-Toten ist; wenn ja: `morning-partial-reveal` (nur Jäger-Karte), Phase → `hunter-night-shot`, `hunter-shoot` an Jäger mit möglichen Zielen
- **server.js**: `hunter-shot`-Handler — Jäger sendet Ziel; Nacht: `morning-full-reveal` + 2,5s → `startDay`; Tag: Gewinncheck, dann `day-result` mit `hunterShot`-Info
- **server.js**: `endDay` — wenn Jäger tagsüber eliminiert: Phase → `hunter-day-shot`, `hunter-shoot` an Jäger mit noch lebenden Spielern, alle sehen "Jäger schießt"-Meldung
- **narrator.js**: `PHASE_LABELS` um `hunter-night-shot` / `hunter-day-shot` erweitert; `updatePhaseCard` zeigt Jäger-Name + "muss jetzt schießen"; `updateButtons` versteckt Weiter-Taste während Jäger schießt; `showDayResult` zeigt optionalen `hunterShot`-Eintrag
- **game.js**: `morning-partial-reveal`-Event — dreht Jäger-Karte um, zeigt dramatischen Text; `morning-full-reveal` — dreht restliche Karten + Schuss-Opfer; `hunter-shoot`-Event — öffnet Hunter-Overlay für Jäger; `phase-changed hunter-day-shot` — zeigt Wartemeldung im Tages-Panel; `showDayWaitResult` zeigt Schuss-Opfer wenn vorhanden
- **game.html**: `#hunter-overlay` mit Ziel-Liste und "Erschießen"-Button
- **game.css**: `.hunter-overlay` (z-index 80, über Morgen-Overlay), `.morning-deaths__hunter` für dramatischen Jäger-Text

## [2026-06-16] Spielende: "Neue Karten" leitet zurück in die Lobby (selbe Spieler)
- **server.js**: `reset-to-lobby`-Event setzt Raum auf Lobby-Zustand zurück (Phase, Spieler-Ready, Karten-Anfragen); sendet jedem Spieler `back-to-lobby` mit Name, isHost, RaumCode; `rejoin-lobby`-Event reconnectet Spieler mit aktueller Socket-ID in bestehenden Raum
- **lobby.js**: `rejoin`-URL-Param erkannt → emittiert `rejoin-lobby` statt `create-room`/`join-room`; Guard für Doppel-Join funktioniert weiterhin
- **narrator.js/game.js**: `back-to-lobby`-Event leitet alle zu `/html/lobby.html?rejoin=CODE&name=NAME` weiter; Host bekommt zusätzlich `host=1`
- **narrator.html**: Button "Neue Karten →" (war "Neue Lobby →")

## [2026-06-16] Spielende: Neustart- und Neue-Lobby-Optionen
- **server.js**: `restart-game`-Event — neustart mit gleichen Karten (neu gemischt), selbe Spieler; `end-session`-Event — emittiert `session-ended` an alle und löscht den Raum
- **narrator.html/js**: Nach Spielende zwei Buttons sichtbar: "Nochmal spielen" und "Neue Lobby →"; Bugfix: `updateButtons` zeigte "Nacht beginnt →" bei `game-over` (nun korrekt versteckt); `game-started`-Handler leitet Erzähler zur narrator.html weiter; `session-ended`-Handler leitet zur Startseite
- **game.js**: `game-started`-Handler leitet Spieler zur game.html mit neuer Karte; `session-ended`-Handler leitet zur Startseite
- **narrator.css**: `.game-over-actions` mit Einblend-Animation

## [2026-06-16] Tagesrunde: Anklage + Abstimmung implementiert
- **Lobby**: "Max. Anklagen"-Einstellung (Host only, Standard 3, 1–10) in Footer; `set-max-accusations`-Event
- **server.js**: Neue Phasen `day-accusation` → `day-voting` → `day-result`; `startDay` ruft `startDayAccusation` auf; `day-vote`-Phase entfernt; neue Funktionen `startDayAccusation`, `processDayNominations`, `startDayVoting`, `processDayVotes`, `endDay`; neue Socket-Events `day-nominate`, `day-vote-cast`, `set-max-accusations`
- **narrator.js/html**: PHASE_LABELS für neue Phasen; Anklage/Abstimmungs-Fortschritt in Phase-Karte; Tag-Ergebnis-Modal mit "Nächste Nacht →"
- **game.js/html/css**: Tag-Panel (aus Boden hochfährt); Anklage-UI mit Spielerliste + Überspringen; Abstimmungs-UI mit Angeklagten-Liste + Bestätigen; Ergebnis-Text im Warte-Zustand; tote Spieler sehen kein Panel

## [2026-06-16] Morgenbildschirm + Nacht-Zusammenfassung implementiert
- `server.js` (`endNight`): sendet alle lebenden Spielernamen im `phase-changed night-summary`-Event
- `server.js` (`phase-advance`): emittiert `morning-reveal` mit Todesliste, ruft `startDay` mit 2,5s Verzögerung auf
- `narrator.js`: `narrator-update`-Handler öffnet nun das Zusammenfassungs-Modal wenn `phase === 'night-summary'` und `summary` vorhanden; totes `night-summary`-Handler entfernt
- `game.html`: neues `#morning-overlay`-Div mit Kartengrid und Todestextzeile
- `game.css`: Stile für `.morning-overlay`, `.morning-grid`, `.morning-card` (Flip-Animation, Name, Todesmarkierung)
- `game.js`: `phase-changed night-summary` zeigt Morgenbildschirm mit allen Karten (verdeckt); `morning-reveal` deckt tote Karten auf und zeigt Rollenbild; `phase-changed day-vote` blendet Morgenbildschirm aus

## [2026-06-16] Bugfix: "Wartet auf: X" verrät aktiven Spieler entfernt
- `game.js`: `night-waiting`-Handler zeigt kein `waitingFor` mehr — nur noch "Schließe deine Augen…"
- `server.js`: `waitingFor`-Feld aus dem `night-waiting`-Emit entfernt

## [2026-06-16] Bugfix: Aktive Rolle sieht Warteschirm + Karten-Peek-Button

### Bugfix: Aktive Rolle sieht "Schließe deine Augen" statt ihrer Aktion
- **Ursache**: `night-waiting` wurde per `io.to(code).emit(...)` an ALLE Spieler gesendet, auch den aktiven — das hat die kurz zuvor gesendete `your-night-turn`-Aktion überschrieben
- `backend/server.js`: `night-waiting`-Emit enthält jetzt zusätzlich `waitingFor` (Spielernamen als String) neben dem schon vorhandenen `activePlayers` (ID-Array)
- `frontend/js/game.js`: `night-waiting`-Handler prüft `activePlayers.includes(socket.id)` — ist man selbst aktiv, wird das Event ignoriert

### Feature: Karte während der Nacht ansehen
- `game.html`: Button `#night-card-peek` (oben-rechts auf dem Nacht-Overlay) hinzugefügt
- `game.js`: Button öffnet dasselbe Info-Modal wie der normale ℹ-Button (Rollenname + Beschreibung); gemeinsame `openCardModal()`-Funktion
- `game.css`: `.night-card-peek` — halbtransparenter Button, positioniert absolute oben-rechts

## [2026-06-16] Bugfix: Erzähler-Seite zeigt "Verbindung zum Raum fehlt"

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

## [2026-06-16] Werwölfe: Mehrheitsvote-System implementiert

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

## [2026-06-16] Hexe: Toggle-Confirm-Flow implementiert

### Frontend (frontend/js/game.js + game.html + game.css)
- Hexe-UI umgebaut von "Klick = sofort" auf "Wählen → Bestätigen":
  - "Heilen" toggelt `is-active`-Klasse (visuelles Feedback, kein sofortiger Emit)
  - "Vergiften…" klappt Zielliste ein/aus; Ziel-Klick selektiert (rückgängig durch erneutes Klicken auf "Vergiften")
  - "Bestätigen" sendet beides gemeinsam: `{ heal: true, poisonTargetId: '...' }` (beliebige Kombination)
  - "Nichts tun" sendet leeres Payload (kein Trank)
- `game.html`: `#witch-confirm`-Button + `witch-ui__actions`-Wrapper ergänzt; "Nichts tun" dorthin verschoben
- `game.css`: `.witch-btn--confirm`, `.witch-btn--heal.is-active`, `.witch-ui__actions` ergänzt
- `game.js`: `witchConfirm`-Referenz + `nightState.witchHealSelected`/`witchPoisonTarget` in Reset initialisiert

## [2026-06-16] Dorfmatratze vollständig implementiert + Hexe-Bugfixes

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

## [2026-06-16] Amor vollständig implementiert + Siegbedingungen

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

## [2026-06-16] Spielseite: Rollenname und Tab-Titel versteckt wenn Karte verdeckt
- Karte startet jetzt face-down (Rückseite sichtbar), Knopf = "Karte zeigen"
- Name und Fraktion unterhalb der Karte sind versteckt solange die Karte verdeckt ist
- Browser-Tab zeigt "Deine Rolle – Werwolf" solange Karte verdeckt; erst nach Aufdecken den Rollennamen
- Beim Zurückflip (Karte verdecken): Name/Fraktion wieder verstecken, Tab-Titel zurücksetzen

## [2026-06-16] Karten: Mindestauswahl statt Exaktauswahl, Balance-Auto-Reduktion
- `server.js`: `n = players.length - (narratorMode ? 1 : 0)` — Erzähler korrekt rausgerechnet
- `server.js`: Neue Funktion `pickBalanced(selectedCards, n)` — wählt zufällig genau `n` Karten aus der Auswahl; Werwölfe werden auf `floor(n/3)` gekappt, Rest wird mit zufälligen Dorfbewohnern aufgefüllt; gibt Fehlermeldung zurück falls unmöglich
- `server.js`: `selectedCards.length !== n` → `< n` (Mindest- statt Exaktprüfung)
- `server.js`: Requested-Card-Check prüft ob die gewünschte Karte im `picked`-Set ist (nicht nur in `selectedCards`)
- `lobby.js`: Counter `is-match` bei `>= total` statt `=== total`
- `lobby.js`: Warnung bei zu vielen Werwölfen zeigt jetzt Info statt Fehler: „X Werwölfe gewählt — zufällig werden Y davon genutzt"
- `lobby.js`: `cardOk` prüft `>= needed` statt `=== needed`

## [2026-06-16] Frontend nach Dateityp reorganisiert
- `frontend/` aufgeteilt in drei Unterordner: `css/`, `js/`, `html/`
- Alle 5 CSS-Dateien → `frontend/css/`
- Alle 7 JS-Dateien → `frontend/js/` (imports auf `/js/roles.js` aktualisiert)
- Alle 6 HTML-Dateien → `frontend/html/` (CSS/JS-Pfade auf absolute Pfade `/css/` und `/js/` aktualisiert)
- Seitenlinks in JS aktualisiert: `lobby.html` → `/html/lobby.html` etc.
- `backend/server.js`: Root `/` leitet auf `/html/index.html` weiter

## [2026-06-16] Bugfix: Spielleiter-Modus-Toggle für Mitspieler ausgeblendet
- `lobby.css`: `.narrator-toggle[hidden] { display: none; }` ergänzt — `display: flex` in der Klasse überschrieb das HTML-`hidden`-Attribut für Nicht-Host-Spieler

## [2026-06-16] Bugfix: Erzähler wird im Kartenzähler nicht mehr mitgezählt
- `lobby.js renderCards`: `total` zieht 1 ab wenn `narratorMode` aktiv → Zähler zeigt z.B. 4 statt 5
- `lobby.js updateFooter`: `needed = players.length - (narratorMode ? 1 : 0)` → "Spiel starten" wird erst aktiv wenn die richtige Anzahl Karten gewählt ist
- `lobby.js updateFooter`: `allReady` prüft nur Nicht-Host-Spieler (`p.isHost || p.isReady`), da Host im Erzähler-Modus keinen Bereit-Status hat

## [2026-06-16] Erzähler-Modus + Nacht-Spiellogik implementiert

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

## [2026-06-16] Bugfix: Spieler können jetzt alle Karten requesten (auch inaktive)
- `lobby.js`: `is-clickable` gilt jetzt für alle Karten (nicht nur ausgewählte); inaktive Karten ohne eigenen Request bleiben visuell gedimmt, sind aber klickbar
- `server.js`: Guard `!room.selectedCards.includes(cardId)` entfernt — Server akzeptiert Request auf jede Karte, nicht nur auf bereits ausgewählte


## [2026-06-16] Vollständige Raum-Logik implementiert

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

## [2026-06-16] Seitenwechsel-Reconnect fuer laufende Spiele repariert
- `backend/server.js`: `resume-game` Socket-Event ergaenzt; Spieler- und Erzaehler-Socket-IDs werden nach dem Wechsel von Lobby zu Spiel-/Erzaehlerseite ersetzt
- Disconnects werden 15 Sekunden verzoegert entfernt, damit normale Seitenwechsel den Raum nicht sofort zerstoeren
- Aktueller Spielzustand wird nach dem Reconnect erneut an Erzaehler oder Spieler gesendet
- `frontend/js/lobby.js`: Raumcode und bisherige Spieler-ID werden beim Wechsel auf `game.html`/`narrator.html` mitgegeben
- `frontend/js/narrator.js` und `frontend/js/game.js`: Zielseiten melden sich mit `resume-game` beim Server zurueck
- Root-`package.json` ergaenzt, damit `npm start` direkt im Projektordner das Backend startet
- README-Startanleitung auf den Root-Startbefehl aktualisiert
