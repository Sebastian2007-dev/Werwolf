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
