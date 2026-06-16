const form      = document.getElementById('start-form');
const nameInput = document.getElementById('host-name');
const nameError = document.getElementById('name-error');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
        nameError.textContent = 'Bitte gib einen Namen ein.';
        nameInput.focus();
        return;
    }
    nameError.textContent = '';
    window.location.href = '/html/lobby.html?' + new URLSearchParams({ name, host: '1' }).toString();
});
