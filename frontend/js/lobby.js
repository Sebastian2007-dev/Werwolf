import { ROLES, DESCRIPTIONS } from '/js/roles.js';

// ── URL params ────────────────────────────────────────────────────────────────
const params      = new URLSearchParams(window.location.search);
const isHost      = params.get('host') === '1';
const myName      = params.get('name');
const roomCode    = params.get('code');
const rejoinCode  = params.get('rejoin');

if (!myName || (!isHost && !roomCode && !rejoinCode)) {
    window.location.href = '/';
}

// ── State ─────────────────────────────────────────────────────────────────────
let myId        = null;
let currentRoom = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const overlay               = document.getElementById('overlay');
const overlayMsg            = document.getElementById('overlay-msg');
const overlayBack           = document.getElementById('overlay-back');
const codeDisplay           = document.getElementById('room-code-display');
const copyBtn               = document.getElementById('copy-btn');
const qrBtn                 = document.getElementById('qr-btn');
const qrModal               = document.getElementById('qr-modal');
const qrBackdrop            = document.getElementById('qr-backdrop');
const qrClose               = document.getElementById('qr-close');
const qrCanvas              = document.getElementById('qr-canvas');
const qrUrl                 = document.getElementById('qr-url');
const playerList            = document.getElementById('player-list');
const playerCount           = document.getElementById('player-count');
const addBotBtn             = document.getElementById('add-bot-btn');
const cardGrid              = document.getElementById('card-grid');
const cardCounter           = document.getElementById('card-counter');
const balanceWarn           = document.getElementById('balance-warning');
const readyBtn              = document.getElementById('ready-btn');
const startBtn              = document.getElementById('start-btn');
const narratorToggle        = document.getElementById('narrator-toggle');
const narratorBtnPlayer     = document.getElementById('narrator-btn-player');
const narratorBtnNarrator   = document.getElementById('narrator-btn-narrator');
const lobbyError            = document.getElementById('lobby-error');
const accusationsSetting    = document.getElementById('accusations-setting');
const maxAccusationsInput   = document.getElementById('max-accusations-input');
const accusationsMinus      = document.getElementById('accusations-minus');
const accusationsPlus       = document.getElementById('accusations-plus');
const botIntelSetting       = document.getElementById('bot-intel-setting');
const botIntelSelect        = document.getElementById('bot-intel-select');

// Anzeige-Labels für die Bot-Persönlichkeiten (Server: player.personality)
const PERSONALITY_LABELS = {
    aggressiv:      'aggressiv',
    zurueckhaltend: 'zurückhaltend',
    mitlaeufer:     'Mitläufer',
    ausgewogen:     'ausgewogen',
};

let isNarratorMode = false;
const chatLog       = document.getElementById('chat-log');
const chatForm      = document.getElementById('chat-form');
const chatInput     = document.getElementById('chat-input');
const chatPanel     = document.querySelector('.lobby__col--chat');
const chatToggle    = document.getElementById('chat-toggle');
const chatBadge     = document.getElementById('chat-badge');
const chatBackdrop  = document.getElementById('chat-backdrop');

// Mobile chat state
let chatPanelOpen   = false;
let prevMsgCount    = 0;
let unreadCount     = 0;
let chatFirstRender = true;

// ── Socket ────────────────────────────────────────────────────────────────────
const socket = io();

let lobbyJoined = false;
socket.on('connect', () => {
    myId = socket.id;
    if (lobbyJoined) return;
    lobbyJoined = true;
    if (rejoinCode) {
        socket.emit('rejoin-lobby', { roomCode: rejoinCode, playerName: myName });
    } else if (isHost && roomCode) {
        // Host reloaded — reconnect to existing room
        socket.emit('rejoin-lobby', { roomCode, playerName: myName });
    } else if (isHost) {
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
    accusationsSetting.hidden = false;
    botIntelSetting.hidden = false;
    addBotBtn.hidden = false;
    // Persist code in URL so a page reload rejoins the same room
    const url = new URL(window.location.href);
    url.searchParams.set('code', code);
    history.replaceState(null, '', url);
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
    if (isHost && room.maxAccusations != null) {
        maxAccusationsInput.value = room.maxAccusations;
    }
    if (isHost && room.botIntelligence != null) {
        botIntelSelect.value = String(room.botIntelligence);
    }
});

socket.on('join-error', ({ message }) => {
    // Host reloaded but server was restarted — create a fresh room
    if (isHost && roomCode) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        history.replaceState(null, '', url);
        socket.emit('create-room', { hostName: myName });
        return;
    }
    showError(message);
});
socket.on('error', ({ message }) => { lobbyError.textContent = message; });
socket.on('you-were-kicked', () => { window.location.href = '/'; });

socket.on('game-started', ({ assignments, narratorMode }) => {
    const code = codeDisplay.textContent;
    const pid  = socket.id;
    // Narrator has no card assignment
    if (narratorMode && !assignments[pid]) {
        sessionStorage.setItem('ww_roomCode', code);
        sessionStorage.setItem('ww_playerId', pid);
        const p = new URLSearchParams({ code, player: pid });
        window.location.href = '/html/narrator.html?' + p.toString();
        return;
    }
    const card = assignments[pid];
    const p = new URLSearchParams({ card, code, player: pid });
    window.location.href = '/html/game.html?' + p.toString();
});

// ── Render: Players ───────────────────────────────────────────────────────────
function renderPlayers(players) {
    playerCount.textContent = `(${players.length})`;
    const designatedNarrator = currentRoom?.designatedNarrator;
    playerList.innerHTML = players.map(p => {
        const isMe  = p.id === myId;
        const reqRole = p.requestedCard ? ROLES.find(r => r.id === p.requestedCard) : null;
        const isDesNarrator = p.id === designatedNarrator;
        const hostActions = (isHost && !isMe && !p.isHost) ? `
            ${!p.isBot ? `<button class="pi-narrator${isDesNarrator ? ' is-active' : ''}" data-id="${p.id}" title="${isDesNarrator ? 'Erzähler-Rolle entfernen' : 'Als Erzähler festlegen'}">&#128214;</button>` : ''}
            <button class="pi-kick" data-id="${p.id}" title="${p.isBot ? 'Bot entfernen' : 'Spieler kicken'}">&#x2715;</button>` : '';
        return `
        <li class="player-item${p.isReady ? ' is-ready' : ''}${isMe ? ' is-me' : ''}${isDesNarrator ? ' is-narrator' : ''}${p.isBot ? ' is-bot' : ''}">
            ${p.isHost ? '<span class="player-item__crown" title="Spielleiter">&#9812;</span>' : ''}
            <span class="player-item__name">${h(p.name)}${isMe ? ' <em style="opacity:.5;font-style:normal">(du)</em>' : ''}${isDesNarrator ? ' <em style="opacity:.6;font-style:normal">(Erzähler)</em>' : ''}${p.isBot && p.personality ? `<span class="player-item__persona">${h(PERSONALITY_LABELS[p.personality] ?? p.personality)}</span>` : ''}</span>
            ${reqRole ? `<span class="player-item__request">${h(reqRole.name)}</span>` : ''}
            ${!p.isHost ? `<span class="player-item__status${p.isReady ? '' : ' is-waiting'}">${p.isReady ? '&#10003; bereit' : 'nicht bereit'}</span>` : ''}
            ${hostActions}
        </li>`;
    }).join('');

    playerList.querySelectorAll('.pi-kick').forEach(btn => {
        btn.addEventListener('click', () => socket.emit('kick-player', { playerId: btn.dataset.id }));
    });
    playerList.querySelectorAll('.pi-narrator').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            socket.emit('set-narrator-player', { playerId: designatedNarrator === id ? null : id });
        });
    });
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
        } else if (selCount < total) {
            const missing = total - selCount;
            balanceWarn.textContent = `${missing} fehlende${missing === 1 ? ' Karte wird' : ' Karten werden'} automatisch mit Dorfbewohnern aufgefüllt.`;
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

    if (chatFirstRender) {
        chatFirstRender = false;
        prevMsgCount = messages.length;
        return;
    }
    if (!chatPanelOpen && messages.length > prevMsgCount) {
        unreadCount += messages.length - prevMsgCount;
        updateChatBadge();
    }
    prevMsgCount = messages.length;
}

function updateChatBadge() {
    chatBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    chatBadge.classList.toggle('has-unread', unreadCount > 0);
}

function openChat() {
    chatPanelOpen = true;
    chatPanel.classList.add('is-open');
    chatToggle.classList.add('is-open');
    chatBackdrop.classList.add('is-visible');
    unreadCount = 0;
    prevMsgCount = currentRoom?.messages?.length ?? prevMsgCount;
    updateChatBadge();
    setTimeout(() => { chatLog.scrollTop = chatLog.scrollHeight; }, 50);
}

function closeChat() {
    chatPanelOpen = false;
    chatPanel.classList.remove('is-open');
    chatToggle.classList.remove('is-open');
    chatBackdrop.classList.remove('is-visible');
}

// ── Footer state ──────────────────────────────────────────────────────────────
const footerHint = document.getElementById('footer-hint');

function setReadyBtnState(isReady) {
    readyBtn.classList.toggle('is-active', isReady);
    readyBtn.textContent = isReady ? '✓ Du bist bereit' : 'Bereit? Hier tippen!';
}

function updateFooter(room) {
    if (isHost) {
        const needed      = room.players.length - (room.narratorMode ? 1 : 0);
        const allReady    = room.players.every(p => p.isHost || p.isReady);
        const wolfSelected = room.selectedCards.some(id => id.startsWith('Werwolf_'));
        const cardOk      = wolfSelected && needed >= 2;
        startBtn.disabled = !(allReady && cardOk);

        // Dem Host zeigen, warum es noch nicht losgehen kann
        const notReady = room.players.filter(p => !p.isHost && !p.isReady).map(p => p.name);
        if (notReady.length > 0) {
            footerHint.textContent = `Warte auf „Bereit" von: ${notReady.join(', ')}`;
            footerHint.hidden = false;
        } else if (!wolfSelected) {
            footerHint.textContent = 'Wähle mindestens eine Werwolf-Karte aus.';
            footerHint.hidden = false;
        } else {
            footerHint.hidden = true;
        }
        return;
    }
    const me = room.players.find(p => p.id === myId);
    if (me) {
        setReadyBtnState(me.isReady);
        footerHint.textContent = me.isReady
            ? 'Du bist bereit — warte, bis der Host das Spiel startet.'
            : 'Tippe auf „Bereit", sonst kann das Spiel nicht starten!';
        footerHint.hidden = false;
    }
}

// ── Interactions ──────────────────────────────────────────────────────────────
readyBtn.addEventListener('click', () => {
    const me = currentRoom?.players?.find(p => p.id === myId);
    const newReady = !me?.isReady;
    // Sofortiges visuelles Feedback, ohne auf den Server zu warten
    setReadyBtnState(newReady);
    footerHint.textContent = newReady
        ? 'Du bist bereit — warte, bis der Host das Spiel startet.'
        : 'Tippe auf „Bereit", sonst kann das Spiel nicht starten!';
    footerHint.hidden = false;
    socket.emit('set-ready', { ready: newReady });
});

startBtn.addEventListener('click', () => {
    lobbyError.textContent = '';
    socket.emit('start-game');
});

addBotBtn.addEventListener('click', () => socket.emit('add-bot'));

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('send-message', { text });
    chatInput.value = '';
});

chatToggle.addEventListener('click', () => {
    if (chatPanelOpen) closeChat(); else openChat();
});
chatBackdrop.addEventListener('click', closeChat);

// Zurück-Knopf abfangen: Chat schließen statt die Lobby zu verlassen
history.pushState({ ww: 'lobby' }, '');
window.addEventListener('popstate', () => {
    if (chatPanelOpen) closeChat();
    else if (!qrModal.hidden) closeQrModal();
    history.pushState({ ww: 'lobby' }, '');
});

copyBtn.addEventListener('click', () => {
    const code = codeDisplay.textContent;
    const onSuccess = () => {
        copyBtn.textContent = '✓';
        setTimeout(() => { copyBtn.innerHTML = '&#10697;'; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(onSuccess);
    } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onSuccess();
    }
});

// QR-Code
let qrInstance = null;

function openQrModal() {
    const code = codeDisplay.textContent.trim();
    const joinUrl = `${window.location.origin}/html/join.html?code=${code}`;
    qrUrl.textContent = joinUrl;
    qrCanvas.innerHTML = '';
    qrInstance = new QRCode(qrCanvas, {
        text: joinUrl,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
    qrModal.hidden = false;
}

function closeQrModal() {
    qrModal.hidden = true;
}

qrBtn.addEventListener('click', openQrModal);
qrClose.addEventListener('click', closeQrModal);
qrBackdrop.addEventListener('click', closeQrModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQrModal(); });

// Max accusations setting
function emitAccusations() {
    const v = parseInt(maxAccusationsInput.value, 10);
    if (v >= 1 && v <= 10) socket.emit('set-max-accusations', { value: v });
}
maxAccusationsInput.addEventListener('change', emitAccusations);
accusationsMinus.addEventListener('click', () => {
    const v = parseInt(maxAccusationsInput.value, 10);
    if (v > 1) { maxAccusationsInput.value = v - 1; emitAccusations(); }
});
accusationsPlus.addEventListener('click', () => {
    const v = parseInt(maxAccusationsInput.value, 10);
    if (v < 10) { maxAccusationsInput.value = v + 1; emitAccusations(); }
});

// Bot intelligence setting
botIntelSelect.addEventListener('change', () => {
    const v = parseInt(botIntelSelect.value, 10);
    if (v >= 1 && v <= 3) socket.emit('set-bot-intelligence', { value: v });
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
