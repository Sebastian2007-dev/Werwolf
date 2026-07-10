# Changelog: Voice Chat

## [2026-07-09 14:30] Voice Chat (WebRTC) — Lobby, Tag & Werwolf-Rudel

- Neuer optionaler Sprach-Chat über WebRTC-Mesh: Audio läuft Peer-to-Peer zwischen den Browsern, der Socket.IO-Server vermittelt nur Offer/Answer/ICE (Signaling)
- Kanal-Regeln (Server-seitig in `voiceChannelFor()` entschieden):
  - Lobby & Spielende → Kanal `lobby`: alle sprechen miteinander
  - Tag-Phasen → Kanal `village`: alle Lebenden sprechen, Tote hören nur zu
  - Nacht → Kanal `wolf`: nur lebende Werwölfe untereinander (inkl. verwandelte: Wildes Kind, Jack the Ripper, Hyde); der Erzähler hört zu, Dorfbewohner hören nichts
- `backend/server.js`: neue Events `voice-join`, `voice-leave`, `voice-signal` (Relay nur innerhalb desselben Kanals), `voice-peers`-Push bei jedem Phasenwechsel/Tod/Disconnect; `room.voice`-Set mit Cleanup bei Kick, Rejoin, Resume und Disconnect
- `frontend/js/voice.js` (neu): geteiltes Modul für Lobby/Spiel/Erzähler — Mikrofon-Freigabe, Peer-Verbindungsauf/-abbau nach Server-Peer-Liste, Glare-Vermeidung (kleinere Socket-ID sendet Offer), Reconnect-Neuaufbau, Autoplay-Entsperrung per Tipp, Mute-Knopf
- `frontend/css/voice.css` (neu): schwebende Voice-Leiste unten links mit Kanal-Anzeige, Peer-Namen, Mute- und Verlassen-Knopf
- `lobby.html`, `game.html`, `narrator.html`: Voice-Leiste eingebaut; Init in `lobby.js`, `game.js`, `narrator.js` (Auto-Rejoin nach Seitenwechsel via `sessionStorage`)
- Getestet: automatisierter Smoke-Test (2 Clients + Spielstart) — Lobby-Kanal, Signal-Relay, Relay-Sperre für Fremde, Nacht nur Wölfe: alles bestanden

## [2026-07-09 21:00] Wolf-Voice nur während der Wolfsrunde

- `voiceChannelFor()`: Der Werwolf-Sprachkanal existiert nachts nur noch, solange die Werwolf-Abstimmung aktiv ist (`nightQueue`-Eintrag „Werwölfe", nicht done) — vorher konnten Wölfe die ganze Nacht sprechen
- Kanal-Mitgliedschaft jetzt über `entry.playerIds` (deckt verwandelte Wölfe wie Wildes Kind/Jack/Hyde automatisch ab)
- `pushVoicePeers` zusätzlich in `advanceNight` (Rundenwechsel) und beim Abschluss der Wolfs-Abstimmung (Opfer bestätigt → Kanal schließt sofort)
