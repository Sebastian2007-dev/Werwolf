# Code Guide für ein Webbrowser-Spiel

## 1. Ziel des Guides

Dieser Guide legt allgemeine Regeln für einen übersichtlichen, wartbaren und gut lesbaren Code fest.

Die wichtigsten Ziele sind:

- klare Trennung von HTML, CSS und JavaScript
- einheitliche Benennung
- kleine und verständliche Komponenten
- geringe Abhängigkeiten zwischen Systemen
- nachvollziehbare Spiellogik
- einfache Erweiterbarkeit
- möglichst wenig doppelter Code
- verständliche Kommentare und Dokumentation

---

# 2. Grundprinzipien

## 2.1 Eine Aufgabe pro Bereich

Jeder Bereich übernimmt nur die Aufgaben, für die er vorgesehen ist.

### HTML

HTML beschreibt:

- Struktur
- Inhalte
- Bedienelemente
- Container
- semantische Gliederung

HTML enthält keine Spiellogik und möglichst keine Darstellungsvorgaben.

### CSS

CSS beschreibt:

- Farben
- Abstände
- Größen
- Positionierung
- Animationen
- Zustände
- responsive Darstellung

CSS enthält keine Spiellogik.

### JavaScript

JavaScript beschreibt:

- Verhalten
- Spielregeln
- Berechnungen
- Zustandsänderungen
- Benutzerinteraktionen
- Speichern und Laden
- dynamische Inhalte

---

## 2.2 Verantwortlichkeiten trennen

Jede Komponente, Funktion oder Klasse sollte möglichst nur eine klar erkennbare Verantwortung besitzen.

Beispiel:

```text
Eingabe erkennen
→ Aktion bestimmen
→ Spielzustand verändern
→ Darstellung aktualisieren
```

Diese Schritte sollten nicht unnötig in einer einzigen großen Funktion vermischt werden.

---

## 2.3 Abhängigkeiten gering halten

Ein System sollte möglichst wenig über andere Systeme wissen.

Beispiel:

```text
Spielsystem meldet:
"Ressource wurde verändert"

Benutzeroberfläche reagiert:
"Anzeige aktualisieren"

Speichersystem reagiert:
"Änderung für später vormerken"
```

Das Spielsystem sollte nicht direkt für Darstellung und Speicherung verantwortlich sein.

---

# 3. Trennung von HTML, CSS und JavaScript

## 3.1 Keine Inline-Styles

Darstellungsvorgaben gehören in CSS.

Nicht empfohlen:

```text
HTML-Element enthält direkte Angaben zu Farbe, Größe oder Position.
```

Empfohlen:

```text
HTML-Element erhält eine Klasse.
CSS definiert die Darstellung dieser Klasse.
```

---

## 3.2 Keine Inline-Events

Interaktionen gehören in JavaScript.

Nicht empfohlen:

```text
Button enthält direkt den auszuführenden JavaScript-Befehl.
```

Empfohlen:

```text
Button besitzt eine eindeutige Kennzeichnung.
JavaScript registriert die passende Aktion.
```

---

## 3.3 Keine Spiellogik im HTML

HTML darf keine Spielwerte berechnen oder verändern.

Pseudocode:

```text
HTML:
    zeigt eine Ressourcenanzeige

JavaScript:
    berechnet den Ressourcenwert
    aktualisiert die Anzeige
```

---

## 3.4 Keine Darstellungsvorgaben in JavaScript

JavaScript sollte möglichst keine Farben, Abstände oder festen Layoutwerte setzen.

Pseudocode:

```text
wenn Element aktiv:
    Klasse "aktiv" hinzufügen

wenn Element inaktiv:
    Klasse "aktiv" entfernen
```

CSS entscheidet anschließend, wie der aktive Zustand aussieht.

---

# 4. Einheitliche Benennung

## 4.1 Allgemeine Regeln

Namen sollten:

- verständlich
- eindeutig
- beschreibend
- nicht unnötig kurz
- einheitlich geschrieben

sein.

Nicht empfohlen:

```text
x
tmp
obj
data2
test
thing
value1
```

Besser:

```text
playerPosition
selectedBuilding
resourceAmount
currentLevel
availableActions
```

---

## 4.2 Variablen

Variablen beschreiben, welche Daten sie enthalten.

Beispiele:

```text
currentHealth
maximumHealth
selectedItem
availableResources
playerPosition
```

---

## 4.3 Funktionen

Funktionen beschreiben eine Tätigkeit.

Beispiele:

```text
startGame
pauseGame
calculateDamage
createBuilding
removeEntity
updateInterface
saveProgress
```

---

## 4.4 Boolean-Werte

Boolean-Namen sollten wie eine Frage lesbar sein.

Beispiele:

```text
isRunning
isVisible
hasEnoughResources
canBeUpgraded
shouldShowTutorial
```

---

## 4.5 Klassen und Systeme

Klassen und größere Systeme verwenden eindeutige Substantive.

Beispiele:

```text
GameState
InputManager
SaveSystem
AudioManager
BuildingController
```

---

## 4.6 Konstanten

Feste Werte sollten als Konstanten erkennbar sein.

Beispiele:

```text
MAXIMUM_LEVEL
DEFAULT_SPEED
SAVE_VERSION
AUTO_SAVE_INTERVAL
```

---

# 5. Einheitliche Formatierung

## 5.1 Einrückung

Im gesamten Projekt wird nur eine Einrückungsart verwendet.

Empfehlung:

```text
4 Leerzeichen pro Ebene
```

Tabs und Leerzeichen sollten nicht gemischt werden.

---

## 5.2 Zeilenlänge

Sehr lange Zeilen sollten aufgeteilt werden.

Empfehlung:

```text
ungefähr 80 bis 120 Zeichen pro Zeile
```

---

## 5.3 Leerzeilen

Leerzeilen trennen logisch zusammengehörige Bereiche.

Beispiel:

```text
Eingaben prüfen

Daten verarbeiten

Ergebnis zurückgeben
```

Zu viele Leerzeilen sollten vermieden werden.

---

## 5.4 Einheitliche Schreibweise

Im gesamten Projekt sollte dieselbe Schreibweise verwendet werden.

Beispiele:

```text
JavaScript:
    camelCase für Variablen und Funktionen
    PascalCase für Klassen
    UPPER_SNAKE_CASE für feste Konstanten

CSS:
    kebab-case für Klassen und IDs
```

---

# 6. Funktionen

## 6.1 Eine Funktion, eine Aufgabe

Eine Funktion sollte möglichst nur eine Hauptaufgabe ausführen.

Nicht empfohlen:

```text
Funktion:
    prüft Ressourcen
    verändert Spielwerte
    erstellt Benutzeroberfläche
    spielt Sound ab
    speichert Spielstand
```

Besser:

```text
Prüffunktion
Änderungsfunktion
Darstellungsfunktion
Soundfunktion
Speicherfunktion
```

---

## 6.2 Kleine Funktionen

Funktionen sollten kurz genug sein, um schnell verstanden zu werden.

Eine Funktion sollte aufgeteilt werden, wenn sie:

- mehrere unabhängige Aufgaben besitzt
- viele Verschachtelungen enthält
- schwer benennbar ist
- sehr viele Parameter benötigt
- nur mit langen Kommentaren verständlich wird

---

## 6.3 Frühzeitige Rückgaben

Ungültige Zustände sollten früh abgefangen werden.

Pseudocode:

```text
Funktion verbessernGebäude:

    wenn kein Gebäude vorhanden:
        abbrechen

    wenn Gebäude zerstört:
        abbrechen

    wenn Ressourcen nicht ausreichen:
        abbrechen

    Verbesserung durchführen
```

Dies verhindert unnötig tiefe Verschachtelungen.

---

## 6.4 Wenige Parameter

Funktionen sollten möglichst wenige Parameter besitzen.

Bei vielen zusammengehörigen Werten sollte ein Parameterobjekt verwendet werden.

Pseudocode:

```text
erstelleEinheit({
    typ,
    position,
    gesundheit,
    geschwindigkeit
})
```

---

## 6.5 Rückgabewerte

Funktionen sollten verständliche Rückgabewerte besitzen.

Beispiele:

```text
true oder false
berechneter Wert
erstelltes Objekt
Ergebnisobjekt mit Status und Grund
```

Pseudocode:

```text
Ergebnis:
    erfolgreich: false
    grund: "nicht genügend Ressourcen"
```

---

## 6.6 Seiteneffekte begrenzen

Eine Funktion sollte nicht unerwartet globale Werte verändern.

Bevorzugt:

```text
Eingabe erhalten
Ergebnis berechnen
Ergebnis zurückgeben
```

Nur Funktionen, deren Aufgabe ausdrücklich eine Zustandsänderung ist, sollten Daten verändern.

---

# 7. Spielzustand

## 7.1 Eine zentrale Datenquelle

Jeder wichtige Spielwert sollte nur eine eindeutige Quelle besitzen.

Nicht empfohlen:

```text
Goldwert im Spielzustand
Goldwert im HTML
Goldwert in einer zusätzlichen globalen Variable
```

Empfohlen:

```text
Goldwert existiert im Spielzustand.
Die Benutzeroberfläche zeigt diesen Wert nur an.
```

---

## 7.2 Zustand und Darstellung trennen

Der Spielzustand darf nicht von sichtbaren HTML-Texten abhängig sein.

Pseudocode:

```text
Spielzustand:
    gold = 100

Darstellung:
    zeige gold an
```

Nicht:

```text
Lese Gold aus dem sichtbaren Text aus
und verwende den Text als Spielwert
```

---

## 7.3 Zustandsänderungen kontrollieren

Spielwerte sollten nicht beliebig an vielen Stellen verändert werden.

Empfohlen:

```text
addResource
removeResource
damagePlayer
healPlayer
upgradeBuilding
```

Diese Aktionen bilden kontrollierte Wege, den Zustand zu verändern.

---

## 7.4 Unveränderliche Daten

Daten, die während des Spiels nicht verändert werden, sollten als unveränderlich behandelt werden.

Beispiele:

```text
Gebäudedefinitionen
Itemtypen
Grundwerte
Schwierigkeitsstufen
Konfigurationen
```

---

# 8. Daten und Spiellogik trennen

Statische Spieldaten sollten nicht direkt in Berechnungen verstreut sein.

Beispiele für statische Daten:

- Gebäudekosten
- Namen
- Beschreibungen
- Produktionswerte
- Einheitenwerte
- Levelanforderungen
- Balancing-Werte

Pseudocode:

```text
Gebäudedaten:
    name
    kosten
    produktion
    maximalesLevel

Spiellogik:
    liest Gebäudedaten
    prüft Bedingungen
    führt Aktion aus
```

---

# 9. Benutzeroberfläche

## 9.1 Darstellung nur bei Änderungen aktualisieren

Nicht jede Anzeige muss ständig vollständig neu aufgebaut werden.

Empfohlen:

```text
wenn Ressource verändert:
    zugehörige Anzeige aktualisieren

wenn Auswahl verändert:
    Auswahlbereich aktualisieren
```

---

## 9.2 Wiederverwendbare Komponenten

Wiederkehrende Elemente sollten nach denselben Regeln aufgebaut sein.

Beispiele:

- Buttons
- Karten
- Dialogfenster
- Ressourcenanzeigen
- Tooltips
- Listen
- Fortschrittsanzeigen

---

## 9.3 Zustände über Klassen darstellen

Zustände sollten über CSS-Klassen sichtbar gemacht werden.

Beispiele:

```text
is-active
is-hidden
is-selected
is-disabled
has-error
has-warning
```

---

## 9.4 Semantische Elemente verwenden

HTML-Elemente sollten ihrer Bedeutung entsprechend gewählt werden.

Beispiele:

```text
button für Aktionen
nav für Navigation
main für Hauptinhalt
section für Inhaltsbereiche
dialog für Dialoge
form für Eingaben
```

---

## 9.5 Barrierefreiheit

Bedienelemente sollten:

- mit der Tastatur erreichbar sein
- klare Beschriftungen besitzen
- sichtbare Fokuszustände haben
- nicht nur über Farben verständlich sein
- verständliche Rückmeldungen geben

---

# 10. CSS-Regeln

## 10.1 Wiederverwendbare Klassen

Darstellung sollte über wiederverwendbare Klassen aufgebaut werden.

Beispiele:

```text
button
button--primary
button--danger
panel
panel--compact
resource-display
```

---

## 10.2 Geringe Selektor-Spezifität

Sehr lange und stark verschachtelte Selektoren sollten vermieden werden.

Nicht empfohlen:

```text
Seite > Bereich > Liste > Karte > Überschrift > Text
```

Besser:

```text
building-card__title
```

---

## 10.3 CSS-Variablen

Wiederkehrende Werte sollten zentral definiert werden.

Beispiele:

```text
Farben
Abstände
Schriftgrößen
Rahmenradien
Schatten
Animationszeiten
Ebenen
```

---

## 10.4 Keine unnötigen Sonderfälle

Eine Komponente sollte möglichst über Varianten statt über viele Einzelfall-Regeln angepasst werden.

Beispiel:

```text
button
button--primary
button--secondary
button--danger
```

---

## 10.5 Responsive Design

Die Oberfläche sollte nicht ausschließlich für eine feste Bildschirmgröße entwickelt werden.

Berücksichtigt werden sollten:

- kleine Bildschirme
- große Bildschirme
- unterschiedliche Seitenverhältnisse
- Touch-Bedienung
- Zoom
- verschiedene Schriftgrößen

---

# 11. Ereignisse und Kommunikation

## 11.1 Ereignisse sinnvoll benennen

Ereignisse sollten eindeutig und beschreibend sein.

Beispiele:

```text
gameStarted
gamePaused
resourceChanged
buildingCreated
playerDamaged
saveCompleted
```

---

## 11.2 Ereignisse statt direkter Kopplung

Ein System kann ein Ereignis auslösen, ohne alle Empfänger zu kennen.

Pseudocode:

```text
Produktionssystem:
    meldet "Ressource verändert"

Benutzeroberfläche:
    aktualisiert Anzeige

Speichersystem:
    markiert Spielstand als verändert

Audio-System:
    spielt optional einen Ton
```

---

## 11.3 Listener entfernen

Temporäre Komponenten sollten registrierte Ereignisse wieder entfernen, wenn sie nicht mehr benötigt werden.

Dies verhindert:

- doppelte Ausführung
- Speicherprobleme
- unerwartetes Verhalten

---

# 12. Fehlerbehandlung

## 12.1 Fehler früh erkennen

Wichtige Voraussetzungen sollten geprüft werden.

Beispiele:

```text
existiert das benötigte Element?
sind geladene Daten gültig?
ist ein Wert eine gültige Zahl?
existiert die angeforderte Definition?
```

---

## 12.2 Verständliche Fehlermeldungen

Fehlermeldungen sollten erklären:

- was fehlgeschlagen ist
- welcher Wert betroffen ist
- in welchem Bereich der Fehler auftrat

Nicht empfohlen:

```text
Fehler
Ungültig
Geht nicht
```

Besser:

```text
Gebäudedefinition konnte nicht gefunden werden.
Spielstand besitzt keine gültige Versionsnummer.
Benötigtes Interface-Element fehlt.
```

---

## 12.3 Erwartbare Fehler behandeln

Nicht jeder Fehler muss das gesamte Spiel stoppen.

Beispiele:

```text
nicht genügend Ressourcen
ungültige Auswahl
Speicherplatz nicht verfügbar
Audiodatei konnte nicht abgespielt werden
```

Solche Situationen sollten kontrolliert behandelt werden.

---

# 13. Speichern und Laden

## 13.1 Nur notwendige Daten speichern

Gespeichert werden sollten nur Daten, die zum Wiederherstellen des Spielstands benötigt werden.

Beispiele:

```text
Spielerfortschritt
Ressourcen
Gebäude
Positionen
Einstellungen
Zeitpunkt des Speicherns
Versionsnummer
```

Nicht gespeichert werden sollten:

```text
DOM-Elemente
Funktionen
temporäre Animationen
berechenbare Zwischenergebnisse
```

---

## 13.2 Speicherstände versionieren

Jeder Spielstand sollte eine Versionsnummer besitzen.

Pseudocode:

```text
wenn Speicherstand-Version älter:
    Daten migrieren

wenn Speicherstand-Version unbekannt:
    Fehler kontrolliert behandeln
```

---

## 13.3 Geladene Daten prüfen

Gespeicherte Daten können:

- fehlen
- beschädigt sein
- aus einer alten Version stammen
- unerwartete Werte enthalten

Darum müssen sie vor der Verwendung validiert werden.

---

# 14. Kommentare und Dokumentation

## 14.1 Kommentare erklären das Warum

Kommentare sollten erklären, warum etwas geschieht.

Nicht empfohlen:

```text
Erhöhe Gold um 10.
```

Besser:

```text
Offline-Ertrag wird begrenzt, damit lange Abwesenheit
das Balancing nicht vollständig umgeht.
```

---

## 14.2 Keine veralteten Kommentare

Kommentare müssen angepasst oder entfernt werden, wenn sich der Code verändert.

Ein falscher Kommentar ist problematischer als kein Kommentar.

---

## 14.3 Komplexe Schnittstellen dokumentieren

Dokumentiert werden sollten insbesondere:

- wichtige Parameter
- Rückgabewerte
- erwartete Datenformen
- mögliche Fehler
- besondere Seiteneffekte
- nicht offensichtliche Regeln

---

# 15. Wiederholungen vermeiden

Wiederholter Code sollte zusammengeführt werden, wenn er dieselbe fachliche Aufgabe erfüllt.

Beispiele:

```text
wiederholte Formatierung
wiederholte Validierung
wiederholte Berechnung
wiederholte Erstellung gleicher UI-Elemente
```

Allerdings sollte keine unnötig komplizierte Abstraktion erstellt werden, nur um wenige ähnliche Zeilen zu vermeiden.

---

# 16. Abstraktion sinnvoll einsetzen

Abstraktionen sind sinnvoll, wenn:

- derselbe Ablauf mehrfach vorkommt
- mehrere Systeme dieselbe Schnittstelle benötigen
- eine Regel zentral geändert werden soll
- ein Bereich unabhängig getestet werden soll

Abstraktionen sind nicht sinnvoll, wenn:

- sie nur einmal verwendet werden
- sie den Ablauf schwerer verständlich machen
- sie viele zusätzliche Ebenen erzeugen
- ihr Zweck nicht klar benannt werden kann

---

# 17. Globale Werte vermeiden

Globale Variablen erhöhen das Risiko für:

- unbeabsichtigte Änderungen
- Namenskonflikte
- schwer nachvollziehbare Fehler
- starke Abhängigkeiten

Bevorzugt werden:

- lokale Variablen
- klar begrenzte Module
- kontrollierte Zustandsobjekte
- explizite Übergabe von Abhängigkeiten

---

# 18. Module und Komponenten

Ein Modul sollte eine klar erkennbare Aufgabe besitzen.

Beispiele:

```text
Eingabeverarbeitung
Spielzustand
Ressourcenverwaltung
Gebäudelogik
Speichern und Laden
Audio
Benutzeroberfläche
```

Ein Modul sollte nur die Teile nach außen freigeben, die andere Bereiche tatsächlich benötigen.

---

# 19. Klassen und Funktionen

Klassen eignen sich für:

- Objekte mit eigenem Zustand
- Objekte mit mehreren zusammengehörigen Aktionen
- wiederverwendbare Instanzen
- klar abgegrenzte Systeme

Normale Funktionen eignen sich für:

- Berechnungen
- Umwandlungen
- Prüfungen
- kleine Hilfsaktionen
- zustandslose Logik

Nicht jede Aufgabe benötigt eine Klasse.

---

# 20. Performance

## 20.1 Nur notwendige Arbeit ausführen

Vermeide:

- unnötige DOM-Suchen
- vollständiges Neuzeichnen ohne Änderung
- wiederholte identische Berechnungen
- zu viele aktive Ereignislistener
- unnötige Objekterstellung in häufigen Abläufen

---

## 20.2 Spielschleife

Eine Spielschleife sollte nur Aufgaben ausführen, die regelmäßig aktualisiert werden müssen.

Pseudocode:

```text
jeder Frame:
    vergangene Zeit bestimmen
    Eingaben verarbeiten
    Spielzustand aktualisieren
    notwendige Darstellung aktualisieren
```

Menüs, statische Texte und seltene Änderungen müssen nicht in jedem Frame neu verarbeitet werden.

---

## 20.3 Zeitbasierte Berechnungen

Bewegungen und Produktionen sollten nach vergangener Zeit berechnet werden und nicht ausschließlich nach Anzahl der Frames.

Pseudocode:

```text
neuePosition =
    altePosition
    + geschwindigkeit
    * vergangeneZeit
```

---

# 21. Sicherheit

## 21.1 Benutzerdaten nicht ungeprüft als HTML einsetzen

Vom Benutzer oder aus externen Quellen stammende Texte sollten als Text und nicht als ausführbarer HTML-Inhalt behandelt werden.

---

## 21.2 Daten validieren

Alle externen Daten sollten geprüft werden.

Beispiele:

```text
lokaler Speicher
importierte Spielstände
Formulareingaben
Netzwerkantworten
Konfigurationsdateien
```

---

## 21.3 Keine geheimen Daten im Client speichern

Ein Browser-Spiel kann keine geheimen Schlüssel oder vertraulichen Prüfregeln sicher im Frontend verstecken.

Nicht im Client speichern:

- private API-Schlüssel
- geheime Tokens
- serverseitige Passwörter
- sicherheitskritische Prüfregeln

---

# 22. Tests

Getestet werden sollten insbesondere:

- Berechnungen
- Ressourcenkosten
- Levelaufstiege
- Schadensberechnungen
- Speicherstand-Migrationen
- Eingabevalidierung
- Grenzwerte
- Fehlerfälle

Pseudocode:

```text
gegeben:
    Spieler besitzt 100 Gold

wenn:
    Gebäude kostet 40 Gold

dann:
    Kauf ist möglich
    verbleibendes Gold beträgt 60
```

---

# 23. Versionskontrolle

Änderungen sollten klein und thematisch zusammengehörig sein.

Gute Commit-Beschreibungen erklären die Änderung.

Beispiele:

```text
Add building selection
Fix invalid save migration
Refactor resource calculation
Improve keyboard navigation
```

Nicht empfohlen:

```text
Update
Stuff
Fix
Changes
```

---

# 24. Qualitätsprüfung vor Abschluss einer Änderung

Vor dem Abschluss sollte geprüft werden:

- Sind HTML, CSS und JavaScript getrennt?
- Hat jede Funktion eine klare Aufgabe?
- Sind Namen verständlich?
- Gibt es unnötig globale Werte?
- Gibt es doppelten Code?
- Sind Fehlerfälle behandelt?
- Sind Daten und Logik getrennt?
- Ist die Benutzeroberfläche mit Tastatur bedienbar?
- Sind Kommentare noch korrekt?
- Wurde die Änderung getestet?
- Funktionieren alte Speicherstände weiterhin?
- Wurde nur notwendiger Code verändert?

---

# 25. Empfohlener Ablauf für neue Funktionen

```text
1. Ziel der Funktion festlegen
2. benötigte Daten bestimmen
3. Zustandsänderungen definieren
4. Eingaben und Fehlerfälle festlegen
5. Spiellogik unabhängig umsetzen
6. Benutzeroberfläche anbinden
7. Darstellung ergänzen
8. Speicherung berücksichtigen
9. Tests durchführen
10. Code auf Verständlichkeit prüfen
```

---

# 26. Zusammenfassung

Der Code sollte so aufgebaut sein, dass ein anderer Entwickler möglichst schnell erkennen kann:

- wo Daten gespeichert werden
- wo Spiellogik ausgeführt wird
- wo die Benutzeroberfläche aktualisiert wird
- welche Komponente für welche Aufgabe zuständig ist
- wie neue Funktionen ergänzt werden
- welche Regeln im gesamten Projekt gelten

Die wichtigste Regel lautet:

> Code sollte zuerst für Menschen verständlich und danach für den Computer ausführbar sein.