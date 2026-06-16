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
const summaryModal  = document.getElementById('summary-modal');
const summaryBody   = document.getElementById('summary-body');
const summaryAdv    = document.getElementById('summary-advance');

// ── State ─────────────────────────────────────────────────────────────────────
let currentPhase    = 'day-prep';
let pendingSummary  = null;

const PHASE_LABELS = {
    'day-prep':      ['Vorbereitungsrunde', 'Tag',   'Alle Spieler dürfen reden. Starte die erste Nacht wenn bereit.'],
    'night':         ['Nacht',              'Nacht', ''],
    'night-summary': ['Nachtauswertung',    'Morgen','Die Nacht ist vorbei — sieh dir die Zusammenfassung an.'],
    'day-vote':      ['Tagesrunde',         'Tag',   'Das Dorf berät und stimmt ab. Starte die nächste Nacht wenn bereit.'],
};

// ── Socket ────────────────────────────────────────────────────────────────────
const socket = io();

socket.on('connect', () => {
    // narrator reconnects – server already knows who we are via socket.id in room
});

socket.on('narrator-update', (data) => {
    currentPhase = data.phase;
    updateHeader(data.phase, data.round);
    updatePhaseCard(data.phase, data.activeEntry, data.waiting);
    if (data.players) renderPlayerGrid(data.players);
    if (data.events)  renderLog(data.events);
    updateButtons(data.phase, data.activeEntry, data.waiting);
});

socket.on('night-summary', (data) => {
    pendingSummary = data;
    currentPhase   = 'night-summary';
    updateHeader('night-summary', data.round ?? 1);
    if (data.players) renderPlayerGrid(data.players);
    if (data.events)  renderLog(data.events);
    updateButtons('night-summary', null, false);
    showSummary(data.summary);
});

socket.on('phase-changed', ({ phase, round }) => {
    updateHeader(phase, round);
    updateButtons(phase, null, false);
    if (phase === 'day-vote' || phase === 'day-prep') {
        phaseCard.classList.remove('is-night');
    }
});

socket.on('game-over', ({ winner, message }) => {
    const labels = { lovers: 'Liebespaar', wolves: 'Werwölfe', villagers: 'Dorfbewohner' };
    phaseCard.classList.remove('is-night');
    phaseEyebrow.textContent = 'Spielende';
    phaseTitle.textContent   = labels[winner] ?? winner;
    phaseHint.textContent    = message;
    phaseStatus.textContent  = '';
    phaseBadge.textContent   = 'Ende';
    phaseBadge.className     = 'nh__badge';
    nextBtn.hidden  = true;
    skipBtn.hidden  = true;
});

// ── Render ────────────────────────────────────────────────────────────────────
function updateHeader(phase, round) {
    const [eyebrow] = PHASE_LABELS[phase] ?? ['—'];
    phaseBadge.textContent = eyebrow;
    phaseBadge.className   = 'nh__badge' + (phase === 'night' || phase === 'night-summary' ? ' is-night' : '');
    roundDisplay.textContent = `Runde ${round ?? 1}`;
}

function updatePhaseCard(phase, entry, waiting) {
    const [eyebrow, title, hint] = PHASE_LABELS[phase] ?? ['—', '—', ''];
    const isNight = phase === 'night';

    phaseCard.classList.toggle('is-night', isNight);
    phaseEyebrow.textContent = eyebrow;

    if (isNight && entry) {
        phaseTitle.textContent = entry.group;
        phaseHint.textContent  = entry.hint;
        phaseStatus.textContent = waiting
            ? `Warte auf: ${entry.playerNames?.join(', ') ?? '—'}`
            : 'Aktion erhalten — drücke Weiter.';
        phaseStatus.className = 'phase-card__status' + (waiting ? '' : ' is-done');
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
    if (phase === 'night') {
        skipBtn.hidden = !waiting;
        nextBtn.textContent = 'Weiter →';
        nextBtn.hidden = false;
    } else if (phase === 'night-summary') {
        skipBtn.hidden = true;
        nextBtn.hidden = true;
    } else {
        skipBtn.hidden = true;
        nextBtn.hidden = false;
        nextBtn.textContent = phase === 'day-prep' ? 'Nacht beginnt →' : 'Nächste Nacht →';
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

// ── Helper ────────────────────────────────────────────────────────────────────
function h(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
