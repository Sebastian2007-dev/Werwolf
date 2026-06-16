const form      = document.getElementById('join-form');
const codeInput = document.getElementById('room-code');
const nameInput = document.getElementById('player-name');
const joinError = document.getElementById('join-error');

codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    const name = nameInput.value.trim();

    if (code.length !== 6) {
        joinError.textContent = 'Der Raumcode muss 6 Zeichen lang sein.';
        codeInput.focus();
        return;
    }
    if (!name) {
        joinError.textContent = 'Bitte gib einen Namen ein.';
        nameInput.focus();
        return;
    }

    joinError.textContent = '';
    window.location.href = '/html/lobby.html?' + new URLSearchParams({ code, name }).toString();
});
