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
    { group: 'Amor',            roleIds: ['Amor'],                                              firstNightOnly: true,   actionType: 'select-two',    hint: 'Wähle 2 Spieler als Liebespaar aus.' },
    { group: 'Dieb',            roleIds: ['Dieb'],                                              firstNightOnly: true,   actionType: 'select-one',    hint: 'Du kannst eine alternative Rolle übernehmen.' },
    { group: 'Wildes Kind',     roleIds: ['WildesKind'],                                        firstNightOnly: true,   actionType: 'select-one',    hint: 'Wähle dein Idol aus.' },
    { group: 'Silberschmied',   roleIds: ['Silberschmied'],                                    firstNightOnly: true,   actionType: 'select-one',    hint: 'Rüste einen Spieler mit Silberwaffen aus.' },
    { group: 'Seherin',         roleIds: ['Seherin'],                                          firstNightOnly: false,  actionType: 'view',          hint: 'Schau dir die Karte eines Spielers an.' },
    { group: 'Werwölfe',        roleIds: ['Werwolf_blau','Werwolf_gelb','Werwolf_gruen','Werwolf_rot'], firstNightOnly: false, actionType: 'kill', hint: 'Wählt gemeinsam ein Opfer aus.' },
    { group: 'Hexe',            roleIds: ['Hexe'],                                             firstNightOnly: false,  actionType: 'witch',         hint: 'Du kannst heilen oder vergiften.' },
    { group: 'Dorfmatratze',    roleIds: ['Dorfmatraze'],                                      firstNightOnly: false,  actionType: 'select-one',    hint: 'Bei wem schläfst du heute Nacht?' },
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

function broadcast(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    io.to(roomCode).emit('room-updated', {
        players:       room.players,
        selectedCards: room.selectedCards,
        messages:      room.messages.slice(-80),
        narratorMode:  room.narratorMode,
    });
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
}

function buildNightQueue(assignments, alive, round) {
    const queue = [];
    for (const tpl of NIGHT_ORDER) {
        if (tpl.firstNightOnly  && round > 1)          continue;
        if (tpl.everySecondNight && round % 2 !== 0)   continue;

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
    g.nightQueue  = buildNightQueue(room.assignments, g.alive, g.round);
    g.nightIdx    = -1;
    g.nightVictim = null;
    g.hexeHealTarget  = null;
    g.hexePoisonTarget= null;
    g.pendingDeaths   = new Set();
    g.nightLog        = [];

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
        const myTargets = entry.actionType === 'kill-wolf'
            ? targets.filter(t => WOLF_IDS.has(room.assignments[t.id]))
            : targets.filter(t => t.id !== pid);

        const extra = {};
        if (entry.actionType === 'witch') {
            extra.victim    = g.nightVictim ? { id: g.nightVictim, name: playerName(room, g.nightVictim) } : null;
            extra.canHeal   = !g.hexeUsedHeal;
            extra.canPoison = !g.hexeUsedPoison;
        }

        io.to(pid).emit('your-night-turn', {
            group: entry.group, actionType: entry.actionType,
            hint: entry.hint, targets: myTargets, extra,
        });
    });

    // Tell all others: eyes closed
    io.to(code).emit('night-waiting', {
        activeGroup:   entry.group,
        activePlayers: entry.playerIds,
    });

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
        if (!g.nightVictim && payload.targetId) {
            g.nightVictim = payload.targetId;
            const vname = playerName(room, payload.targetId);
            addEvent(g, `Werwölfe haben ${vname} als Opfer gewählt.`);
            g.nightLog.push(`Werwölfe → ${vname}`);
        }
        // Tell all wolves the current vote
        entry.playerIds.forEach(pid => {
            io.to(pid).emit('wolf-vote-update', { victim: g.nightVictim, victimName: playerName(room, g.nightVictim) });
        });

    } else if (entry.actionType === 'view') {
        const tname = playerName(room, payload.targetId);
        const trole = roleName(room.assignments, payload.targetId);
        io.to(actorId).emit('view-result', { targetName: tname, roleName: trole, roleId: room.assignments[payload.targetId] });
        addEvent(g, `Seherin hat die Karte von ${tname} angeschaut.`);
        g.nightLog.push(`Seherin sah: ${tname} = ${trole}`);

    } else if (entry.actionType === 'witch') {
        const { heal, poisonTargetId } = payload;
        if (heal && !g.hexeUsedHeal && g.nightVictim) {
            g.hexeHealTarget  = g.nightVictim;
            g.hexeUsedHeal    = true;
            addEvent(g, `Hexe hat ihr Heilmittel eingesetzt.`);
            g.nightLog.push(`Hexe heilt: ${playerName(room, g.nightVictim)}`);
        }
        if (poisonTargetId && !g.hexeUsedPoison) {
            g.hexePoisonTarget = poisonTargetId;
            g.hexeUsedPoison   = true;
            addEvent(g, `Hexe hat ihr Gift eingesetzt.`);
            g.nightLog.push(`Hexe vergiftet: ${playerName(room, poisonTargetId)}`);
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

    // Push current state to narrator (they see action happened, but still need to press Weiter)
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
}

function endNight(code, room) {
    const g = room.game;
    g.phase = 'night-summary';

    // Compute deaths
    if (g.nightVictim && g.hexeHealTarget !== g.nightVictim) {
        g.pendingDeaths.add(g.nightVictim);
    }
    if (g.hexePoisonTarget) g.pendingDeaths.add(g.hexePoisonTarget);

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
    if (g.nightVictim) {
        const vname = playerName(room, g.nightVictim);
        if (g.hexeHealTarget === g.nightVictim) {
            lines.push(`Die Werwölfe haben ${vname} angegriffen — die Hexe hat sie/ihn gerettet.`);
        } else {
            lines.push(`Die Werwölfe haben ${vname} getötet.`);
        }
    } else {
        lines.push(`Die Werwölfe haben heute Nacht niemanden angegriffen.`);
    }
    if (g.hexePoisonTarget) {
        lines.push(`Die Hexe hat ${playerName(room, g.hexePoisonTarget)} vergiftet.`);
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

    io.to(code).emit('phase-changed', { phase: 'night-summary', round: g.round });

    narratorPush(g, {
        phase: 'night-summary', round: g.round,
        summary, events: g.events, players: playerStatusList(room, g),
    });
}

function checkWinCondition(room) {
    const g = room.game;
    const aliveIds  = [...g.alive];
    const wolves    = aliveIds.filter(id => WOLF_IDS.has(room.assignments[id]));
    const nonWolves = aliveIds.filter(id => !WOLF_IDS.has(room.assignments[id]));

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
    }
    g.pendingDeaths = new Set();
    g.round++;

    addEvent(g, `Tag ${g.round - 1} beginnt.`);

    // Check win condition before continuing
    const win = checkWinCondition(room);
    if (win) {
        g.phase = 'game-over';
        addEvent(g, win.message);
        io.to(code).emit('game-over', { winner: win.winner, message: win.message });
        narratorPush(g, {
            phase: 'game-over', winner: win.winner, message: win.message,
            events: g.events, players: playerStatusList(room, g),
        });
        return;
    }

    g.phase = 'day-vote';
    io.to(code).emit('phase-changed', {
        phase: 'day-vote', round: g.round - 1,
        alive: [...g.alive],
    });

    narratorPush(g, {
        phase: 'day-vote', round: g.round - 1,
        events: g.events, players: playerStatusList(room, g),
    });
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

        const n = room.players.length - (room.narratorMode ? 1 : 0);
        if (room.players.length < 3)           { socket.emit('error', { message: 'Mindestens 3 Spieler werden benötigt.' }); return; }
        if (room.selectedCards.length < n)     { socket.emit('error', { message: `Bitte mindestens ${n} Karten auswählen.` }); return; }
        if (!room.players.every(p => p.isReady)) { socket.emit('error', { message: 'Noch nicht alle Spieler sind bereit.' }); return; }
        const picked = pickBalanced(room.selectedCards, n);
        if (typeof picked === 'string')        { socket.emit('error', { message: picked }); return; }

        // Assign cards — honour requested cards only if they are in the picked set
        const pool = [...picked];
        const assignments = {};
        const unassigned  = [];
        for (const p of room.players) {
            if (room.narratorMode && p.isHost) continue; // narrator gets no card
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
            narratorId: room.narratorMode ? room.hostId : null,
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
        };

        addEvent(room.game, 'Spiel gestartet.');

        io.to(code).emit('game-started', {
            assignments,
            narratorMode: room.narratorMode,
            narratorId:   room.game.narratorId,
        });

        // Send narrator their initial state
        if (room.game.narratorId) {
            io.to(room.game.narratorId).emit('narrator-update', {
                phase: 'day-prep', round: 1,
                events:  room.game.events,
                players: playerStatusList(room, room.game),
            });
        }
    });

    // ─ Game phase controls (narrator) ────────────────────────────────────────

    socket.on('phase-advance', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        const g = room.game;
        if (!g || g.narratorId !== socket.id) return;

        if (g.phase === 'day-prep') {
            startNight(code, room);
        } else if (g.phase === 'night') {
            advanceNight(code, room);
        } else if (g.phase === 'night-summary') {
            startDay(code, room);
        } else if (g.phase === 'day-vote') {
            startNight(code, room);
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

        processNightAction(code, room, entry, socket.id, payload);

        // Tell this player their turn is done
        io.to(socket.id).emit('night-turn-done');
    });

    // ─ Disconnect ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        const ctx = findRoomBySocket(socket.id);
        if (!ctx) return;
        const { code, room } = ctx;
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) { rooms.delete(code); return; }
        if (room.hostId === socket.id) {
            room.players[0].isHost = true;
            room.hostId = room.players[0].id;
        }
        broadcast(code);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Werwolf läuft auf http://localhost:${PORT}`));
