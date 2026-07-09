import { ROLES, DESCRIPTIONS, FACTION_LABEL } from '/js/roles.js';

const params = new URLSearchParams(window.location.search);
const cardId   = params.get('card');
const roomCode = params.get('code');
// On reconnect we need the MOST RECENT socket ID known to the server, not the original lobby ID
let currentPlayerId = params.get('player');
// May change if player is Ergebene Magd and transforms
let currentCardId = cardId;

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
    const currentRole = ROLES.find(r => r.id === currentCardId);
    infoTitle.textContent = currentRole?.name ?? currentCardId;
    infoDesc.textContent  = DESCRIPTIONS[currentCardId] ?? 'Keine Beschreibung verfügbar.';
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

let lovePartnerName = null;

loveRecallBtn.addEventListener('click', () => {
    lovePanel.hidden = !lovePanel.hidden;
});

// ── Katz und Maus ─────────────────────────────────────────────────────────────
const katzMausPanel     = document.getElementById('katz-maus-panel');
const katzMausPanelText = document.getElementById('katz-maus-panel-text');
const katzMausRecallBtn = document.getElementById('katz-maus-recall-btn');

katzMausRecallBtn.addEventListener('click', () => {
    katzMausPanel.hidden = !katzMausPanel.hidden;
});

const gameOverOverlay      = document.getElementById('game-over-overlay');
const gameOverWinner       = document.getElementById('game-over-winner');
const gameOverMessage      = document.getElementById('game-over-message');
const gameOverHostActions  = document.getElementById('game-over-host-actions');
const goRestartSameBtn     = document.getElementById('go-restart-same-btn');
const goRestartNewBtn      = document.getElementById('go-restart-new-btn');

// ── Spectator / dead player ────────────────────────────────────────────────────
const cardScene      = document.getElementById('card-scene');
const spectatorPanel = document.getElementById('spectator-panel');
const spectatorLog   = document.getElementById('spectator-log');
let isDead = false;

function setDead() {
    if (isDead) return;
    isDead = true;
    cardScene.classList.add('is-dead');
    spectatorPanel.hidden = false;
    dayPanel.hidden = true;
    nightOverlay.hidden = true;
    socket.emit('join-spectator');
}

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
let skipConfirmPending = false;
let skipConfirmTimer   = null;

// ── Morning overlay refs ──────────────────────────────────────────────────────
const morningOverlay  = document.getElementById('morning-overlay');
const morningGrid     = document.getElementById('morning-grid');
const morningDeaths   = document.getElementById('morning-deaths');
document.getElementById('morning-card-peek').addEventListener('click', openCardModal);

// ── Hunter overlay refs ───────────────────────────────────────────────────────
const hunterOverlay    = document.getElementById('hunter-overlay');
const hunterTargetList = document.getElementById('hunter-target-list');
const hunterConfirm    = document.getElementById('hunter-confirm');
let hunterSelectedId   = null;

// ── Magd overlay refs ─────────────────────────────────────────────────────────
const magdOverlay   = document.getElementById('magd-overlay');
const magdHerrName  = document.getElementById('magd-herr-name');
const magdRoleImg   = document.getElementById('magd-role-img');
const magdRoleName  = document.getElementById('magd-role-name');
const magdFaction   = document.getElementById('magd-faction');
const magdConfirm   = document.getElementById('magd-confirm');

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
// Solange die Seherin ihr Ergebnis betrachtet, dürfen Warte-Screens es nicht überdecken
let viewingResult = false;

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
    players.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.className    = 'target-btn';
        btn.dataset.id   = p.id;
        btn.textContent  = p.name;
        btn.style.setProperty('--btn-i', idx);
        btn.addEventListener('click', () => onSelect(p, btn, container));
        container.appendChild(btn);
    });
}

// Receive night turn
socket.on('your-night-turn', ({ group, hint, actionType, players, extra }) => {
    // Die tote Zigeunerin darf ihren Fluch noch aussprechen
    if (isDead && group !== 'Zigeunerin') return;
    viewingResult = false;
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
            if (isDead) hideOverlay();
            else showWait('Deine Wahl wurde gespeichert.');
        };
    }
});

// Seherin result — bleibt sichtbar, bis die Seherin "Verstanden" drückt
socket.on('view-result', ({ targetName, roleId }) => {
    if (isDead) return;
    viewingResult = true;
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
        viewingResult = false;
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
socket.on('night-waiting', ({ activePlayers, autoStatusMsg }) => {
    if (isDead) { nightOverlay.hidden = true; return; }
    if (activePlayers?.includes(socket.id)) return;
    if (viewingResult) return; // Seherin liest noch ihr Ergebnis
    showOverlay();
    showWait(autoStatusMsg ?? '');
});

// Our turn is done (server moved on)
socket.on('night-turn-done', () => {
    if (!isDead && !viewingResult) showWait('Gut gemacht. Warte auf die anderen…');
    autoSkipWarning.hidden = true;
    if (autoSkipInterval) { clearInterval(autoSkipInterval); autoSkipInterval = null; }
});

// Phase transitions
socket.on('phase-changed', ({ phase, players, maxAccusations, accused, runoff, eliminated, skipped, hunterShot, hunterName, awayPlayerId, narrSurvived, alsoDied, voteResult }) => {
    gchatOnPhase(phase);
    viewingResult = false;
    // Day / night atmosphere
    const nightPhases = ['night'];
    const dayPhases   = ['night-summary','day-prep','day-accusation','day-voting','hunter-day-shot','day-result'];
    document.body.classList.toggle('is-night', nightPhases.includes(phase));
    document.body.classList.toggle('is-day',   dayPhases.includes(phase));

    if (phase === 'night') {
        morningOverlay.hidden = true;
        hunterOverlay.hidden = true;
        if (isDead) { nightOverlay.hidden = true; return; }
        dayPanel.hidden = true;
    }
    if (phase === 'day-prep') {
        hideOverlay();
        morningOverlay.hidden = true;
        dayPanel.hidden = true;
        hunterOverlay.hidden = true;
    }
    if (phase === 'night-summary' && players) {
        hideOverlay();
        showMorningScreen(players);
    }
    if (phase === 'day-accusation' && players) {
        morningOverlay.hidden = true;
        dayAlive = players.some(p => p.id === currentPlayerId);
        if (dayAlive) {
            if (awayPlayerId === currentPlayerId) {
                showDayAway();
            } else if (currentCardId === 'Narr') {
                showDayNoVote();
            } else {
                showDayAccusation(players.filter(p => p.id !== awayPlayerId), maxAccusations);
            }
        }
    }
    if (phase === 'day-voting' && accused) {
        if (dayAlive && awayPlayerId !== currentPlayerId && currentCardId !== 'Narr') showDayVoting(accused, runoff);
    }
    if (phase === 'hunter-day-shot') {
        // All day-alive players see a wait message; the Jäger gets hunter-shoot separately
        if (dayAlive) {
            dayPanel.hidden = false;
            dayAccusationUi.hidden = true;
            dayVotingUi.hidden = true;
            dayWaitUi.hidden = false;
            dayWaitText.textContent = `Der Jäger schießt noch einmal ab…`;
        }
    }
    if (phase === 'day-result') {
        if (eliminated?.id === currentPlayerId || hunterShot?.id === currentPlayerId
            || alsoDied?.some(d => d.id === currentPlayerId)) setDead();
        hunterOverlay.hidden = true;
        if (dayAlive && !isDead) showDayWaitResult(skipped, eliminated, hunterShot, narrSurvived, alsoDied, voteResult);
    }
});

// Live vote progress during day voting
socket.on('day-vote-update', ({ counts, totalVoted, totalVoters }) => {
    // Live-Stimmenzähler an den Angeklagten-Buttons (für alle, die noch wählen)
    dayAccusedList.querySelectorAll('.target-btn').forEach(btn => {
        const count = counts?.[btn.dataset.id] ?? 0;
        let badge = btn.querySelector('.vote-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'vote-badge';
            btn.appendChild(badge);
        }
        badge.textContent = count;
        badge.hidden = count === 0;
    });

    if (dayWaitUi.hidden === false) {
        dayWaitText.textContent = `${totalVoted} von ${totalVoters} Spielern haben abgestimmt…`;
    }
});

// Live nomination tally during accusation phase
socket.on('day-accusation-update', ({ tally, skipCount, totalResponded, total }) => {
    // Update vote badges on target buttons (visible to players still choosing)
    dayTargetList.querySelectorAll('.target-btn').forEach(btn => {
        const tid = btn.dataset.id;
        const count = tally[tid] ?? 0;
        let badge = btn.querySelector('.vote-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'vote-badge';
            btn.appendChild(badge);
        }
        badge.textContent = count;
        badge.hidden = count === 0;
    });

    // Update stats line
    const statsEl = document.getElementById('day-accusation-stats');
    if (statsEl && totalResponded > 0) {
        const parts = [`${totalResponded}/${total} reagiert`];
        if (skipCount > 0) parts.push(`${skipCount} überspringen`);
        statsEl.textContent = parts.join(' · ');
        statsEl.hidden = false;
    }

    // Also update wait text for players who already submitted
    if (dayWaitUi.hidden === false) {
        dayWaitText.textContent = `${totalResponded} von ${total} Spielern haben reagiert…`;
    }
});

// Confirmed: submitted nomination or vote
socket.on('day-nomination-done', () => { showDayWait(); });
socket.on('day-vote-done', () => { showDayWait(); });

function resetSkipConfirm() {
    if (skipConfirmTimer) { clearTimeout(skipConfirmTimer); skipConfirmTimer = null; }
    skipConfirmPending = false;
    daySkipBtn.textContent = 'Überspringen';
    daySkipBtn.classList.remove('is-confirming');
}

function showDayAccusation(players, maxAccusations) {
    daySelectedId = null;
    resetSkipConfirm();
    const statsEl = document.getElementById('day-accusation-stats');
    if (statsEl) { statsEl.hidden = true; statsEl.textContent = ''; }
    dayPanel.hidden = false;
    dayAccusationUi.hidden = false;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = true;
    dayAccuseBtn.hidden = true;

    const targets = players.filter(p => p.id !== currentPlayerId);
    dayTargetList.innerHTML = '';
    buildTargetButtons(dayTargetList, targets, (p, btn) => {
        resetSkipConfirm();
        dayTargetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        daySelectedId = p.id;
        dayAccuseBtn.hidden = false;
        dayAccuseBtn.classList.remove('confirm-pop');
        void dayAccuseBtn.offsetWidth;
        dayAccuseBtn.classList.add('confirm-pop');
        dayAccuseBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    dayAccuseBtn.onclick = () => {
        if (!daySelectedId) return;
        socket.emit('day-nominate', { targetId: daySelectedId });
    };

    daySkipBtn.onclick = () => {
        if (!skipConfirmPending) {
            skipConfirmPending = true;
            daySkipBtn.textContent = 'Wirklich überspringen?';
            daySkipBtn.classList.add('is-confirming');
            skipConfirmTimer = setTimeout(resetSkipConfirm, 3000);
        } else {
            resetSkipConfirm();
            socket.emit('day-nominate', { targetId: null });
        }
    };
}

function showDayVoting(accused, runoff = false) {
    daySelectedId = null;
    dayPanel.hidden = false;
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = false;
    dayWaitUi.hidden = true;
    dayVoteBtn.hidden = true;

    const eyebrowEl  = document.getElementById('day-voting-eyebrow');
    const hintEl     = document.getElementById('day-voting-hint');
    const selfWarnEl = document.getElementById('day-voting-self-warn');

    eyebrowEl.textContent = runoff ? 'Stichwahl' : 'Abstimmung';
    hintEl.textContent = runoff
        ? 'Gleichstand! Stimme erneut ab — nur die Erstplatzierten stehen noch zur Wahl.'
        : 'Wen verdächtigst du am meisten ein Werwolf zu sein?';
    selfWarnEl.hidden = !accused.some(a => a.id === currentPlayerId);

    dayAccusedList.innerHTML = '';
    buildTargetButtons(dayAccusedList, accused, (p, btn) => {
        dayAccusedList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        daySelectedId = p.id;
        dayVoteBtn.hidden = false;
        dayVoteBtn.classList.remove('confirm-pop');
        void dayVoteBtn.offsetWidth;
        dayVoteBtn.classList.add('confirm-pop');
        dayVoteBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Kontext an jedem Angeklagten: Anklagen (bzw. Stimmen des ersten Wahlgangs)
    dayAccusedList.querySelectorAll('.target-btn').forEach((btn, i) => {
        const a = accused[i];
        if (a?.id === currentPlayerId) btn.classList.add('is-self');
        if (!a?.count) return;
        const meta = document.createElement('span');
        meta.className = 'target-btn__meta';
        meta.textContent = runoff
            ? `${a.count} Stimme${a.count === 1 ? '' : 'n'} im 1. Wahlgang`
            : `${a.count} Anklage${a.count === 1 ? '' : 'n'}`;
        btn.appendChild(meta);
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

function showDayAway() {
    dayPanel.hidden = false;
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = false;
    dayWaitText.textContent = 'Du bist heute einkaufen — du kannst weder anklagen noch abstimmen.';
}

function showDayNoVote() {
    dayPanel.hidden = false;
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = false;
    dayWaitText.textContent = 'Du bist der Narr — du darfst nicht abstimmen.';
}

function showDayWaitResult(skipped, eliminated, hunterShot, narrSurvived, alsoDied, voteResult) {
    dayAccusationUi.hidden = true;
    dayVotingUi.hidden = true;
    dayWaitUi.hidden = false;
    let text;
    if (narrSurvived) {
        text = 'Der Narr überlebt — Narrenfreiheit!';
    } else if (skipped) {
        text = 'Abstimmung übersprungen — niemand wird eliminiert.';
    } else if (eliminated) {
        text = `${eliminated.name} wurde vom Dorf eliminiert — ${eliminated.roleName}.`;
    } else {
        text = 'Unentschieden — niemand wird eliminiert.';
    }
    if (hunterShot) text += ` Jäger erschoss ${hunterShot.name}.`;
    if (alsoDied?.length > 0) {
        text += ' ' + alsoDied.map(d => `${d.name} (${d.roleName}) stirbt ebenfalls.`).join(' ');
    }
    dayWaitText.textContent = text;

    // Stimmverteilung unter dem Ergebnis anzeigen
    if (voteResult?.length > 0 && !skipped) {
        const tallyLine = document.createElement('span');
        tallyLine.className = 'day-panel__tally';
        tallyLine.textContent = 'Stimmen: ' + voteResult.map(v => `${v.name} ${v.votes}`).join(' · ');
        dayWaitText.appendChild(document.createElement('br'));
        dayWaitText.appendChild(tallyLine);
    }
}

// Jäger died at night: flip ONLY the Jäger's card first, then wait for hunter shot
socket.on('morning-partial-reveal', ({ hunterDeath }) => {
    const cardEl = morningGrid.querySelector(`[data-player-id="${CSS.escape(hunterDeath.id)}"]`);
    if (cardEl) {
        const backEl = cardEl.querySelector('.morning-card__back');
        const roleData = ROLES.find(r => r.id === hunterDeath.roleId);
        if (roleData && backEl.children.length === 0) {
            const img = document.createElement('img');
            img.src = `/assets/${roleData.image}`;
            img.alt = roleData.name;
            backEl.appendChild(img);
        }
        cardEl.classList.add('is-dead');
        cardEl.querySelector('.morning-card__flip').classList.add('is-revealed');
    }
    morningDeaths.innerHTML = '<span class="morning-deaths__hunter">und der Jäger reißt mit in den Tod…</span>';
    morningDeaths.classList.add('has-deaths');
});

// Jäger shot: flip remaining dead cards + hunter's target card
socket.on('morning-full-reveal', ({ deaths, hunterShot }) => {
    if (deaths.some(d => d.id === currentPlayerId) || hunterShot?.id === currentPlayerId) setDead();
    const flipCard = (d) => {
        const cardEl = morningGrid.querySelector(`[data-player-id="${CSS.escape(d.id)}"]`);
        if (!cardEl) return;
        const backEl = cardEl.querySelector('.morning-card__back');
        if (backEl.children.length === 0) {
            const roleData = ROLES.find(r => r.id === d.roleId);
            if (roleData) {
                const img = document.createElement('img');
                img.src = `/assets/${roleData.image}`;
                img.alt = roleData.name;
                backEl.appendChild(img);
            }
        }
        cardEl.classList.add('is-dead');
        cardEl.querySelector('.morning-card__flip').classList.add('is-revealed');
    };
    deaths.forEach(flipCard);
    if (hunterShot) flipCard(hunterShot);

    const names = [...morningGrid.querySelectorAll('.morning-card.is-dead')]
        .map(el => el.querySelector('.morning-card__name')?.textContent ?? '');
    morningDeaths.textContent = names.length > 0 ? names.join(', ') : 'Niemand';
    morningDeaths.classList.toggle('has-deaths', names.length > 0);
});

// Server asks Jäger to pick their target
socket.on('hunter-shoot', ({ targets }) => {
    hunterSelectedId = null;
    hunterConfirm.hidden = true;
    buildTargetButtons(hunterTargetList, targets, (p, btn) => {
        hunterTargetList.querySelectorAll('.target-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        hunterSelectedId = p.id;
        hunterConfirm.hidden = false;
    });
    hunterConfirm.onclick = () => {
        if (!hunterSelectedId) return;
        socket.emit('hunter-shot', { targetId: hunterSelectedId });
        hunterOverlay.hidden = true;
    };
    hunterOverlay.hidden = false;
});

// Narrator advances: reveal dead cards
socket.on('morning-reveal', ({ deaths }) => {
    if (deaths.some(d => d.id === currentPlayerId)) setDead();
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

// Jack the Ripper: Dorfmatratze encountered Jack, he becomes a Werwolf
socket.on('jack-transformed', () => {
    gchatBecomeWolf();
    document.getElementById('jack-overlay').hidden = false;
    document.getElementById('jack-confirm').onclick = () => {
        document.getElementById('jack-overlay').hidden = true;
        roleFaction.textContent = FACTION_LABEL['W'] ?? 'Werwolf';
        roleFaction.hidden = false;
    };
});

// Dieb: picked a new role, update displayed card
socket.on('role-changed', ({ roleId }) => {
    currentCardId = roleId;
    if (WOLF_CARD_IDS.has(roleId)) gchatBecomeWolf();
    const newRole = ROLES.find(r => r.id === roleId);
    if (newRole) {
        document.getElementById('role-img').src = `/assets/${newRole.image}`;
        document.getElementById('role-img').alt = newRole.name;
        roleName.textContent    = newRole.name;
        roleFaction.textContent = FACTION_LABEL[newRole.faction] ?? newRole.faction;
        roleName.hidden    = false;
        roleFaction.hidden = false;
        cardFlip.classList.remove('is-flipped');
        flipBtn.classList.remove('is-flipped');
        flipBtn.textContent = 'Karte umdrehen';
        document.title = `${newRole.name} – Werwolf`;
    }
});

// Jekyll & Hyde: jede Nacht wechselt die Seite
const jekyllPanel     = document.getElementById('jekyll-panel');
const jekyllPanelText = document.getElementById('jekyll-panel-text');
const jekyllRecallBtn = document.getElementById('jekyll-recall-btn');

jekyllRecallBtn.addEventListener('click', () => {
    jekyllPanel.hidden = !jekyllPanel.hidden;
});

socket.on('jekyll-state', ({ isWolf: isHyde, round }) => {
    jekyllPanelText.textContent = isHyde
        ? `Nacht ${round}: Du bist Hyde — heute bist du ein Werwolf und jagst mit dem Rudel.`
        : `Nacht ${round}: Du bist Jekyll — heute bist du ein Dorfbewohner.`;
    jekyllPanel.hidden    = false;
    jekyllRecallBtn.hidden = false;
    roleFaction.textContent = isHyde ? 'Werwolf' : 'Dorfbewohner';

    // Rudel-Chat nur in Hyde-Nächten
    isWolfPlayer = isHyde;
    gchatWolfTabBtn.hidden = !isHyde;
    if (!isHyde && gchatTab === 'wolf') gchatSwitchTab('village');
    gchatUpdateToggle();
    gchatUpdateSend();
});

// Bär: brummt zu Tagesbeginn, wenn ein Werwolf neben ihm sitzt
let baerToastTimer = null;
socket.on('baer-growl', () => {
    const toast = document.getElementById('baer-toast');
    toast.hidden = false;
    if (baerToastTimer) clearTimeout(baerToastTimer);
    baerToastTimer = setTimeout(() => { toast.hidden = true; }, 7000);
});

// Wildes Kind: its idol died, it becomes a Werwolf
socket.on('wildeskind-transform', ({ idolName }) => {
    gchatBecomeWolf();
    document.getElementById('wildeskind-idol-name').textContent = idolName;
    document.getElementById('wildeskind-overlay').hidden = false;

    document.getElementById('wildeskind-confirm').onclick = () => {
        document.getElementById('wildeskind-overlay').hidden = true;
        roleFaction.textContent = 'Werwolf';
        roleFaction.hidden = false;
    };
});

// Ergebene Magd: her Herr died, she takes his role
socket.on('magd-transform', ({ herrName, roleId, roleName: newRoleName }) => {
    if (WOLF_CARD_IDS.has(roleId)) gchatBecomeWolf();
    const newRole = ROLES.find(r => r.id === roleId);
    magdHerrName.textContent = herrName;
    magdRoleImg.src          = newRole ? `/assets/${newRole.image}` : '';
    magdRoleImg.alt          = newRoleName;
    magdRoleName.textContent = newRoleName;
    magdFaction.textContent  = newRole ? (FACTION_LABEL[newRole.faction] ?? newRole.faction) : '';
    magdOverlay.hidden = false;

    magdConfirm.onclick = () => {
        magdOverlay.hidden = true;
        currentCardId = roleId;
        // Update main card display in-place
        document.getElementById('role-img').src = newRole ? `/assets/${newRole.image}` : '';
        document.getElementById('role-img').alt = newRoleName;
        roleName.textContent    = newRoleName;
        roleFaction.textContent = newRole ? (FACTION_LABEL[newRole.faction] ?? newRole.faction) : '';
        roleName.hidden    = false;
        roleFaction.hidden = false;
        cardFlip.classList.remove('is-flipped');
        flipBtn.classList.remove('is-flipped');
        flipBtn.textContent = 'Karte umdrehen';
        document.title = `${newRoleName} – Werwolf`;
    };
});

// Amor: we are one of the lovers
socket.on('you-are-lovers', ({ partnerName }) => {
    lovePartnerName = partnerName;
    lovePanelText.textContent = `Du bist verliebt in ${partnerName}. Ihr gewinnt nur zusammen – und sterbt zusammen.`;
    lovePanel.hidden    = false;
    loveRecallBtn.hidden = false;
});

socket.on('you-are-katz-maus', ({ role, partnerName }) => {
    const other = role === 'Katze' ? 'Maus' : 'Katze';
    katzMausPanelText.textContent = `Du bist die ${role}. Deine ${other} ist: ${partnerName}. Ihr gewinnt mit den Dorfbewohnern.`;
    katzMausPanel.hidden    = false;
    katzMausRecallBtn.hidden = false;
});

// Dead player: server confirms we're a spectator (on reconnect)
socket.on('you-are-dead', () => setDead());

// Geisterblick: narrator-update wird toten Spielern vom Server weitergeleitet.
// Sie sehen Spielstatus, alle Rollen offen und das Ereignisprotokoll.
const spectatorStatus = document.getElementById('spectator-status');
const spectatorRoles  = document.getElementById('spectator-roles');

const SPECTATOR_PHASE_LABELS = {
    'day-prep':          'Tag — das Dorf berät sich',
    'night-summary':     'Der Morgen graut…',
    'morning-reveal':    'Der Morgen graut…',
    'hunter-night-shot': 'Der Jäger schießt noch einmal…',
    'hunter-day-shot':   'Der Jäger schießt noch einmal…',
    'day-accusation':    'Tag — Anklage-Phase läuft',
    'day-voting':        'Tag — das Dorf stimmt ab',
    'day-result':        'Tag — Ergebnis steht fest',
    'game-over':         'Das Spiel ist vorbei',
};

socket.on('narrator-update', ({ phase, round, activeEntry, events, players }) => {
    if (!isDead) return;

    if (phase) {
        let status;
        if (phase === 'night') {
            status = `Nacht ${round ?? ''}`.trim();
            if (activeEntry && !activeEntry.done) {
                const plural = (activeEntry.playerNames?.length ?? 1) > 1;
                status += ` — ${activeEntry.group} ${plural ? 'sind' : 'ist'} am Zug`;
            }
        } else {
            status = SPECTATOR_PHASE_LABELS[phase] ?? phase;
        }
        spectatorStatus.textContent = status;
    }

    if (players) {
        spectatorRoles.innerHTML = players.map(p => {
            const r = ROLES.find(x => x.id === p.roleId);
            const cls = 'spectator-role'
                + (p.isAlive ? '' : ' is-dead')
                + (p.id === currentPlayerId ? ' is-me' : '');
            return `<div class="${cls}">
                <span class="spectator-role__name">${esc(p.name)}</span>
                <span class="spectator-role__role">${esc(r?.name ?? '?')}</span>
            </div>`;
        }).join('');
    }

    if (events) {
        const atBottom = spectatorLog.scrollHeight - spectatorLog.scrollTop <= spectatorLog.clientHeight + 40;
        spectatorLog.innerHTML = events.map(e => {
            const t = new Date(e.time);
            const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
            const isPhase = /beginnt|vorüber|Stichwahl|gestartet|gewonnen/.test(e.text);
            return `<p class="spectator-log__entry${isPhase ? ' is-phase' : ''}">
                <span class="spectator-log__time">${time}</span>${esc(e.text)}</p>`;
        }).join('');
        if (atBottom) spectatorLog.scrollTop = spectatorLog.scrollHeight;
    }
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

// ── Auto-pilot events ─────────────────────────────────────────────────────────
const autoModeBanner   = document.getElementById('auto-mode-banner');
const autoDayCountdown = document.getElementById('auto-day-countdown');
const autoDayNumber    = document.getElementById('auto-day-number');
const autoSkipWarning  = document.getElementById('auto-skip-warning');
const autoSkipSeconds  = document.getElementById('auto-skip-seconds');
let   autoSkipInterval = null;

socket.on('auto-mode-activated', () => {
    autoModeBanner.hidden = false;
});

socket.on('auto-day-starting', ({ countdown, label }) => {
    document.getElementById('auto-day-label').textContent = label ?? 'Tag beginnt in';
    autoDayNumber.textContent = countdown;
    autoDayCountdown.hidden   = false;
    autoDayCountdown.querySelector('.auto-day-countdown__number').classList.remove('pulse-num');
    void autoDayCountdown.querySelector('.auto-day-countdown__number').offsetWidth;
    autoDayCountdown.querySelector('.auto-day-countdown__number').style.animation = 'none';

    let remaining = countdown;
    const tick = () => {
        remaining--;
        autoDayNumber.textContent = remaining;
        autoDayNumber.style.animation = 'none';
        void autoDayNumber.offsetWidth;
        autoDayNumber.style.animation = 'pulse-num 1s ease-in-out';
        if (remaining <= 0) {
            autoDayCountdown.hidden = true;
        }
    };
    const iv = setInterval(() => { tick(); if (remaining <= 0) clearInterval(iv); }, 1000);
});

socket.on('auto-skip-warning', ({ countdown }) => {
    if (isDead) return;
    autoSkipSeconds.textContent = countdown;
    autoSkipWarning.hidden = false;
    let remaining = countdown;
    if (autoSkipInterval) clearInterval(autoSkipInterval);
    autoSkipInterval = setInterval(() => {
        remaining--;
        autoSkipSeconds.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(autoSkipInterval);
            autoSkipWarning.hidden = true;
        }
    }, 1000);
});


// Game over
socket.on('game-over', ({ winner, message, hostId }) => {
    hideOverlay();
    if (winner === 'everyone-dead') {
        gameOverWinner.textContent  = '';
        gameOverMessage.textContent = 'XD';
        gameOverOverlay.hidden = false;
        setTimeout(() => { window.location.href = 'https://www.youtube.com/watch?v=Aq5WXmQQooo'; }, 2000);
        return;
    }
    const labels = { lovers: 'Liebespaar', wolves: 'Werwölfe', villagers: 'Dorfbewohner', 'einsamer-wolf': 'Einsamer Wolf' };
    gameOverWinner.textContent  = labels[winner] ?? winner;
    gameOverMessage.textContent = message;
    gameOverOverlay.hidden = false;

    if (hostId && hostId === socket.id) {
        gameOverHostActions.hidden = false;
    }
});

goRestartSameBtn.addEventListener('click', () => {
    gameOverHostActions.hidden = true;
    socket.emit('restart-game');
});

goRestartNewBtn.addEventListener('click', () => {
    gameOverHostActions.hidden = true;
    socket.emit('reset-to-lobby');
});

// ── In-game Chat ─────────────────────────────────────────────────────────────
const WOLF_CARD_IDS   = new Set(['Werwolf_blau','Werwolf_gelb','Werwolf_gruen','Werwolf_rot']);
const gchatToggleBtn  = document.getElementById('gchat-toggle');
const gchatPanelEl    = document.getElementById('gchat-panel');
const gchatBadgeEl    = document.getElementById('gchat-badge');
const gchatCloseBtn   = document.getElementById('gchat-close');
const gchatWolfTabBtn = document.getElementById('gchat-wolf-tab');
const gchatLogVil     = document.getElementById('gchat-log-village');
const gchatLogWolf    = document.getElementById('gchat-log-wolf');
const gchatInputEl    = document.getElementById('gchat-input');
const gchatSendBtn    = document.getElementById('gchat-send');

let isWolfPlayer  = WOLF_CARD_IDS.has(currentCardId);
let gchatOpen     = false;
let gchatTab      = 'village';   // 'village' | 'wolf'
let gchatUnread   = { village: 0, wolf: 0 };
let gchatPhase    = '';
let gchatDead     = false;

const DAY_PHASES  = new Set(['day-prep','day-accusation','day-voting','day-result','night-summary']);

if (isWolfPlayer) gchatWolfTabBtn.hidden = false;

function gchatUpdateSend() {
    const canSend = !gchatDead && (
        gchatTab === 'wolf' ? isWolfPlayer
                            : DAY_PHASES.has(gchatPhase)
    );
    gchatInputEl.disabled  = !canSend;
    gchatSendBtn.disabled  = !canSend;
    gchatInputEl.placeholder = canSend ? 'Nachricht…'
        : (gchatTab === 'village' && !DAY_PHASES.has(gchatPhase))
            ? 'Chat nur tagsüber verfügbar'
            : 'Schreiben nicht möglich';
}

function gchatUpdateToggle() {
    if (gchatOpen) return;
    const show = DAY_PHASES.has(gchatPhase) || isWolfPlayer;
    gchatToggleBtn.hidden = !show;
}

function gchatUpdateBadge() {
    const total = gchatUnread.village + gchatUnread.wolf;
    gchatBadgeEl.hidden    = total === 0;
    gchatBadgeEl.textContent = total > 9 ? '9+' : String(total);
}

function gchatAppendMsg(log, msg) {
    const empty = log.querySelector('.gchat-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'gchat-msg' + (msg.chatType === 'wolf' ? ' gchat-msg--wolf' : '');
    div.innerHTML = `<span class="gchat-msg__author">${esc(msg.author)}</span>`
                  + `<span class="gchat-msg__text">${esc(msg.text)}</span>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function gchatSwitchTab(tab) {
    gchatTab = tab;
    gchatPanelEl.querySelectorAll('.gchat-tab').forEach(t =>
        t.classList.toggle('is-active', t.dataset.tab === tab)
    );
    gchatLogVil.hidden  = tab !== 'village';
    gchatLogWolf.hidden = tab !== 'wolf';
    gchatUnread[tab] = 0;
    gchatUpdateBadge();
    gchatUpdateSend();
    if (tab === 'village') gchatLogVil.scrollTop  = gchatLogVil.scrollHeight;
    else                   gchatLogWolf.scrollTop = gchatLogWolf.scrollHeight;
}

function gchatDoSend() {
    const text = gchatInputEl.value.trim();
    if (!text || gchatInputEl.disabled) return;
    socket.emit('game-chat', { text, chatType: gchatTab });
    gchatInputEl.value = '';
}

gchatToggleBtn.addEventListener('click', () => {
    gchatOpen = true;
    gchatPanelEl.hidden = false;
    gchatToggleBtn.hidden = true;
    gchatUnread[gchatTab] = 0;
    gchatUpdateBadge();
    gchatUpdateSend();
    gchatInputEl.focus();
});

// Schließen-Klick wird weiter unten registriert (gchatClose, geteilt mit Zurück-Knopf/Escape)

gchatPanelEl.querySelectorAll('.gchat-tab').forEach(tab => {
    tab.addEventListener('click', () => gchatSwitchTab(tab.dataset.tab));
});

gchatSendBtn.addEventListener('click', gchatDoSend);
gchatInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') gchatDoSend(); });

// Typing in chat counts as activity → reset the auto-skip warning
let gchatActivityThrottle = null;
gchatInputEl.addEventListener('input', () => {
    if (gchatActivityThrottle) return;
    socket.emit('game-activity');
    gchatActivityThrottle = setTimeout(() => { gchatActivityThrottle = null; }, 3000);
});

// Receive messages
socket.on('game-chat-msg', (msg) => {
    const log = msg.chatType === 'wolf' ? gchatLogWolf : gchatLogVil;
    gchatAppendMsg(log, msg);
    if (!gchatOpen || gchatTab !== msg.chatType) {
        gchatUnread[msg.chatType] = (gchatUnread[msg.chatType] ?? 0) + 1;
        gchatUpdateBadge();
    }
});

// Chat history on reconnect
socket.on('game-chat-history', ({ villageChat, wolfChat }) => {
    gchatLogVil.innerHTML  = '<p class="gchat-empty">Noch keine Nachrichten.</p>';
    gchatLogWolf.innerHTML = '<p class="gchat-empty">Noch keine Nachrichten im Rudel.</p>';
    villageChat.forEach(msg => gchatAppendMsg(gchatLogVil, msg));
    wolfChat.forEach(msg  => gchatAppendMsg(gchatLogWolf, msg));
});

// Hook into existing events to update chat state
function gchatOnPhase(phase) {
    gchatPhase = phase;
    gchatUpdateToggle();
    gchatUpdateSend();
}

// Hook into you-are-dead
socket.on('you-are-dead', () => { gchatDead = true; gchatUpdateSend(); });

// Wolves: reveal chat tab on transform
function gchatBecomeWolf() {
    isWolfPlayer = true;
    gchatWolfTabBtn.hidden = false;
    gchatUpdateToggle();
}

// ── Zurück-Knopf abfangen ─────────────────────────────────────────────────────
// Handy-/Browser-Zurück wirft Spieler sonst aus dem Spiel. Stattdessen:
// Chat offen → Chat schließen; sonst auf der Seite bleiben und Hinweis zeigen.
const backToast = document.getElementById('back-toast');
let backToastTimer = null;

function gchatClose() {
    gchatOpen = false;
    gchatPanelEl.hidden = true;
    gchatUpdateToggle();
}
gchatCloseBtn.addEventListener('click', gchatClose);

history.pushState({ ww: 'game' }, '');
window.addEventListener('popstate', () => {
    if (gchatOpen) {
        gchatClose();
    } else {
        backToast.hidden = false;
        if (backToastTimer) clearTimeout(backToastTimer);
        backToastTimer = setTimeout(() => { backToast.hidden = true; }, 3500);
    }
    history.pushState({ ww: 'game' }, '');
});

// Escape schließt den Chat ebenfalls
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gchatOpen) gchatClose();
});
