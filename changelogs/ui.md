## [2026-06-16] Tote Spieler: Nacht-Overlay wird nicht mehr angezeigt

- `setDead()`: schließt `nightOverlay` sofort beim Tod
- `your-night-turn`, `night-waiting`, `night-turn-done`, `view-result`: alle mit `if (isDead) return` Guard
- `phase-changed` → `night`: bei toten Spielern früher `return`, Overlay bleibt versteckt

## [2026-06-16] Anklage-Phase: Bestätigung deutlicher sichtbar

- `.day-panel__actions` von flex-row auf flex-column umgestellt → Bestätigen-Button erscheint ÜBER Überspringen, nicht daneben
- `#day-accuse-btn` und `#day-vote-btn`: größer, volle Breite (max 280px), stärkerer Glow
- Pop-In-Animation (`confirm-pop`) wird via JS ausgelöst wenn ein Spieler ausgewählt wird
- `scrollIntoView` sorgt dafür dass der Button immer im sichtbaren Bereich erscheint
- Gilt auch für die Abstimmungs-Phase (Abstimmen ✓-Button)

## [2026-06-16] Visuelles Redesign: Animationen und Tag/Nacht-Atmosphäre

- Tag/Nacht-Phasenwechsel: `body.is-night` / `body.is-day` Klassen via JS gesetzt
- Nacht-Atmosphäre: `body.is-night::before` mit tieferem Blau-Lila, Sternfeld im Night-Overlay via `::before` Pseudo-Element
- Tages-Atmosphäre: `body.is-day::after` — warmer Amber-Schimmer, 2s-Überblendung (opacity-Transition)
- Mondlicht-Pulsieren (`moon-breathe`) im Night-Overlay via `::after` Pseudo-Element
- Card-Scene: sanftes Floating-Animation (`card-float`, 6s), phasenabhängiger Box-Shadow (kühl nachts, warm tagsüber)
- Target-Buttons: Einzel-Einlauf mit Stagger-Delay per `--btn-i` CSS-Custom-Property (`btn-enter`), Accent-Balken links bei Auswahl, bessere Hover-Effekte
- Night-Confirm-Button: glühende Pulse-Animation (`confirm-glow`)
- Morgen-Overlay: Dawn-Lichtschimmer von unten (`::before`), Karten-Stagger-Animation (`morning-card-in`)
- Game-Over: kinematischer Reveal — Hintergrund-Blur + Content-Scale aus-Dunkel (`gameover-bg`, `gameover-box`), Title-Glow-Loop
- Alle Overlays (WildesKind, Jack, Ergebene Magd): dramatischer Einlauf (`overlay-dramatic`, `text-rise`)
- Day-Panel: `backdrop-filter: blur(16px)`, phasenabhängige Border-Farbe (amber tagsüber)
- `buildTargetButtons()` in game.js: setzt `--btn-i` Inline-Style für Stagger-Animation

## [2026-06-16] Tablet/Mobile: Bereit-Button erreichbar

- `.lobby` auf ≤ 860px von `overflow-y: auto` auf `overflow: visible` geändert
- Damit scrollt die gesamte Seite (body) statt nur die Lobby — Footer mit Bereit-Button immer erreichbar
- `.lobby__col--cards` explizit `overflow: visible` auf Mobile

## [2026-06-16] Mobile Footer: kein horizontales Scrollen mehr

- `.lobby-footer` wraps auf ≤ 860px (flex-wrap: wrap)
- `.lobby-footer__actions` wraps ebenfalls, rechtsbündig
- "Spielleiter-Modus:" Label auf Mobile ausgeblendet (nur Buttons sichtbar)
- Start-Button nimmt volle verfügbare Breite

## [2026-06-16] Mobile Chat: Klick auf Input schloss Chat (Stacking Context Fix)

- `z-index: 1` von `.lobby` entfernt — verhinderte, dass der fixierte Chat-Panel (z-index 50) über dem Backdrop (z-index 49) lag, weil lobby einen eigenen Stacking Context bildete

## [2026-06-16] Modal: doppelte Scrollbar entfernt

- `.modal` erhält `overflow: hidden` — nur `.modal__content` scrollt, der dialog selbst nicht mehr

## [2026-06-16] Chat-Spalte Senden-Button fix

- Desktop: Chat-Grid-Spalte von 240px auf 270px verbreitert
- `.chat-input` erhält `min-width: 0` damit Flex-Shrink greift und Button nicht abgeschnitten wird

## [2026-06-16] Mobile Chat als Slide-in Overlay

- Chat-Spalte auf ≤ 860 px: festes Panel, das von rechts einschiebt (transform translateX)
- Halbtransparenter Backdrop schließt Panel bei Klick
- FAB-Tab am rechten Bildschirmrand: Pfeil ❮/❯ dreht sich beim Öffnen/Schließen
- Rotes Unread-Badge zählt neue Nachrichten, während Chat geschlossen ist
- Auf Desktop: kein FAB, Chat bleibt inline im Grid

## [2026-06-16] Custom Scrollbars und Number Spinner

- Globale Custom-Scrollbars in app.css: gold (rgba 200,170,110) auf transparentem Track, 6px breit, webkit + Firefox
- accusations-setting: natives `<input type=number>` durch custom Spinner `− [Wert] +` ersetzt (lobby.html)
- num-spin CSS in lobby.css: Buttons im Design-Stil, nativer Spinner per -webkit-appearance versteckt
- lobby.js: accusations-minus / accusations-plus Buttons senden set-max-accusations über Socket
