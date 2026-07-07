const form      = document.getElementById('join-form');
const codeInput = document.getElementById('room-code');
const nameInput = document.getElementById('player-name');
const joinError = document.getElementById('join-error');
const subtitle  = document.querySelector('.form-card__subtitle');

codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Per QR-Code / Link geöffnet (?code=XXXXXX): Raumcode vorbefüllen,
// der Spieler muss nur noch seinen Namen eingeben.
const urlCode = new URLSearchParams(window.location.search).get('code');
if (urlCode) {
    codeInput.value = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (codeInput.value.length === 6) {
        codeInput.readOnly = true;
        codeInput.classList.add('is-prefilled');
        subtitle.textContent = `Raum ${codeInput.value} erkannt — gib nur noch deinen Namen ein.`;
        nameInput.focus();
    }
}

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
