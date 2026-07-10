const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.get('/', (req, res) => res.redirect('/html/index.html'));

// HTML/JS/CSS: no-cache = Browser fragt bei jedem Laden per ETag nach (304 wenn
// unverändert) — sonst liefert der Browser nach einem Deploy tagelang alte
// Dateien aus seinem Cache. Bilder dürfen lange cachen.
app.use(express.static(path.join(__dirname, '../frontend'), {
    setHeaders: (res, filePath) => {
        if (/\.(html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    },
}));
app.use('/assets', express.static(path.join(__dirname, '../assets'), { maxAge: '7d' }));

// ── Constants ─────────────────────────────────────────────────────────────────

const WOLF_IDS = new Set(['Werwolf_blau', 'Werwolf_gelb', 'Werwolf_gruen', 'Werwolf_rot']);

// Karenzzeit bei Verbindungsabbruch (ms) — per Env übersteuerbar (u. a. für Tests).
// Im Spiel großzügig: Handys trennen schon bei Bildschirm-aus/App-Wechsel.
const GRACE_GAME_MS  = parseInt(process.env.GRACE_GAME_MS  ?? '60000', 10);
const GRACE_LOBBY_MS = parseInt(process.env.GRACE_LOBBY_MS ?? '15000', 10);

// Night call order – server iterates this list and skips roles not in the game
const NIGHT_ORDER = [
    { group: 'Ergebene Magd',   roleIds: ['ErgebeneMagd'],                                        firstNightOnly: true,   actionType: 'select-one',    hint: 'Wähle deinen Herren aus. Du weißt nicht, welche Rolle er hat.' },
    { group: 'Amor',            roleIds: ['Amor'],                                              firstNightOnly: true,   actionType: 'select-two',    hint: 'Wähle 2 Spieler als Liebespaar aus.' },
    { group: 'Dieb',            roleIds: ['Dieb'],                                              firstNightOnly: true,   actionType: 'optional',      hint: 'Du kannst eine alternative Rolle übernehmen — oder Dieb bleiben.' },
    { group: 'Wildes Kind',     roleIds: ['WildesKind'],                                        firstNightOnly: true,   actionType: 'select-one',    hint: 'Wähle dein Idol aus.' },
    { group: 'Silberschmied',   roleIds: ['Silberschmied'],                                    firstNightOnly: true,   actionType: 'select-one',    hint: 'Rüste einen Spieler mit Silberwaffen aus.' },
    { group: 'Dorfmatratze',    roleIds: ['Dorfmatraze'],                                      firstNightOnly: false,  actionType: 'select-one',    hint: 'Bei wem schläfst du heute Nacht?' },
    { group: 'Seherin',         roleIds: ['Seherin'],                                          firstNightOnly: false,  actionType: 'view',          hint: 'Schau dir die Karte eines Spielers an.' },
    { group: 'Händler',         roleIds: ['Haendler'],                                         firstNightOnly: false,  actionType: 'select-one',    hint: 'Schicke einen Spieler für diese Runde einkaufen.' },
    // Glöckner MUSS vor den Werwölfen dran sein, damit sein Läuten die Wolfsrunde derselben Nacht ausfallen lassen kann
    { group: 'Glöckner',        roleIds: ['Gloeckner'],                                        firstNightOnly: false,  actionType: 'optional',      hint: 'Möchtest du heute die Glocken läuten? (Optional, einmalig)' },
    { group: 'Werwölfe',        roleIds: ['Werwolf_blau','Werwolf_gelb','Werwolf_gruen','Werwolf_rot'], firstNightOnly: false, actionType: 'kill', hint: 'Wählt gemeinsam ein Opfer aus.' },
    { group: 'Zigeunerin',      roleIds: ['Zigeunerin'],                                       firstNightOnly: false,  actionType: 'select-one',    hint: 'Du wurdest angeklagt — verfluche einen Werwolf, der mit dir stirbt.' },
    { group: 'Hexe',            roleIds: ['Hexe'],                                             firstNightOnly: false,  actionType: 'witch',         hint: 'Du kannst heilen oder vergiften.' },
    { group: 'Einsamer Wolf',   roleIds: ['EinsamerWolf'],                                     everySecondNight: true, actionType: 'select-one',    hint: 'Wähle einen Werwolf, den du tötest.' },
    { group: 'Jack the Ripper', roleIds: ['JackTheRipper'],                                    firstNightOnly: false,  actionType: 'select-one',    hint: 'Wähle deinen heutigen Besuch.' },
    { group: 'Gendarm',         roleIds: ['Gendarm'],                                          firstNightOnly: false,  actionType: 'optional-kill', hint: 'Möchtest du jemanden verhaften? (Optional, einmalig)' },
];

const ROLE_NAMES = {
    Werwolf_blau:'Werwolf', Werwolf_gelb:'Werwolf', Werwolf_gruen:'Werwolf', Werwolf_rot:'Werwolf',
    Dorfbewohner:'Dorfbewohner', Dorfmatraze:'Dorfmatratze', Jaeger:'Jäger', Hexe:'Hexe',
    Amor:'Amor', Seherin:'Seherin', Haendler:'Händler', Alter:'Alter',
    Silberschmied:'Silberschmied', Katze:'Katze', Maus:'Maus', Gloeckner:'Glöckner',
    ErgebeneMagd:'Ergebene Magd', Baer:'Bär', Gendarm:'Gendarm', Dieb:'Dieb',
    WildesKind:'Wildes Kind', Narr:'Narr', JekylUndHyde:'Jekyll & Hyde',
    JackTheRipper:'Jack the Ripper', Zigeunerin:'Zigeunerin', EinsamerWolf:'Einsamer Wolf',
};

// Status messages shown to non-active players during auto mode
const AUTO_NIGHT_MSGS = {
    'Dorfmatratze':   'Die Dorfmatratze sucht sich ein Bett für die Nacht…',
    'Seherin':        'Die Seherin öffnet ihr geheimes Auge…',
    'Händler':        'Ein Händler zieht durch das Dorf.',
    'Werwölfe':       'Die Werwölfe heulen.',
    'Hexe':           'Du hörst die Hexe lachen.',
    'Amor':           'Vor deinem Fenster schlägt Amor mit den Flügeln.',
    'Jäger':          'Der Jäger schleicht durch den Wald.',
    'Einsamer Wolf':  'In der Ferne heult ein einsamer Wolf.',
    'Silberschmied':  'Der Silberschmied hämmert leise in der Nacht.',
    'Wildes Kind':    'Das wilde Kind schleicht durch das Dickicht.',
    'Ergebene Magd':  'Eine treue Seele wacht über ihren Herrn.',
    'Glöckner':       'In der Ferne läuten die Kirchenglocken.',
    'Gendarm':        'Der Gendarm schleicht durchs Dorf.',
    'Dieb':           'Ein Dieb schleicht durch das Haus.',
    'Jack the Ripper':'Im Nebel schleicht eine dunkle Gestalt.',
    'Zigeunerin':     'Ein alter Fluch liegt in der Luft…',
};

// ── Room helpers ──────────────────────────────────────────────────────────────

const rooms = new Map();

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
    while (rooms.has(code));
    return code;
}

function findRoomBySocket(socketId) {
    for (const [code, room] of rooms) {
        const player = room.players.find(p => p.id === socketId);
        if (player) return { code, room, player };
    }
    return null;
}

function replaceIdInSet(set, oldId, newId) {
    if (!set?.has(oldId)) return;
    set.delete(oldId);
    set.add(newId);
}

function replaceIdInArray(arr, oldId, newId) {
    if (!Array.isArray(arr)) return;
    arr.forEach((id, idx) => {
        if (id === oldId) arr[idx] = newId;
    });
}

function replaceObjectKey(obj, oldId, newId) {
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, oldId)) return;
    obj[newId] = obj[oldId];
    delete obj[oldId];
}

function replacePlayerSocket(room, oldId, newId) {
    const player = room.players.find(p => p.id === oldId);
    if (!player) return false;

    if (room.disconnectTimers?.has(oldId)) {
        clearTimeout(room.disconnectTimers.get(oldId));
        room.disconnectTimers.delete(oldId);
    }

    player.id = newId;
    player.isConnected = true;
    if (room.hostId === oldId) room.hostId = newId;

    // Voice: alte Socket-ID austragen — der Client tritt nach dem Resume neu bei
    room.voice?.delete(oldId);

    replaceObjectKey(room.assignments, oldId, newId);

    const g = room.game;
    if (g) {
        if (g.narratorId === oldId) g.narratorId = newId;
        replaceIdInSet(g.alive, oldId, newId);
        replaceIdInSet(g.pendingDeaths, oldId, newId);
        replaceIdInSet(g.wolfConfirms, oldId, newId);
        replaceObjectKey(g.wolfVotes, oldId, newId);

        if (g.nightVictim === oldId)             g.nightVictim             = newId;
        if (g.hexeHealTarget === oldId)          g.hexeHealTarget          = newId;
        if (g.hexePoisonTarget === oldId)        g.hexePoisonTarget        = newId;
        if (g.dorfmatraze_sleep === oldId)       g.dorfmatraze_sleep       = newId;
        if (g.haendler_away === oldId)           g.haendler_away           = newId;
        if (g.magd_herr      === oldId)          g.magd_herr               = newId;
        if (g.wildesKind_idol === oldId)         g.wildesKind_idol         = newId;
        if (g.silberschmied_protected === oldId) g.silberschmied_protected = newId;
        if (g.einsamerWolf_target === oldId)     g.einsamerWolf_target     = newId;
        if (g.jack_target === oldId)             g.jack_target             = newId;
        if (g.gendarm_target === oldId)          g.gendarm_target          = newId;
        if (g.zigeunerin_target === oldId)       g.zigeunerin_target       = newId;
        replaceIdInArray(g.lovers, oldId, newId);
        replaceIdInSet(g.spectators, oldId, newId);
        replaceIdInArray(g.dayAccused, oldId, newId);

        // Day nominations/votes: keys are the voters, values the targets
        for (const obj of [g.dayNominations, g.dayVotes]) {
            if (!obj) continue;
            replaceObjectKey(obj, oldId, newId);
            for (const key of Object.keys(obj)) {
                if (obj[key] === oldId) obj[key] = newId;
            }
        }

        g.nightQueue?.forEach(entry => replaceIdInArray(entry.playerIds, oldId, newId));

        // Bot-Gedächtnisse verweisen auf Spieler-IDs — bei Reconnects nachziehen
        for (const m of Object.values(g.botMemory ?? {})) {
            replaceIdInSet(m.knownWolves, oldId, newId);
            replaceIdInSet(m.cleared, oldId, newId);
            replaceIdInSet(m.seen, oldId, newId);
            replaceObjectKey(m.suspicion, oldId, newId);
        }
    }

    return true;
}

function pushCurrentGameState(code, room, socket) {
    const g = room.game;
    if (!g) return;

    // Katz und Maus: inform each of their partner (re-sent on every reconnect)
    const katzeId = Object.entries(room.assignments).find(([, rid]) => rid === 'Katze')?.[0];
    const mausId  = Object.entries(room.assignments).find(([, rid]) => rid === 'Maus')?.[0];
    if (katzeId && mausId) {
        if (socket.id === katzeId) {
            socket.emit('you-are-katz-maus', { role: 'Katze', partnerName: playerName(room, mausId) });
        } else if (socket.id === mausId) {
            socket.emit('you-are-katz-maus', { role: 'Maus', partnerName: playerName(room, katzeId) });
        }
    }

    if (g.narratorId === socket.id) {
        const entry = g.nightQueue?.[g.nightIdx] ?? null;
        const payload = {
            phase: g.phase,
            round: g.round,
            activeEntry: entry ? {
                group: entry.group,
                hint: entry.hint,
                actionType: entry.actionType,
                playerNames: entry.playerIds.map(id => playerName(room, id)),
                done: entry.done,
            } : null,
            summary: g.nightSummary,
            events: g.events,
            players: playerStatusList(room, g),
            waiting: g.phase === 'night' ? !entry?.done : false,
        };
        socket.emit('narrator-update', payload);
        if (g.phase === 'game-over' && g.gameOverPayload) socket.emit('game-over', g.gameOverPayload);
        return;
    }

    // Dead player → spectator mode
    if (!g.alive.has(socket.id)) {
        g.spectators.add(socket.id);
        socket.emit('you-are-dead');
        const entry = g.nightQueue?.[g.nightIdx] ?? null;
        socket.emit('narrator-update', {
            phase: g.phase, round: g.round,
            activeEntry: entry ? {
                group: entry.group, hint: entry.hint,
                actionType: entry.actionType,
                playerNames: entry.playerIds.map(id => playerName(room, id)),
                done: entry.done,
            } : null,
            summary: g.nightSummary,
            events: g.events,
            players: playerStatusList(room, g),
        });
        if (g.phase === 'game-over' && g.gameOverPayload) socket.emit('game-over', g.gameOverPayload);
        return;
    }

    // Vollständige Wiederherstellung des Phasen-Zustands nach einem Reload:
    // die normalen Phasen-Events tragen Kontextdaten (Spielerlisten, Angeklagte,
    // Stimmen …), die der Client zum Aufbau seiner UI zwingend braucht.
    const aliveList = () => [...g.alive].map(id => ({ id, name: playerName(room, id) }));

    if (g.phase === 'night') {
        socket.emit('phase-changed', { phase: 'night', round: g.round });
        const entry = g.nightQueue?.[g.nightIdx];
        if (entry?.playerIds.includes(socket.id) && !entry.done) {
            const extra = entry.actionType === 'witch' ? buildWitchExtra(room, g) : {};
            socket.emit('your-night-turn', {
                group: entry.group,
                actionType: entry.actionType,
                hint: entry.hint,
                players: buildNightTargetsFor(room, g, entry, socket.id),
                extra,
            });
            // Wolfs-Abstimmung: aktuellen Stimmenstand (inkl. eigener Stimme) nachreichen
            if (entry.actionType === 'kill') broadcastWolfVotes(code, room, entry, g);
        } else {
            socket.emit('night-waiting', {
                activeGroup:   entry?.group ?? null,
                activePlayers: entry?.playerIds ?? [],
                autoStatusMsg: g.autoMode ? (AUTO_NIGHT_MSGS[entry?.group] ?? null) : null,
            });
        }

    } else if ((g.phase === 'hunter-night-shot' || g.phase === 'hunter-day-shot')
               && findPlayerByRole(room, 'Jaeger') === socket.id) {
        // Reconnecting Jäger gets his shoot prompt again
        socket.emit('hunter-shoot', { targets: hunterShootTargets(room, g) });

    } else if (g.phase === 'day-accusation') {
        socket.emit('phase-changed', {
            phase: 'day-accusation', round: g.round,
            players: aliveList(), maxAccusations: g.maxAccusations,
            awayPlayerId: g.haendler_away || null,
        });
        const nominations = Object.values(g.dayNominations);
        if (nominations.length > 0) {
            const tally = {};
            for (const nid of nominations) { if (nid && g.alive.has(nid)) tally[nid] = (tally[nid] ?? 0) + 1; }
            socket.emit('day-accusation-update', {
                tally,
                skipCount: nominations.filter(v => v === null).length,
                totalResponded: nominations.length,
                total: g.alive.size,
                pairs: Object.entries(g.dayNominations).map(([vid, tid]) => ({
                    voter: playerName(room, vid), target: tid ? playerName(room, tid) : null,
                })),
            });
        }
        if (g.dayNominations[socket.id] !== undefined) socket.emit('day-nomination-done');

    } else if (g.phase === 'day-voting') {
        // Anklage-Kontext wie in startDayVoting rekonstruieren
        const counts = {};
        if (g.dayRunoff) {
            (g.dayVoteResult ?? []).forEach(r => { counts[r.id] = r.votes; });
        } else {
            for (const nid of Object.values(g.dayNominations)) { if (nid) counts[nid] = (counts[nid] ?? 0) + 1; }
        }
        socket.emit('phase-changed', {
            phase: 'day-voting', round: g.round,
            accused: g.dayAccused.map(id => ({ id, name: playerName(room, id), count: counts[id] ?? 0 })),
            runoff: g.dayRunoff, awayPlayerId: g.haendler_away || null,
            players: aliveList(),
        });
        const votedIds = Object.keys(g.dayVotes);
        if (votedIds.length > 0) {
            const vcounts = {};
            for (const vid of Object.values(g.dayVotes)) { vcounts[vid] = (vcounts[vid] ?? 0) + 1; }
            socket.emit('day-vote-update', {
                counts: vcounts, totalVoted: votedIds.length, totalVoters: countDayVoters(room, g),
                pairs: Object.entries(g.dayVotes).map(([vid, tid]) => ({
                    voter: playerName(room, vid), target: playerName(room, tid),
                })),
            });
        }
        if (g.dayVotes[socket.id] !== undefined) socket.emit('day-vote-done');

    } else if (g.phase === 'night-summary' || g.phase === 'morning-reveal') {
        socket.emit('phase-changed', { phase: 'night-summary', round: g.round, players: aliveList() });
        if (g.phase === 'morning-reveal' && g.nightSummary) {
            socket.emit('morning-reveal', { deaths: g.nightSummary.deaths });
        }

    } else if (g.phase === 'day-result') {
        socket.emit('phase-changed', {
            phase: 'day-result', round: g.round,
            eliminated: g.dayEliminatedInfo, alsoDied: g.dayAlsoDied,
            skipped: !g.dayEliminatedInfo && (g.dayVoteResult ?? []).length === 0,
            voteResult: g.dayVoteResult, wasRunoff: g.dayRunoff,
            players: aliveList(),
        });

    } else if (g.phase === 'hunter-night-shot' || g.phase === 'hunter-day-shot') {
        // Nicht-Jäger während einer Jäger-Phase
        socket.emit('phase-changed', {
            phase: g.phase, round: g.round,
            hunterName: playerName(room, findPlayerByRole(room, 'Jaeger')),
            players: aliveList(),
        });

    } else if (g.phase === 'game-over' && g.gameOverPayload) {
        socket.emit('game-over', g.gameOverPayload);

    } else {
        socket.emit('phase-changed', { phase: g.phase, round: g.round });
    }

    // Re-send persistent role knowledge on reconnect
    if (g.lovers?.includes(socket.id)) {
        const partner = g.lovers.find(id => id !== socket.id);
        socket.emit('you-are-lovers', { partnerName: playerName(room, partner) });
    }
    if (room.assignments[socket.id] === 'JekylUndHyde') {
        socket.emit('jekyll-state', { isWolf: g.jekyllIsWolf, round: g.round });
    }

    // Send chat history to reconnecting player
    socket.emit('game-chat-history', {
        villageChat: g.villageChat ?? [],
        wolfChat:    isWolf(room, socket.id) ? (g.wolfChat ?? []) : [],
    });
}

function broadcast(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    io.to(roomCode).emit('room-updated', {
        players:            room.players,
        selectedCards:      room.selectedCards,
        messages:           room.messages.slice(-80),
        narratorMode:       room.narratorMode,
        maxAccusations:     room.maxAccusations ?? 3,
        botIntelligence:    room.botIntelligence ?? 2,
        designatedNarrator: room.designatedNarrator ?? null,
    });
    pushVoicePeers(room);
}

// ── Voice chat (WebRTC signaling) ─────────────────────────────────────────────
// Audio läuft Peer-to-Peer zwischen den Browsern; der Server vermittelt nur
// Offer/Answer/ICE und entscheidet, wer in welchem Sprachkanal ist:
//   Lobby & Spielende → 'lobby' (alle) · Tag → 'village' (Tote hören nur zu)
//   Nacht → 'wolf' (nur lebende Werwölfe; der Erzähler hört zu)

function voiceChannelFor(room, id) {
    const player = room.players.find(p => p.id === id);
    if (!player || player.isBot) return null;

    const g = room.game;
    if (!g || room.phase === 'lobby' || g.phase === 'game-over') {
        return { channel: 'lobby', canSpeak: true };
    }
    if (g.phase === 'night') {
        // Wölfe sprechen nur, während ihre Abstimmungsrunde läuft — nicht die ganze Nacht
        const entry    = g.nightQueue?.[g.nightIdx];
        const wolfTurn = entry && !entry.done && entry.group === 'Werwölfe';
        if (!wolfTurn) return null;
        if (g.narratorId === id) return { channel: 'wolf', canSpeak: false };
        if (g.alive.has(id) && entry.playerIds.includes(id)) return { channel: 'wolf', canSpeak: true };
        return null;
    }
    if (g.narratorId === id) return { channel: 'village', canSpeak: true };
    return { channel: 'village', canSpeak: g.alive.has(id) };
}

// Schickt jedem Voice-Teilnehmer seine aktuelle Kanal-Zuordnung und Peer-Liste.
// Der Client baut daraufhin WebRTC-Verbindungen auf bzw. ab.
function pushVoicePeers(room) {
    if (!room.voice || room.voice.size === 0) return;

    const infos = new Map();
    for (const id of room.voice) {
        const info = voiceChannelFor(room, id);
        if (info) infos.set(id, info);
    }

    for (const id of room.voice) {
        const my = infos.get(id) ?? null;
        const peers = my
            ? [...infos.entries()]
                .filter(([pid, info]) => pid !== id && info.channel === my.channel)
                .map(([pid, info]) => ({ id: pid, name: playerName(room, pid), canSpeak: info.canSpeak }))
            : [];
        io.to(id).emit('voice-peers', {
            channel:  my?.channel ?? null,
            canSpeak: my?.canSpeak ?? false,
            peers,
        });
    }
}

// ── Auto-pilot helpers ────────────────────────────────────────────────────────

function clearAutoTimers(g) {
    if (g.autoTimer) { clearTimeout(g.autoTimer); g.autoTimer = null; }
}

function startAutoTurnTimer(code, room, playerIds) {
    const g = room.game;
    clearAutoTimers(g);
    g.autoTimer = setTimeout(() => {
        if (!room.game || !room.game.autoMode || room.game.phase !== 'night') return;
        playerIds.forEach(pid => io.to(pid).emit('auto-skip-warning', { countdown: 10 }));
        g.autoTimer = setTimeout(() => {
            if (!room.game || !room.game.autoMode || room.game.phase !== 'night') return;
            skipNight(code, room);
        }, 10000);
    }, 30000);
}

// ── Bot players (Computer-Mitspieler) ────────────────────────────────────────
// Bots sind normale Einträge in room.players mit isBot: true und einer ID ohne
// Socket dahinter (io.to(botId) ist ein No-Op). Der Server handelt für sie mit
// kurzen Zufalls-Verzögerungen, damit sich ihre Züge natürlich anfühlen.

const BOT_NAMES = [
    'Alwin', 'Berta', 'Cäsar', 'Dora', 'Emil', 'Frieda', 'Gustav', 'Heidi',
    'Ida', 'Jonas', 'Karla', 'Ludwig', 'Martha', 'Nepomuk', 'Olga', 'Paul',
    'Quirin', 'Rosa', 'Siegfried', 'Thea',
];
let botIdCounter = 0;

// Schlauheitsgrad (vom Host einstellbar): useChance = wie zuverlässig ein Bot
// sein Wissen anwendet, forgetChance = nächtliche Chance pro Fakt, ihn zu vergessen
const BOT_INTELLIGENCE = {
    1: { label: 'Einfach', useChance: 0.15, forgetChance: 0.45 },
    2: { label: 'Normal',  useChance: 0.65, forgetChance: 0.20 },
    3: { label: 'Schlau',  useChance: 0.92, forgetChance: 0.05 },
};

// Persönlichkeiten: nominateChance = wie gerne der Bot anklagt, abilityChance =
// wie schnell er riskante Fähigkeiten (Gift, Verhaftung, Glocken) einsetzt,
// betrayChance = Chance, dass Magd/Wildes Kind den Herrn/das Idol absichtlich
// opfern, um dessen Rolle zu erben, followCrowd = wie stark er der Masse folgt
const BOT_PERSONALITIES = {
    aggressiv:      { label: 'aggressiv',      nominateChance: 0.85, abilityChance: 0.35, betrayChance: 0.35, followCrowd: 0.2 },
    zurueckhaltend: { label: 'zurückhaltend',  nominateChance: 0.30, abilityChance: 0.05, betrayChance: 0,    followCrowd: 0.3 },
    mitlaeufer:     { label: 'Mitläufer',      nominateChance: 0.55, abilityChance: 0.10, betrayChance: 0.05, followCrowd: 0.9 },
    ausgewogen:     { label: 'ausgewogen',     nominateChance: 0.60, abilityChance: 0.15, betrayChance: 0.10, followCrowd: 0.5 },
};

function botIntel(room) {
    return BOT_INTELLIGENCE[room.botIntelligence] ?? BOT_INTELLIGENCE[2];
}

function botPersona(room, id) {
    const key = room.players.find(p => p.id === id)?.personality;
    return BOT_PERSONALITIES[key] ?? BOT_PERSONALITIES.ausgewogen;
}

// Wendet der Bot in diesem Moment sein Wissen an? (abhängig vom Schlauheitsgrad)
function botActsSmart(room) {
    return Math.random() < botIntel(room).useChance;
}

function isBotPlayer(room, id) {
    return !!room.players.find(p => p.id === id)?.isBot;
}

function createBot(room) {
    const used = new Set(room.players.map(p => p.name));
    const free = BOT_NAMES.filter(n => !used.has(`🤖 ${n}`));
    const base = free.length ? free[Math.floor(Math.random() * free.length)] : `Bot ${botIdCounter + 1}`;
    botIdCounter++;
    return {
        id: `bot_${botIdCounter}_${Date.now().toString(36)}`,
        name: `🤖 ${base}`,
        isHost: false, isReady: true, isBot: true, requestedCard: null,
        personality: pickRandom(Object.keys(BOT_PERSONALITIES)),
    };
}

function addBotTimer(g, fn, ms) {
    if (!g.botTimers) g.botTimers = [];
    g.botTimers.push(setTimeout(fn, ms));
}

function clearBotTimers(g) {
    g?.botTimers?.forEach(clearTimeout);
    if (g) g.botTimers = [];
}

function botDelay() { return 1500 + Math.random() * 3000; }

function pickRandom(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }

// ── Bot-Gedächtnis ────────────────────────────────────────────────────────────
// Jeder Bot merkt sich Fakten wie ein menschlicher Spieler: sichere Werwölfe,
// geklärte Unschuldige, bereits angesehene Spieler (Seherin) und einen
// Verdachtszähler. Nächtliches Vergessen macht das Ganze menschlich-fehlbar.

function botMemoryOf(g, botId) {
    if (!g.botMemory) g.botMemory = {};
    if (!g.botMemory[botId]) {
        g.botMemory[botId] = {
            knownWolves: new Set(),  // sicher Werwolf
            cleared:     new Set(),  // sicher kein Werwolf
            seen:        new Set(),  // von der Seherin bereits angesehen
            suspicion:   {},         // playerId -> Verdachtspunkte
        };
    }
    return g.botMemory[botId];
}

function memLearnWolf(g, botId, targetId) {
    const m = botMemoryOf(g, botId);
    m.knownWolves.add(targetId);
    m.cleared.delete(targetId);
}

function memLearnCleared(g, botId, targetId) {
    const m = botMemoryOf(g, botId);
    if (!m.knownWolves.has(targetId)) m.cleared.add(targetId);
}

function memSuspect(g, botId, targetId, points) {
    const m = botMemoryOf(g, botId);
    m.suspicion[targetId] = (m.suspicion[targetId] ?? 0) + points;
}

// Öffentliche Information: alle lebenden Bots lernen sie gleichzeitig
function memBroadcastCleared(room, g, targetId) {
    room.players.filter(p => p.isBot && g.alive.has(p.id) && p.id !== targetId)
        .forEach(p => memLearnCleared(g, p.id, targetId));
}

function memBroadcastSuspect(room, g, targetId, points) {
    room.players.filter(p => p.isBot && g.alive.has(p.id) && p.id !== targetId)
        .forEach(p => memSuspect(g, p.id, targetId, points));
}

// Nächtliches Vergessen: je nach Schlauheitsgrad gehen Fakten wieder verloren
function botMemoryNightlyForget(room, g) {
    const { forgetChance } = botIntel(room);
    for (const m of Object.values(g.botMemory ?? {})) {
        for (const set of [m.knownWolves, m.cleared, m.seen]) {
            for (const id of [...set]) {
                if (Math.random() < forgetChance) set.delete(id);
            }
        }
        for (const [id, v] of Object.entries(m.suspicion)) {
            const decayed = v * (Math.random() < forgetChance ? 0.4 : 0.85);
            if (decayed < 0.3) delete m.suspicion[id];
            else m.suspicion[id] = decayed;
        }
    }
}

// Spieler, die dieser Bot niemals angreift: Liebespartner und Katz/Maus-Partner
// (dieses Wissen vergisst auch ein Bot nie)
function botBondedIds(room, g, botId) {
    const bonded = new Set();
    if (g.lovers?.includes(botId)) bonded.add(g.lovers.find(id => id !== botId));
    const rid = room.assignments[botId];
    if (rid === 'Katze') { const m = findPlayerByRole(room, 'Maus');  if (m) bonded.add(m); }
    if (rid === 'Maus')  { const k = findPlayerByRole(room, 'Katze'); if (k) bonded.add(k); }
    return bonded;
}

// Herr (Magd) bzw. Idol (Wildes Kind): wird normalerweise geschont — außer der
// Bot opfert ihn absichtlich, um die Rolle zu erben (Persönlichkeitsstrategie)
function botMasterId(room, g, botId) {
    const rid = room.assignments[botId];
    if (rid === 'ErgebeneMagd' && g.magd_herr && g.alive.has(g.magd_herr)) return g.magd_herr;
    if (rid === 'WildesKind' && g.wildesKind_idol && !g.wildesKind_isWolf && g.alive.has(g.wildesKind_idol)) return g.wildesKind_idol;
    return null;
}

// Wählt ein Angriffsziel: bekannte Wölfe zuerst, dann höchster Verdacht;
// Geklärte werden gemieden. Das Zufallsrauschen hält Bots unberechenbar.
function botPickSuspect(g, botId, candidateIds) {
    if (!candidateIds.length) return null;
    const m = botMemoryOf(g, botId);
    const wolves = candidateIds.filter(id => m.knownWolves.has(id));
    if (wolves.length) return pickRandom(wolves);
    const unclear = candidateIds.filter(id => !m.cleared.has(id));
    const pool = unclear.length ? unclear : candidateIds;
    let best = null, bestScore = -Infinity;
    for (const id of pool) {
        const score = (m.suspicion[id] ?? 0) + Math.random();
        if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
}

// Wählt ein Schutz-/Vertrauensziel: möglichst unverdächtig, gerne geklärt
function botPickTrusted(g, botId, candidateIds) {
    if (!candidateIds.length) return null;
    const m = botMemoryOf(g, botId);
    const safe = candidateIds.filter(id => !m.knownWolves.has(id));
    const pool = safe.length ? safe : candidateIds;
    let best = null, bestScore = Infinity;
    for (const id of pool) {
        const score = (m.suspicion[id] ?? 0) - (m.cleared.has(id) ? 1 : 0) + Math.random();
        if (score < bestScore) { bestScore = score; best = id; }
    }
    return best;
}

// Entscheidet, was ein Bot in seiner Nachtrunde tut — mit Gedächtnis,
// Persönlichkeit und einstellbarem Schlauheitsgrad statt purem Zufall
function botNightPayload(room, g, entry, botId) {
    const targets = buildNightTargetsFor(room, g, entry, botId);
    const ids     = targets.map(t => t.id);
    const persona = botPersona(room, botId);
    const mem     = botMemoryOf(g, botId);
    const bonded  = botBondedIds(room, g, botId);
    const pickId  = () => pickRandom(ids) ?? null;

    if (entry.group === 'Glöckner') return Math.random() < persona.abilityChance ? { targetId: '__ring__' } : {};
    if (entry.group === 'Dieb')     return Math.random() < 0.5 ? { targetId: pickRandom(g.diebOptions ?? []) } : {};

    if (entry.group === 'Gendarm') {
        // Verhaften ist riskant: bei einem Unschuldigen stirbt der Gendarm mit.
        const candidates = ids.filter(id => !bonded.has(id));
        if (botActsSmart(room)) {
            const knownWolf = candidates.find(id => mem.knownWolves.has(id));
            if (knownWolf && Math.random() < 0.8) return { targetId: knownWolf };
            return {}; // kein sicheres Ziel → lieber warten
        }
        return Math.random() < persona.abilityChance * 0.4 ? { targetId: pickRandom(candidates) } : {};
    }

    if (entry.actionType === 'view') {
        // Seherin: niemanden doppelt ansehen, Verdächtige zuerst
        let pool = ids.filter(id => !mem.seen.has(id));
        if (botActsSmart(room)) {
            const uninformative = id => mem.cleared.has(id) || mem.knownWolves.has(id) || bonded.has(id);
            const fresh = pool.filter(id => !uninformative(id));
            if (fresh.length) pool = fresh;
        }
        if (!pool.length) pool = ids;
        return { targetId: botPickSuspect(g, botId, pool) };
    }

    if (entry.actionType === 'witch') {
        // Die Hexe sieht dasselbe Opfer wie ein menschlicher Spieler
        const victim = buildWitchExtra(room, g).victim?.id ?? null;
        if (victim) memLearnCleared(g, botId, victim); // Wolfsopfer ist kein Wolf

        // Sich selbst oder den Partner rettet die Hexe immer
        if (victim && !g.hexeUsedHeal && (victim === botId || bonded.has(victim))) return { heal: true };
        if (victim && !g.hexeUsedHeal) {
            const healChance = (botActsSmart(room) && mem.cleared.has(victim) ? 0.4 : 0.3) + persona.abilityChance;
            if (Math.random() < healChance) return { heal: true };
        }
        if (!g.hexeUsedPoison && Math.random() < persona.abilityChance) {
            let pool = ids.filter(id => id !== victim && !bonded.has(id));
            if (botActsSmart(room)) {
                const wolf = pool.find(id => mem.knownWolves.has(id));
                if (wolf) return { poisonTargetId: wolf };
                pool = pool.filter(id => !mem.cleared.has(id));
            }
            const tid = botPickSuspect(g, botId, pool);
            if (tid) return { poisonTargetId: tid };
        }
        return {};
    }

    switch (entry.actionType) {
        case 'select-two': {
            const two = shuffle(ids).slice(0, 2);
            return two.length === 2 ? { targets: two } : {};
        }
        default: {
            // Schutz-/Bindungsrollen suchen sich vertrauenswürdige Ziele
            const protective = ['Dorfmatratze', 'Silberschmied', 'Ergebene Magd', 'Wildes Kind', 'Händler'].includes(entry.group);
            if (protective && botActsSmart(room)) {
                return { targetId: botPickTrusted(g, botId, ids.filter(id => !bonded.has(id))) ?? pickId() };
            }
            return { targetId: pickId() };
        }
    }
}

// Plant die Züge aller Bots der gerade aktiven Nachtrolle
function scheduleBotNightTurns(code, room) {
    const g = room.game;
    if (!g || g.phase !== 'night') return;
    clearBotTimers(g);
    const entry = g.nightQueue[g.nightIdx];
    if (!entry || entry.done) return;

    if (entry.actionType === 'kill') { scheduleBotWolfSync(code, room, entry); return; }

    entry.playerIds.filter(id => isBotPlayer(room, id)).forEach(botId => {
        addBotTimer(g, () => {
            if (room.game !== g || g.phase !== 'night') return;
            if (g.nightQueue[g.nightIdx] !== entry || entry.done) return;
            const payload = botNightPayload(room, g, entry, botId);
            const done = processNightAction(code, room, entry, botId, payload);
            if (done && g.autoMode) {
                clearAutoTimers(g);
                g.autoTimer = setTimeout(() => {
                    if (room.game?.phase === 'night') advanceNight(code, room);
                }, 800);
            }
        }, botDelay());
    });
}

// Werwolf-Bots: schließen sich dem führenden Kandidaten an und bestätigen die
// Mehrheit. Wird nach jeder Stimmabgabe erneut aufgerufen, bis das Opfer steht.
function scheduleBotWolfSync(code, room, entry) {
    const g = room.game;
    if (!g || g.phase !== 'night' || entry.done) return;
    clearBotTimers(g);

    const bots = entry.playerIds.filter(id => isBotPlayer(room, id));
    if (bots.length === 0) return;

    bots.forEach(botId => {
        addBotTimer(g, () => {
            if (room.game !== g || g.phase !== 'night') return;
            if (g.nightQueue[g.nightIdx] !== entry || entry.done) return;

            const counts    = getVoteCounts(g.wolfVotes);
            const threshold = Math.floor(entry.playerIds.length / 2) + 1;
            const leader    = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
            const desired   = leader ?? pickRandom(buildNightTargetsFor(room, g, entry, botId))?.id;
            if (!desired) return;

            if (g.wolfVotes[botId] !== desired) {
                // processNightAction ruft scheduleBotWolfSync erneut auf
                processNightAction(code, room, entry, botId, { vote: desired });
            } else if (getMajorityTarget(counts, threshold) === desired && !g.wolfConfirms.has(botId)) {
                processNightAction(code, room, entry, botId, { confirm: true });
            }
        }, botDelay());
    });
}

// Bots klagen nach kurzer "Bedenkzeit" an oder überspringen die Runde —
// Persönlichkeit bestimmt die Anklagefreude, das Gedächtnis das Ziel
function scheduleBotNominations(code, room) {
    const g = room.game;
    if (!g) return;
    clearBotTimers(g);
    room.players.filter(p => p.isBot && g.alive.has(p.id)).forEach(bot => {
        if (g.dayNominations[bot.id] !== undefined) return; // Narr/Händler-Ziel bereits vorregistriert
        addBotTimer(g, () => {
            if (room.game !== g || g.phase !== 'day-accusation') return;
            if (g.dayNominations[bot.id] !== undefined) return;

            const persona = botPersona(room, bot.id);
            const mem     = botMemoryOf(g, bot.id);
            const bonded  = botBondedIds(room, g, bot.id);
            const master  = botMasterId(room, g, bot.id);
            const betray  = master && Math.random() < persona.betrayChance;

            // Werwolf-Bots klagen keine Rudelmitglieder an, niemand seinen Partner
            let candidates = [...g.alive].filter(id =>
                id !== bot.id &&
                id !== g.haendler_away &&
                !bonded.has(id) &&
                !(isWolf(room, bot.id) && isWolf(room, id)));
            // Herr/Idol wird geschont — außer der Bot will die Rolle absichtlich erben
            if (master && !betray) candidates = candidates.filter(id => id !== master);

            let target = null;
            if (betray && candidates.includes(master)) {
                target = master;
            } else if (botActsSmart(room)) {
                const knownWolf = candidates.find(id => mem.knownWolves.has(id));
                if (knownWolf && !isWolf(room, bot.id)) {
                    target = knownWolf; // sicheres Wissen → immer anklagen
                } else if (Math.random() < persona.nominateChance) {
                    let pool = candidates.filter(id => !mem.cleared.has(id));
                    if (!pool.length) pool = candidates;
                    // Mitläufer springen auf bereits laufende Anklagen auf
                    const tally = {};
                    for (const nid of Object.values(g.dayNominations)) {
                        if (nid) tally[nid] = (tally[nid] ?? 0) + 1;
                    }
                    const crowd = pool.filter(id => tally[id]);
                    target = (crowd.length && Math.random() < persona.followCrowd)
                        ? pickRandom(crowd)
                        : botPickSuspect(g, bot.id, pool);
                }
            } else if (Math.random() < persona.nominateChance) {
                target = pickRandom(candidates);
            }
            castDayNomination(code, room, bot.id, target);
        }, 2000 + Math.random() * 6000);
    });
}

// Bots stimmen über die Angeklagten ab (Werwolf-Bots schonen das Rudel,
// niemand stimmt gegen den eigenen Partner)
function scheduleBotDayVotes(code, room) {
    const g = room.game;
    if (!g) return;
    clearBotTimers(g);
    room.players.filter(p => p.isBot && g.alive.has(p.id)).forEach(bot => {
        if (g.haendler_away === bot.id) return;
        if (findPlayerByRole(room, 'Narr') === bot.id) return;
        addBotTimer(g, () => {
            if (room.game !== g || g.phase !== 'day-voting') return;
            if (g.dayVotes[bot.id] !== undefined) return;

            const persona = botPersona(room, bot.id);
            const mem     = botMemoryOf(g, bot.id);
            const bonded  = botBondedIds(room, g, bot.id);

            let options = g.dayAccused.filter(id => id !== bot.id && g.alive.has(id));
            const noBond = options.filter(id => !bonded.has(id));
            if (noBond.length) options = noBond;
            if (isWolf(room, bot.id)) {
                const nonWolf = options.filter(id => !isWolf(room, id));
                if (nonWolf.length) options = nonWolf;
            }
            if (!options.length) options = g.dayAccused.filter(id => g.alive.has(id));

            let target = null;
            if (botActsSmart(room)) {
                target = options.find(id => mem.knownWolves.has(id)) ?? null;
                if (!target) {
                    const unclear = options.filter(id => !mem.cleared.has(id));
                    if (unclear.length) options = unclear;
                }
            }
            if (!target && Math.random() < persona.followCrowd) {
                // Mitläufer: stimmt für den aktuell Führenden
                const counts = {};
                for (const vid of Object.values(g.dayVotes)) counts[vid] = (counts[vid] ?? 0) + 1;
                target = options.filter(id => counts[id]).sort((a, b) => counts[b] - counts[a])[0] ?? null;
            }
            if (!target) target = botPickSuspect(g, bot.id, options);
            if (target) castDayVote(code, room, bot.id, target);
        }, 2000 + Math.random() * 5000);
    });
}

// Bot-Jäger schießt nach kurzer Pause — auf Verdächtige statt blind,
// und niemals auf den eigenen Partner
function scheduleBotHunterShot(code, room) {
    const g = room.game;
    const jaegerId = findPlayerByRole(room, 'Jaeger');
    if (!jaegerId || !isBotPlayer(room, jaegerId)) return;
    clearBotTimers(g);
    const phase = g.phase;
    addBotTimer(g, () => {
        if (room.game !== g || g.phase !== phase) return;
        const bonded  = botBondedIds(room, g, jaegerId);
        const targets = hunterShootTargets(room, g).map(t => t.id);
        let pool = targets.filter(id => !bonded.has(id));
        if (!pool.length) pool = targets;
        const target = botActsSmart(room)
            ? botPickSuspect(g, jaegerId, pool)
            : pickRandom(pool);
        if (phase === 'hunter-night-shot') resolveNightHunterShot(code, room, target);
        else                               resolveDayHunterShot(code, room, target);
    }, 2500 + Math.random() * 2000);
}

// Jäger starb in der Nacht und schießt (oder wird übersprungen: targetId = null)
function resolveNightHunterShot(code, room, targetId) {
    const g = room.game;
    clearAutoTimers(g);
    const jaegerId = findPlayerByRole(room, 'Jaeger');
    let shotInfo    = null;
    let extraDeaths = [];
    if (targetId && g.alive.has(targetId) && !g.pendingDeaths.has(targetId) && targetId !== g.haendler_away) {
        addEvent(g, `${playerName(room, jaegerId)} (Jäger) erschoss ${playerName(room, targetId)}.`);
        const deaths = applyDeath(code, room, targetId);
        shotInfo    = deaths[0] ?? null;
        extraDeaths = deaths.slice(1);
    } else {
        addEvent(g, 'Der Jäger hat nicht geschossen.');
    }
    const remainingDeaths = (g.nightSummary?.deaths ?? []).filter(d => d.id !== jaegerId);
    io.to(code).emit('morning-full-reveal', {
        deaths: [...remainingDeaths, ...extraDeaths],
        hunterShot: shotInfo,
    });
    g.phase = 'morning-reveal'; // Übergangsphase verhindert doppeltes Weiterschalten
    setTimeout(() => {
        if (room.game === g && g.phase === 'morning-reveal') startDay(code, room);
    }, 2500);
}

function doPhaseAdvance(code, room) {
    const g = room.game;
    if (!g) return;
    if (g.phase === 'day-prep') {
        startNight(code, room);
    } else if (g.phase === 'night') {
        // Weiter nur, wenn die aktive Rolle fertig ist — Überspringen geht separat via phase-skip
        const entry = g.nightQueue[g.nightIdx];
        if (entry && !entry.done) return;
        advanceNight(code, room);
    } else if (g.phase === 'night-summary') {
        const deaths   = g.nightSummary?.deaths ?? [];
        const jaegerId = findPlayerByRole(room, 'Jaeger');
        const jaegerDied = jaegerId && deaths.some(d => d.id === jaegerId);
        if (jaegerDied) {
            const hunterDeath = deaths.find(d => d.id === jaegerId);
            io.to(code).emit('morning-partial-reveal', { hunterDeath });
            g.phase = 'hunter-night-shot';
            io.to(jaegerId).emit('hunter-shoot', { targets: hunterShootTargets(room, g) });
            addEvent(g, `${playerName(room, jaegerId)} (Jäger) reißt jemanden mit in den Tod.`);
            narratorPush(g, {
                phase: 'hunter-night-shot', round: g.round,
                hunterName: playerName(room, jaegerId),
                events: g.events, players: playerStatusList(room, g),
            });
            if (g.autoMode) {
                clearAutoTimers(g);
                g.autoTimer = setTimeout(() => {
                    if (room.game?.phase === 'hunter-night-shot') resolveNightHunterShot(code, room, null);
                }, 45000);
            }
            scheduleBotHunterShot(code, room);
        } else {
            io.to(code).emit('morning-reveal', { deaths });
            g.phase = 'morning-reveal'; // Übergangsphase verhindert doppeltes Weiterschalten
            setTimeout(() => {
                if (room.game === g && g.phase === 'morning-reveal') startDay(code, room);
            }, 2500);
        }
    } else if (g.phase === 'hunter-night-shot') {
        resolveNightHunterShot(code, room, null);
    } else if (g.phase === 'hunter-day-shot') {
        resolveDayHunterShot(code, room, null);
    } else if (g.phase === 'day-accusation') {
        // Erzähler erzwingt das Ende der Anklage-Phase (z. B. bei AFK-Spielern)
        addEvent(g, 'Der Erzähler beendet die Anklage-Phase.');
        processDayNominations(code, room);
    } else if (g.phase === 'day-voting') {
        addEvent(g, 'Der Erzähler beendet die Abstimmung.');
        processDayVotes(code, room);
    } else if (g.phase === 'day-result') {
        startNight(code, room);
    }
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Returns shuffled array of exactly n cards maintaining wolf balance,
// or a string error message if it's impossible.
function pickBalanced(selectedCards, n) {
    const wolves    = selectedCards.filter(id =>  WOLF_IDS.has(id));
    const nonWolves = selectedCards.filter(id => !WOLF_IDS.has(id));
    const maxWolves = Math.floor(n / 3);

    if (wolves.length === 0) return 'Mindestens 1 Werwolf muss ausgewählt sein.';

    const wolfCount    = Math.min(wolves.length, maxWolves);
    const nonWolfCount = n - wolfCount;

    if (nonWolves.length < nonWolfCount) {
        return `Nicht genug Dorfbewohner-Karten ausgewählt (benötigt: ${nonWolfCount}, vorhanden: ${nonWolves.length}).`;
    }

    return shuffle([
        ...shuffle(wolves).slice(0, wolfCount),
        ...shuffle(nonWolves).slice(0, nonWolfCount),
    ]);
}

// ── Wolf-vote helpers ─────────────────────────────────────────────────────────

function getVoteCounts(wolfVotes) {
    const counts = {};
    for (const tid of Object.values(wolfVotes)) {
        if (tid) counts[tid] = (counts[tid] || 0) + 1;
    }
    return counts;
}

function getMajorityTarget(voteCounts, threshold) {
    const found = Object.entries(voteCounts).find(([, c]) => c >= threshold);
    return found ? found[0] : null;
}

function broadcastWolfVotes(code, room, entry, g) {
    const voteCounts    = getVoteCounts(g.wolfVotes);
    const wolfCount     = entry.playerIds.length;
    const threshold     = Math.floor(wolfCount / 2) + 1;
    const majorityTarget = getMajorityTarget(voteCounts, threshold);

    entry.playerIds.forEach(pid => {
        io.to(pid).emit('wolf-vote-update', {
            voteCounts,
            majorityTarget,
            majorityTargetName: majorityTarget ? playerName(room, majorityTarget) : null,
            myVote:        g.wolfVotes[pid] ?? null,
            confirmedCount: g.wolfConfirms.size,
            totalWolves:   wolfCount,
            threshold,
            iConfirmed:    g.wolfConfirms.has(pid),
        });
    });

    // Keep narrator informed of vote progress
    const voteDesc = Object.entries(voteCounts)
        .map(([tid, c]) => `${playerName(room, tid)}: ${c}`)
        .join(', ') || 'Keine Stimmen';
    narratorPush(g, {
        phase: 'night', round: g.round,
        activeEntry: {
            group: entry.group, hint: entry.hint, actionType: entry.actionType,
            playerNames: entry.playerIds.map(id => playerName(room, id)),
            done: false, wolfVoteSummary: voteDesc,
        },
        events: g.events, players: playerStatusList(room, g), waiting: true,
    });
}

// ── Game helpers ──────────────────────────────────────────────────────────────

function playerName(room, id) {
    return room.players.find(p => p.id === id)?.name ?? '???';
}

function roleName(assignments, id) {
    return ROLE_NAMES[assignments?.[id]] ?? assignments?.[id] ?? '???';
}

function addEvent(game, text) {
    game.events.push({ text, time: Date.now() });
    if (game.events.length > 300) game.events.shift();
}

function playerStatusList(room, game) {
    return room.players
        .filter(p => p.id !== game.narratorId)
        .map(p => ({
            id:      p.id,
            name:    p.name,
            isAlive: game.alive.has(p.id),
            roleId:  room.assignments[p.id],
        }));
}

function narratorPush(game, payload) {
    if (game.narratorId) io.to(game.narratorId).emit('narrator-update', payload);
    game.spectators?.forEach(sid => io.to(sid).emit('narrator-update', payload));
}

function findPlayerByRole(room, roleId) {
    return Object.entries(room.assignments ?? {}).find(([, rid]) => rid === roleId)?.[0] ?? null;
}

function freshGameState(room, narratorPlayerId, assignments) {
    return {
        round:          1,
        phase:          'day-prep',
        narratorId:     narratorPlayerId,
        autoMode:       !narratorPlayerId,
        autoTimer:      null,
        alive:          new Set(Object.keys(assignments)),
        events:         [],
        hexeUsedHeal:   false,
        hexeUsedPoison: false,
        nightVictim:    null,
        lovers:         null,
        nightQueue:     [],
        nightIdx:       -1,
        pendingDeaths:  new Set(),
        nightLog:       [],
        maxAccusations: room.maxAccusations ?? 3,
        dayNominations: {},
        dayAccused:     [],
        dayVotes:       {},
        dayRunoff:      false,
        dayVoteResult:  null,
        dayAlsoDied:    [],
        dayEliminatedInfo:       null,
        magd_herr:               null,
        wildesKind_idol:         null,
        wildesKind_isWolf:       false,
        alter_lives:             2,
        silberschmied_protected: null,
        einsamerWolf_target:     null,
        jack_target:             null,
        jack_isWolf:             false,
        jekyllIsWolf:            false,
        zigeunerin_cursePending: false,
        zigeunerin_target:       null,
        gendarm_target:          null,
        gendarm_used:            false,
        gloeckner_used:          false,
        diebOptions:             null,
        spectators:              new Set(),
        villageChat:             [],
        wolfChat:                [],
        botTimers:               [],
        botMemory:               {},
        reveals:                 [],   // Besondere Ereignisse für die Auflösung am Spielende
    };
}

// Kills a player outside the night resolution (day vote, hunter shot, disconnect).
// Applies the lover cascade and role transforms; returns info objects for every death.
function applyDeath(code, room, deadId) {
    const g = room.game;
    const deaths = [];
    const kill = (id) => {
        if (!g.alive.has(id)) return;
        g.alive.delete(id);
        deaths.push({
            id,
            name:     playerName(room, id),
            roleId:   room.assignments[id],
            roleName: roleName(room.assignments, id),
        });
        tryMagdTransform(code, room, id);
        tryWildesKindTransform(code, room, id);
        if (!isBotPlayer(room, id)) g.spectators.add(id);
        io.to(id).emit('you-are-dead');
    };
    kill(deadId);
    if (g.lovers?.includes(deadId)) {
        const partner = g.lovers.find(id => id !== deadId);
        if (partner && g.alive.has(partner)) {
            kill(partner);
            addEvent(g, `Liebespaar: ${playerName(room, partner)} stirbt mit.`);
        }
    }
    pushVoicePeers(room);
    return deaths;
}

function tryMagdTransform(code, room, deadId) {
    const g = room.game;
    if (!g.magd_herr || g.magd_herr !== deadId) return;

    const magdId = findPlayerByRole(room, 'ErgebeneMagd');
    if (!magdId || !g.alive.has(magdId)) return;

    const newRoleId   = room.assignments[deadId];
    const newRoleName = ROLE_NAMES[newRoleId] ?? newRoleId;
    const herrName    = playerName(room, deadId);

    room.assignments[magdId] = newRoleId;
    g.magd_herr = null;

    // Reset role-specific state so the Magd starts with full fresh abilities
    if (newRoleId === 'Hexe') {
        g.hexeUsedHeal   = false;
        g.hexeUsedPoison = false;
    }
    // (Alter, Glöckner, Gendarm: reset when those roles are implemented)

    addEvent(g, `Die Ergebene Magd übernimmt die Rolle von ${herrName}: ${newRoleName}.`);
    g.reveals.push(`${playerName(room, magdId)} war die Ergebene Magd und übernahm die Rolle von ${herrName}: ${newRoleName}.`);
    io.to(magdId).emit('magd-transform', { herrName, roleId: newRoleId, roleName: newRoleName });
}

function tryWildesKindTransform(code, room, deadId) {
    const g = room.game;
    if (!g.wildesKind_idol || g.wildesKind_idol !== deadId) return;
    if (g.wildesKind_isWolf) return;

    const wkId = findPlayerByRole(room, 'WildesKind');
    if (!wkId || !g.alive.has(wkId)) return;

    g.wildesKind_isWolf = true;
    g.wildesKind_idol   = null;

    const idolName = playerName(room, deadId);
    addEvent(g, `Das Wilde Kind mutiert zum Werwolf — Idol ${idolName} ist gestorben.`);
    g.reveals.push(`${playerName(room, wkId)} (Wildes Kind) wurde zum Werwolf, weil Idol ${idolName} starb.`);
    io.to(wkId).emit('wildeskind-transform', { idolName });
}

function buildNightQueue(assignments, alive, round, g) {
    const queue = [];
    for (const tpl of NIGHT_ORDER) {
        if (tpl.firstNightOnly  && round > 1)          continue;
        if (tpl.everySecondNight && round % 2 !== 0)   continue;
        if (tpl.group === 'Glöckner'        && g?.gloeckner_used)  continue;
        if (tpl.group === 'Gendarm'         && g?.gendarm_used)    continue;
        if (tpl.group === 'Jack the Ripper' && g?.jack_isWolf)     continue;

        let pids;
        if (tpl.group === 'Zigeunerin') {
            // Fluch-Runde: nur nach ihrem Anklage-Tod — sie handelt als Tote
            if (!g?.zigeunerin_cursePending) continue;
            const zigId = Object.entries(assignments).find(([, rid]) => rid === 'Zigeunerin')?.[0];
            pids = zigId ? [zigId] : [];
        } else {
            pids = Object.entries(assignments)
                .filter(([pid, rid]) => tpl.roleIds.includes(rid) && alive.has(pid))
                .map(([pid]) => pid);
        }

        if (pids.length === 0) continue;

        queue.push({
            group:      tpl.group,
            playerIds:  pids,
            actionType: tpl.actionType,
            hint:       tpl.hint,
            done:       false,
        });
    }
    return queue;
}

// Adds transformed wolves (Wildes Kind, Jack, Hyde) to the wolf night turn.
// Creates the wolf entry if no natural-born wolf is alive anymore.
function addTransformedWolves(room, g) {
    const extraIds = [];
    const pushIfAlive = (roleId, condition) => {
        if (!condition) return;
        const pid = findPlayerByRole(room, roleId);
        if (pid && g.alive.has(pid)) extraIds.push(pid);
    };
    pushIfAlive('WildesKind',    g.wildesKind_isWolf);
    pushIfAlive('JackTheRipper', g.jack_isWolf);
    pushIfAlive('JekylUndHyde',  g.jekyllIsWolf);

    if (extraIds.length === 0) return;

    let wolfEntry = g.nightQueue.find(e => e.group === 'Werwölfe');
    if (!wolfEntry) {
        wolfEntry = {
            group: 'Werwölfe', playerIds: [], actionType: 'kill',
            hint: 'Wählt gemeinsam ein Opfer aus.', done: false,
        };
        const tpl     = NIGHT_ORDER.find(t => t.group === 'Werwölfe');
        const wolfIdx = NIGHT_ORDER.indexOf(tpl);
        const insertAt = g.nightQueue.findIndex(e =>
            NIGHT_ORDER.findIndex(t => t.group === e.group) > wolfIdx);
        if (insertAt === -1) g.nightQueue.push(wolfEntry);
        else                 g.nightQueue.splice(insertAt, 0, wolfEntry);
    }
    extraIds.forEach(id => {
        if (!wolfEntry.playerIds.includes(id)) wolfEntry.playerIds.push(id);
    });
}

function startNight(code, room) {
    const g = room.game;
    g.phase = 'night';

    // Bots vergessen über Nacht einen Teil ihres Wissens (menschlicher)
    botMemoryNightlyForget(room, g);

    // Jekyll & Hyde wechselt jede Nacht die Seite: ungerade Nächte Jekyll (Dorf), gerade Nächte Hyde (Wolf)
    const jekyllId = findPlayerByRole(room, 'JekylUndHyde');
    if (jekyllId && g.alive.has(jekyllId)) {
        g.jekyllIsWolf = g.round % 2 === 0;
        io.to(jekyllId).emit('jekyll-state', { isWolf: g.jekyllIsWolf, round: g.round });
    }

    g.nightQueue = buildNightQueue(room.assignments, g.alive, g.round, g);
    addTransformedWolves(room, g);
    g.nightIdx    = -1;
    g.nightVictim        = null;
    g.hexeHealTarget     = null;
    g.hexePoisonTarget   = null;
    g.pendingDeaths      = new Set();
    g.nightLog           = [];
    g.dorfmatraze_sleep     = null;
    g.dorfmatraze_protected = false;
    g.haendler_away         = null;
    g.wolfVotes             = {};
    g.wolfConfirms          = new Set();
    g.einsamerWolf_target   = null;
    g.jack_target           = null;
    g.gendarm_target        = null;
    g.zigeunerin_target     = null;

    addEvent(g, `Nacht ${g.round} beginnt.`);
    io.to(code).emit('phase-changed', { phase: 'night', round: g.round });
    pushVoicePeers(room);
    advanceNight(code, room);
}

// Target list for a night-turn player — shared by advanceNight and reconnect push
function buildNightTargetsFor(room, g, entry, pid) {
    const targets = room.players.filter(p =>
        g.alive.has(p.id) && p.id !== g.narratorId
    ).map(p => ({ id: p.id, name: p.name }));

    if (entry.group === 'Dieb' && g.diebOptions?.length > 0) {
        return g.diebOptions.map(rid => ({ id: rid, name: ROLE_NAMES[rid] ?? rid }));
    }
    if (entry.group === 'Glöckner') {
        return [{ id: '__ring__', name: 'Glocken läuten' }];
    }
    if (entry.group === 'Einsamer Wolf' || entry.group === 'Zigeunerin') {
        return targets.filter(t => isWolf(room, t.id));
    }
    if (entry.actionType === 'kill') {
        return targets.filter(t => !isWolf(room, t.id));
    }
    if (entry.group === 'Amor') {
        return targets; // Amor darf sich selbst ins Liebespaar aufnehmen
    }
    return targets.filter(t => t.id !== pid);
}

function buildWitchExtra(room, g) {
    // Hide the wolf victim from Hexe if the victim is the protected Dorfmatratze
    const dorfmatrazeId = Object.entries(room.assignments)
        .find(([id, rid]) => rid === 'Dorfmatraze' && g.alive.has(id))?.[0];
    const victimIsProtected = dorfmatrazeId && g.nightVictim === dorfmatrazeId;
    return {
        victim: (g.nightVictim && !victimIsProtected)
            ? { id: g.nightVictim, name: playerName(room, g.nightVictim) }
            : null,
        canHeal:   !g.hexeUsedHeal,
        canPoison: !g.hexeUsedPoison,
    };
}

function advanceNight(code, room) {
    const g = room.game;
    g.nightIdx++;

    if (g.nightIdx >= g.nightQueue.length) { endNight(code, room); return; }

    const entry = g.nightQueue[g.nightIdx];

    addEvent(g, `${entry.group} ist am Zug.`);

    // Notify active role players
    entry.playerIds.forEach(pid => {
        const extra = entry.actionType === 'witch' ? buildWitchExtra(room, g) : {};
        io.to(pid).emit('your-night-turn', {
            group: entry.group, actionType: entry.actionType,
            hint: entry.hint,
            players: buildNightTargetsFor(room, g, entry, pid),
            extra,
        });
    });

    // Tell all others: eyes closed (activePlayers list lets the client skip if it's the active one)
    io.to(code).emit('night-waiting', {
        activeGroup:   entry.group,
        activePlayers: entry.playerIds,
        autoStatusMsg: g.autoMode ? (AUTO_NIGHT_MSGS[entry.group] ?? null) : null,
    });

    if (g.autoMode) startAutoTurnTimer(code, room, entry.playerIds);

    // Update narrator
    narratorPush(g, {
        phase: 'night', round: g.round,
        activeEntry: {
            group: entry.group, hint: entry.hint,
            actionType: entry.actionType,
            playerNames: entry.playerIds.map(id => playerName(room, id)),
        },
        events:  g.events,
        players: playerStatusList(room, g),
        waiting: true,
    });

    // Wolfsrunde beginnt/endet → Voice-Kanäle neu zuordnen
    pushVoicePeers(room);

    scheduleBotNightTurns(code, room);
}

function skipNight(code, room) {
    const g = room.game;
    const entry = g.nightQueue[g.nightIdx];
    if (entry) addEvent(g, `${entry.group} wurde übersprungen.`);
    advanceNight(code, room);
}

// Valid targets for the Jäger's revenge shot (night: before deaths applied; day: after)
function hunterShootTargets(room, g) {
    const jaegerId = findPlayerByRole(room, 'Jaeger');
    return [...g.alive]
        .filter(id => id !== jaegerId && !g.pendingDeaths.has(id) && id !== g.haendler_away)
        .map(id => ({ id, name: playerName(room, id) }));
}

function processNightAction(code, room, entry, actorId, payload) {
    const g = room.game;
    const aname = playerName(room, actorId);

    if (entry.actionType === 'kill') {
        if (payload.vote !== undefined) {
            // Wolf casts/changes their vote — resets all confirms
            g.wolfVotes[actorId] = payload.vote;
            g.wolfConfirms.clear();
            // Active voting counts as activity — don't auto-skip deliberating wolves
            if (g.autoMode) startAutoTurnTimer(code, room, entry.playerIds);
        } else if (payload.confirm) {
            const voteCounts     = getVoteCounts(g.wolfVotes);
            const wolfCount      = entry.playerIds.length;
            const threshold      = Math.floor(wolfCount / 2) + 1;
            const majorityTarget = getMajorityTarget(voteCounts, threshold);

            // Only wolves who voted for the majority target can confirm
            if (!majorityTarget || g.wolfVotes[actorId] !== majorityTarget) return false;
            g.wolfConfirms.add(actorId);

            if (g.wolfConfirms.size >= threshold) {
                // Victim locked — end wolf turn
                g.nightVictim = majorityTarget;
                entry.done    = true;
                pushVoicePeers(room); // Wolfsrunde vorbei → Wolfs-Voice schließen
                const vname   = playerName(room, majorityTarget);
                addEvent(g, `Werwölfe haben ${vname} als Opfer gewählt.`);
                g.nightLog.push(`Werwölfe → ${vname}`);
                entry.playerIds.forEach(pid => io.to(pid).emit('night-turn-done'));
                narratorPush(g, {
                    phase: 'night', round: g.round,
                    activeEntry: {
                        group: entry.group, hint: entry.hint, actionType: entry.actionType,
                        playerNames: entry.playerIds.map(id => playerName(room, id)), done: true,
                    },
                    events: g.events, players: playerStatusList(room, g), waiting: false,
                });
                if (g.autoMode) {
                    clearAutoTimers(g);
                    g.autoTimer = setTimeout(() => {
                        if (room.game?.phase === 'night') advanceNight(code, room);
                    }, 800);
                }
                return false;
            }
        }
        broadcastWolfVotes(code, room, entry, g);
        scheduleBotWolfSync(code, room, entry);
        return false;

    } else if (entry.actionType === 'view') {
        if (payload.acknowledged || !payload.targetId) return false;
        const tname = playerName(room, payload.targetId);
        const trole = roleName(room.assignments, payload.targetId);
        io.to(actorId).emit('view-result', { targetName: tname, roleName: trole, roleId: room.assignments[payload.targetId] });
        addEvent(g, `Seherin hat die Karte von ${tname} angeschaut.`);
        g.nightLog.push(`Seherin sah: ${tname} = ${trole}`);
        // Seherin-Bot merkt sich das Ergebnis wie ein menschlicher Spieler
        if (isBotPlayer(room, actorId)) {
            botMemoryOf(g, actorId).seen.add(payload.targetId);
            if (WOLF_IDS.has(room.assignments[payload.targetId])) memLearnWolf(g, actorId, payload.targetId);
            else memLearnCleared(g, actorId, payload.targetId);
        }

    } else if (entry.actionType === 'witch') {
        const isHeal      = payload.heal || payload.action === 'heal';
        const poisonTarget = payload.poisonTargetId ?? (payload.action === 'poison' ? payload.targetId : null);
        if (isHeal && !g.hexeUsedHeal && g.nightVictim) {
            g.hexeHealTarget = g.nightVictim;
            g.hexeUsedHeal   = true;
            addEvent(g, `Hexe hat ihr Heilmittel eingesetzt.`);
            g.nightLog.push(`Hexe heilt: ${playerName(room, g.nightVictim)}`);
        }
        if (poisonTarget && !g.hexeUsedPoison) {
            g.hexePoisonTarget = poisonTarget;
            g.hexeUsedPoison   = true;
            addEvent(g, `Hexe hat ihr Gift eingesetzt.`);
            g.nightLog.push(`Hexe vergiftet: ${playerName(room, poisonTarget)}`);
        }

    } else if (entry.group === 'Dorfmatratze') {
        if (payload.targetId) {
            // TODO: exclude Händler's shopping target from selection when Händler is implemented
            g.dorfmatraze_sleep = payload.targetId;
            const tname = playerName(room, payload.targetId);
            addEvent(g, `Dorfmatratze schläft heute bei ${tname}.`);
            g.nightLog.push(`Dorfmatratze → ${tname}`);
        }

    } else if (entry.group === 'Ergebene Magd') {
        if (payload.targetId) {
            g.magd_herr = payload.targetId;
            addEvent(g, `Ergebene Magd hat ihren Herren ausgewählt.`);
            g.nightLog.push(`Ergebene Magd → ${playerName(room, payload.targetId)}`);
        }

    } else if (entry.group === 'Wildes Kind') {
        if (payload.targetId) {
            g.wildesKind_idol = payload.targetId;
            addEvent(g, `Das Wilde Kind hat sein Idol ausgewählt.`);
            g.nightLog.push(`Wildes Kind → ${playerName(room, payload.targetId)} (Idol, geheim)`);
        }

    } else if (entry.group === 'Amor') {
        const ids = payload.targets ?? [];
        if (ids.length === 2) {
            g.lovers = ids;
            const [l1, l2] = ids;
            const n1 = playerName(room, l1);
            const n2 = playerName(room, l2);
            io.to(l1).emit('you-are-lovers', { partnerName: n2 });
            io.to(l2).emit('you-are-lovers', { partnerName: n1 });
            addEvent(g, `Amor hat ${n1} und ${n2} als Liebespaar bestimmt.`);
            g.reveals.push(`Liebespaar: ${n1} ♥ ${n2}.`);
            g.nightLog.push(`Amor: ${n1} ♥ ${n2}`);
        }

    } else if (entry.group === 'Händler') {
        if (payload.targetId) {
            g.haendler_away = payload.targetId;
            const tname = playerName(room, payload.targetId);
            addEvent(g, `Händler schickt jemanden einkaufen.`);
            g.nightLog.push(`Händler schickt ${tname} einkaufen.`);
        }

    } else if (entry.group === 'Silberschmied') {
        if (payload.targetId) {
            g.silberschmied_protected = payload.targetId;
            addEvent(g, `Silberschmied rüstet jemanden mit Silberwaffen aus.`);
            g.nightLog.push(`Silberschmied → ${playerName(room, payload.targetId)} (Silberschutz)`);
        }

    } else if (entry.group === 'Einsamer Wolf') {
        if (payload.targetId) {
            g.einsamerWolf_target = payload.targetId;
            addEvent(g, `Einsamer Wolf hat ein Ziel ausgewählt.`);
            g.nightLog.push(`Einsamer Wolf → ${playerName(room, payload.targetId)}`);
        }

    } else if (entry.group === 'Jack the Ripper') {
        if (payload.targetId) {
            g.jack_target = payload.targetId;
            addEvent(g, `Jack the Ripper hat seinen heutigen Besuch ausgewählt.`);
            g.nightLog.push(`Jack → ${playerName(room, payload.targetId)}`);
        }

    } else if (entry.group === 'Gendarm') {
        if (payload.targetId) {
            g.gendarm_target = payload.targetId;
            g.gendarm_used   = true;
            addEvent(g, `Gendarm verhaftet jemanden.`);
            g.nightLog.push(`Gendarm → ${playerName(room, payload.targetId)}`);
        }

    } else if (entry.group === 'Zigeunerin') {
        if (payload.targetId) {
            g.zigeunerin_target = payload.targetId;
            addEvent(g, `Die Zigeunerin spricht ihren Fluch aus.`);
            g.nightLog.push(`Zigeunerin verflucht ${playerName(room, payload.targetId)}`);
        }
        g.zigeunerin_cursePending = false;

    } else if (entry.group === 'Glöckner') {
        if (payload.targetId === '__ring__') {
            g.gloeckner_used = true;
            const remaining  = g.nightQueue.slice(g.nightIdx + 1);
            const wolfRelIdx = remaining.findIndex(e => e.group === 'Werwölfe');
            if (wolfRelIdx !== -1) {
                g.nightQueue.splice(g.nightIdx + 1 + wolfRelIdx, 1);
                addEvent(g, `Der Glöckner läutet die Glocken — die Werwölfe schlafen diese Nacht.`);
                g.nightLog.push(`Glöckner läutet — Werwolfrunde übersprungen`);
            } else {
                addEvent(g, `Der Glöckner läutet — aber die Werwölfe haben heute bereits gehandelt.`);
                g.nightLog.push(`Glöckner läutet — kein Effekt (Wölfe bereits dran)`);
            }
        }

    } else if (entry.group === 'Dieb') {
        const chosenRole = payload.targetId;
        if (chosenRole && g.diebOptions?.includes(chosenRole)) {
            room.assignments[actorId] = chosenRole;
            io.to(actorId).emit('role-changed', { roleId: chosenRole });
            addEvent(g, `Dieb hat eine neue Rolle übernommen.`);
            g.reveals.push(`${aname} war der Dieb und übernahm die Rolle ${ROLE_NAMES[chosenRole] ?? chosenRole}.`);
            g.nightLog.push(`Dieb → ${ROLE_NAMES[chosenRole] ?? chosenRole}`);

            // Rebuild the rest of tonight's queue so the new role still acts this night
            const done       = g.nightQueue.slice(0, g.nightIdx + 1);
            const doneGroups = new Set(done.map(e => e.group));
            const remaining  = buildNightQueue(room.assignments, g.alive, g.round, g)
                .filter(e => !doneGroups.has(e.group));
            g.nightQueue = [...done, ...remaining];
            addTransformedWolves(room, g);
        }

    } else {
        // Generic: select-one, select-two, optional, etc.
        const ids = payload.targets ?? payload.targetIds ?? (payload.targetId ? [payload.targetId] : []);
        const tnames = ids.map(id => playerName(room, id)).join(', ');
        if (tnames) {
            addEvent(g, `${entry.group}: ${aname} wählt ${tnames}.`);
            g.nightLog.push(`${entry.group}: ${tnames}`);
        }
    }

    // Mark done so narrator "Weiter" works
    entry.done = true;

    narratorPush(g, {
        phase: 'night', round: g.round,
        activeEntry: {
            group: entry.group, hint: entry.hint,
            actionType: entry.actionType,
            playerNames: entry.playerIds.map(id => playerName(room, id)),
            done: true,
        },
        events:  g.events,
        players: playerStatusList(room, g),
        waiting: false,
    });
    return true;
}

function endNight(code, room) {
    const g = room.game;
    g.phase = 'night-summary';

    // Find alive Dorfmatratze (if in game)
    const dorfmatrazeId = Object.entries(room.assignments)
        .find(([id, rid]) => rid === 'Dorfmatraze' && g.alive.has(id))?.[0];

    // Compute wolf-attack deaths (with Dorfmatratze, Händler, and Silberschmied mechanics)
    let silberProtected = false;
    let silberWolfDied  = null;
    if (g.nightVictim) {
        if (dorfmatrazeId && g.nightVictim === dorfmatrazeId) {
            // Wolves attacked Dorfmatratze directly → she is protected, nothing happens
            g.dorfmatraze_protected = true;
            addEvent(g, `Die Werwölfe griffen die Dorfmatratze direkt an — sie war nicht zuhause.`);
            g.nightLog.push(`Dorfmatratze geschützt (direkt angegriffen)`);
        } else if (g.haendler_away && g.nightVictim === g.haendler_away) {
            // Wolves attacked the away player → protected (was shopping)
            addEvent(g, `Die Werwölfe griffen jemanden an — die Person war einkaufen und blieb unverletzt.`);
            g.nightLog.push(`Händler-Schutz: ${playerName(room, g.haendler_away)} war einkaufen`);
        } else if (g.silberschmied_protected === g.nightVictim && !isWolf(room, g.nightVictim)) {
            // Silberwaffe: victim survives, one random wolf dies instead
            silberProtected = true;
            const aliveWolves = [...g.alive].filter(id => isWolf(room, id));
            if (aliveWolves.length > 0) {
                silberWolfDied = aliveWolves[Math.floor(Math.random() * aliveWolves.length)];
                g.pendingDeaths.add(silberWolfDied);
                addEvent(g, `Die Silberwaffen haben einen Werwolf getötet! ${playerName(room, g.nightVictim)} überlebt.`);
                g.nightLog.push(`Silberschmied: ${playerName(room, g.nightVictim)} überlebt, Wolf ${playerName(room, silberWolfDied)} stirbt`);
            } else {
                addEvent(g, `Die Silberwaffen schützen — kein Werwolf mehr am Leben.`);
                g.nightLog.push(`Silberschmied: ${playerName(room, g.nightVictim)} überlebt (keine Wölfe mehr)`);
            }
        } else {
            // Normal wolf kill — primary victim dies unless Hexe healed
            if (g.hexeHealTarget !== g.nightVictim) {
                g.pendingDeaths.add(g.nightVictim);
            }
            // If Dorfmatratze was sleeping at the wolf's target → she also dies
            if (dorfmatrazeId && g.dorfmatraze_sleep === g.nightVictim) {
                g.pendingDeaths.add(dorfmatrazeId);
                g.nightLog.push(`Dorfmatratze stirbt mit (schlief bei ${playerName(room, g.nightVictim)})`);
            }
        }
    }
    if (g.hexePoisonTarget) g.pendingDeaths.add(g.hexePoisonTarget);

    // EinsamerWolf: kills the chosen wolf
    if (g.einsamerWolf_target && g.alive.has(g.einsamerWolf_target) && isWolf(room, g.einsamerWolf_target)) {
        g.pendingDeaths.add(g.einsamerWolf_target);
        g.nightLog.push(`Einsamer Wolf tötet Werwolf: ${playerName(room, g.einsamerWolf_target)}`);
    }

    // Zigeunerin: her curse kills the chosen wolf
    if (g.zigeunerin_target && g.alive.has(g.zigeunerin_target) && isWolf(room, g.zigeunerin_target)) {
        g.pendingDeaths.add(g.zigeunerin_target);
        g.nightLog.push(`Zigeunerin-Fluch tötet Werwolf: ${playerName(room, g.zigeunerin_target)}`);
    }
    g.zigeunerin_cursePending = false;

    // Gendarm: kills the target; if the target is innocent, Gendarm also dies
    if (g.gendarm_target && g.alive.has(g.gendarm_target)) {
        g.pendingDeaths.add(g.gendarm_target);
        if (!isWolf(room, g.gendarm_target)) {
            const gendarmId = findPlayerByRole(room, 'Gendarm');
            if (gendarmId && g.alive.has(gendarmId)) {
                g.pendingDeaths.add(gendarmId);
                g.nightLog.push(`Gendarm verhaftet Unschuldigen (${playerName(room, g.gendarm_target)}) — stirbt mit`);
            }
        } else {
            g.nightLog.push(`Gendarm verhaftet Werwolf: ${playerName(room, g.gendarm_target)}`);
        }
    }

    // JackTheRipper: if Dorfmatratze encounters Jack tonight, she dies and Jack mutates
    const jackId = findPlayerByRole(room, 'JackTheRipper');
    if (jackId && g.alive.has(jackId) && !g.jack_isWolf && dorfmatrazeId && g.alive.has(dorfmatrazeId)) {
        const encountered = g.dorfmatraze_sleep === jackId ||
                            (g.jack_target && g.dorfmatraze_sleep === g.jack_target);
        if (encountered) {
            g.pendingDeaths.add(dorfmatrazeId);
            g.jack_isWolf = true;
            io.to(jackId).emit('jack-transformed');
            addEvent(g, `Jack the Ripper hat die Dorfmatratze getötet und ist zum Werwolf geworden!`);
            g.reveals.push(`${playerName(room, jackId)} (Jack the Ripper) mutierte zum Werwolf.`);
            g.nightLog.push(`Jack mutiert → Werwolf, Dorfmatratze stirbt`);
        }
    }

    // Händler protection: away player cannot be killed by any means tonight
    // (runs AFTER all kill sources so none of them slips through)
    if (g.haendler_away && g.pendingDeaths.delete(g.haendler_away)) {
        g.nightLog.push(`Händler-Schutz: ${playerName(room, g.haendler_away)} war einkaufen — überlebt`);
    }

    // Alter: has 2 lives — each night-kill source costs one life; vote deaths are instant
    const alterId = Object.entries(room.assignments)
        .find(([id, rid]) => rid === 'Alter' && g.alive.has(id))?.[0];
    if (alterId && g.pendingDeaths.has(alterId)) {
        const causes =
            (g.nightVictim === alterId && g.hexeHealTarget !== alterId ? 1 : 0) +
            (g.hexePoisonTarget === alterId ? 1 : 0) +
            (g.gendarm_target === alterId ? 1 : 0) +
            (dorfmatrazeId === alterId && g.dorfmatraze_sleep === g.nightVictim ? 1 : 0);
        g.alter_lives -= Math.max(causes, 1);
        if (g.alter_lives >= 1) {
            g.pendingDeaths.delete(alterId);
            g.nightLog.push(`Alter überlebt (${g.alter_lives} Leben übrig, geheim)`);
        }
    }

    // Liebespaar: stirbt einer, stirbt der andere mit
    if (g.lovers) {
        const [l1, l2] = g.lovers;
        if (g.pendingDeaths.has(l1) && g.alive.has(l2)) {
            g.pendingDeaths.add(l2);
            g.nightLog.push(`Liebespaar: ${playerName(room, l2)} stirbt mit.`);
        }
        if (g.pendingDeaths.has(l2) && g.alive.has(l1)) {
            g.pendingDeaths.add(l1);
            g.nightLog.push(`Liebespaar: ${playerName(room, l1)} stirbt mit.`);
        }
        // Even the lover cascade cannot kill the shopping player
        if (g.haendler_away) g.pendingDeaths.delete(g.haendler_away);
    }

    // Build summary text
    const lines = [];
    if (g.dorfmatraze_protected) {
        lines.push(`Die Werwölfe haben heute Nacht die Dorfmatratze angegriffen — sie war aber nicht zuhause.`);
    } else if (g.haendler_away && g.nightVictim === g.haendler_away) {
        lines.push(`Die Werwölfe haben heute Nacht jemanden angegriffen — die Person war einkaufen und blieb unverletzt.`);
    } else if (silberProtected) {
        lines.push(silberWolfDied
            ? `Die Silberwaffen haben einen Werwolf getötet! ${playerName(room, g.nightVictim)} überlebt.`
            : `Die Silberwaffen schützen ${playerName(room, g.nightVictim)}.`);
        // Öffentlich: das Angriffsopfer wurde namentlich genannt → kein Werwolf
        memBroadcastCleared(room, g, g.nightVictim);
    } else if (g.nightVictim) {
        const vname = playerName(room, g.nightVictim);
        const dorfmatratzeDied = dorfmatrazeId && g.pendingDeaths.has(dorfmatrazeId)
            && g.dorfmatraze_sleep === g.nightVictim;
        if (g.hexeHealTarget === g.nightVictim) {
            lines.push(`Die Werwölfe haben ${vname} angegriffen — die Hexe hat sie/ihn gerettet.`);
            // Öffentlich: das gerettete Opfer lebt und ist damit geklärt
            memBroadcastCleared(room, g, g.nightVictim);
            if (dorfmatratzeDied) {
                lines.push(`Die Dorfmatratze schlief bei ${vname} und ist trotzdem gestorben.`);
            }
        } else {
            lines.push(`Die Werwölfe haben ${vname} getötet.`);
            if (dorfmatratzeDied) {
                lines.push(`Die Dorfmatratze schlief bei ${vname} und ist mitgestorben.`);
            }
        }
    } else {
        lines.push(`Die Werwölfe haben heute Nacht niemanden angegriffen.`);
    }
    if (g.hexePoisonTarget) {
        if (g.haendler_away === g.hexePoisonTarget) {
            lines.push(`Die Hexe hat ihr Gift eingesetzt — das Ziel war einkaufen und blieb unversehrt.`);
        } else {
            lines.push(`Die Hexe hat ${playerName(room, g.hexePoisonTarget)} vergiftet.`);
        }
    }
    if (g.einsamerWolf_target && g.pendingDeaths.has(g.einsamerWolf_target)) {
        lines.push(`Ein Werwolf wurde in dieser Nacht getötet.`);
    }
    if (g.zigeunerin_target && g.pendingDeaths.has(g.zigeunerin_target)) {
        lines.push(`Der Fluch der Zigeunerin hat einen Werwolf mit in den Tod gerissen.`);
    }
    if (g.gendarm_target) {
        const gname = playerName(room, g.gendarm_target);
        if (isWolf(room, g.gendarm_target)) {
            lines.push(`Der Gendarm hat ${gname} verhaftet — einen Werwolf.`);
        } else {
            lines.push(`Der Gendarm hat einen Unschuldigen verhaftet und dabei sein Leben verloren.`);
        }
    }
    if (g.pendingDeaths.size === 0) {
        lines.push(`Heute früh wacht das Dorf unversehrt auf.`);
    }

    addEvent(g, `Die Nacht ist vorüber.`);

    const summary = {
        lines,
        deaths: [...g.pendingDeaths].map(id => ({
            id, name: playerName(room, id), roleId: room.assignments[id], roleName: roleName(room.assignments, id),
        })),
        nightLog: g.nightLog,
    };
    g.nightSummary = summary;

    const morningPlayers = [...g.alive].map(id => ({ id, name: playerName(room, id) }));
    io.to(code).emit('phase-changed', { phase: 'night-summary', round: g.round, players: morningPlayers });
    pushVoicePeers(room);

    narratorPush(g, {
        phase: 'night-summary', round: g.round,
        summary, events: g.events, players: playerStatusList(room, g),
    });

    if (g.autoMode) {
        clearAutoTimers(g);
        g.autoTimer = setTimeout(() => {
            if (room.game?.phase === 'night-summary') doPhaseAdvance(code, room);
        }, 3500);
    }
}

function isWolf(room, id) {
    const rid = room.assignments[id];
    return WOLF_IDS.has(rid)
        || (rid === 'WildesKind'    && room.game.wildesKind_isWolf)
        || (rid === 'JackTheRipper' && room.game.jack_isWolf)
        || (rid === 'JekylUndHyde'  && room.game.jekyllIsWolf);
}

function checkWinCondition(room) {
    const g = room.game;
    const aliveIds  = [...g.alive];
    const wolves    = aliveIds.filter(id => isWolf(room, id));
    const nonWolves = aliveIds.filter(id => !isWolf(room, id));

    // Easter egg: everyone is dead
    if (g.alive.size === 0) {
        return { winner: 'everyone-dead', message: 'XD' };
    }

    // EinsamerWolf: wins when last player alive
    const ewId = findPlayerByRole(room, 'EinsamerWolf');
    if (ewId && g.alive.has(ewId) && g.alive.size === 1) {
        return { winner: 'einsamer-wolf', message: 'Der Einsame Wolf hat allein gewonnen!' };
    }

    // Lovers: both alive, last two players standing
    if (g.lovers) {
        const [l1, l2] = g.lovers;
        if (g.alive.has(l1) && g.alive.has(l2) && aliveIds.length === 2) {
            const n1 = playerName(room, l1), n2 = playerName(room, l2);
            return { winner: 'lovers', message: `Das Liebespaar ${n1} & ${n2} hat gewonnen!` };
        }
    }

    // Wolves: reach or exceed villager count
    if (wolves.length > 0 && wolves.length >= nonWolves.length) {
        return { winner: 'wolves', message: 'Die Werwölfe haben gewonnen!' };
    }

    // Villagers: all wolves eliminated — but not while the Einsame Wolf still lives
    if (wolves.length === 0 && !(ewId && g.alive.has(ewId))) {
        return { winner: 'villagers', message: 'Die Dorfbewohner haben gewonnen!' };
    }

    return null;
}

function startDay(code, room) {
    const g = room.game;

    // Apply deaths — Nacht-Tote werden sofort Zuschauer (Fix: der Client meldete
    // sich beim Morgen-Screen an, als der Server sie noch als lebendig führte)
    for (const pid of g.pendingDeaths) {
        g.alive.delete(pid);
        tryMagdTransform(code, room, pid);
        tryWildesKindTransform(code, room, pid);
        if (!isBotPlayer(room, pid)) g.spectators.add(pid);
        io.to(pid).emit('you-are-dead');
    }
    g.pendingDeaths = new Set();
    g.round++;
    pushVoicePeers(room);

    addEvent(g, `Tag ${g.round - 1} beginnt.`);

    // Check win condition before continuing
    const win = checkWinCondition(room);
    if (win) { endGame(code, room, win); return; }

    if (g.autoMode) {
        clearAutoTimers(g);
        g.phase = 'day-prep';
        io.to(code).emit('auto-day-starting', { countdown: 5 });
        g.autoTimer = setTimeout(() => {
            if (room.game?.phase === 'day-prep') startDayAccusation(code, room);
        }, 5000);
        return;
    }
    startDayAccusation(code, room);
}

// ── Day phase functions ────────────────────────────────────────────────────────

// Bär: brummt zu Tagesbeginn, wenn er im Sitzkreis (Beitrittsreihenfolge) neben einem Werwolf sitzt
function checkBaerGrowl(code, room) {
    const g = room.game;
    const baerId = findPlayerByRole(room, 'Baer');
    if (!baerId || !g.alive.has(baerId)) return;

    const circle = room.players
        .filter(p => g.alive.has(p.id) && p.id !== g.narratorId)
        .map(p => p.id);
    if (circle.length < 2) return;

    const idx   = circle.indexOf(baerId);
    const left  = circle[(idx - 1 + circle.length) % circle.length];
    const right = circle[(idx + 1) % circle.length];
    if (isWolf(room, left) || isWolf(room, right)) {
        addEvent(g, 'Der Bär brummt — er riecht einen Werwolf in seiner Nähe!');
        io.to(code).emit('baer-growl');
    }
}

function startDayAccusation(code, room) {
    const g = room.game;
    g.phase = 'day-accusation';
    g.dayNominations = {};
    g.dayAccused = [];
    g.dayVotes = {};
    g.dayRunoff = false;
    g.dayVoteResult = null;
    g.dayAlsoDied = [];
    g.dayEliminatedInfo = null;

    checkBaerGrowl(code, room);

    // Pre-register non-voters as skipped so voting can complete without them
    if (g.haendler_away && g.alive.has(g.haendler_away)) {
        g.dayNominations[g.haendler_away] = null;
    }
    const narrId = findPlayerByRole(room, 'Narr');
    if (narrId && g.alive.has(narrId) && narrId !== g.haendler_away) {
        g.dayNominations[narrId] = null;
    }

    const alivePlayers = [...g.alive].map(id => ({ id, name: playerName(room, id) }));
    io.to(code).emit('phase-changed', {
        phase: 'day-accusation', round: g.round,
        players: alivePlayers, maxAccusations: g.maxAccusations,
        awayPlayerId: g.haendler_away || null,
    });
    narratorPush(g, { phase: 'day-accusation', round: g.round, players: playerStatusList(room, g), events: g.events, awayPlayerId: g.haendler_away || null });

    scheduleBotNominations(code, room);
}

function processDayNominations(code, room) {
    const g = room.game;
    const nominations = Object.values(g.dayNominations);
    const skipCount  = nominations.filter(v => v === null).length;
    const nomCount   = nominations.length - skipCount;

    if (skipCount > nomCount) {
        addEvent(g, 'Das Dorf überspringt die Abstimmung.');
        endDay(code, room, null, true);
        return;
    }

    const tally = {};
    for (const nid of nominations) {
        if (nid && g.alive.has(nid)) tally[nid] = (tally[nid] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    g.dayAccused = sorted.slice(0, g.maxAccusations).map(([id]) => id);

    // Zigeunerin: stirbt automatisch, sobald sie angeklagt wird — Fluch in der nächsten Nacht
    const zigId = findPlayerByRole(room, 'Zigeunerin');
    if (zigId && g.dayAccused.includes(zigId) && g.alive.has(zigId)) {
        g.dayAccused = g.dayAccused.filter(id => id !== zigId);
        addEvent(g, `${playerName(room, zigId)} (Zigeunerin) wurde angeklagt und stirbt — ihr Fluch wird die Nacht überdauern.`);
        const deaths = applyDeath(code, room, zigId);
        g.dayAlsoDied.push(...deaths);
        g.zigeunerin_cursePending = true;

        const win = checkWinCondition(room);
        if (win) { endGame(code, room, win); return; }
        if (deaths.some(d => d.roleId === 'Jaeger')) { startDayHunterShot(code, room); return; }
        if (g.dayAccused.length === 0) { endDay(code, room, null, false); return; }
    }

    if (g.dayAccused.length === 0) {
        addEvent(g, 'Niemand wurde angeklagt.');
        endDay(code, room, null, true);
        return;
    }

    startDayVoting(code, room);
}

function countDayVoters(room, g) {
    const liveNarrId = findPlayerByRole(room, 'Narr');
    const narrOffset = (liveNarrId && g.alive.has(liveNarrId)) ? 1 : 0;
    const awayOffset = (g.haendler_away && g.alive.has(g.haendler_away) && g.haendler_away !== liveNarrId) ? 1 : 0;
    return g.alive.size - narrOffset - awayOffset;
}

function checkDayNominationsComplete(code, room) {
    const g = room.game;
    if (g.phase !== 'day-accusation') return;
    if (Object.keys(g.dayNominations).length >= g.alive.size) processDayNominations(code, room);
}

function checkDayVotesComplete(code, room) {
    const g = room.game;
    if (g.phase !== 'day-voting') return;
    if (Object.keys(g.dayVotes).length >= countDayVoters(room, g)) processDayVotes(code, room);
}

// runoff = Stichwahl nach Gleichstand: gleiche Phase, aber nur die Erstplatzierten
function startDayVoting(code, room, runoff = false) {
    const g = room.game;
    g.phase = 'day-voting';
    g.dayVotes = {};

    // Kontext für die Wähler: wie oft wurde jeder Angeklagte nominiert
    // (bzw. in der Stichwahl: wie viele Stimmen er im ersten Wahlgang hatte)
    const counts = {};
    if (runoff) {
        (g.dayVoteResult ?? []).forEach(r => { counts[r.id] = r.votes; });
    } else {
        for (const nid of Object.values(g.dayNominations)) {
            if (nid) counts[nid] = (counts[nid] ?? 0) + 1;
        }
    }

    const accused = g.dayAccused.map(id => ({ id, name: playerName(room, id), count: counts[id] ?? 0 }));
    io.to(code).emit('phase-changed', { phase: 'day-voting', round: g.round, accused, runoff, awayPlayerId: g.haendler_away || null });
    narratorPush(g, { phase: 'day-voting', round: g.round, accused, runoff, players: playerStatusList(room, g), events: g.events, awayPlayerId: g.haendler_away || null });

    scheduleBotDayVotes(code, room);
}

// Nominierung eines Spielers (Mensch via Socket oder Bot) inkl. aller Updates
function castDayNomination(code, room, voterId, targetId) {
    const g = room.game;
    if (!g || g.phase !== 'day-accusation') return;
    if (!g.alive.has(voterId)) return;
    if (g.haendler_away === voterId) return;
    if (findPlayerByRole(room, 'Narr') === voterId) return;

    // Cannot nominate the away player — treat as skip
    const effectiveTarget = (targetId && targetId !== g.haendler_away) ? targetId : null;
    g.dayNominations[voterId] = effectiveTarget;
    io.to(voterId).emit('day-nomination-done');

    // Bots beobachten das Anklageverhalten: wer einen (für sie) Geklärten
    // anklagt, macht sich verdächtig; der Angeklagte rückt leicht in den Fokus
    if (effectiveTarget) {
        room.players.filter(p => p.isBot && g.alive.has(p.id) && p.id !== voterId).forEach(p => {
            const m = botMemoryOf(g, p.id);
            if (m.cleared.has(effectiveTarget)) memSuspect(g, p.id, voterId, 0.75);
            else if (effectiveTarget !== p.id)  memSuspect(g, p.id, effectiveTarget, 0.25);
        });
    }

    const nominations = Object.values(g.dayNominations);
    const tally = {};
    for (const nid of nominations) { if (nid) tally[nid] = (tally[nid] ?? 0) + 1; }
    const skipCount = nominations.filter(v => v === null).length;
    // Namentliche Liste: wer klagt wen an (null = überspringt)
    const pairs = Object.entries(g.dayNominations).map(([vid, tid]) => ({
        voter:  playerName(room, vid),
        target: tid ? playerName(room, tid) : null,
    }));
    narratorPush(g, {
        phase: 'day-accusation', round: g.round,
        progress: { nominated: nominations.length, total: g.alive.size, skipped: skipCount, tally, pairs },
        players: playerStatusList(room, g), events: g.events,
    });
    io.to(code).emit('day-accusation-update', {
        tally,
        skipCount,
        totalResponded: nominations.length,
        total: g.alive.size,
        pairs,
    });

    checkDayNominationsComplete(code, room);
}

// Stimmabgabe über die Angeklagten (Mensch via Socket oder Bot) inkl. aller Updates
function castDayVote(code, room, voterId, targetId) {
    const g = room.game;
    if (!g || g.phase !== 'day-voting') return;
    if (!g.alive.has(voterId)) return;
    if (g.haendler_away === voterId) return;
    if (findPlayerByRole(room, 'Narr') === voterId) return;
    if (!g.dayAccused.includes(targetId)) return;

    g.dayVotes[voterId] = targetId;
    io.to(voterId).emit('day-vote-done');

    const counts = {};
    for (const vid of Object.values(g.dayVotes)) { counts[vid] = (counts[vid] ?? 0) + 1; }
    const totalVoted  = Object.keys(g.dayVotes).length;
    const totalVoters = countDayVoters(room, g);
    // Namentliche Liste: wer stimmt für wen
    const pairs = Object.entries(g.dayVotes).map(([vid, tid]) => ({
        voter:  playerName(room, vid),
        target: playerName(room, tid),
    }));
    io.to(code).emit('day-vote-update', { counts, totalVoted, totalVoters, pairs });
    narratorPush(g, {
        phase: 'day-voting', round: g.round,
        progress: { voted: totalVoted, total: totalVoters, counts, pairs },
        players: playerStatusList(room, g), events: g.events,
    });

    checkDayVotesComplete(code, room);
}

function processDayVotes(code, room) {
    const g = room.game;
    const tally = {};
    for (const vid of Object.values(g.dayVotes)) {
        if (vid && g.alive.has(vid)) tally[vid] = (tally[vid] ?? 0) + 1;
    }

    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    g.dayVoteResult = sorted.map(([id, votes]) => ({ id, name: playerName(room, id), votes }));

    // Gleichstand an der Spitze → einmalige Stichwahl zwischen den Erstplatzierten
    if (!g.dayRunoff && sorted.length >= 2 && sorted[0][1] === sorted[1][1]) {
        const tied = sorted.filter(([, c]) => c === sorted[0][1]).map(([id]) => id);
        g.dayRunoff  = true;
        g.dayAccused = tied;
        addEvent(g, `Gleichstand — Stichwahl zwischen ${tied.map(id => playerName(room, id)).join(' und ')}.`);
        startDayVoting(code, room, true);
        return;
    }

    let eliminated = null;
    if (sorted.length > 0 && (sorted.length < 2 || sorted[0][1] > sorted[1][1])) {
        eliminated = sorted[0][0];
    }

    // Narr immunity: cannot be eliminated by day vote
    const narrId = findPlayerByRole(room, 'Narr');
    let narrSurvived = false;
    if (eliminated && eliminated === narrId) {
        narrSurvived = true;
        addEvent(g, `${playerName(room, narrId)} (Narr) überlebt — Narrenfreiheit.`);
        eliminated = null;
    } else if (eliminated) {
        addEvent(g, `${playerName(room, eliminated)} wurde vom Dorf eliminiert.`);
    } else if (g.dayRunoff) {
        addEvent(g, 'Auch die Stichwahl endet unentschieden — niemand wird eliminiert.');
    } else {
        addEvent(g, 'Unentschieden — niemand wird eliminiert.');
    }

    // Bots werten das aufgedeckte Ergebnis aus: Wähler eines Unschuldigen werden
    // verdächtiger, Wähler eines enttarnten Werwolfs vertrauenswürdiger
    if (eliminated) {
        const wasWolf = isWolf(room, eliminated);
        for (const [voterId, tid] of Object.entries(g.dayVotes)) {
            if (tid !== eliminated || !g.alive.has(voterId)) continue;
            memBroadcastSuspect(room, g, voterId, wasWolf ? -0.5 : 1);
        }
    }

    endDay(code, room, eliminated, false, narrSurvived);
}

function endGame(code, room, win) {
    const g = room.game;
    g.phase = 'game-over';
    clearAutoTimers(g);
    clearBotTimers(g);
    addEvent(g, win.message);

    // Volle Auflösung: alle Rollen, Verwandlungen und das Liebespaar
    const reveal = {
        players: room.players
            .filter(p => p.id !== g.narratorId)
            .map(p => ({
                id:       p.id,
                name:     p.name,
                roleId:   room.assignments[p.id],
                roleName: roleName(room.assignments, p.id),
                isAlive:  g.alive.has(p.id),
                isWolf:   isWolf(room, p.id),
                isLover:  g.lovers?.includes(p.id) ?? false,
            })),
        notes: g.reveals,
    };

    // Payload merken, damit Reconnects nach Spielende den Endscreen wiederbekommen
    g.gameOverPayload = { winner: win.winner, message: win.message, hostId: room.hostId, reveal };
    io.to(code).emit('game-over', g.gameOverPayload);
    narratorPush(g, { phase: 'game-over', winner: win.winner, message: win.message, events: g.events, players: playerStatusList(room, g), reveal });
    pushVoicePeers(room);
}

// Jäger stirbt am Tag (Lynch, Zigeunerin-Kaskade, Liebespaar) → er darf noch schießen
function startDayHunterShot(code, room) {
    const g = room.game;
    g.phase = 'hunter-day-shot';
    const jaegerId   = findPlayerByRole(room, 'Jaeger');
    const hunterName = playerName(room, jaegerId);
    addEvent(g, `${hunterName} (Jäger) reißt jemanden mit in den Tod.`);
    io.to(jaegerId).emit('hunter-shoot', { targets: hunterShootTargets(room, g) });
    io.to(code).emit('phase-changed', { phase: 'hunter-day-shot', round: g.round, hunterName });
    narratorPush(g, {
        phase: 'hunter-day-shot', round: g.round, hunterName,
        players: playerStatusList(room, g), events: g.events,
    });
    if (g.autoMode) {
        clearAutoTimers(g);
        g.autoTimer = setTimeout(() => {
            if (room.game?.phase === 'hunter-day-shot') resolveDayHunterShot(code, room, null);
        }, 45000);
    }
    scheduleBotHunterShot(code, room);
}

function resolveDayHunterShot(code, room, targetId) {
    const g = room.game;
    clearAutoTimers(g);
    let shotInfo = null;
    if (targetId && g.alive.has(targetId) && targetId !== g.haendler_away) {
        const jaegerId = findPlayerByRole(room, 'Jaeger');
        addEvent(g, `${playerName(room, jaegerId)} (Jäger) erschoss ${playerName(room, targetId)}.`);
        const deaths = applyDeath(code, room, targetId);
        shotInfo = deaths[0] ?? null;
        g.dayAlsoDied.push(...deaths.slice(1));
    } else {
        addEvent(g, 'Der Jäger hat nicht geschossen.');
    }
    finishDay(code, room, { hunterShot: shotInfo });
}

function finishDay(code, room, { skipped = false, narrSurvived = false, hunterShot = null } = {}) {
    const g = room.game;

    const win = checkWinCondition(room);
    if (win) { endGame(code, room, win); return; }

    g.phase = 'day-result';
    const payload = {
        phase: 'day-result', round: g.round,
        eliminated:   g.dayEliminatedInfo,
        alsoDied:     g.dayAlsoDied,
        hunterShot,
        skipped:      !!skipped,
        narrSurvived: !!narrSurvived,
        voteResult:   g.dayVoteResult,
        wasRunoff:    !!g.dayRunoff,
    };
    io.to(code).emit('phase-changed', payload);
    narratorPush(g, { ...payload, events: g.events, players: playerStatusList(room, g) });

    if (g.autoMode) {
        clearAutoTimers(g);
        g.autoTimer = setTimeout(() => {
            if (room.game?.phase === 'day-result') doPhaseAdvance(code, room);
        }, 4000);
    }
}

function endDay(code, room, eliminatedId, skipped, narrSurvived = false) {
    const g = room.game;

    if (eliminatedId) {
        g.dayEliminatedInfo = {
            id:       eliminatedId,
            name:     playerName(room, eliminatedId),
            roleId:   room.assignments[eliminatedId],
            roleName: roleName(room.assignments, eliminatedId),
        };
        // applyDeath handles the lover cascade and role transforms
        const deaths = applyDeath(code, room, eliminatedId);
        g.dayAlsoDied.push(...deaths.filter(d => d.id !== eliminatedId));

        // Jäger shoots before win is checked — their shot could kill a wolf and reverse the outcome.
        // Triggers also when the Jäger dies as lover of the eliminated player.
        if (deaths.some(d => d.roleId === 'Jaeger')) {
            startDayHunterShot(code, room);
            return;
        }
    }

    finishDay(code, room, { skipped, narrSurvived });
}

// Removes a player who permanently left mid-game.
// Treated like a death so no phase waits forever on their input.
function handleGameLeave(code, room, playerId) {
    const g = room.game;
    if (!g || g.phase === 'game-over') return;

    g.spectators?.delete(playerId);
    const wasJaeger = room.assignments[playerId] === 'Jaeger';

    if (g.alive.has(playerId)) {
        addEvent(g, `${playerName(room, playerId)} hat das Spiel verlassen.`);
        applyDeath(code, room, playerId);

        // Drop their pending inputs
        if (g.dayNominations) delete g.dayNominations[playerId];
        if (g.dayVotes)       delete g.dayVotes[playerId];
        if (g.wolfVotes)      delete g.wolfVotes[playerId];
        g.wolfConfirms?.delete(playerId);
        g.nightQueue?.forEach(entry => {
            const idx = entry.playerIds.indexOf(playerId);
            if (idx !== -1) entry.playerIds.splice(idx, 1);
        });

        const win = checkWinCondition(room);
        if (win) { endGame(code, room, win); return; }
    }

    // Unblock whatever the game is currently waiting on
    if (g.phase === 'hunter-night-shot' && wasJaeger) {
        resolveNightHunterShot(code, room, null);
    } else if (g.phase === 'hunter-day-shot' && wasJaeger) {
        resolveDayHunterShot(code, room, null);
    } else if (g.phase === 'night') {
        const entry = g.nightQueue[g.nightIdx];
        if (entry && !entry.done) {
            if (entry.playerIds.length === 0) {
                addEvent(g, `${entry.group} ist nicht mehr im Spiel.`);
                advanceNight(code, room);
            } else if (entry.actionType === 'kill') {
                // Fewer wolves → new majority threshold, update everyone
                broadcastWolfVotes(code, room, entry, g);
                scheduleBotWolfSync(code, room, entry);
            }
        }
    } else if (g.phase === 'day-accusation') {
        checkDayNominationsComplete(code, room);
    } else if (g.phase === 'day-voting') {
        checkDayVotesComplete(code, room);
    }

    if (room.game === g && g.phase !== 'game-over') {
        narratorPush(g, {
            phase: g.phase, round: g.round,
            events: g.events, players: playerStatusList(room, g),
        });
    }
}

// ── Socket events ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {

    // ─ Lobby ─────────────────────────────────────────────────────────────────

    socket.on('create-room', ({ hostName }) => {
        const code = generateCode();
        const host = { id: socket.id, name: hostName, isHost: true, isReady: true, requestedCard: null };
        rooms.set(code, {
            hostId: socket.id, players: [host], selectedCards: [],
            messages: [], phase: 'lobby', narratorMode: false,
            maxAccusations: 3, botIntelligence: 2, designatedNarrator: null,
            disconnectTimers: new Map(),
            voice: new Set(),
        });
        socket.join(code);
        socket.emit('room-created', { roomCode: code });
        broadcast(code);
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room)                                           { socket.emit('join-error', { message: 'Raum nicht gefunden.' }); return; }
        if (room.phase !== 'lobby')                          { socket.emit('join-error', { message: 'Das Spiel hat bereits begonnen.' }); return; }
        if (room.players.some(p => p.name === playerName))  { socket.emit('join-error', { message: 'Dieser Name ist bereits vergeben.' }); return; }

        const player = { id: socket.id, name: playerName, isHost: false, isReady: false, requestedCard: null };
        room.players.push(player);
        socket.join(roomCode);
        socket.emit('room-joined', { roomCode });
        broadcast(roomCode);
    });

    socket.on('resume-game', ({ roomCode, playerId }) => {
        const room = rooms.get(roomCode);
        if (!room || !playerId) {
            socket.emit('resume-error', { message: 'Spiel konnte nicht wieder verbunden werden.' });
            return;
        }

        if (!replacePlayerSocket(room, playerId, socket.id)) {
            socket.emit('resume-error', { message: 'Spieler wurde in diesem Raum nicht gefunden.' });
            return;
        }

        socket.join(roomCode);
        socket.emit('resume-ok');
        broadcast(roomCode);
        pushCurrentGameState(roomCode, room, socket);
    });

    socket.on('toggle-card', ({ cardId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const { code, room } = ctx;
        const idx = room.selectedCards.indexOf(cardId);
        if (idx === -1) { room.selectedCards.push(cardId); }
        else {
            room.selectedCards.splice(idx, 1);
            room.players.forEach(p => { if (p.requestedCard === cardId) p.requestedCard = null; });
        }
        broadcast(code);
    });

    socket.on('request-card', ({ cardId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room, player } = ctx;
        if (player.isHost) return;
        player.requestedCard = player.requestedCard === cardId ? null : cardId;
        broadcast(code);
    });

    socket.on('set-ready', ({ ready }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room, player } = ctx;
        if (!player.isHost) player.isReady = ready;
        broadcast(code);
    });

    socket.on('set-narrator-mode', ({ isNarrator }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        ctx.room.narratorMode = !!isNarrator;
        broadcast(ctx.code);
    });

    socket.on('send-message', ({ text }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || !text?.trim()) return;
        const { code, room, player } = ctx;
        room.messages.push({ author: player.name, text: text.trim().slice(0, 300), time: Date.now() });
        if (room.messages.length > 200) room.messages.shift();
        broadcast(code);
    });

    socket.on('start-game', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const { code, room } = ctx;

        const narratorPlayerId = room.designatedNarrator ?? (room.narratorMode ? room.hostId : null);
        const effectiveNarratorMode = !!narratorPlayerId;
        const n = room.players.length - (effectiveNarratorMode ? 1 : 0);
        if (n < 3)                             { socket.emit('error', { message: 'Mindestens 3 Mitspieler (ohne Erzähler) werden benötigt.' }); return; }
        if (!room.selectedCards.some(id => WOLF_IDS.has(id))) { socket.emit('error', { message: 'Mindestens 1 Werwolf muss ausgewählt sein.' }); return; }
        if (!room.players.every(p => p.isHost || p.isReady)) { socket.emit('error', { message: 'Noch nicht alle Spieler sind bereit.' }); return; }

        // Fehlende Karten mit Dorfbewohnern auffüllen
        const paddedCards = [...room.selectedCards];
        while (paddedCards.length < n) paddedCards.push('Dorfbewohner');

        const picked = pickBalanced(paddedCards, n);
        if (typeof picked === 'string')        { socket.emit('error', { message: picked }); return; }

        // Assign cards — narrator (host or designated) gets no card
        const pool = [...picked];
        const assignments = {};
        const unassigned  = [];
        for (const p of room.players) {
            if (p.id === narratorPlayerId) continue;
            const idx = (p.requestedCard && pool.includes(p.requestedCard)) ? pool.indexOf(p.requestedCard) : -1;
            if (idx !== -1) { assignments[p.id] = pool.splice(idx, 1)[0]; }
            else { unassigned.push(p.id); }
        }
        for (const id of unassigned) {
            assignments[id] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        }

        room.phase       = 'game';
        room.assignments = assignments;
        room.game        = freshGameState(room, narratorPlayerId, assignments);

        // Dieb: generate 2 extra role options from unassigned roles
        const diebId = Object.entries(assignments).find(([, rid]) => rid === 'Dieb')?.[0];
        if (diebId) {
            const assignedRoles = new Set(Object.values(assignments));
            const candidates    = Object.keys(ROLE_NAMES).filter(r => !assignedRoles.has(r));
            room.game.diebOptions = shuffle(candidates).slice(0, Math.min(2, candidates.length));
        }

        addEvent(room.game, 'Spiel gestartet.');

        io.to(code).emit('game-started', {
            assignments,
            narratorMode: effectiveNarratorMode,
            narratorId:   narratorPlayerId,
        });

        // Send narrator their initial state
        if (narratorPlayerId) {
            io.to(narratorPlayerId).emit('narrator-update', {
                phase: 'day-prep', round: 1,
                events:  room.game.events,
                players: playerStatusList(room, room.game),
            });
        }

        // Auto mode: trigger first night automatically after players have loaded
        if (!narratorPlayerId) {
            setTimeout(() => {
                if (!room.game || room.game.phase !== 'day-prep') return;
                io.to(code).emit('auto-day-starting', { countdown: 5, label: 'Nacht beginnt in' });
                room.game.autoTimer = setTimeout(() => {
                    if (room.game?.phase === 'day-prep') startNight(code, room);
                }, 5000);
            }, 3000);
        }
    });

    socket.on('restart-game', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        if (!room.game || ctx.room.hostId !== socket.id) return;

        const narratorPlayerId = room.designatedNarrator ?? (room.narratorMode ? room.hostId : null);
        const effectiveNarratorMode = !!narratorPlayerId;
        const n = room.players.length - (effectiveNarratorMode ? 1 : 0);
        if (n < 3) { socket.emit('error', { message: 'Mindestens 3 Mitspieler (ohne Erzähler) werden benötigt.' }); return; }

        // Fehlende Karten mit Dorfbewohnern auffüllen
        const paddedCards = [...room.selectedCards];
        while (paddedCards.length < n) paddedCards.push('Dorfbewohner');

        const picked = pickBalanced(paddedCards, n);
        if (typeof picked === 'string') { socket.emit('error', { message: picked }); return; }

        const pool = [...picked];
        shuffle(pool);
        const assignments = {};
        for (const p of room.players) {
            if (p.id === narratorPlayerId) continue;
            assignments[p.id] = pool.pop();
        }

        room.assignments = assignments;
        room.game        = freshGameState(room, narratorPlayerId, assignments);

        // Dieb: generate 2 extra role options from unassigned roles
        const diebIdR = Object.entries(assignments).find(([, rid]) => rid === 'Dieb')?.[0];
        if (diebIdR) {
            const assignedRolesR = new Set(Object.values(assignments));
            const candidatesR    = Object.keys(ROLE_NAMES).filter(r => !assignedRolesR.has(r));
            room.game.diebOptions = shuffle(candidatesR).slice(0, Math.min(2, candidatesR.length));
        }

        addEvent(room.game, 'Spiel neugestartet.');

        io.to(code).emit('game-started', {
            assignments,
            narratorMode: effectiveNarratorMode,
            narratorId:   narratorPlayerId,
        });

        if (narratorPlayerId) {
            io.to(narratorPlayerId).emit('narrator-update', {
                phase: 'day-prep', round: 1,
                events: room.game.events, players: playerStatusList(room, room.game),
            });
        }

        if (!narratorPlayerId) {
            setTimeout(() => {
                if (!room.game || room.game.phase !== 'day-prep') return;
                io.to(code).emit('auto-day-starting', { countdown: 5, label: 'Nacht beginnt in' });
                room.game.autoTimer = setTimeout(() => {
                    if (room.game?.phase === 'day-prep') startNight(code, room);
                }, 5000);
            }, 3000);
        }
    });

    socket.on('reset-to-lobby', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        if (!room.game) return;
        const isAuthorized = room.game.narratorId === socket.id || room.hostId === socket.id;
        if (!isAuthorized) return;

        clearAutoTimers(room.game);
        clearBotTimers(room.game);
        room.phase = 'lobby';
        room.game  = null;
        room.players.forEach(p => { p.isReady = p.isHost || p.isBot; p.requestedCard = null; });

        room.players.forEach(p => {
            io.to(p.id).emit('back-to-lobby', {
                name:     p.name,
                isHost:   p.id === room.hostId,
                roomCode: code,
            });
        });
    });

    socket.on('rejoin-lobby', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room || room.phase !== 'lobby') {
            socket.emit('join-error', { message: 'Raum nicht mehr verfügbar.' });
            return;
        }
        const player = room.players.find(p => p.name === playerName);
        if (!player) {
            socket.emit('join-error', { message: 'Spieler nicht gefunden.' });
            return;
        }

        const oldId = player.id;
        player.id = socket.id;
        player.isConnected = true;
        if (room.hostId === oldId) room.hostId = socket.id;
        room.voice?.delete(oldId);
        const timer = room.disconnectTimers?.get(oldId);
        if (timer) { clearTimeout(timer); room.disconnectTimers.delete(oldId); }

        socket.join(roomCode);
        socket.emit(player.isHost ? 'room-created' : 'room-joined', { roomCode });
        broadcast(roomCode);
    });

    socket.on('end-session', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        if (!room.game || room.game.narratorId !== socket.id) return;
        clearAutoTimers(room.game);
        clearBotTimers(room.game);
        io.to(code).emit('session-ended');
        rooms.delete(code);
    });

    // ─ Game phase controls (narrator) ────────────────────────────────────────

    socket.on('phase-advance', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.narratorId !== socket.id) return;
        clearAutoTimers(g);
        doPhaseAdvance(code, room);
    });

    socket.on('add-bot', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const { code, room } = ctx;
        if (room.phase !== 'lobby') return;
        if (room.players.length >= 20) {
            socket.emit('error', { message: 'Maximal 20 Spieler pro Raum.' });
            return;
        }
        room.players.push(createBot(room));
        broadcast(code);
    });

    socket.on('kick-player', ({ playerId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const { code, room } = ctx;
        if (room.phase !== 'lobby') return;
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.designatedNarrator === playerId) room.designatedNarrator = null;
        room.voice?.delete(playerId);
        io.to(playerId).emit('you-were-kicked');
        broadcast(code);
    });

    socket.on('set-narrator-player', ({ playerId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        if (playerId && isBotPlayer(ctx.room, playerId)) return; // Bots können nicht erzählen
        ctx.room.designatedNarrator = playerId || null;
        if (playerId) ctx.room.narratorMode = true;
        broadcast(ctx.code);
    });

    socket.on('set-max-accusations', ({ value }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const n = parseInt(value, 10);
        if (!Number.isFinite(n) || n < 1 || n > 10) return;
        ctx.room.maxAccusations = n;
        broadcast(ctx.code);
    });

    socket.on('set-bot-intelligence', ({ value }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const n = parseInt(value, 10);
        if (!BOT_INTELLIGENCE[n]) return;
        ctx.room.botIntelligence = n;
        broadcast(ctx.code);
    });

    socket.on('day-nominate', ({ targetId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        castDayNomination(ctx.code, ctx.room, socket.id, targetId);
    });

    socket.on('day-vote-cast', ({ targetId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        castDayVote(ctx.code, ctx.room, socket.id, targetId);
    });

    // ─ In-game chat ──────────────────────────────────────────────────────────

    socket.on('game-chat', ({ text, chatType }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || !text?.trim()) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || !['village', 'wolf'].includes(chatType)) return;

        const senderName = playerName(room, socket.id);
        if (!senderName) return;

        if (chatType === 'wolf' && !isWolf(room, socket.id)) return;

        const msg = { author: senderName, text: text.trim().slice(0, 300), time: Date.now(), chatType };

        if (chatType === 'village') {
            g.villageChat.push(msg);
            if (g.villageChat.length > 200) g.villageChat.shift();
            io.to(code).emit('game-chat-msg', msg);
        } else {
            g.wolfChat.push(msg);
            if (g.wolfChat.length > 200) g.wolfChat.shift();
            [...g.alive].filter(id => isWolf(room, id))
                .forEach(id => io.to(id).emit('game-chat-msg', msg));
        }
    });

    // ─ Voice chat (WebRTC signaling) ─────────────────────────────────────────

    socket.on('voice-join', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        if (!ctx.room.voice) ctx.room.voice = new Set();
        ctx.room.voice.add(socket.id);
        pushVoicePeers(ctx.room);
    });

    socket.on('voice-leave', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx?.room.voice?.delete(socket.id)) return;
        pushVoicePeers(ctx.room);
    });

    // Vermittelt Offer/Answer/ICE zwischen zwei Peers — nur innerhalb desselben Kanals
    socket.on('voice-signal', ({ to, data }) => {
        if (!to || !data) return;
        const ctx = findRoomBySocket(socket.id);
        if (!ctx?.room.voice?.has(socket.id) || !ctx.room.voice.has(to)) return;
        const me   = voiceChannelFor(ctx.room, socket.id);
        const peer = voiceChannelFor(ctx.room, to);
        if (!me || !peer || me.channel !== peer.channel) return;
        io.to(to).emit('voice-signal', { from: socket.id, data });
    });

    // ─ Game activity: reset auto-skip timer when player types/sends in chat ──

    socket.on('game-activity', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || !g.autoMode || g.phase !== 'night') return;
        const entry = g.nightQueue[g.nightIdx];
        if (!entry || !entry.playerIds.includes(socket.id)) return;
        startAutoTurnTimer(code, room, entry.playerIds);
    });

    // ─ Hunter shot (Jäger) ───────────────────────────────────────────────────

    socket.on('hunter-shot', ({ targetId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g) return;

        const jaegerId = findPlayerByRole(room, 'Jaeger');
        if (jaegerId !== socket.id) return;
        if (!g.alive.has(targetId)) return;

        if (g.phase === 'hunter-night-shot')     resolveNightHunterShot(code, room, targetId);
        else if (g.phase === 'hunter-day-shot')  resolveDayHunterShot(code, room, targetId);
    });

    socket.on('phase-skip', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.narratorId !== socket.id || g.phase !== 'night') return;
        skipNight(code, room);
    });

    // ─ Night actions (players) ────────────────────────────────────────────────

    socket.on('night-action', (payload) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.phase !== 'night') return;

        const entry = g.nightQueue[g.nightIdx];
        if (!entry || !entry.playerIds.includes(socket.id)) return;

        const sendDone = processNightAction(code, room, entry, socket.id, payload);
        if (sendDone) {
            io.to(socket.id).emit('night-turn-done');
            if (g.autoMode) {
                clearAutoTimers(g);
                g.autoTimer = setTimeout(() => {
                    if (room.game?.phase === 'night') advanceNight(code, room);
                }, 800);
            }
        }
    });

    // ─ Spectator ──────────────────────────────────────────────────────────────

    socket.on('join-spectator', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { room } = ctx;
        const g = room.game;
        // pendingDeaths zählt mit: der Client meldet sich schon beim Morgen-Screen,
        // bevor startDay die Toten endgültig aus alive entfernt
        if (!g || (g.alive.has(socket.id) && !g.pendingDeaths.has(socket.id))) return;
        g.spectators.add(socket.id);

        // Sofortiger Schnappschuss, damit der Zuschauer nicht auf das nächste Ereignis warten muss
        const entry = g.nightQueue?.[g.nightIdx] ?? null;
        socket.emit('narrator-update', {
            phase: g.phase, round: g.round,
            activeEntry: entry ? {
                group: entry.group, hint: entry.hint,
                actionType: entry.actionType,
                playerNames: entry.playerIds.map(id => playerName(room, id)),
                done: entry.done,
            } : null,
            events:  g.events,
            players: playerStatusList(room, g),
        });
    });

    // ─ Disconnect ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;

        if (!room.disconnectTimers) room.disconnectTimers = new Map();
        const timer = setTimeout(() => {
            const wasNarrator = room.game && room.game.narratorId === socket.id;
            const player = room.players.find(p => p.id === socket.id);

            if (room.game) {
                // Im Spiel: Spieler NICHT entfernen, nur als getrennt markieren.
                // Spielmechanisch stirbt er (damit keine Phase auf ihn wartet),
                // aber er kann jederzeit per Reload als Geist zurückkehren —
                // wichtig für Handys, deren Tabs minutenlang eingefroren werden.
                if (player) player.isConnected = false;
                if (!wasNarrator) handleGameLeave(code, room, socket.id);
            } else {
                room.players = room.players.filter(p => p.id !== socket.id);
            }
            room.voice?.delete(socket.id);

            // Raum auflösen, wenn kein Mensch mehr verbunden ist — Bots zählen nicht
            const connectedHumans = room.players.filter(p => !p.isBot && p.isConnected !== false);
            if (connectedHumans.length === 0) {
                if (room.game) { clearAutoTimers(room.game); clearBotTimers(room.game); }
                rooms.delete(code);
                return;
            }
            if (room.hostId === socket.id) {
                connectedHumans[0].isHost = true;
                if (player) player.isHost = false;
                room.hostId = connectedHumans[0].id;
            }
            room.disconnectTimers.delete(socket.id);

            if (wasNarrator && room.game) {
                const g = room.game;
                g.narratorId = null;
                g.autoMode   = true;
                clearAutoTimers(g);
                io.to(code).emit('auto-mode-activated', {
                    message: 'Der Erzähler hat das Spiel verlassen. Automatischer Modus aktiviert.',
                });
                setTimeout(() => {
                    if (!room.game) return;
                    if (g.phase === 'day-prep') {
                        io.to(code).emit('auto-day-starting', { countdown: 5 });
                        g.autoTimer = setTimeout(() => {
                            if (room.game?.phase === 'day-prep') startNight(code, room);
                        }, 5000);
                    } else if (g.phase === 'night') {
                        const entry = g.nightQueue[g.nightIdx];
                        if (entry && !entry.done) {
                            startAutoTurnTimer(code, room, entry.playerIds);
                        } else {
                            g.autoTimer = setTimeout(() => {
                                if (room.game?.phase === 'night') advanceNight(code, room);
                            }, 1000);
                        }
                    } else if (g.phase === 'night-summary') {
                        g.autoTimer = setTimeout(() => {
                            if (room.game?.phase === 'night-summary') doPhaseAdvance(code, room);
                        }, 2000);
                    } else if (g.phase === 'day-result') {
                        g.autoTimer = setTimeout(() => {
                            if (room.game?.phase === 'day-result') doPhaseAdvance(code, room);
                        }, 2000);
                    } else if (g.phase === 'hunter-night-shot' || g.phase === 'hunter-day-shot') {
                        // Jäger bekommt noch Zeit zu schießen, dann geht es automatisch weiter
                        g.autoTimer = setTimeout(() => {
                            if (room.game?.phase === 'hunter-night-shot')     resolveNightHunterShot(code, room, null);
                            else if (room.game?.phase === 'hunter-day-shot') resolveDayHunterShot(code, room, null);
                        }, 45000);
                    }
                }, 1500);
            }

            broadcast(code);
        }, room.game ? GRACE_GAME_MS : GRACE_LOBBY_MS);

        room.disconnectTimers.set(socket.id, timer);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Werwolf läuft auf http://localhost:${PORT}`));
