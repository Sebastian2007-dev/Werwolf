# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based Werwolf (Werewolf) game — a digital companion/game-master tool for the social deduction card game. The game logic and all roles are documented in [roles.md](roles.md).

## Tech Stack

- HTML, CSS, JavaScript — no build step required
- Single-page application served via a Linux web server (e.g. nginx or Apache)
- External libraries via CDN are explicitly allowed (e.g. Socket.IO, Alpine.js, Tailwind, etc.)
- Frontend structure: `frontend/html/` (pages), `frontend/css/` (styles), `frontend/js/` (scripts)
- Role card images in `assets/` (JPEG per role)

## Deployment Target

The game runs on a **Linux server**. Keep this in mind for:
- File paths — use lowercase, URL-safe names (Linux is case-sensitive)
- Static file serving — assets must be referenced with correct relative paths
- Any backend logic (if added) should target a Linux runtime (Node.js, Python, etc.)

## Running Locally

Open `frontend/index.html` directly in a browser for quick testing. No build step needed.
On the server, serve the `frontend/` directory as the web root.

## Changelog Requirement

**Every change must be logged.** After completing any modification, append an entry to a file in `changelogs/` using this format:

```
## [YYYY-MM-DD HH:MM] Short description of what changed
- Detail of what was added/changed/removed
- Another detail if needed
```

Use one changelog file per major feature area (e.g., `changelogs/ui.md`, `changelogs/roles.md`, `changelogs/game-logic.md`). If no suitable file exists, create one.

## Architecture Principles (from CodeGuide.md)

The [CodeGuide.md](CodeGuide.md) is the authoritative style guide. Key rules:

**Separation of concerns** — HTML = structure only, CSS = presentation only, JS = behavior and game logic. No inline styles, no inline event handlers, no game logic in HTML.

**State management** — one central game state object (not scattered globals, not read from DOM text). UI only displays state; it never is the state.

**CSS conventions** — BEM-style class names (`button--primary`, `panel--compact`), CSS variables for colors/spacing/typography, state via classes (`is-active`, `is-hidden`, `is-disabled`).

**JS conventions** — camelCase variables/functions, PascalCase classes, `UPPER_SNAKE_CASE` constants. 4-space indentation. Early returns to avoid deep nesting.

**Naming** — functions are verbs (`startGame`, `calculateDamage`), booleans read as questions (`isAlive`, `hasVoted`).

## Rechtliches (Impressum & Datenschutz)

**Bei jeder Änderung prüfen, ob Impressum und Datenschutzerklärung angepasst werden müssen.** Relevante Auslöser:

- **Browser-Speicherung** (Cookies, `localStorage`, `sessionStorage`): In der Datenschutzerklärung dokumentieren. Rein **funktionale** Speicherung ohne Tracking (aktuell: Tutorial-gesehen-Status in `localStorage`, Voice-Chat-Präferenz und Reconnect-Daten in `sessionStorage`) ist nach § 25 Abs. 2 TTDSG „unbedingt erforderlich" — dafür ist **kein Cookie-Banner nötig**. Ein Consent-Banner wird erst Pflicht, wenn Tracking-, Analyse- oder Werbe-Speicherung dazukommt. Vor jedem neuen Storage-Key prüfen, ob er funktional bleibt.
- **Externe Dienste, die IP-Adressen der Nutzer erhalten** (aktuell: Google Fonts CDN, jsdelivr CDN für qrcodejs, Google STUN-Server für den Voice-Chat): müssen in der Datenschutzerklärung aufgeführt werden. Datenschutzfreundlicher wäre Self-Hosting der Fonts/Libraries — bei Gelegenheit umstellen.
- **Voice-Chat (WebRTC)**: Audio läuft Peer-to-Peer; die Teilnehmer sehen dabei gegenseitig ihre IP-Adressen. In der Datenschutzerklärung erwähnen. Der Beitritt ist freiwillig (expliziter Klick + Mikrofon-Freigabe).
- **Chat & Spielernamen**: werden nur im Arbeitsspeicher des Servers gehalten (keine Datenbank, kein Logging, weg nach Raum-Ende). Diesen Zustand beibehalten und so dokumentieren — er hält die Datenschutzerklärung einfach.

**Wo die Rechtstexte liegen:** Impressum, Datenschutzerklärung und Nutzungsbedingungen sind Modale auf der Startseite (`frontend/html/index.html`), per Hash-Deep-Link direkt verlinkbar: `/html/index.html#impressum`, `#datenschutz`, `#nutzung` (Logik in `app.js`). Alle anderen Seiten verlinken dorthin — `start.html`/`join.html`/`narrator.html` über einen `legal-links`-Footer, Lobby und Spiel über die Tutorial-Box („?"-Knopf im Header, Links öffnen in neuem Tab). Bei neuen datenschutzrelevanten Features die Abschnitte im Datenschutz-Modal von `index.html` aktualisieren.

## Roles Reference

All 20+ roles are defined in [roles.md](roles.md). Roles fall into three factions:
- `(W)` Werwolf — wins when they equal or outnumber villagers
- `(D)` Dorfbewohner (villager) — wins when all werewolves are eliminated
- `(N)` Neutral / `(S)` Solo — have their own win conditions

Role images are in `assets/` as `<RoleName>.jpeg` (e.g., `Hexe.jpeg`, `Seherin.jpeg`). The werewolf cards come in four colors: `Werwolf_blau.jpeg`, `Werwolf_gelb.jpeg`, `Werwolf_grün.jpeg`, `Werwolf_rot.jpeg`.
