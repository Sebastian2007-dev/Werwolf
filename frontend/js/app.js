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
