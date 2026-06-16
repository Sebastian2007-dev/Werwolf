import { ROLES, DESCRIPTIONS, FACTION_LABEL } from '/js/roles.js';

const params = new URLSearchParams(window.location.search);
const cardId = params.get('card');

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

infoBtn.addEventListener('click', () => {
    infoTitle.textContent = role?.name ?? cardId;
    infoDesc.textContent  = DESCRIPTIONS[cardId] ?? 'Keine Beschreibung verfügbar.';
    infoModal.showModal();
});

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

    } else {
        // kill / generic select-one
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

// Wolf coordination: another wolf already voted
socket.on('wolf-vote-update', ({ voterName, targetName }) => {
    if (nightWait.hidden === false) {
        nightWaitSub.textContent = `${voterName} hat für ${targetName} gestimmt.`;
    }
});

// Not our turn: show wait screen
socket.on('night-waiting', ({ waitingFor }) => {
    showOverlay();
    showWait(waitingFor ? `Wartet auf: ${waitingFor}` : '');
});

// Our turn is done (server moved on)
socket.on('night-turn-done', () => {
    showWait('Gut gemacht. Warte auf die anderen…');
});

// Day phase: hide overlay
socket.on('phase-changed', ({ phase }) => {
    if (phase === 'day-prep' || phase === 'day-vote') {
        hideOverlay();
    }
});

// Amor: we are one of the lovers
socket.on('you-are-lovers', ({ partnerName }) => {
    lovePartnerName = partnerName;
    lovePanelText.textContent = `Du bist verliebt in ${partnerName}. Ihr gewinnt nur zusammen – und sterbt zusammen.`;
    lovePanel.hidden    = false;
    loveRecallBtn.hidden = false;
});

// Game over
socket.on('game-over', ({ winner, message }) => {
    hideOverlay();
    const labels = { lovers: 'Liebespaar', wolves: 'Werwölfe', villagers: 'Dorfbewohner' };
    gameOverWinner.textContent  = labels[winner] ?? winner;
    gameOverMessage.textContent = message;
    gameOverOverlay.hidden = false;
});
