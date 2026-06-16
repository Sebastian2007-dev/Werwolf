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
cd backend
npm install
node server.js
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

Der **Quellcode** steht unter der [MIT License](LICENSE).  
Die **Assets** (Bilder in `assets/`) sind urheberrechtlich geschützt – **All Rights Reserved**. Keine Weitergabe, Modifikation oder kommerzielle Nutzung ohne ausdrückliche Genehmigung.  
Details siehe [LICENSE](LICENSE).
