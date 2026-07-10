# Changelog: Spiel-Logik (Server)

## [2026-07-07 13:10] Großes Logik-Bugfixing + fehlende Rollen implementiert (server.js)

### Kritische Fixes
- **Glöckner:** stand in der Nacht-Reihenfolge NACH den Werwölfen — sein Läuten konnte die Wolfsrunde nie ausfallen lassen und die einmalige Fähigkeit wurde trotzdem verbraucht. Glöckner ist jetzt VOR den Werwölfen dran; Läuten entfernt die Wolfsrunde derselben Nacht (per Smoke-Test verifiziert).
- **Liebespaar:** Partner-Tod galt nur für Nacht-Tode. Neu: zentrale `applyDeath()`-Funktion mit Liebespaar-Kaskade + Rollen-Transformationen — greift jetzt auch bei Tages-Lynch, Jägerschuss und Spieler-Disconnect. Stirbt der Jäger als Liebespartner des Gelynchten, darf er ebenfalls schießen.
- **Disconnect-Deadlock:** Spieler, die das Spiel endgültig verlassen, blieben in `g.alive` — Anklage/Abstimmung konnten nie abschließen, Erzähler konnte Tag-Phasen nicht überspringen. Neu: `handleGameLeave()` behandelt den Spieler wie einen Tod (inkl. Kaskade), räumt offene Votes/Nominierungen/Night-Queue-Einträge auf, prüft Sieg und schaltet blockierte Phasen weiter.
- **Jäger-Phasen konnten ewig hängen:** `phase-advance` kennt jetzt `hunter-night-shot`/`hunter-day-shot` (Erzähler kann den Schuss überspringen), im Auto-Modus läuft ein 45s-Timeout. Gilt auch, wenn der Erzähler mitten in einer Jäger-Phase das Spiel verlässt.
- **Doppel-Advance:** Nach der Nachtauswertung gibt es eine Übergangsphase `morning-reveal` — Doppelklick auf „Weiter" startet den Tag nicht mehr doppelt. In der Nacht schaltet „Weiter" nur noch weiter, wenn die aktive Rolle fertig ist (Überspringen weiterhin via Skip).

### Rollen-Fixes (Abgleich mit roles.md)
- **Dieb:** darf jetzt auch „Dieb bleiben" (actionType optional). Nach Rollentausch wird der Rest der Nacht-Queue neu aufgebaut — die neue Rolle (z. B. Seherin, Werwolf) handelt noch in derselben Nacht statt erst ab Nacht 2.
- **Händler:** Der Einkaufende ist jetzt wirklich unantastbar — die Schutz-Löschung läuft NACH allen Todesquellen (Einsamer Wolf, Gendarm, Jack, Liebespaar-Kaskade) statt davor; auch der Jäger kann ihn nicht mehr erschießen.
- **Alter:** 2-Leben-Regel generalisiert — jede Nacht-Todesquelle (Wolfsangriff, Gift, Gendarm, Dorfmatratzen-Tod) kostet ein Leben; mehrere Quellen in einer Nacht können beide Leben nehmen. Abstimmungstod bleibt sofort tödlich.
- **Einsamer Wolf:** Dorfsieg ist blockiert, solange der Einsame Wolf lebt (vorher gewann das Dorf sofort, wenn er den letzten Werwolf tötete — er konnte praktisch nie gewinnen).
- **Jekyll & Hyde (NEU implementiert):** wechselt jede Nacht die Seite (ungerade Nächte Jekyll/Dorf, gerade Nächte Hyde/Wolf). Als Hyde jagt und stimmt er mit dem Rudel (inkl. Wolf-Chat), zählt für Siegbedingung und Bär als Werwolf. Spieler wird jede Nacht per `jekyll-state` informiert.
- **Bär (NEU implementiert):** Zu Tagesbeginn wird der Sitzkreis (Beitrittsreihenfolge der lebenden Spieler) geprüft — sitzt ein Werwolf neben dem Bären, „brummt" es für alle (`baer-growl` + Event-Log).
- **Zigeunerin (NEU implementiert):** Wird sie angeklagt (kommt in die Anklage-Liste), stirbt sie sofort. In der folgenden Nacht darf sie (als Tote) einen Werwolf verfluchen, der mit ihr stirbt. Interpretation von roles.md dokumentiert — bei Bedarf anpassen.
- **Werwolf-Transformationen:** Wildes Kind / Jack / Hyde werden jetzt über `addTransformedWolves()` in die Wolfsrunde eingefügt — auch wenn kein „geborener" Werwolf mehr lebt (Eintrag wird neu erzeugt statt still auszufallen).

### Weitere Fixes
- Wolf-Voting setzt im Auto-Modus den 40s-Auto-Skip-Timer zurück (aktiv abstimmende Wölfe wurden vorher übersprungen).
- Reconnect: Ziel-Listen laufen über den gemeinsamen Helper `buildNightTargetsFor()` — Wölfe sahen nach Reconnect Rudelmitglieder als Ziele, Dieb/Glöckner/Einsamer Wolf bekamen falsche Listen. Jäger erhält nach Reconnect seine Schuss-Aufforderung erneut; Liebespaar- und Jekyll-Status werden erneut gesendet.
- `replacePlayerSocket`: mappt jetzt auch Tages-Nominierungen/-Votes, Anklage-Liste und Zigeunerin-Ziel auf die neue Socket-ID um.
- Tages-Tode (Zigeunerin, Liebespartner, Jägerschuss-Opfer) erhalten sofort `you-are-dead` (Zuschauermodus) und erscheinen als `alsoDied` im Tagesergebnis.
- Tally-Auswertung (Nominierung + Abstimmung) ignoriert Stimmen auf inzwischen tote Spieler.
- Mindestens 3 Mitspieler OHNE Erzähler nötig (vorher konnte mit Erzähler ein 2-Spieler-Spiel ohne Werwölfe entstehen).
- Amor darf sich selbst ins Liebespaar aufnehmen (roles.md verbietet es nicht, Standard-Regel erlaubt es).
- Doppelter Game-State-Block (start/restart) zu `freshGameState()` dedupliziert; Spielende zentral in `endGame()`.

### Verifikation
- `node --check` auf allen geänderten Dateien.
- End-to-End-Smoke-Test (4 Bots, Auto-Modus): Nacht 1 (Seherin, Wolf-Vote+Bestätigung, Hexe) → Morgen → Anklage → Abstimmung → Lynch → Siegbedingung. PASS.
- Glöckner-Smoke-Test: Läuten in Nacht 1 → keine Wolfsrunde in derselben Nacht. PASS.

### Bekannte offene Punkte / Interpretationen
- Amor-Siegbedingung: roles.md sagt unklar „als letzte 4 Personen" — implementiert ist Sieg als letzte 2 Überlebende.
- Katz & Maus: kennen einander weiterhin von Spielbeginn an (roles.md „müssen versuchen sich gegenseitig auszuwählen" hätte auch eine Such-Mechanik sein können) — keine eigene Mechanik implementiert.
- Einsamer Wolf + 0 Werwölfe: Spiel läuft als reines Lynch-Spiel weiter, bis er stirbt (Dorfsieg) oder allein übrig ist (Solo-Sieg).

## [2026-07-09 11:40] Computer-Spieler (Bots)
- Der Host kann in der Lobby über "+ Computer-Spieler" Bots hinzufügen (max. 20 Spieler pro Raum); entfernen über den ✕-Knopf wie beim Kicken
- Bots erscheinen als "🤖 Name" (deutscher Namenspool), sind immer bereit und zählen für die Mindestspielerzahl
- backend/server.js, neuer Abschnitt "Bot players": Bots sind normale room.players-Einträge mit isBot: true und ID ohne Socket (io.to(botId) ist ein No-Op); der Server handelt für sie mit Zufalls-Verzögerungen (1,5–4,5 s)
- Nacht-KI: alle Rollen abgedeckt — Seherin/Dorfmatratze/Amor/Magd/Wildes Kind/usw. wählen zufällige Ziele, Hexe heilt zu 50 % und vergiftet zu 15 %, Glöckner läutet zu 20 %, Gendarm verhaftet zu 15 %, Dieb tauscht zu 50 %
- Werwolf-Bots: schließen sich per scheduleBotWolfSync dem führenden Kandidaten an und bestätigen die Mehrheit — funktioniert rein unter Bots und gemischt mit menschlichen Wölfen (Bots folgen der menschlichen Stimme)
- Tag-KI: Bots klagen zu 60 % an (Werwolf-Bots schonen das Rudel) oder überspringen, stimmen über Angeklagte ab (Wolf-Bots bevorzugen Nicht-Wölfe); Bot-Jäger schießt nach kurzer Pause auf ein Zufallsziel
- Anklage-/Abstimmungslogik aus den Socket-Handlern in castDayNomination/castDayVote extrahiert (von Mensch und Bot gemeinsam genutzt)
- Schutzregeln: Bots können nicht Erzähler werden; Host-Rolle geht bei Disconnect nie an einen Bot; ein Raum nur mit Bots wird aufgelöst; Bot-Timer werden bei Spielende/Reset/Raumauflösung aufgeräumt
- Getestet: komplettes Auto-Spiel mit 1 Mensch + 6 Bots lief bis zum Dorfbewohner-Sieg durch (Amor, Wolfsvotum, Hexe, Anklagen, Abstimmungen, Siegbedingung)

## [2026-07-09 12:00] Tag-Abstimmung überarbeitet: Stichwahl, Transparenz, Kontext
- Stichwahl bei Gleichstand: Endet der erste Wahlgang mit Patt an der Spitze, folgt automatisch eine Stichwahl zwischen den Erstplatzierten (einmalig — endet auch sie im Patt, stirbt niemand). Vorher passierte bei Gleichstand einfach gar nichts.
- server.js: processDayVotes erkennt das Patt und ruft startDayVoting(code, room, runoff=true) mit den punktgleichen Kandidaten erneut auf; g.dayRunoff verhindert Endlosschleifen; Ereignislog-Einträge für Stichwahl und Stichwahl-Patt
- Angeklagten-Liste mit Kontext: Jeder Kandidat zeigt jetzt, wie oft er angeklagt wurde (in der Stichwahl: seine Stimmen aus dem 1. Wahlgang)
- day-result enthält jetzt voteResult (Stimmverteilung mit Namen) und wasRunoff — Spieler und Erzähler sehen das Abstimmungsergebnis im Detail
- Bots nehmen automatisch an der Stichwahl teil (scheduleBotDayVotes läuft bei jedem Wahlgang)
- Getestet: deterministischer 4-Spieler-Test (2:2-Patt → Stichwahl → 4:0-Eliminierung) plus komplettes Bot-Spiel als Regression, in dem zufällig eine echte Stichwahl auftrat

## [2026-07-09 12:35] Zuschauer-Modus für tote Spieler repariert
- Bugfix (Race-Condition): Nacht-Tote wurden nie Zuschauer. Der Client meldete sich beim Morgen-Screen per join-spectator an, aber der Server entfernte die Toten erst 2,5 s später aus g.alive (startDay) — die Anmeldung wurde deshalb stillschweigend verworfen und das Ereignisprotokoll blieb für immer leer.
- Fix 1: startDay trägt Nacht-Tote jetzt serverseitig direkt in g.spectators ein und sendet ihnen you-are-dead (vorher fehlte beides bei Nacht-Toden komplett)
- Fix 2: applyDeath (Tages-Tode, Jäger-Schuss, Liebespaar) trägt Tote ebenfalls sofort in g.spectators ein
- Fix 3: join-spectator akzeptiert auch Spieler in pendingDeaths und sendet sofort einen Schnappschuss (Phase, Events, Spielerliste) — kein Warten mehr auf das nächste Ereignis
- Bots werden nicht in g.spectators aufgenommen
- Getestet: 4-Spieler-Test — Nacht-Opfer erhält you-are-dead, wird Zuschauer und empfängt sofort Events + Rollenliste

## [2026-07-09 21:00] Game-Over-Auflösung + namentliche Anklagen/Stimmen

- **Auflösung am Spielende:** `game-over` enthält jetzt `reveal` mit allen Spielern (Name, Rolle, Kartenbild, tot/lebendig, Wolf-Status, Liebespaar) und `notes` mit Sonderereignissen; gesammelt in `g.reveals` bei: Amor (Liebespaar), Ergebene Magd (Rollenübernahme), Wildes Kind (Wolf-Mutation), Jack the Ripper (Wolf-Mutation), Dieb (Rollentausch)
- Client (`game.js`/`game.html`/`game.css`): Game-Over-Overlay zeigt Karten-Grid aller Spieler mit Badges (☠ tot, ❤ Liebespaar, 🐺 verwandelter Wolf) plus Ereignis-Liste; Box scrollbar für große Runden
- **Namentliche Abstimmungen:** `day-accusation-update` und `day-vote-update` senden `pairs` (wer → wen, null = überspringt/enthält sich); Erzähler bekommt sie in `progress.pairs`
- Client: neue Live-Liste im Tag-Panel („Anklagen" / „Stimmen") für alle Spieler sichtbar, auch im Warte-Zustand; Erzähler-Ansicht zeigt die Paare unter dem Fortschritt
- Getestet: automatisierter E2E-Lauf (4 Clients, komplette Runde bis Dorfsieg) — 11/11 bestanden

## [2026-07-10 00:15] Reload mitten im Spiel repariert (Reconnect stellt volle UI wieder her)

- Problem: Nach einem Seiten-Reload schickte der Server nur ein nacktes `phase-changed {phase, round}` — dem Client fehlten Spielerlisten, Angeklagte, Stimmenstände etc., daher blieb die Phasen-UI leer, der eigene Zug verschwand und Werwölfe sahen ihren Abstimmungsstand nicht mehr
- `pushCurrentGameState` rekonstruiert jetzt den kompletten Live-Zustand je Phase:
  - Nacht: `phase-changed` (Atmosphäre/Runde) + eigener Zug; bei der Wolfsrunde zusätzlich `wolf-vote-update` mit aktuellem Stimmenstand inkl. eigener Stimme; Wartende bekommen `night-waiting` mit aktiver Gruppe
  - Anklage-Phase: Spielerliste, max. Anklagen, bisherige namentliche Anklagen (`day-accusation-update`), `day-nomination-done` falls schon angeklagt
  - Abstimmung: Angeklagte mit Anklage-Zahlen (Stichwahl-bewusst), bisherige Stimmen, `day-vote-done` falls schon gewählt
  - Morgen/Ergebnis: `night-summary` mit Spielerliste (+ `morning-reveal`-Nachreichung), `day-result` mit Eliminiertem/Stimmverteilung
  - Spielende: `game-over` samt Auflösung wird gespeichert (`g.gameOverPayload`) und Reconnects (auch Erzähler/Tote) erneut zugestellt
- Client (`game.js`): `dayAlive` wird zentral aus jeder mitgelieferten Spielerliste abgeleitet (ging beim Reload verloren und blockierte Abstimmungs-/Ergebnis-UI); `showDayWaitResult` blendet das Tag-Panel selbst ein
- Getestet: E2E-Reload-Test (Wolf lädt während Abstimmung neu und kann weiterwählen; Spieler lädt am Tag neu und kann anklagen; Reload nach Spielende zeigt Auflösung) — 8/8 bestanden

## [2026-07-10 01:15] Handy-Reload repariert: veraltete Spieler-ID + zu kurze Karenzzeit

- Ursache: Die Spielseite nahm die Spieler-ID für den Resume aus der URL. Am Handy baut der Browser die Socket-Verbindung aber ständig neu auf (Bildschirm aus, App-Wechsel) — der Server kennt den Spieler dann unter einer neuen ID, die URL veraltet. Ein Seiten-Reload schickte die alte ID → `resume-error` → Client blieb stumm auf leerer Seite
- `game.js`: aktuelle ID wird bei jedem `resume-ok` in `sessionStorage` UND in der URL nachgeführt; beim Laden hat der sessionStorage-Stand Vorrang (raum-gebunden); `lobby.js` legt die ID beim Spielstart ebenfalls ab, `narrator.js` führt sie bei `resume-ok` nach
- Neuer `resume-error`-Handler: sichtbare Meldung + Weiterleitung zur Startseite statt stummem Hängen
- `server.js`: Karenzzeit bei Verbindungsabbruch im laufenden Spiel von 15 s auf 60 s erhöht (Lobby bleibt 15 s) — vorher galt ein kurzer App-Wechsel am Handy als endgültiges Verlassen (= Tod des Spielers)
- Regression: Reload-E2E-Test weiterhin 8/8 bestanden

## [2026-07-10 01:45] Rückkehr auch nach langem Verbindungsabbruch möglich

- Problem: Handys frieren Hintergrund-Tabs ein (Bildschirm aus, App-Wechsel) — beim Zurückkehren lädt Chrome die Seite neu, aber der Server hatte den Spieler nach Ablauf der Karenzzeit ENDGÜLTIG aus `room.players` entfernt → `resume-error` → zurück zur Startseite, kein Weg zurück ins Spiel
- Im laufenden Spiel werden getrennte Spieler jetzt nicht mehr entfernt, sondern nur als `isConnected: false` markiert: spielmechanisch sterben sie weiterhin (`handleGameLeave`, damit keine Phase blockiert), bleiben aber im Raum und können jederzeit per Reload als Geist zurückkehren; in der Lobby wird wie bisher entfernt
- Raum-Aufräumen jetzt über „kein Mensch mehr verbunden" statt „keine Menschen mehr in der Liste"; Host-Übergabe geht an den ersten verbundenen Menschen (alter Host verliert das Flag); `resume-game`/`rejoin-lobby` setzen `isConnected` zurück
- Nebeneffekt: Namen getrennter Spieler bleiben für Ereignisprotokoll und Spielende-Auflösung erhalten
- Karenzzeiten per Env übersteuerbar (`GRACE_GAME_MS`, Standard 60 s / `GRACE_LOBBY_MS`, Standard 15 s) — genutzt vom neuen E2E-Test „Rückkehr nach Karenzzeit" (3/3 bestanden; Reload- und Host-Transfer-Tests weiterhin grün)

## [2026-07-10 09:20] Intelligente Bots: Gedächtnis, Persönlichkeiten, Schlauheitsgrad (server.js)

### Bot-Gedächtnis (`g.botMemory`)
- Jeder Bot merkt sich Fakten wie ein menschlicher Spieler: `knownWolves` (sicher Werwolf), `cleared` (sicher unschuldig), `seen` (Seherin: bereits angesehen) und einen `suspicion`-Zähler pro Mitspieler.
- **Wissensquellen privat:** Seherin-Bot speichert jedes Kartenergebnis; Hexen-Bot lernt aus dem genannten Wolfsopfer, dass es kein Werwolf sein kann (sieht dasselbe wie ein Mensch — inkl. verstecktem Opfer bei geschützter Dorfmatratze via `buildWitchExtra`).
- **Wissensquellen öffentlich (alle Bots):** von der Hexe gerettetes Opfer und Silberschmied-Überlebender gelten als geklärt; Wähler eines enttarnten Unschuldigen werden verdächtiger, Wähler eines enttarnten Werwolfs vertrauenswürdiger; wer einen (für den Bot) Geklärten anklagt, macht sich verdächtig.
- **Vergessen:** Zu Nachtbeginn (`botMemoryNightlyForget`) verliert jeder Bot pro Fakt mit einer vom Schlauheitsgrad abhängigen Chance sein Wissen; Verdacht verblasst schrittweise. Liebespartner/Katz-und-Maus-Partner werden nie vergessen (on-the-fly via `botBondedIds`).
- Reconnect-sicher: `replacePlayerSocket` zieht Spieler-IDs in allen Bot-Gedächtnissen nach.

### Persönlichkeiten (`BOT_PERSONALITIES`)
- Jeder Bot bekommt bei Erstellung zufällig eine von vier Persönlichkeiten: **aggressiv** (klagt viel an, setzt Fähigkeiten schnell ein), **zurückhaltend** (klagt selten an, spart Fähigkeiten), **Mitläufer** (springt auf laufende Anklagen auf, stimmt für den Führenden), **ausgewogen**.
- **Herr/Idol-Verrat als Strategie:** Ergebene Magd und Wildes Kind schonen ihren Herrn/ihr Idol normalerweise — mit persönlichkeitsabhängiger `betrayChance` klagen sie ihn aber absichtlich an, um die Rolle zu erben bzw. zum Werwolf zu werden.
- Persönlichkeit wird in der Lobby als Tag am Bot angezeigt.

### Schlauheitsgrad (Host-Einstellung, `set-bot-intelligence`)
- 3 Stufen: **Einfach** (Bots nutzen Wissen selten, vergessen viel), **Normal**, **Schlau** (nutzen Wissen fast immer, vergessen kaum). Steuert `useChance` pro Entscheidung und die nächtliche `forgetChance`.

### Neue Entscheidungslogik (statt purem Zufall)
- **Seherin:** sieht niemanden doppelt an, bevorzugt Verdächtige, meidet bereits Geklärte.
- **Hexe:** heilt sich selbst und ihren Liebespartner immer; heilt Geklärte bevorzugt; vergiftet bekannte Werwölfe gezielt, sonst den Verdächtigsten — nie Partner oder Geklärte (wenn schlau).
- **Gendarm:** verhaftet fast nur noch bei sicherem Wissen über einen Werwolf (vorher: 15 % Zufallsverhaftung = meist Selbstmord).
- **Schutzrollen** (Dorfmatratze, Silberschmied, Händler, Magd, Wildes Kind): wählen vertrauenswürdige Ziele statt zufälliger.
- **Anklage/Abstimmung:** bekannte Werwölfe werden zielsicher angeklagt/gewählt; Partner, Rudel (bei Wolf-Bots) und Geklärte werden verschont; Mitläufer folgen der Menge.
- **Jäger:** schießt auf den Verdächtigsten statt blind — nie auf den eigenen Partner.
- Zufallsrauschen in allen Bewertungen hält Bots unberechenbar; per Smoke-Test (Host + 7 Bots, volles Spiel bis Wolfssieg) verifiziert.

## [2026-07-10 09:45] Bot-Gedächtnis: Wichtigkeitsgrad pro Erinnerung
- Jeder gemerkte Fakt trägt jetzt eine Wichtigkeit (0..1); die nächtliche Vergessen-Chance skaliert mit `forgetChance * (1 - Wichtigkeit)` — je wichtiger, desto unwahrscheinlicher wird vergessen (`MEM_IMPORTANCE`).
- Stufen: Seherin enttarnt Werwolf **0.95** (brennt sich ein), Seherin sieht Unschuldigen / Hexe kennt Wolfsopfer **0.75**, „schon angesehen" **0.6**, öffentlich Geklärte (Heilung, Silberschmied) **0.5**; Verdachtspunkte („X klagte Y an") bleiben die unwichtigste Stufe und verblassen wie bisher am schnellsten.
- Wird ein Fakt erneut gelernt, bleibt die höchste Wichtigkeit erhalten (`memRemember`).
- Umsetzung: Gedächtnis-Sets → Maps (`playerId → Wichtigkeit`); neuer Helper `replaceKeyInMap` hält Reconnect-IDs inkl. Wichtigkeit aktuell.
- Verifiziert: Monte-Carlo-Test der Vergessenskurve (Stufe „Einfach", 3 Nächte: Wolfs-Sichtung überlebt zu 93 %, öffentliche Klärung zu 47 %) + voller Smoke-Test (Host + 7 Bots bis Spielende).
