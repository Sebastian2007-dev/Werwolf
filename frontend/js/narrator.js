import { ROLES, DESCRIPTIONS } from '/js/roles.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const phaseBadge    = document.getElementById('phase-badge');
const roundDisplay  = document.getElementById('round-display');
const phaseCard     = document.getElementById('phase-card');
const phaseEyebrow  = document.getElementById('phase-eyebrow');
const phaseTitle    = document.getElementById('phase-title');
const phaseHint     = document.getElementById('phase-hint');
const phaseStatus   = document.getElementById('phase-status');
const playerGrid    = document.getElementById('player-grid');
const logEntries    = document.getElementById('log-entries');
const nextBtn       = document.getElementById('next-btn');
const skipBtn       = document.getElementById('skip-btn');
const summaryModal    = document.getElementById('summary-modal');
const summaryBody     = document.getElementById('summary-body');
const summaryAdv      = document.getElementById('summary-advance');
const dayResultModal    = document.getElementById('day-result-modal');
const dayResultBody     = document.getElementById('day-result-body');
const dayResultAdv      = document.getElementById('day-result-advance');
const gameOverActions   = document.getElementById('game-over-actions');
const restartSameBtn    = document.getElementById('restart-same-btn');
const restartNewBtn     = document.getElementById('restart-new-btn');

// ── State ─────────────────────────────────────────────────────────────────────
let currentPhase    = 'day-prep';
let pendingSummary  = null;
const params = new URLSearchParams(window.location.search);
const roomCode = params.get('code')   || sessionStorage.getItem('ww_roomCode');
let currentPlayerId = params.get('player') || sessionStorage.getItem('ww_playerId');

const PHASE_LABELS = {
    'day-prep':           ['Vorbereitungsrunde', 'Tag',    'Alle Spieler dürfen reden. Starte die erste Nacht wenn bereit.'],
    'night':              ['Nacht',              'Nacht',  ''],
    'night-summary':      ['Nachtauswertung',    'Morgen', 'Die Nacht ist vorbei — sieh dir die Zusammenfassung an.'],
    'hunter-night-shot':  ['Jäger schießt',      'Morgen', 'Der Jäger reißt jemanden mit in den Tod…'],
    'hunter-day-shot':    ['Jäger schießt',      'Tag',    'Der Jäger reißt jemanden mit in den Tod…'],
    'day-accusation':     ['Anklage-Phase',      'Tag',    'Spieler nominieren Angeklagte…'],
    'day-voting':         ['Abstimmung',         'Tag',    'Spieler stimmen über die Angeklagten ab…'],
    'day-result':         ['Tagesergebnis',      'Tag',    'Sieh dir das Ergebnis an.'],
};

// ── Socket ────────────────────────────────────────────────────────────────────
const socket = io();

socket.on('connect', () => {
    if (!roomCode || !currentPlayerId) {
        phaseStatus.textContent = 'Verbindung zum Raum fehlt. Starte das Spiel neu aus der Lobby.';
        nextBtn.disabled = true;
        return;
    }
    socket.emit('resume-game', { roomCode, playerId: currentPlayerId });
});

socket.on('resume-ok', () => {
    currentPlayerId = socket.id; // Keep track of current socket ID for reconnects
    nextBtn.disabled = false;
});

socket.on('resume-error', ({ message }) => {
    phaseStatus.textContent = message;
    nextBtn.disabled = true;
    skipBtn.disabled = true;
});

socket.on('narrator-update', (data) => {
    currentPhase = data.phase;
    updateHeader(data.phase, data.round);
    updatePhaseCard(data.phase, data.activeEntry, data.waiting, data.progress, data.hunterName);
    if (data.players) renderPlayerGrid(data.players);
    if (data.events)  renderLog(data.events);
    updateButtons(data.phase, data.activeEntry, data.waiting);
    if (data.phase === 'night-summary' && data.summary) showSummary(data.summary);
    if (data.phase === 'day-result') showDayResult(data.eliminated, data.skipped, data.hunterShot, data.alsoDied, data.narrSurvived);
});

socket.on('phase-changed', ({ phase, round }) => {
    updateHeader(phase, round);
    updateButtons(phase, null, false);
    if (phase === 'day-voting' || phase === 'day-prep') {
        phaseCard.classList.remove('is-night');
    }
});

socket.on('game-over', ({ winner, message }) => {
    const labels = { lovers: 'Liebespaar', wolves: 'Werwölfe', villagers: 'Dorfbewohner', 'einsamer-wolf': 'Einsamer Wolf' };
    phaseCard.classList.remove('is-night');
    phaseEyebrow.textContent = 'Spielende';
    phaseTitle.textContent   = labels[winner] ?? winner;
    phaseHint.textContent    = message;
    phaseStatus.textContent  = '';
    phaseBadge.textContent   = 'Ende';
    phaseBadge.className     = 'nh__badge';
    nextBtn.hidden       = true;
    skipBtn.hidden       = true;
    gameOverActions.hidden = false;
});

socket.on('game-started', ({ assignments, narratorMode }) => {
    if (narratorMode && !assignments[currentPlayerId]) {
        const p = new URLSearchParams({ code: roomCode, player: currentPlayerId });
        window.location.href = '/html/narrator.html?' + p.toString();
    }
});

socket.on('back-to-lobby', ({ name, isHost, roomCode: rc }) => {
    const p = new URLSearchParams({ rejoin: rc, name });
    if (isHost) p.set('host', '1');
    window.location.href = '/html/lobby.html?' + p.toString();
});

socket.on('session-ended', () => {
    window.location.href = '/';
});

socket.on('auto-mode-activated', ({ message }) => {
    nextBtn.hidden = true;
    skipBtn.hidden = true;
    const banner = document.createElement('p');
    banner.className = 'narrator-auto-banner';
    banner.textContent = message;
    document.querySelector('.narrator-header')?.appendChild(banner);
});

// ── Render ────────────────────────────────────────────────────────────────────
function updateHeader(phase, round) {
    const [eyebrow] = PHASE_LABELS[phase] ?? ['—'];
    phaseBadge.textContent = eyebrow;
    phaseBadge.className   = 'nh__badge' + (phase === 'night' || phase === 'night-summary' ? ' is-night' : '');
    roundDisplay.textContent = `Runde ${round ?? 1}`;
}

function updatePhaseCard(phase, entry, waiting, progress, hunterName) {
    const [eyebrow, title, hint] = PHASE_LABELS[phase] ?? ['—', '—', ''];
    const isNight = phase === 'night';

    phaseCard.classList.toggle('is-night', isNight || phase === 'night-summary' || phase === 'hunter-night-shot');
    phaseEyebrow.textContent = eyebrow;

    if (isNight && entry) {
        phaseTitle.textContent = entry.group;
        phaseHint.textContent  = entry.hint;
        phaseStatus.textContent = waiting
            ? `Warte auf: ${entry.playerNames?.join(', ') ?? '—'}`
            : 'Aktion erhalten — drücke Weiter.';
        phaseStatus.className = 'phase-card__status' + (waiting ? '' : ' is-done');
    } else if (phase === 'hunter-night-shot' || phase === 'hunter-day-shot') {
        phaseTitle.textContent = title;
        phaseHint.textContent  = hint;
        phaseStatus.textContent = hunterName ? `${hunterName} muss jetzt schießen.` : 'Jäger schießt…';
        phaseStatus.className = 'phase-card__status';
    } else if (phase === 'day-accusation' && progress) {
        phaseTitle.textContent = title;
        phaseHint.textContent  = hint;
        phaseStatus.textContent = `${progress.nominated} / ${progress.total} nominiert (${progress.skipped} übersprungen)`;
        phaseStatus.className = 'phase-card__status';
    } else if (phase === 'day-voting' && progress) {
        phaseTitle.textContent = title;
        phaseHint.textContent  = hint;
        phaseStatus.textContent = `${progress.voted} / ${progress.total} abgestimmt`;
        phaseStatus.className = 'phase-card__status';
    } else {
        phaseTitle.textContent   = title;
        phaseHint.textContent    = hint;
        phaseStatus.textContent  = '';
    }
}

function renderPlayerGrid(players) {
    playerGrid.innerHTML = players.map(p => {
        const role = ROLES.find(r => r.id === p.roleId);
        return `
        <div class="pg-player${!p.isAlive ? ' is-dead' : ''}" title="${role ? role.name : ''}">
            <div class="pg-player__dot"></div>
            <span>${h(p.name)}</span>
        </div>`;
    }).join('');
}

function renderLog(events) {
    const atBottom = logEntries.scrollHeight - logEntries.scrollTop <= logEntries.clientHeight + 60;

    const phaseKeywords = ['beginnt', 'Tag', 'Nacht', 'vorbei', 'Spiel'];
    logEntries.innerHTML = events.map(ev => {
        const t    = new Date(ev.time);
        const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        const isPhase = phaseKeywords.some(k => ev.text.includes(k)) && ev.text.length < 50;
        return `
        <div class="log-entry${isPhase ? ' log-entry--phase' : ''}">
            <span class="log-entry__time">${time}</span>
            <span class="log-entry__text">${h(ev.text)}</span>
        </div>`;
    }).join('');

    if (atBottom) logEntries.scrollTop = logEntries.scrollHeight;
}

function updateButtons(phase, entry, waiting) {
    gameOverActions.hidden = (phase !== 'game-over');
    skipBtn.hidden = true;
    if (phase === 'game-over') {
        nextBtn.hidden = true;
    } else if (phase === 'night') {
        skipBtn.hidden = !waiting;
        nextBtn.textContent = 'Weiter →';
        nextBtn.hidden = false;
    } else if (phase === 'night-summary' || phase === 'day-result') {
        // Immer sichtbar — falls das Modal versehentlich geschlossen wurde
        nextBtn.textContent = 'Weiter →';
        nextBtn.hidden = false;
    } else if (phase === 'hunter-night-shot' || phase === 'hunter-day-shot') {
        nextBtn.textContent = 'Jäger überspringen →';
        nextBtn.hidden = false;
    } else if (phase === 'day-accusation' || phase === 'day-voting') {
        nextBtn.textContent = 'Phase abschließen →';
        nextBtn.hidden = false;
    } else {
        nextBtn.hidden = false;
        nextBtn.textContent = 'Nacht beginnt →';
    }
}

function showSummary(summary) {
    summaryBody.innerHTML = '';

    if (!summary) return;

    summary.lines.forEach(line => {
        const cls = line.includes('getötet') || line.includes('vergiftet') ? 'is-death'
                  : line.includes('gerettet') ? 'is-saved' : '';
        const div = document.createElement('p');
        div.className = `summary-line ${cls}`;
        div.textContent = line;
        summaryBody.appendChild(div);
    });

    if (summary.deaths?.length > 0) {
        const d = document.createElement('div');
        d.className = 'summary-deaths';
        d.innerHTML = '<strong>Gestorben:</strong> ' +
            summary.deaths.map(p => `${h(p.name)} (${h(p.roleName)})`).join(', ');
        summaryBody.appendChild(d);
    }

    summaryModal.showModal();
}

// ── Interactions ──────────────────────────────────────────────────────────────

// Zurück-Knopf abfangen — der Erzähler darf nicht versehentlich das Spiel verlassen
history.pushState({ ww: 'narrator' }, '');
window.addEventListener('popstate', () => {
    history.pushState({ ww: 'narrator' }, '');
});

nextBtn.addEventListener('click', () => {
    socket.emit('phase-advance');
});

skipBtn.addEventListener('click', () => {
    socket.emit('phase-skip');
});

summaryAdv.addEventListener('click', () => {
    summaryModal.close();
    socket.emit('phase-advance');
});

summaryModal.addEventListener('click', (e) => {
    if (e.target === summaryModal) summaryModal.close();
});

dayResultAdv.addEventListener('click', () => {
    dayResultModal.close();
    socket.emit('phase-advance');
});

restartSameBtn.addEventListener('click', () => {
    gameOverActions.hidden = true;
    socket.emit('restart-game');
});

restartNewBtn.addEventListener('click', () => {
    gameOverActions.hidden = true;
    socket.emit('reset-to-lobby');
});

dayResultModal.addEventListener('click', (e) => {
    if (e.target === dayResultModal) dayResultModal.close();
});

function showDayResult(eliminated, skipped, hunterShot, alsoDied, narrSurvived) {
    dayResultBody.innerHTML = '';
    const addLine = (text, cls = '') => {
        const p = document.createElement('p');
        p.className = `summary-line ${cls}`;
        p.textContent = text;
        dayResultBody.appendChild(p);
    };
    if (narrSurvived) {
        addLine('Der Narr überlebt die Abstimmung — Narrenfreiheit.');
    } else if (skipped) {
        addLine('Das Dorf überspringt die Abstimmung — niemand wird eliminiert.');
    } else if (eliminated) {
        addLine(`${eliminated.name} (${eliminated.roleName}) wurde vom Dorf eliminiert.`, 'is-death');
    } else {
        addLine('Unentschieden — niemand wird eliminiert.');
    }
    if (hunterShot) {
        addLine(`Jäger erschoss ${hunterShot.name} (${hunterShot.roleName}).`, 'is-death');
    }
    (alsoDied ?? []).forEach(d => {
        addLine(`${d.name} (${d.roleName}) stirbt ebenfalls.`, 'is-death');
    });
    dayResultModal.showModal();
}

// ── Helper ────────────────────────────────────────────────────────────────────
function h(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
