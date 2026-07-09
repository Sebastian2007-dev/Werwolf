// ── Tutorial-Overlay ──────────────────────────────────────────────────────────
// Erklärt Schritt für Schritt alles, was man im Spiel machen kann und muss.
// Der „gesehen"-Status wird nur lokal im Browser gespeichert (localStorage,
// rein funktional — kein Cookie, keine Übertragung an den Server).
// TUTORIAL_VERSION erhöhen, wenn neue Inhalte allen noch einmal gezeigt
// werden sollen.

const TUTORIAL_VERSION = 1;
const STORAGE_KEY      = 'ww_tutorial_seen';

const STEPS = [
    {
        icon: '🐺',
        title: 'Willkommen bei Werwolf',
        text: 'Werwolf ist ein Spiel um Täuschung und Misstrauen: Das <strong>Dorf</strong> gegen die <strong>Werwölfe</strong>. '
            + 'Nachts reißen die Wölfe heimlich Opfer, tagsüber diskutiert und richtet das Dorf. '
            + '<br><br>Das Dorf gewinnt, wenn alle Werwölfe tot sind — die Werwölfe gewinnen, '
            + 'sobald sie gleich viele oder mehr sind als die Dorfbewohner.',
    },
    {
        icon: '🚪',
        title: 'Lobby & Beitreten',
        text: 'Ein Spieler erstellt als <strong>Host</strong> einen Raum und teilt den 6-stelligen Code oder den QR-Code. '
            + 'Alle anderen treten damit bei. '
            + '<br><br><strong>Wichtig:</strong> Jeder Mitspieler muss unten auf <em>„Bereit"</em> tippen — '
            + 'erst dann kann der Host das Spiel starten.',
    },
    {
        icon: '🃏',
        title: 'Karten auswählen',
        text: 'Der Host wählt, welche Rollen im Spiel sind (mindestens 1 Werwolf, höchstens ein Drittel Wölfe). '
            + 'Fehlen Karten, wird mit Dorfbewohnern aufgefüllt. '
            + '<br><br>Als Mitspieler kannst du eine Karte antippen und dir als <strong>Wunschkarte</strong> (♥) markieren — '
            + 'eine Garantie ist das aber nicht! Tippe auf eine Karte und halte sie, um ihre Fähigkeit zu lesen.',
    },
    {
        icon: '📖',
        title: 'Spielleiter-Modus',
        text: 'Der Host entscheidet: selbst <strong>mitspielen</strong> (ein Auto-Modus führt dann durch das Spiel) '
            + 'oder als <strong>Erzähler</strong> das Spiel leiten, ohne mitzuspielen. '
            + '<br><br>Der Host kann auch einen anderen Spieler per 📖-Knopf zum Erzähler machen — '
            + 'und mit <em>„+ Computer-Spieler"</em> Bots auffüllen, wenn ihr zu wenige seid.',
    },
    {
        icon: '🎭',
        title: 'Deine Rolle',
        text: 'Zu Spielbeginn bekommst du <strong>geheim</strong> eine Karte. Tippe auf <em>„Karte zeigen"</em>, '
            + 'um sie anzusehen — lass dabei niemanden auf dein Display schauen! '
            + '<br><br>Der <em>ⓘ Info</em>-Knopf erklärt dir jederzeit, was deine Rolle kann.',
    },
    {
        icon: '🌙',
        title: 'Die Nacht',
        text: 'Nachts „schlafen" alle. Die Rollen werden nacheinander geweckt — wenn du dran bist, '
            + 'erscheint deine Aktion automatisch auf dem Bildschirm: einfach den Anweisungen folgen. '
            + '<br><br>Die <strong>Werwölfe</strong> einigen sich gemeinsam per Mehrheit auf ein Opfer und bestätigen es. '
            + '<br><br>⚠ Im Auto-Modus gilt: Wer zu lange wartet, wird übersprungen!',
    },
    {
        icon: '☀️',
        title: 'Der Tag',
        text: 'Am Morgen werden die Toten der Nacht aufgedeckt. Danach: '
            + '<br><br><strong>1. Anklage-Phase</strong> — jeder klagt einen Verdächtigen an oder überspringt. '
            + '<br><strong>2. Abstimmung</strong> — das Dorf stimmt über die Angeklagten ab. '
            + 'Wer die meisten Stimmen bekommt, wird eliminiert. '
            + '<br><br>Du siehst dabei live mit Namen, wer wen anklagt und wer für wen stimmt.',
    },
    {
        icon: '💬',
        title: 'Chat & Voice',
        text: '<strong>💬 Text-Chat:</strong> „Dorf" für alle (nur tagsüber) und „Rudel" nur für Werwölfe. '
            + '<br><br><strong>🎙 Voice-Chat</strong> (freiwillig): In der Lobby reden alle miteinander, '
            + 'tagsüber alle Lebenden, nachts nur die Werwölfe — und auch die nur, während ihre Abstimmung läuft. '
            + 'Tote dürfen zuhören, aber nicht mehr sprechen.',
    },
    {
        icon: '👻',
        title: 'Tod, Geister & Sieg',
        text: 'Wer stirbt, wird zum <strong>Geist</strong>: Du siehst ab dann alle Rollen und das komplette Protokoll — '
            + 'aber psst, nichts verraten! '
            + '<br><br>Neben Dorf und Wölfen gibt es Sonderrollen mit eigenen Zielen '
            + '(Liebespaar, Einsamer Wolf, Narr …) — wirf einen Blick auf ⓘ deiner Karte. Viel Erfolg! 🍀',
    },
];

export function initTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return { open() {}, openIfNew() {} };

    const iconEl  = document.getElementById('tutorial-icon');
    const titleEl = document.getElementById('tutorial-title');
    const textEl  = document.getElementById('tutorial-text');
    const dotsEl  = document.getElementById('tutorial-dots');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');
    const closeBtn = document.getElementById('tutorial-close');
    const helpBtn  = document.getElementById('tutorial-btn');

    let idx = 0;

    function markSeen() {
        try { localStorage.setItem(STORAGE_KEY, String(TUTORIAL_VERSION)); } catch { /* Storage blockiert */ }
    }

    function render() {
        const step = STEPS[idx];
        iconEl.textContent  = step.icon;
        titleEl.textContent = step.title;
        textEl.innerHTML    = step.text;
        dotsEl.innerHTML = STEPS.map((_, i) =>
            `<button class="tutorial-dot${i === idx ? ' is-active' : ''}" data-i="${i}" aria-label="Schritt ${i + 1}"></button>`
        ).join('');
        dotsEl.querySelectorAll('.tutorial-dot').forEach(d =>
            d.addEventListener('click', () => { idx = parseInt(d.dataset.i, 10); render(); })
        );
        prevBtn.disabled = idx === 0;
        nextBtn.textContent = idx === STEPS.length - 1 ? 'Los geht’s ✓' : 'Weiter →';
    }

    function open(at = 0) {
        idx = at;
        render();
        overlay.hidden = false;
    }

    function close() {
        overlay.hidden = true;
        markSeen();
    }

    function openIfNew() {
        let seen = 0;
        try { seen = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; } catch { /* Storage blockiert */ }
        if (seen < TUTORIAL_VERSION) open(0);
    }

    prevBtn.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
    nextBtn.addEventListener('click', () => {
        if (idx < STEPS.length - 1) { idx++; render(); }
        else close();
    });
    closeBtn.addEventListener('click', close);
    helpBtn?.addEventListener('click', () => open(0));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
        if (overlay.hidden) return;
        if (e.key === 'Escape')     close();
        if (e.key === 'ArrowRight' && idx < STEPS.length - 1) { idx++; render(); }
        if (e.key === 'ArrowLeft'  && idx > 0)                { idx--; render(); }
    });

    return { open, openIfNew };
}
