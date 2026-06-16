import { ROLES, DESCRIPTIONS } from '/js/roles.js';

// ── URL params ────────────────────────────────────────────────────────────────
const params   = new URLSearchParams(window.location.search);
const isHost   = params.get('host') === '1';
const myName   = params.get('name');
const roomCode = params.get('code');

if (!myName || (!isHost && !roomCode)) {
    window.location.href = '/';
}

// ── State ─────────────────────────────────────────────────────────────────────
let myId        = null;
let currentRoom = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const overlay       = document.getElementById('overlay');
const overlayMsg    = document.getElementById('overlay-msg');
const overlayBack   = document.getElementById('overlay-back');
const codeDisplay   = document.getElementById('room-code-display');
const copyBtn       = document.getElementById('copy-btn');
const playerList    = document.getElementById('player-list');
const playerCount   = document.getElementById('player-count');
const cardGrid      = document.getElementById('card-grid');
const cardCounter   = document.getElementById('card-counter');
const balanceWarn   = document.getElementById('balance-warning');
const readyBtn          = document.getElementById('ready-btn');
const startBtn          = document.getElementById('start-btn');
const narratorToggle    = document.getElementById('narrator-toggle');
const narratorBtnPlayer = document.getElementById('narrator-btn-player');
const narratorBtnNarrator = document.getElementById('narrator-btn-narrator');
const lobbyError        = document.getElementById('lobby-error');

let isNarratorMode = false;
const chatLog       = document.getElementById('chat-log');
const chatForm      = document.getElementById('chat-form');
const chatInput     = document.getElementById('chat-input');

// ── Socket ────────────────────────────────────────────────────────────────────
const socket = io();

socket.on('connect', () => {
    myId = socket.id;
    if (isHost) {
        socket.emit('create-room', { hostName: myName });
    } else {
        socket.emit('join-room', { roomCode, playerName: myName });
    }
});

socket.on('connect_error', () => showError('Verbindung zum Server fehlgeschlagen.'));

socket.on('room-created', ({ roomCode: code }) => {
    codeDisplay.textContent = code;
    overlay.hidden = true;
    startBtn.hidden = false;
    narratorToggle.hidden = false;
});

socket.on('room-joined', ({ roomCode: code }) => {
    codeDisplay.textContent = code;
    overlay.hidden = true;
    readyBtn.hidden = false;
});

socket.on('room-updated', (room) => {
    currentRoom = room;
    renderPlayers(room.players);
    renderCards(room.selectedCards, room.players, room.narratorMode);
    renderChat(room.messages);
    updateFooter(room);
});

socket.on('join-error', ({ message }) => showError(message));
socket.on('error', ({ message }) => { lobbyError.textContent = message; });

socket.on('game-started', ({ assignments, narratorMode, narratorId }) => {
    if (narratorMode && socket.id === narratorId) {
        window.location.href = '/html/narrator.html';
        return;
    }
    const card = assignments[socket.id];
    const p = new URLSearchParams({ card });
    window.location.href = '/html/game.html?' + p.toString();
});

// ── Render: Players ───────────────────────────────────────────────────────────
function renderPlayers(players) {
    playerCount.textContent = `(${players.length})`;
    playerList.innerHTML = players.map(p => {
        const isMe  = p.id === myId;
        const reqRole = p.requestedCard ? ROLES.find(r => r.id === p.requestedCard) : null;
        return `
        <li class="player-item${p.isReady ? ' is-ready' : ''}${isMe ? ' is-me' : ''}">
            ${p.isHost ? '<span class="player-item__crown" title="Spielleiter">&#9812;</span>' : ''}
            <span class="player-item__name">${h(p.name)}${isMe ? ' <em style="opacity:.5;font-style:normal">(du)</em>' : ''}</span>
            ${reqRole ? `<span class="player-item__request">${h(reqRole.name)}</span>` : ''}
            ${!p.isHost ? `<span class="player-item__status">${p.isReady ? '&#10003;' : '&hellip;'}</span>` : ''}
        </li>`;
    }).join('');
}

// ── Render: Cards ─────────────────────────────────────────────────────────────
function renderCards(selectedCards, players, narratorMode) {
    const total      = (players?.length ?? 0) - (narratorMode ? 1 : 0);
    const selCount   = selectedCards.length;
    const wolfCount  = selectedCards.filter(id => id.startsWith('Werwolf_')).length;
    const maxWolves  = Math.floor(total / 3);

    // Counter — green when enough cards selected, red when too few
    cardCounter.textContent = `${selCount} / ${total}`;
    cardCounter.className   = 'card-counter' + (selCount >= total && total > 0 ? ' is-match' : '');

    // Balance warning
    if (total >= 2 && selCount > 0) {
        if (wolfCount === 0) {
            balanceWarn.textContent = 'Kein Werwolf ausgewählt!';
            balanceWarn.hidden = false;
        } else if (wolfCount > maxWolves) {
            const usable = Math.min(wolfCount, maxWolves);
            balanceWarn.textContent = `${wolfCount} Werwölfe gewählt — zufällig werden ${usable} davon genutzt (max. ${maxWolves} für ${total} Spieler).`;
            balanceWarn.hidden = false;
        } else {
            balanceWarn.hidden = true;
        }
    } else {
        balanceWarn.hidden = true;
    }

    const myPlayer = players?.find(p => p.id === myId);

    const groups = [
        { label: 'Werwölfe',      roles: ROLES.filter(r => r.faction === 'W') },
        { label: 'Dorfbewohner',  roles: ROLES.filter(r => r.faction === 'D') },
        { label: 'Neutral / Solo',roles: ROLES.filter(r => r.faction === 'N' || r.faction === 'S') },
    ];

    cardGrid.innerHTML = groups.map(g => `
        <div class="card-group">
            <p class="card-group__label">${g.label}</p>
            <div class="card-group__cards">
                ${g.roles.map(role => {
                    const selected    = selectedCards.includes(role.id);
                    const myRequest   = myPlayer?.requestedCard === role.id;
                    const reqCount    = players?.filter(p => p.requestedCard === role.id).length ?? 0;
                    let cls = 'role-card';
                    if (selected)           cls += ' is-selected';
                    if (myRequest)          cls += ' is-requested';
                    if (!isHost && !selected && !myRequest) cls += ' is-dimmed';
                    cls += ' is-clickable';

                    return `
                    <button class="${cls}" data-role-id="${role.id}" title="${h(DESCRIPTIONS[role.id] ?? '')}">
                        <img class="role-card__img" src="/assets/${role.image}" alt="${h(role.name)}" loading="lazy">
                        <span class="role-card__name">${h(role.name)}</span>
                        ${isHost && reqCount > 0 ? `<span class="role-card__badge">${reqCount}&#x2665;</span>` : ''}
                        ${!isHost && myRequest   ? `<span class="role-card__badge">&#x2665;</span>` : ''}
                    </button>`;
                }).join('')}
            </div>
        </div>
    `).join('');

    cardGrid.querySelectorAll('.role-card.is-clickable').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.roleId;
            socket.emit(isHost ? 'toggle-card' : 'request-card', { cardId: id });
        });
    });
}

// ── Render: Chat ──────────────────────────────────────────────────────────────
function renderChat(messages) {
    const atBottom = chatLog.scrollHeight - chatLog.scrollTop <= chatLog.clientHeight + 60;
    chatLog.innerHTML = messages.map(m =>
        `<div class="chat-msg"><span class="chat-msg__author">${h(m.author)}</span><span class="chat-msg__text">${h(m.text)}</span></div>`
    ).join('');
    if (atBottom) chatLog.scrollTop = chatLog.scrollHeight;
}

// ── Footer state ──────────────────────────────────────────────────────────────
function updateFooter(room) {
    if (isHost) {
        const needed   = room.players.length - (room.narratorMode ? 1 : 0);
        const allReady = room.players.every(p => p.isHost || p.isReady);
        const cardOk   = room.selectedCards.length >= needed && needed >= 2;
        startBtn.disabled = !(allReady && cardOk);
        return;
    }
    const me = room.players.find(p => p.id === myId);
    if (me) readyBtn.classList.toggle('is-active', me.isReady);
}

// ── Interactions ──────────────────────────────────────────────────────────────
readyBtn.addEventListener('click', () => {
    const me = currentRoom?.players?.find(p => p.id === myId);
    socket.emit('set-ready', { ready: !me?.isReady });
});

startBtn.addEventListener('click', () => {
    lobbyError.textContent = '';
    socket.emit('start-game');
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('send-message', { text });
    chatInput.value = '';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
        copyBtn.textContent = '✓';
        setTimeout(() => { copyBtn.innerHTML = '&#10697;'; }, 1500);
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
// Narrator mode toggle
[narratorBtnPlayer, narratorBtnNarrator].forEach(btn => {
    btn.addEventListener('click', () => {
        isNarratorMode = btn.dataset.mode === 'narrator';
        narratorBtnPlayer.classList.toggle('is-active', !isNarratorMode);
        narratorBtnNarrator.classList.toggle('is-active', isNarratorMode);
        socket.emit('set-narrator-mode', { isNarrator: isNarratorMode });
    });
});

function showError(msg) {
    overlayMsg.textContent = msg;
    overlayBack.hidden = false;
    const spinner = overlay.querySelector('.overlay__spinner');
    if (spinner) spinner.hidden = true;
    overlay.hidden = false;
}

function h(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
