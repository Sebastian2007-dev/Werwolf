# Changelog — Projektdokumentation / Meta

## [2026-06-16 12:30] README und LICENSE hinzugefügt
- README.md vollständig überarbeitet: Projektbeschreibung, Features, Rollenübersicht, Tech Stack, Startanleitung, Projektstruktur, Lizenzhinweis
- LICENSE erstellt: Ursprünglich MIT-Lizenz für Quellcode und All Rights Reserved für Assets in `assets/`

## [2026-06-16 17:00] Lizenz auf nicht-kommerzielle Nutzung geändert
- LICENSE ersetzt: Proprietäre Nicht-Kommerziell-Lizenz für das gesamte Projekt
- Nicht-kommerzielle Nutzung, Veränderung, Weitergabe und kostenloses Hosting erlaubt
- Kommerzielle Nutzung, auch von veränderten Versionen, nur mit ausdrücklicher schriftlicher Genehmigung
- README-Lizenzhinweis entsprechend aktualisiert

## [2026-06-16 16:30] Favicon eingebunden
- `assets/favicon/favicon.png` in alle 6 HTML-Seiten als `<link rel="icon" type="image/png">` eingetragen (index, start, join, lobby, game, narrator)

## [2026-06-16 11:15] Impressum: TMG → DDG aktualisiert
- § 5 TMG durch § 5 DDG ersetzt (TMG seit Mai 2024 außer Kraft, Regelung nahtlos ins Digitale-Dienste-Gesetz übergegangen)

## [2026-06-16 10:20] Impressum & Datenschutz mit echten Kontaktdaten befüllt
- Name: Sebastian Wendt
- Adresse: Bochumer Straße 52, 99734 Nordhausen
- E-Mail: sebastianwendt07@gmail.com (in Impressum, Datenschutz Abschnitt 1 und 5)

## [2026-06-16 10:15] Bugfix: Modals in der Bildschirmmitte zentriert
- `app.css` `.modal`: `position: fixed; inset: 0; margin: auto` ergänzt — nativer `<dialog>` positioniert sich ohne das in der linken oberen Ecke

## [2026-06-16 10:00] Homepage implementiert
- `frontend/index.html` — vollständige Homepage mit zwei Action-Cards ("Geschichte starten", "Geschichte beitreten") und Footer
- `frontend/app.css` — Dark-Theme mit CSS-Variablen, Cinzel-/Lato-Schriften via Google Fonts CDN, atmosphärischer Hintergrund-Glow, responsive Layout
- `frontend/app.js` — Modal-Logik für Impressum, Datenschutz und Nutzungsbedingungen (natives `<dialog>`-Element, Backdrop-Click-Close)
- Footer: Impressum (§5 TMG), Datenschutz (DSGVO), Nutzungsbedingungen als Platzhaltertexte (persönliche Daten noch einzutragen)
- `start.html` und `join.html` als Zielseiten noch nicht gebaut (folgen später)

## [2026-06-16 15:00] CLAUDE.md erstellt und erweitert
- CLAUDE.md initial erstellt mit Projektübersicht, Architekturprinzipien, Rollenbeschreibung und Changelog-Pflicht
- Deployment-Ziel ergänzt: Linux-Server (case-sensitive Dateipfade beachten)
- Externe Bibliotheken via CDN ausdrücklich als erlaubt dokumentiert
- Tech-Stack-Beschreibung angepasst (kein reines "kein Framework mehr" — CDNs erlaubt)
