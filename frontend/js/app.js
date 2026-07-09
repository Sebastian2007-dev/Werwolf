import { initTutorial } from '/js/tutorial.js';

// Tutorial: Footer-Knopf öffnet es (keine Auto-Anzeige — die macht die Lobby)
const tutorial = initTutorial();

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
