import { ROLES, DESCRIPTIONS, FACTION_LABEL } from '/js/roles.js';

const params = new URLSearchParams(window.location.search);
const cardId   = params.get('card');
const roomCode = params.get('code');
// On reconnect we need the MOST RECENT socket ID known to the server, not the original lobby ID
let currentPlayerId = params.get('player');

if (!cardId) { window.location.href = '/'; }

const role = ROLES.find(r => r.id === cardId);

// ── Populate card ─────────────────────────────────────────────────────────────
const roleName    = document.getElementById('role-name');
const roleFaction = document.getElementById('role-faction');

if (role) {
    document.getElementById('role-img').src = `/assets/${role.image}`;
    document.getElementById('role-img').alt = role.name;
    roleName.textContent    = role.name;
    roleFaction.textContent = FACTION_LABEL[role.faction] ?? role.faction;
}

// ── Flip card ─────────────────────────────────────────────────────────────────
const cardFlip = document.getElementById('card-flip');
const flipBtn  = document.getElementById('flip-btn');

// Start face-down: role is hidden until the player peeks
let flipped = true;
cardFlip.classList.add('is-flipped');
flipBtn.classList.add('is-flipped');
flipBtn.textContent  = 'Karte zeigen';
roleName.hidden      = true;
roleFaction.hidden   = true;
document.title       = 'Deine Rolle – Werwolf';

flipBtn.addEventListener('click', () => {
    flipped = !flipped;
    cardFlip.classList.toggle('is-flipped', flipped);
    flipBtn.classList.toggle('is-flipped', flipped);

    const hiding = flipped; // true = card face-down, role hidden
    flipBtn.textContent  = hiding ? 'Karte zeigen'    : 'Karte umdrehen';
    roleName.hidden      = hiding;
    roleFaction.hidden   = hiding;
    document.title       = hiding
        ? 'Deine Rolle – Werwolf'
        : `${role?.name ?? ''} – Werwolf`;
});

// ── Info modal ────────────────────────────────────────────────────────────────
const infoModal  = document.getElementById('info-modal');
const infoTitle  = document.getElementById('info-modal-title');
const infoDesc   = document.getElementById('info-modal-desc');
const infoBtn    = document.getElementById('info-btn');
const closeBtn   = infoModal.querySelector('.modal__close');

function openCardModal() {
    infoTitle.textContent = role?.name ?? cardId;
    infoDesc.textContent  = DESCRIPTIONS[cardId] ?? 'Keine Beschreibung verfügbar.';
    infoModal.showModal();
}

infoBtn.addEventListener('click', openCardModal);
document.getElementById('night-card-peek').addEventListener('click', openCardModal);

closeBtn.addEventListener('click', () => infoModal.close());
infoModal.addEventListener('click', (e) => { if (e.target === infoModal) infoModal.close(); });

// ── Liebespaar ────────────────────────────────────────────────────────────────
const lovePanel      = document.getElementById('love-panel');
const lovePanelText  = document.getElementById('love-panel-text');
const loveRecallBtn  = document.getElementById('love-recall-btn');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverWinner  = document.getElementById('game-over-winner');
const gameOverMessage = document.getElementById('game-over-message');

let lovePartnerName = null;

loveRecallBtn.addEventListener('click', () => {
    lovePanel.hidden = !lovePanel.hidden;
});

// ── Night overlay ─────────────────────────────────────────────────────────────
const socket = io();

socket.on('connect', () => {
    if (roomCode && currentPlayerId) {
        socket.emit('resume-game', { roomCode, playerId: currentPlayerId });
    }
});

socket.on('resume-ok', () => {
    // Track the current socket ID so reconnects can find us in the room
    currentPlayerId = socket.id;
});

// ── Day panel refs ────────────────────────────────────────────────────────────
const dayPanel          = document.getElementById('day-panel');
const dayAccusationUi   = document.getElementById('day-accusation-ui');
const dayVotingUi       = document.getElementById('day-voting-ui');
const dayWaitUi         = document.getElementById('day-wait-ui');
const dayTargetList     = document.getElementById('day-target-list');
const dayAccusedList    = document.getElementById('day-accused-list');
const dayAccuseBtn      = document.getElementById('day-accuse-btn');
const daySkipBtn        = document.getElementById('day-skip-btn');
const dayVoteBtn        = document.getElementById('day-vote-btn');
const dayWaitText       = document.getElementById('day-wait-text');

let daySelectedId = null;
let dayAlive = false;

// ── Morning overlay refs ──────────────────────────────────────────────────────
const morningOverlay  = document.getElementById('morning-overlay');
const morningGrid     = document.getElementById('morning-grid');
const morningDeaths   = document.getElementById('morning-deaths');
document.getElementById('morning-card-peek').addEventListener('click', openCardModal);

const nightOverlay  = document.getElementById('night-overlay');
const nightWait     = document.getElementById('night-wait');
const nightWaitSub  = document.getElementById('night-wait-sub');
const nightAction   = document.getElementById('night-action');
const naGroup       = document.getElementById('na-group');
const naHint        = document.getElementById('na-hint');
const targetList    = document.getElementById('target-list');
const witchUi       = document.getElementById('witch-ui');
const witchVictim   = document.getElementById('witch-victim');
const witchHeal     = document.getElementById('witch-heal');
const witchPoison   = document.getElementById('witch-poison');
const witchConfirm  = document.getElementById('witch-confirm');
const witchPass     = document.getElementById('witch-pass');
const witchPoisonTargets = document.getElementById('witch-poison-targets');
const wolfStatus    = document.getElementById('wolf-status');
const viewResult    = document.getElementById('view-result');
const viewResultText = document.getElementById('view-result-text');
const viewResultImg  = document.getElementById('view-result-img');
const selectTwoHint = document.getElementById('select-two-hint');
const nightConfirm  = document.getElementById('night-confirm');

let nightState = { type: null, selected: [], maxSelect: 1 };

function showOverlay() { nightOverlay.hidden = false; }
function hideOverlay() { nightOverlay.hidden = true; }

function showWait(sub) {
    nightWait.hidden   = false;
    nightAction.hidden = true;
    nightWaitSub.textContent = sub ?? '';
}

function showActionUI() {
    nightWait.hidden   = true;
    nightAction.hidden = false;
}

function resetActionPanels() {
    targetList.hidden        = true;
    witchUi.hidden           = true;
    viewResult.hidden        = true;
    selectTwoHint.hidden     = true;
    nightConfirm.hidden      = true;
    witchPoisonTargets.hidden = true;
    targetList.innerHTML     = '';
    witchPoisonTargets.innerHTML = '';
    witchHeal.classList.remove('is-active');
    wolfStatus.hidden    = true;
    wolfStatus.textContent = '';
    nightConfirm.disabled = false;
    nightState = { type: null, selected: [], maxSelect: 1, witchHealSelected: false, witchPoisonTarget: null };
}

function buildTargetButtons(container, players, onSelect) {
    container.innerHTML = '';
    players.forEach(p => {
        const btn = document.createElement('button');
        btn.className    = 'target-btn';
        btn.dataset.id   = p.id;
        btn.textContent  = p.name;
        btn.addEventListener('click', () => onSelect(p, btn, container));
        container.appendChild(btn);
    });
}

// Receive night turn
socket.on('your-night-turn', ({ group, hint, actionType, players, extra }) => {
    showOverlay();
    showActionUI();
    resetActionPanels();
    naGroup.textContent = group;
    naHint.textContent  = hint;
    nightState.type = actionType;

    if (actionType === 'witch') {
        const victim = extra?.victim ?? null;
        witchUi.hidden = false;

        witchVictim.textContent = victim
            ? `Die Werwölfe haben ${victim.name} gewählt.`
            : 'Diese Nacht wurde niemand angegriffen.';

        witchHeal.hidden   = !victim || !(extra?.canHeal ?? true);
        witchPoison.hidden = !(extra?.canPoison ?? true);

        witchHeal.onclick = () => {
            nightState.witchHealSelected = !nightState.witchHealSelected;
            witchHeal.classList.toggle('is-active', nightState.witchHealSelected);
        };

        witchPoison.onclick = () => {
            witchPoisonTargets.hidden = !witchPoisonTargets.hidden;
            if (!witchPoisonTargets.hidden && witchPoisonTargets.children.length === 0) {
                buildTargetButtons(witchPoisonTargets, players, (p, btn) => {
                    witchPoisonTargets.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
                    btn.classList.add('is-selected');
                    nightState.witchPoisonTarget = p.id;
                });
            }
        };

        witchConfirm.onclick = () => {
            socket.emit('night-action', {
                heal: nightState.witchHealSelected || undefined,
                poisonTargetId: nightState.witchPoisonTarget || undefined,
            });
            showWait('Deine Entscheidung wurde gespeichert.');
        };

        witchPass.onclick = () => {
            socket.emit('night-action', {});
            showWait('Du hast nichts getan.');
        };

    } else if (actionType === 'select-two') {
        nightState.maxSelect = 2;
        selectTwoHint.hidden = false;
        targetList.hidden    = false;
        nightConfirm.hidden  = true;
        buildTargetButtons(targetList, players, (p, btn) => {
            const already = nightState.selected.findIndex(s => s.id === p.id);
            if (already !== -1) {
                nightState.selected.splice(already, 1);
                btn.classList.remove('is-selected');
            } else if (nightState.selected.length < 2) {
                nightState.selected.push(p);
                btn.classList.add('is-selected');
            }
            nightConfirm.hidden = nightState.selected.length < 2;
        });
        nightConfirm.onclick = () => {
            socket.emit('night-action', { targets: nightState.selected.map(s => s.id) });
            showWait('Deine Wahl wurde gespeichert.');
        };

    } else if (actionType === 'optional' || actionType === 'optional-kill') {
        targetList.hidden   = false;
        nightConfirm.hidden = false;
        nightConfirm.textContent = 'Nichts tun ✓';
        buildTargetButtons(targetList, players, (p, btn) => {
            targetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            nightState.selected = [p];
            nightConfirm.textContent = 'Bestätigen ✓';
        });
        nightConfirm.onclick = () => {
            const targetId = nightState.selected[0]?.id ?? null;
            socket.emit('night-action', { targetId });
            showWait(targetId ? 'Deine Wahl wurde gespeichert.' : 'Du hast nichts getan.');
        };

    } else if (actionType === 'kill') {
        // Wolf majority vote UI
        targetList.hidden    = false;
        nightConfirm.hidden  = true;
        wolfStatus.hidden    = false;
        wolfStatus.textContent = 'Wähle ein Opfer:';
        nightConfirm.textContent = 'Bestätigen ✓';

        buildTargetButtons(targetList, players, (p, btn) => {
            targetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            socket.emit('night-action', { vote: p.id });
        });

        nightConfirm.onclick = () => {
            socket.emit('night-action', { confirm: true });
            nightConfirm.disabled = true;
            nightConfirm.textContent = 'Bestätigt ✓';
        };

    } else {
        // Generic select-one (Dorfmatratze, Silberschmied, Wildes Kind, …)
        targetList.hidden = false;
        buildTargetButtons(targetList, players, (p, btn) => {
            targetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            nightState.selected = [p];
            nightConfirm.hidden = false;
        });
        nightConfirm.hidden = true;
        nightConfirm.textContent = 'Bestätigen ✓';
        nightConfirm.onclick = () => {
            const targetId = nightState.selected[0]?.id;
            if (!targetId) return;
            socket.emit('night-action', { targetId });
            showWait('Deine Wahl wurde gespeichert.');
        };
    }
});

// Seherin result
socket.on('view-result', ({ targetName, roleId }) => {
    showOverlay();
    showActionUI();
    resetActionPanels();
    naGroup.textContent = 'Seherin';
    naHint.textContent  = 'Du siehst die wahre Natur dieses Spielers:';
    viewResult.hidden = false;

    const seherinRole = ROLES.find(r => r.id === roleId);
    viewResultText.textContent = `${targetName} ist: ${seherinRole?.name ?? roleId}`;
    if (seherinRole) {
        viewResultImg.src = `/assets/${seherinRole.image}`;
        viewResultImg.alt = seherinRole.name;
    }

    nightConfirm.hidden = false;
    nightConfirm.textContent = 'Verstanden ✓';
    nightConfirm.onclick = () => {
        socket.emit('night-action', { acknowledged: true });
        showWait('Du schließt die Augen wieder…');
    };
});

// Wolf vote update: update badges and confirm button
socket.on('wolf-vote-update', ({ voteCounts, majorityTarget, majorityTargetName, myVote, confirmedCount, totalWolves, threshold, iConfirmed }) => {
    // Update vote-count badges on target buttons
    targetList.querySelectorAll('.target-btn').forEach(btn => {
        const tid   = btn.dataset.id;
        const count = voteCounts[tid] ?? 0;
        let badge   = btn.querySelector('.vote-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'vote-badge';
            btn.appendChild(badge);
        }
        badge.textContent = count > 0 ? count : '';
        badge.hidden      = count === 0;
        btn.classList.toggle('is-selected', tid === myVote);
    });

    // Update status line and confirm button
    if (majorityTarget) {
        wolfStatus.textContent = `${majorityTargetName} hat die Mehrheit — ${confirmedCount}/${totalWolves} bestätigt.`;
        if (!iConfirmed && myVote === majorityTarget) {
            nightConfirm.hidden   = false;
            nightConfirm.disabled = false;
            nightConfirm.textContent = 'Bestätigen ✓';
        } else if (iConfirmed) {
            nightConfirm.disabled = true;
            nightConfirm.textContent = 'Bestätigt ✓';
            nightConfirm.hidden = false;
        } else {
            nightConfirm.hidden = true;
        }
    } else {
        wolfStatus.textContent = 'Noch keine Mehrheit — stimmt weiter ab.';
        nightConfirm.hidden    = true;
    }
});

// Not our turn: show wait screen (skip if we are the active player)
socket.on('night-waiting', ({ activePlayers }) => {
    if (activePlayers?.includes(socket.id)) return;
    showOverlay();
    showWait('');
});

// Our turn is done (server moved on)
socket.on('night-turn-done', () => {
    showWait('Gut gemacht. Warte auf die anderen…');
});

// Phase transitions
socket.on('phase-changed', ({ phase, players, maxAccusations, accused, eliminated, skipped }) => {
    if (phase === 'night') {
        dayPanel.hidden = true;
        morningOverlay.hidden = true;
    }
    if (phase === 'day-prep') {
        hideOverlay();
        morningOverlay.hidden = true;
        dayPanel.hidden = true;
    }
    if (phase === 'night-summary' && players) {
        hideOverlay();
        showMorningScreen(players);
    }
    if (phase === 'day-accusation' && players) {
        morningOverlay.hidden = true;
        dayAlive = players.some(p => p.id === currentPlayerId);
        if (dayAlive) showDayAccusation(players, maxAccusations);
    }
    if (phase === 'day-voting' && accused) {
        if (dayAlive) showDayVoting(accused);
    }
    if (phase === 'day-result') {
        if (dayAlive) showDayWaitResult(skipped, eliminated);
    }
});

// Live vote progress during day voting
socket.on('day-vote-update', ({ totalVoted, totalVoters }) => {
    if (dayWaitUi.hidden === false) {
        dayWaitText.textContent = `${totalVoted} von ${totalVoters} Spielern haben abgestimmt…`;
    }
});

// Confirmed: submitted nomination or vote
socket.on('day-nomination-done', () => { showDayWait(); });
socket.on('day-vote-done', () => { showDayWait(); });

function showDayAccusation(players, maxAccusations) {
    daySelectedId = null;
    dayPanel.hidden = false;
    dayAccusationUi.hidden = false;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = true;
    dayAccuseBtn.hidden = true;

    const targets = players.filter(p => p.id !== currentPlayerId);
    dayTargetList.innerHTML = '';
    buildTargetButtons(dayTargetList, targets, (p, btn) => {
        dayTargetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        daySelectedId = p.id;
        dayAccuseBtn.hidden = false;
    });

    dayAccuseBtn.onclick = () => {
        if (!daySelectedId) return;
        socket.emit('day-nominate', { targetId: daySelectedId });
    };

    daySkipBtn.onclick = () => {
        socket.emit('day-nominate', { targetId: null });
    };
}

function showDayVoting(accused) {
    daySelectedId = null;
    dayPanel.hidden = false;
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = false;
    dayWaitUi.hidden = true;
    dayVoteBtn.hidden = true;

    dayAccusedList.innerHTML = '';
    buildTargetButtons(dayAccusedList, accused, (p, btn) => {
        dayAccusedList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        daySelectedId = p.id;
        dayVoteBtn.hidden = false;
    });

    dayVoteBtn.onclick = () => {
        if (!daySelectedId) return;
        socket.emit('day-vote-cast', { targetId: daySelectedId });
    };
}

function showDayWait() {
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = false;
    dayWaitText.textContent = 'Warte auf andere Spieler…';
}

function showDayWaitResult(skipped, eliminated) {
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = false;
    if (skipped) {
        dayWaitText.textContent = 'Abstimmung übersprungen — niemand wird eliminiert.';
    } else if (eliminated) {
        dayWaitText.textContent = `${eliminated.name} wurde vom Dorf eliminiert.`;
    } else {
        dayWaitText.textContent = 'Unentschieden — niemand wird eliminiert.';
    }
}

// Narrator advances: reveal dead cards
socket.on('morning-reveal', ({ deaths }) => {
    if (deaths.length === 0) {
        morningDeaths.textContent = 'Niemand';
        morningDeaths.classList.remove('has-deaths');
    } else {
        morningDeaths.textContent = deaths.map(d => d.name).join(', ');
        morningDeaths.classList.add('has-deaths');
    }
    deaths.forEach(d => {
        const cardEl = morningGrid.querySelector(`[data-player-id="${CSS.escape(d.id)}"]`);
        if (!cardEl) return;
        const backEl = cardEl.querySelector('.morning-card__back');
        const roleData = ROLES.find(r => r.id === d.roleId);
        if (roleData) {
            const img = document.createElement('img');
            img.src = `/assets/${roleData.image}`;
            img.alt = roleData.name;
            backEl.appendChild(img);
        }
        cardEl.classList.add('is-dead');
        cardEl.querySelector('.morning-card__flip').classList.add('is-revealed');
    });
});

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showMorningScreen(players) {
    morningGrid.innerHTML = '';
    morningDeaths.textContent = '…';
    morningDeaths.classList.remove('has-deaths');
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'morning-card';
        div.dataset.playerId = p.id;
        div.innerHTML = `
            <div class="morning-card__scene">
                <div class="morning-card__flip">
                    <div class="morning-card__front">
                        <img src="/assets/backside.jpeg" alt="">
                    </div>
                    <div class="morning-card__back"></div>
                </div>
            </div>
            <p class="morning-card__name">${esc(p.name)}</p>
        `;
        morningGrid.appendChild(div);
    });
    morningOverlay.hidden = false;
}

// Amor: we are one of the lovers
socket.on('you-are-lovers', ({ partnerName }) => {
    lovePartnerName = partnerName;
    lovePanelText.textContent = `Du bist verliebt in ${partnerName}. Ihr gewinnt nur zusammen – und sterbt zusammen.`;
    lovePanel.hidden    = false;
    loveRecallBtn.hidden = false;
});

// Restart: narrator dealt new cards — go to new game page
socket.on('game-started', ({ assignments }) => {
    const newCard = assignments[currentPlayerId];
    if (!newCard) return;
    const p = new URLSearchParams({ card: newCard, code: roomCode, player: currentPlayerId });
    window.location.href = '/html/game.html?' + p.toString();
});

// Back to lobby: narrator chose "Neue Karten"
socket.on('back-to-lobby', ({ name, isHost, roomCode: rc }) => {
    const p = new URLSearchParams({ rejoin: rc, name });
    if (isHost) p.set('host', '1');
    window.location.href = '/html/lobby.html?' + p.toString();
});

socket.on('session-ended', () => {
    window.location.href = '/';
});

// Game over
socket.on('game-over', ({ winner, message }) => {
    hideOverlay();
    const labels = { lovers: 'Liebespaar', wolves: 'Werwölfe', villagers: 'Dorfbewohner' };
    gameOverWinner.textContent  = labels[winner] ?? winner;
    gameOverMessage.textContent = message;
    gameOverOverlay.hidden = false;
});
