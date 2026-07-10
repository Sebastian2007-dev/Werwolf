import { initTutorial } from '/js/tutorial.js';
import { APP_VERSION, CHANGELOG } from '/js/changelog-data.js';

// Tutorial: Footer-Knopf öffnet es (keine Auto-Anzeige — die macht die Lobby)
const tutorial = initTutorial();

// ── Version & Changelog ───────────────────────────────────────────────────────
const versionBtn = document.getElementById('version-btn');
if (versionBtn) versionBtn.textContent = `v${APP_VERSION}`;

const changelogList = document.getElementById('changelog-list');
if (changelogList) {
    const h = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    changelogList.innerHTML = CHANGELOG.map(entry => `
        <section class="changelog__entry">
            <h3 class="changelog__version">v${h(entry.version)} <span class="changelog__date">${h(entry.date)}</span></h3>
            <ul class="changelog__changes">
                ${entry.changes.map(c => `<li>${h(c)}</li>`).join('')}
            </ul>
        </section>
    `).join('');
}

// Modal open/close
const openModal = (id) => {
    const modal = document.getElementById('modal-' + id);
    if (modal) modal.showModal();
};

const closeModal = (modal) => modal.close();

document.querySelectorAll('[data-modal]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.modal));
});

document.querySelectorAll('.modal').forEach((modal) => {
    modal.querySelector('.modal__close')?.addEventListener('click', () => closeModal(modal));

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// Deep-Links: /html/index.html#impressum|#datenschutz|#nutzung öffnen das
// jeweilige Modal direkt, #tutorial startet das Tutorial — alles fest verlinkbar
const LEGAL_MODALS = ['impressum', 'datenschutz', 'nutzung'];

function openModalFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (LEGAL_MODALS.includes(hash)) openModal(hash);
    if (hash === 'tutorial') tutorial.open(0);
}

openModalFromHash();
window.addEventListener('hashchange', openModalFromHash);
