const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.get('/', (req, res) => res.redirect('/html/index.html'));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ── Constants ─────────────────────────────────────────────────────────────────

const WOLF_IDS = new Set(['Werwolf_blau', 'Werwolf_gelb', 'Werwolf_gruen', 'Werwolf_rot']);

// Night call order – server iterates this list and skips roles not in the game
const NIGHT_ORDER = [
    { group: 'Ergebene Magd',   roleIds: ['ErgebeneMagd'],                                        firstNightOnly: true,   actionType: 'select-one',    hint: 'Wähle deinen Herren aus. Du weißt nicht, welche Rolle er hat.' },
    { group: 'Amor',            roleIds: ['Amor'],                                              firstNightOnly: true,   actionType: 'select-two',    hint: 'Wähle 2 Spieler als Liebespaar aus.' },
    { group: 'Dieb',            roleIds: ['Dieb'],                                              firstNightOnly: true,   actionType: 'select-one',    hint: 'Du kannst eine alternative Rolle übernehmen.' },
    { group: 'Wildes Kind',     roleIds: ['WildesKind'],                                        firstNightOnly: true,   actionType: 'select-one',    hint: 'Wähle dein Idol aus.' },
    { group: 'Silberschmied',   roleIds: ['Silberschmied'],                                    firstNightOnly: true,   actionType: 'select-one',    hint: 'Rüste einen Spieler mit Silberwaffen aus.' },
    { group: 'Dorfmatratze',    roleIds: ['Dorfmatraze'],                                      firstNightOnly: false,  actionType: 'select-one',    hint: 'Bei wem schläfst du heute Nacht?' },
    { group: 'Seherin',         roleIds: ['Seherin'],                                          firstNightOnly: false,  actionType: 'view',          hint: 'Schau dir die Karte eines Spielers an.' },
    { group: 'Händler',         roleIds: ['Haendler'],                                         firstNightOnly: false,  actionType: 'select-one',    hint: 'Schicke einen Spieler für diese Runde einkaufen.' },
    { group: 'Werwölfe',        roleIds: ['Werwolf_blau','Werwolf_gelb','Werwolf_gruen','Werwolf_rot'], firstNightOnly: false, actionType: 'kill', hint: 'Wählt gemeinsam ein Opfer aus.' },
    { group: 'Hexe',            roleIds: ['Hexe'],                                             firstNightOnly: false,  actionType: 'witch',         hint: 'Du kannst heilen oder vergiften.' },
    { group: 'Einsamer Wolf',   roleIds: ['EinsamerWolf'],                                     everySecondNight: true, actionType: 'select-one',    hint: 'Wähle einen Werwolf, den du tötest.' },
    { group: 'Jack the Ripper', roleIds: ['JackTheRipper'],                                    firstNightOnly: false,  actionType: 'select-one',    hint: 'Wähle deinen heutigen Besuch.' },
    { group: 'Gendarm',         roleIds: ['Gendarm'],                                          firstNightOnly: false,  actionType: 'optional-kill', hint: 'Möchtest du jemanden verhaften? (Optional, einmalig)' },
    { group: 'Glöckner',        roleIds: ['Gloeckner'],                                        firstNightOnly: false,  actionType: 'optional',      hint: 'Möchtest du heute die Glocken läuten? (Optional, einmalig)' },
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
    if (room.hostId === oldId) room.hostId = newId;

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
        replaceIdInArray(g.lovers, oldId, newId);
        replaceIdInSet(g.spectators, oldId, newId);

        g.nightQueue?.forEach(entry => replaceIdInArray(entry.playerIds, oldId, newId));
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
        return;
    }

    if (g.phase === 'night') {
        const entry = g.nightQueue?.[g.nightIdx];
        if (entry?.playerIds.includes(socket.id) && !entry.done) {
            const targets = room.players.filter(p =>
                g.alive.has(p.id) && p.id !== g.narratorId
            ).map(p => ({ id: p.id, name: p.name }));

            const myTargets = entry.actionType === 'kill-wolf'
                ? targets.filter(t => WOLF_IDS.has(room.assignments[t.id]))
                : targets.filter(t => t.id !== socket.id);

            const extra = {};
            if (entry.actionType === 'witch') {
                const dorfmatrazeId = Object.entries(room.assignments)
                    .find(([id, rid]) => rid === 'Dorfmatraze' && g.alive.has(id))?.[0];
                const victimIsProtected = dorfmatrazeId && g.nightVictim === dorfmatrazeId;
                extra.victim    = (g.nightVictim && !victimIsProtected)
                    ? { id: g.nightVictim, name: playerName(room, g.nightVictim) }
                    : null;
                extra.canHeal   = !g.hexeUsedHeal;
                extra.canPoison = !g.hexeUsedPoison;
            }

            socket.emit('your-night-turn', {
                group: entry.group,
                actionType: entry.actionType,
                hint: entry.hint,
                players: myTargets,
                extra,
            });
        } else {
            socket.emit('night-waiting', {
                waitingFor: entry?.playerIds.map(id => playerName(room, id)).join(', ') ?? null,
            });
        }
    } else {
        socket.emit('phase-changed', { phase: g.phase, round: g.round });
    }
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
        designatedNarrator: room.designatedNarrator ?? null,
    });
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

function doPhaseAdvance(code, room) {
    const g = room.game;
    if (!g) return;
    if (g.phase === 'day-prep') {
        startNight(code, room);
    } else if (g.phase === 'night') {
        advanceNight(code, room);
    } else if (g.phase === 'night-summary') {
        const deaths   = g.nightSummary?.deaths ?? [];
        const jaegerId = findPlayerByRole(room, 'Jaeger');
        const jaegerDied = jaegerId && deaths.some(d => d.id === jaegerId);
        if (jaegerDied) {
            const hunterDeath = deaths.find(d => d.id === jaegerId);
            io.to(code).emit('morning-partial-reveal', { hunterDeath });
            g.phase = 'hunter-night-shot';
            const deadIds = new Set(deaths.map(d => d.id));
            const shootTargets = [...g.alive]
                .filter(id => id !== jaegerId && !deadIds.has(id))
                .map(id => ({ id, name: playerName(room, id) }));
            io.to(jaegerId).emit('hunter-shoot', { targets: shootTargets });
            addEvent(g, `${playerName(room, jaegerId)} (Jäger) reißt jemanden mit in den Tod.`);
            narratorPush(g, {
                phase: 'hunter-night-shot', round: g.round,
                hunterName: playerName(room, jaegerId),
                events: g.events, players: playerStatusList(room, g),
            });
        } else {
            io.to(code).emit('morning-reveal', { deaths });
            setTimeout(() => startDay(code, room), 2500);
        }
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

        const pids = Object.entries(assignments)
            .filter(([pid, rid]) => tpl.roleIds.includes(rid) && alive.has(pid))
            .map(([pid]) => pid);

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

function startNight(code, room) {
    const g = room.game;
    g.phase       = 'night';
    g.nightQueue  = buildNightQueue(room.assignments, g.alive, g.round, g);

    // Transformed WildesKind joins the wolf night turn
    if (g.wildesKind_isWolf) {
        const wkId = findPlayerByRole(room, 'WildesKind');
        if (wkId && g.alive.has(wkId)) {
            const wolfEntry = g.nightQueue.find(e => e.group === 'Werwölfe');
            if (wolfEntry) wolfEntry.playerIds.push(wkId);
        }
    }
    // Transformed JackTheRipper joins the wolf night turn
    if (g.jack_isWolf) {
        const jackId = findPlayerByRole(room, 'JackTheRipper');
        if (jackId && g.alive.has(jackId)) {
            const wolfEntry = g.nightQueue.find(e => e.group === 'Werwölfe');
            if (wolfEntry) wolfEntry.playerIds.push(jackId);
        }
    }
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

    addEvent(g, `Nacht ${g.round} beginnt.`);
    io.to(code).emit('phase-changed', { phase: 'night', round: g.round });
    advanceNight(code, room);
}

function advanceNight(code, room) {
    const g = room.game;
    g.nightIdx++;

    if (g.nightIdx >= g.nightQueue.length) { endNight(code, room); return; }

    const entry = g.nightQueue[g.nightIdx];

    // Build target list: all alive, non-narrator players
    const targets = room.players.filter(p =>
        g.alive.has(p.id) && p.id !== g.narratorId
    ).map(p => ({ id: p.id, name: p.name }));

    addEvent(g, `${entry.group} ist am Zug.`);

    // Notify active role players
    entry.playerIds.forEach(pid => {
        let myTargets = entry.actionType === 'kill-wolf'
            ? targets.filter(t => isWolf(room, t.id))
            : entry.actionType === 'kill'
                ? targets.filter(t => !isWolf(room, t.id))
                : targets.filter(t => t.id !== pid);

        // Special target overrides
        if (entry.group === 'Dieb' && g.diebOptions?.length > 0) {
            myTargets = g.diebOptions.map(rid => ({ id: rid, name: ROLE_NAMES[rid] ?? rid }));
        } else if (entry.group === 'Glöckner') {
            myTargets = [{ id: '__ring__', name: 'Glocken läuten' }];
        } else if (entry.group === 'Einsamer Wolf') {
            myTargets = targets.filter(t => isWolf(room, t.id));
        }

        const extra = {};
        if (entry.actionType === 'witch') {
            // Hide the wolf victim from Hexe if the victim is the protected Dorfmatratze
            const dorfmatrazeId = Object.entries(room.assignments)
                .find(([id, rid]) => rid === 'Dorfmatraze' && g.alive.has(id))?.[0];
            const victimIsProtected = dorfmatrazeId && g.nightVictim === dorfmatrazeId;
            extra.victim    = (g.nightVictim && !victimIsProtected)
                ? { id: g.nightVictim, name: playerName(room, g.nightVictim) }
                : null;
            extra.canHeal   = !g.hexeUsedHeal;
            extra.canPoison = !g.hexeUsedPoison;
        }

        io.to(pid).emit('your-night-turn', {
            group: entry.group, actionType: entry.actionType,
            hint: entry.hint, players: myTargets, extra,
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
}

function skipNight(code, room) {
    const g = room.game;
    const entry = g.nightQueue[g.nightIdx];
    if (entry) addEvent(g, `${entry.group} wurde übersprungen.`);
    advanceNight(code, room);
}

function processNightAction(code, room, entry, actorId, payload) {
    const g = room.game;
    const aname = playerName(room, actorId);

    if (entry.actionType === 'kill') {
        if (payload.vote !== undefined) {
            // Wolf casts/changes their vote — resets all confirms
            g.wolfVotes[actorId] = payload.vote;
            g.wolfConfirms.clear();
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
        return false;

    } else if (entry.actionType === 'view') {
        if (payload.acknowledged || !payload.targetId) return false;
        const tname = playerName(room, payload.targetId);
        const trole = roleName(room.assignments, payload.targetId);
        io.to(actorId).emit('view-result', { targetName: tname, roleName: trole, roleId: room.assignments[payload.targetId] });
        addEvent(g, `Seherin hat die Karte von ${tname} angeschaut.`);
        g.nightLog.push(`Seherin sah: ${tname} = ${trole}`);

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
            g.nightLog.push(`Dieb → ${ROLE_NAMES[chosenRole] ?? chosenRole}`);
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
    // Händler protection: away player cannot be killed by any means (e.g. hexe poison)
    if (g.haendler_away) g.pendingDeaths.delete(g.haendler_away);

    // EinsamerWolf: kills the chosen wolf
    if (g.einsamerWolf_target && g.alive.has(g.einsamerWolf_target) && isWolf(room, g.einsamerWolf_target)) {
        g.pendingDeaths.add(g.einsamerWolf_target);
        g.nightLog.push(`Einsamer Wolf tötet Werwolf: ${playerName(room, g.einsamerWolf_target)}`);
    }

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
            g.nightLog.push(`Jack mutiert → Werwolf, Dorfmatratze stirbt`);
        }
    }

    // Alter: silently survives the first wolf attack only (not hexe poison, not lover cascade)
    const alterId = Object.entries(room.assignments)
        .find(([id, rid]) => rid === 'Alter' && g.alive.has(id))?.[0];
    if (alterId && g.nightVictim === alterId && g.pendingDeaths.has(alterId) && g.alter_lives > 1) {
        g.pendingDeaths.delete(alterId);
        g.alter_lives--;
        g.nightLog.push(`Alter überlebt Wolfsangriff (${g.alter_lives} Leben übrig, geheim)`);
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
    } else if (g.nightVictim) {
        const vname = playerName(room, g.nightVictim);
        const dorfmatratzeDied = dorfmatrazeId && g.pendingDeaths.has(dorfmatrazeId)
            && g.dorfmatraze_sleep === g.nightVictim;
        if (g.hexeHealTarget === g.nightVictim) {
            lines.push(`Die Werwölfe haben ${vname} angegriffen — die Hexe hat sie/ihn gerettet.`);
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
        || (rid === 'JackTheRipper' && room.game.jack_isWolf);
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

    // Villagers: all wolves eliminated
    if (wolves.length === 0) {
        return { winner: 'villagers', message: 'Die Dorfbewohner haben gewonnen!' };
    }

    return null;
}

function startDay(code, room) {
    const g = room.game;

    // Apply deaths
    for (const pid of g.pendingDeaths) {
        g.alive.delete(pid);
        tryMagdTransform(code, room, pid);
        tryWildesKindTransform(code, room, pid);
    }
    g.pendingDeaths = new Set();
    g.round++;

    addEvent(g, `Tag ${g.round - 1} beginnt.`);

    // Check win condition before continuing
    const win = checkWinCondition(room);
    if (win) {
        g.phase = 'game-over';
        addEvent(g, win.message);
        io.to(code).emit('game-over', { winner: win.winner, message: win.message, hostId: room.hostId });
        narratorPush(g, {
            phase: 'game-over', winner: win.winner, message: win.message,
            events: g.events, players: playerStatusList(room, g),
        });
        return;
    }

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

function startDayAccusation(code, room) {
    const g = room.game;
    g.phase = 'day-accusation';
    g.dayNominations = {};
    g.dayAccused = [];
    g.dayVotes = {};

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
        if (nid) tally[nid] = (tally[nid] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    g.dayAccused = sorted.slice(0, g.maxAccusations).map(([id]) => id);

    startDayVoting(code, room);
}

function startDayVoting(code, room) {
    const g = room.game;
    g.phase = 'day-voting';
    g.dayVotes = {};

    const accused = g.dayAccused.map(id => ({ id, name: playerName(room, id) }));
    io.to(code).emit('phase-changed', { phase: 'day-voting', round: g.round, accused, awayPlayerId: g.haendler_away || null });
    narratorPush(g, { phase: 'day-voting', round: g.round, accused, players: playerStatusList(room, g), events: g.events, awayPlayerId: g.haendler_away || null });
}

function processDayVotes(code, room) {
    const g = room.game;
    const tally = {};
    for (const vid of Object.values(g.dayVotes)) {
        if (vid) tally[vid] = (tally[vid] ?? 0) + 1;
    }

    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
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
    } else {
        addEvent(g, 'Unentschieden — niemand wird eliminiert.');
    }

    endDay(code, room, eliminated, false, narrSurvived);
}

function endDay(code, room, eliminatedId, skipped, narrSurvived = false) {
    const g = room.game;

    if (eliminatedId) {
        g.alive.delete(eliminatedId);
        tryMagdTransform(code, room, eliminatedId);
        tryWildesKindTransform(code, room, eliminatedId);
    }

    // Jäger shoots before win is checked — their shot could kill a wolf and reverse the outcome
    if (eliminatedId && room.assignments[eliminatedId] === 'Jaeger') {
        addEvent(g, `${playerName(room, eliminatedId)} (Jäger) reißt jemanden mit in den Tod.`);
        g.phase = 'hunter-day-shot';
        const jaegerInfo = {
            id: eliminatedId,
            name: playerName(room, eliminatedId),
            roleId: 'Jaeger',
            roleName: 'Jäger',
        };
        const shootTargets = [...g.alive].map(id => ({ id, name: playerName(room, id) }));
        io.to(eliminatedId).emit('hunter-shoot', { targets: shootTargets });
        io.to(code).emit('phase-changed', { phase: 'hunter-day-shot', round: g.round, hunterName: playerName(room, eliminatedId) });
        narratorPush(g, {
            phase: 'hunter-day-shot', round: g.round,
            eliminated: jaegerInfo,
            players: playerStatusList(room, g), events: g.events,
        });
        return;
    }

    const win = checkWinCondition(room);
    if (win) {
        g.phase = 'game-over';
        addEvent(g, win.message);
        io.to(code).emit('game-over', { winner: win.winner, message: win.message, hostId: room.hostId });
        narratorPush(g, { phase: 'game-over', winner: win.winner, message: win.message, events: g.events, players: playerStatusList(room, g) });
        return;
    }

    g.phase = 'day-result';
    const eliminatedInfo = eliminatedId ? {
        id: eliminatedId,
        name: playerName(room, eliminatedId),
        roleId: room.assignments[eliminatedId],
        roleName: roleName(room.assignments, eliminatedId),
    } : null;

    io.to(code).emit('phase-changed', { phase: 'day-result', round: g.round, eliminated: eliminatedInfo, skipped: !!skipped, narrSurvived: !!narrSurvived });
    narratorPush(g, { phase: 'day-result', round: g.round, eliminated: eliminatedInfo, skipped: !!skipped, narrSurvived: !!narrSurvived, events: g.events, players: playerStatusList(room, g) });

    if (g.autoMode) {
        clearAutoTimers(g);
        g.autoTimer = setTimeout(() => {
            if (room.game?.phase === 'day-result') doPhaseAdvance(code, room);
        }, 4000);
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
            maxAccusations: 3, designatedNarrator: null,
            disconnectTimers: new Map(),
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
        if (room.players.length < 3)           { socket.emit('error', { message: 'Mindestens 3 Spieler werden benötigt.' }); return; }
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
        room.game = {
            round:    1,
            phase:    'day-prep',
            narratorId: narratorPlayerId,
            autoMode:   !narratorPlayerId,
            autoTimer:  null,
            alive:    new Set(Object.keys(assignments)),
            events:   [],
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
            magd_herr:              null,
            wildesKind_idol:        null,
            wildesKind_isWolf:      false,
            alter_lives:            2,
            silberschmied_protected: null,
            einsamerWolf_target:    null,
            jack_target:            null,
            jack_isWolf:            false,
            gendarm_target:         null,
            gendarm_used:           false,
            gloeckner_used:         false,
            diebOptions:            null,
            spectators:             new Set(),
        };

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
        room.game = {
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
            magd_herr:              null,
            wildesKind_idol:        null,
            wildesKind_isWolf:      false,
            alter_lives:            2,
            silberschmied_protected: null,
            einsamerWolf_target:    null,
            jack_target:            null,
            jack_isWolf:            false,
            gendarm_target:         null,
            gendarm_used:           false,
            gloeckner_used:         false,
            diebOptions:            null,
            spectators:             new Set(),
        };

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

        room.phase = 'lobby';
        room.game  = null;
        room.players.forEach(p => { p.isReady = p.isHost; p.requestedCard = null; });

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
        if (room.hostId === oldId) room.hostId = socket.id;
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

    socket.on('kick-player', ({ playerId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
        const { code, room } = ctx;
        if (room.phase !== 'lobby') return;
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.designatedNarrator === playerId) room.designatedNarrator = null;
        io.to(playerId).emit('you-were-kicked');
        broadcast(code);
    });

    socket.on('set-narrator-player', ({ playerId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx || ctx.room.hostId !== socket.id) return;
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

    socket.on('day-nominate', ({ targetId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.phase !== 'day-accusation') return;
        if (!g.alive.has(socket.id)) return;
        if (g.haendler_away === socket.id) return;
        if (findPlayerByRole(room, 'Narr') === socket.id) return;

        // Cannot nominate the away player — treat as skip
        const effectiveTarget = (targetId && targetId !== g.haendler_away) ? targetId : null;
        g.dayNominations[socket.id] = effectiveTarget;
        io.to(socket.id).emit('day-nomination-done');

        const nominations = Object.values(g.dayNominations);
        const tally = {};
        for (const nid of nominations) { if (nid) tally[nid] = (tally[nid] ?? 0) + 1; }
        const skipCount = nominations.filter(v => v === null).length;
        narratorPush(g, {
            phase: 'day-accusation', round: g.round,
            progress: { nominated: nominations.length, total: g.alive.size, skipped: skipCount, tally },
            players: playerStatusList(room, g), events: g.events,
        });
        io.to(code).emit('day-accusation-update', {
            tally,
            skipCount,
            totalResponded: nominations.length,
            total: g.alive.size,
        });

        if (nominations.length >= g.alive.size) processDayNominations(code, room);
    });

    socket.on('day-vote-cast', ({ targetId }) => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.phase !== 'day-voting') return;
        if (!g.alive.has(socket.id)) return;
        if (g.haendler_away === socket.id) return;
        if (findPlayerByRole(room, 'Narr') === socket.id) return;
        if (!g.dayAccused.includes(targetId)) return;

        g.dayVotes[socket.id] = targetId;
        io.to(socket.id).emit('day-vote-done');

        const counts = {};
        for (const vid of Object.values(g.dayVotes)) { counts[vid] = (counts[vid] ?? 0) + 1; }
        const totalVoted   = Object.keys(g.dayVotes).length;
        const liveNarrId   = findPlayerByRole(room, 'Narr');
        const narrOffset   = (liveNarrId && g.alive.has(liveNarrId)) ? 1 : 0;
        const awayOffset   = (g.haendler_away && g.alive.has(g.haendler_away) && g.haendler_away !== liveNarrId) ? 1 : 0;
        const totalVoters  = g.alive.size - narrOffset - awayOffset;
        io.to(code).emit('day-vote-update', { counts, totalVoted, totalVoters });
        narratorPush(g, {
            phase: 'day-voting', round: g.round,
            progress: { voted: totalVoted, total: totalVoters, counts },
            players: playerStatusList(room, g), events: g.events,
        });

        if (totalVoted >= totalVoters) processDayVotes(code, room);
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
        if (g.phase !== 'hunter-night-shot' && g.phase !== 'hunter-day-shot') return;
        if (!g.alive.has(targetId)) return;

        g.alive.delete(targetId);
        tryMagdTransform(code, room, targetId);
        tryWildesKindTransform(code, room, targetId);
        const shotInfo = {
            id:       targetId,
            name:     playerName(room, targetId),
            roleId:   room.assignments[targetId],
            roleName: roleName(room.assignments, targetId),
        };
        addEvent(g, `${playerName(room, jaegerId)} (Jäger) erschoss ${shotInfo.name}.`);

        if (g.phase === 'hunter-night-shot') {
            const remainingDeaths = (g.nightSummary?.deaths ?? []).filter(d => d.id !== jaegerId);
            io.to(code).emit('morning-full-reveal', { deaths: remainingDeaths, hunterShot: shotInfo });
            setTimeout(() => startDay(code, room), 2500);
        } else {
            const win = checkWinCondition(room);
            if (win) {
                g.phase = 'game-over';
                addEvent(g, win.message);
                io.to(code).emit('game-over', { winner: win.winner, message: win.message, hostId: room.hostId });
                narratorPush(g, { phase: 'game-over', winner: win.winner, message: win.message, events: g.events, players: playerStatusList(room, g) });
                return;
            }

            g.phase = 'day-result';
            const jaegerInfo = {
                id:       jaegerId,
                name:     playerName(room, jaegerId),
                roleId:   'Jaeger',
                roleName: 'Jäger',
            };
            io.to(code).emit('phase-changed', {
                phase: 'day-result', round: g.round,
                eliminated: jaegerInfo, skipped: false, hunterShot: shotInfo,
            });
            narratorPush(g, {
                phase: 'day-result', round: g.round,
                eliminated: jaegerInfo, hunterShot: shotInfo, skipped: false,
                events: g.events, players: playerStatusList(room, g),
            });
        }
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
        if (!g || g.alive.has(socket.id)) return;
        g.spectators.add(socket.id);
    });

    // ─ Disconnect ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;

        if (!room.disconnectTimers) room.disconnectTimers = new Map();
        const timer = setTimeout(() => {
            const wasNarrator = room.game && room.game.narratorId === socket.id;
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) { rooms.delete(code); return; }
            if (room.hostId === socket.id) {
                room.players[0].isHost = true;
                room.hostId = room.players[0].id;
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
                    }
                }, 1500);
            }

            broadcast(code);
        }, 15000);

        room.disconnectTimers.set(socket.id, timer);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Werwolf läuft auf http://localhost:${PORT}`));
