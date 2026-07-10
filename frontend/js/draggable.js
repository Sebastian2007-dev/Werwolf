// Verschiebbare Schwebeelemente (Chat-Knopf, Voice-Leiste) — geteilt von
// Spiel und Lobby. Per Drag frei positionierbar, 8-px-Schwelle unterscheidet
// Klick von Drag, die Position bleibt im Browser gespeichert.
export function makeDraggable(el, storageKey) {
    if (!el) return;
    el.style.touchAction = 'none';

    const applyPos = (x, y) => {
        const maxX = window.innerWidth  - el.offsetWidth;
        const maxY = window.innerHeight - el.offsetHeight;
        el.style.left   = Math.min(Math.max(0, x), Math.max(0, maxX)) + 'px';
        el.style.top    = Math.min(Math.max(0, y), Math.max(0, maxY)) + 'px';
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
    };

    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try { const { x, y } = JSON.parse(saved); applyPos(x, y); } catch { /* ignorieren */ }
    }

    let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false, moved = false;

    el.addEventListener('pointerdown', (e) => {
        dragging = true; moved = false;
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();
        origX = rect.left; origY = rect.top;
    });

    window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 8) return; // Klick von Drag unterscheiden
        moved = true;
        applyPos(origX + dx, origY + dy);
    });

    window.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        if (!moved) return;
        const rect = el.getBoundingClientRect();
        localStorage.setItem(storageKey, JSON.stringify({ x: rect.left, y: rect.top }));
        // Klick direkt nach dem Drag unterdrücken (würde sonst Chat/Voice auslösen)
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 400);
    });

    // Nach Fenster-Resize wieder in den sichtbaren Bereich holen
    window.addEventListener('resize', () => {
        if (!el.style.left) return;
        const rect = el.getBoundingClientRect();
        applyPos(rect.left, rect.top);
    });
}
