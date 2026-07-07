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
