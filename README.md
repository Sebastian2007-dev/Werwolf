# Werwolf – Digitaler Spielleiter

Ein browser-basierter Spielleiter-Assistent für das soziale Deduktionsspiel **Werwolf**. Das Tool unterstützt den Spielleiter beim Verwalten von Rollen, Abstimmungen und Spielphasen.

## Features

- Übersicht aller Rollen mit Fähigkeiten und Fraktionen
- Rollen-Karten mit Artwork für jede Figur
- Tages- und Nachtrunden-Verwaltung
- Unterstützung für 20+ Rollen (Werwölfe, Dorfbewohner, Neutrale & Solo)

## Rollen

| Fraktion | Beispiele |
|----------|-----------|
| (W) Werwolf | Werwolf (4 Farben), Einsamer Wolf, Jekyll & Hyde |
| (D) Dorfbewohner | Seherin, Hexe, Jäger, Amor, Silberschmied, … |
| (N) Neutral | Dieb, Narr |
| (S) Solo | Einsamer Wolf |

Alle Rollen und ihre genauen Regeln stehen in [roles.md](roles.md).

## Tech Stack

- Reines HTML / CSS / JavaScript — kein Build-Schritt nötig
- Socket.IO (Backend, optional für Multiplayer)
- Rollenbilder als JPEG in `assets/`

## Lokal starten

```
# Einfach die Datei im Browser öffnen:
frontend/index.html
```

Für das Backend (optional):

```bash
npm run install:backend
npm start
```

## Projektstruktur

```
assets/          # Rollenkarten-Bilder (JPEG)
frontend/
  html/          # Seiten
  css/           # Styles
  js/            # Spiellogik
backend/         # Node.js / Socket.IO Server
roles.md         # Regelwerk aller Rollen
CodeGuide.md     # Code-Styleguide
```

## Lizenz

Dieses Projekt steht unter einer **proprietären Nicht-Kommerziell-Lizenz**.

Du darfst das Projekt nicht-kommerziell nutzen, verändern, weitergeben und kostenlos hosten.  
Kommerzielle Nutzung, auch von veränderten Versionen, ist ohne ausdrückliche schriftliche Genehmigung nicht erlaubt.  
Details siehe [LICENSE](LICENSE).
