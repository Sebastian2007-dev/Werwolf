// ── Voice Chat (WebRTC-Mesh) ──────────────────────────────────────────────────
// Audio läuft Peer-to-Peer zwischen den Browsern. Der Server schickt per
// 'voice-peers', wer im selben Sprachkanal ist; dieses Modul baut die
// Verbindungen dazu auf und ab. Wer sprechen darf, entscheidet der Server
// (canSpeak) — lokal kommt nur die Stummschaltung des Spielers dazu.

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const CHANNEL_LABELS = {
    lobby:   'Alle',
    village: 'Dorf',
    wolf:    '🐺 Rudel',
};

export function initVoice(socket) {
    const bar        = document.getElementById('voice-bar');
    const joinBtn    = document.getElementById('voice-join');
    const controls   = document.getElementById('voice-controls');
    const channelEl  = document.getElementById('voice-channel');
    const peersEl    = document.getElementById('voice-peers');
    const muteBtn    = document.getElementById('voice-mute');
    const leaveBtn   = document.getElementById('voice-leave');
    if (!bar) return { resume() {} };

    let joined      = false;   // Spieler hat Voice aktiviert
    let muted       = false;   // lokale Stummschaltung
    let canSpeak    = false;   // Server-Erlaubnis (Phase / tot / Kanal)
    let channel     = null;    // aktueller Kanal oder null (nachts für Nicht-Wölfe)
    let localStream = null;
    let lastPeers   = [];      // letzte Peer-Liste vom Server
    const peers     = new Map(); // peerId → { pc, audio, pendingIce }

    // ── Mikrofon / Sprech-Status ──────────────────────────────────────────────
    function applyTrackState() {
        const speaking = joined && canSpeak && !muted;
        localStream?.getAudioTracks().forEach(t => { t.enabled = speaking; });
        muteBtn.textContent = muted ? '🔇' : '🎙';
        muteBtn.classList.toggle('is-muted', muted);
        muteBtn.disabled = !canSpeak;
        muteBtn.title = !canSpeak ? 'Du kannst gerade nicht sprechen'
            : muted ? 'Stummschaltung aufheben' : 'Mikrofon stummschalten';
        bar.classList.toggle('is-silenced', joined && !canSpeak);
    }

    function renderStatus() {
        if (!channel) {
            channelEl.textContent = '🌙 Stumm';
            peersEl.textContent   = 'Nachts hörst du niemanden.';
            return;
        }
        const label = CHANNEL_LABELS[channel] ?? channel;
        channelEl.textContent = canSpeak ? label : `${label} · nur zuhören`;
        peersEl.textContent = lastPeers.length > 0
            ? lastPeers.map(p => p.name).join(', ')
            : 'Niemand sonst im Voice.';
    }

    // ── Autoplay-Sperre (mobile Browser) ──────────────────────────────────────
    let needsUnlock = false;
    function tryUnlockAudio() {
        if (!needsUnlock) return;
        needsUnlock = false;
        bar.classList.remove('needs-unlock');
        peers.forEach(p => { p.audio.play().catch(() => {}); });
    }
    document.addEventListener('click',      tryUnlockAudio, true);
    document.addEventListener('touchstart', tryUnlockAudio, true);

    // ── Peer-Verbindungen ─────────────────────────────────────────────────────
    function closePeer(id) {
        const p = peers.get(id);
        if (!p) return;
        try { p.pc.close(); } catch { /* schon geschlossen */ }
        p.audio.srcObject = null;
        p.audio.remove();
        peers.delete(id);
    }

    function createPeer(id, isInitiator) {
        const pc    = new RTCPeerConnection(RTC_CONFIG);
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', '');
        bar.appendChild(audio);
        const entry = { pc, audio, pendingIce: [] };
        peers.set(id, entry);

        localStream.getAudioTracks().forEach(t => pc.addTrack(t, localStream));

        pc.ontrack = (e) => {
            audio.srcObject = e.streams[0];
            audio.play().catch(() => {
                needsUnlock = true;
                bar.classList.add('needs-unlock');
            });
        };
        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('voice-signal', { to: id, data: { candidate: e.candidate } });
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState !== 'failed') return;
            // Fehlgeschlagene Verbindung neu aufbauen, solange der Peer noch erwartet wird
            closePeer(id);
            if (joined && lastPeers.some(p => p.id === id) && socket.id < id) {
                createPeer(id, true);
            }
        };
        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    await pc.setLocalDescription(await pc.createOffer());
                    socket.emit('voice-signal', { to: id, data: { sdp: pc.localDescription } });
                } catch { /* Peer ist inzwischen weg */ }
            };
        }
        return entry;
    }

    function drainIce(entry) {
        entry.pendingIce.splice(0).forEach(c => entry.pc.addIceCandidate(c).catch(() => {}));
    }

    // ── Server-Events ─────────────────────────────────────────────────────────
    socket.on('voice-peers', ({ channel: ch, canSpeak: cs, peers: list }) => {
        if (!joined) return;
        channel   = ch;
        canSpeak  = cs;
        lastPeers = list ?? [];

        // Verbindungen zu Peers kappen, die nicht mehr im Kanal sind
        for (const id of [...peers.keys()]) {
            if (!lastPeers.some(p => p.id === id)) closePeer(id);
        }
        // Neue Peers verbinden — die kleinere Socket-ID beginnt (verhindert Doppel-Offer)
        lastPeers.forEach(p => {
            if (!peers.has(p.id) && socket.id < p.id) createPeer(p.id, true);
        });

        applyTrackState();
        renderStatus();
    });

    socket.on('voice-signal', async ({ from, data }) => {
        if (!joined || !localStream) return;
        try {
            if (data.sdp?.type === 'offer') {
                const entry = peers.get(from) ?? createPeer(from, false);
                await entry.pc.setRemoteDescription(data.sdp);
                await entry.pc.setLocalDescription(await entry.pc.createAnswer());
                socket.emit('voice-signal', { to: from, data: { sdp: entry.pc.localDescription } });
                drainIce(entry);
            } else if (data.sdp?.type === 'answer') {
                const entry = peers.get(from);
                if (!entry) return;
                await entry.pc.setRemoteDescription(data.sdp);
                drainIce(entry);
            } else if (data.candidate) {
                const entry = peers.get(from);
                if (!entry) return;
                if (entry.pc.remoteDescription) entry.pc.addIceCandidate(data.candidate).catch(() => {});
                else entry.pendingIce.push(data.candidate);
            }
        } catch { /* veraltetes Signal eines getrennten Peers */ }
    });

    // ── Beitreten / Verlassen ─────────────────────────────────────────────────
    async function join() {
        if (joined) return;
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
        } catch {
            sessionStorage.removeItem('ww_voice');
            joinBtn.classList.add('is-error');
            joinBtn.textContent = 'Mikrofon blockiert';
            setTimeout(() => {
                joinBtn.classList.remove('is-error');
                joinBtn.textContent = '🎙 Voice';
            }, 3000);
            return;
        }
        joined = true;
        sessionStorage.setItem('ww_voice', '1');
        joinBtn.hidden  = true;
        controls.hidden = false;
        channelEl.textContent = 'Verbinde…';
        peersEl.textContent   = '';
        applyTrackState();
        socket.emit('voice-join');
    }

    function leave() {
        if (!joined) return;
        joined = false;
        sessionStorage.removeItem('ww_voice');
        socket.emit('voice-leave');
        [...peers.keys()].forEach(closePeer);
        localStream?.getTracks().forEach(t => t.stop());
        localStream = null;
        channel  = null;
        canSpeak = false;
        controls.hidden = true;
        joinBtn.hidden  = false;
        bar.classList.remove('is-silenced', 'needs-unlock');
    }

    joinBtn.addEventListener('click', join);
    leaveBtn.addEventListener('click', leave);
    muteBtn.addEventListener('click', () => {
        muted = !muted;
        applyTrackState();
    });

    // Nach Raum-Beitritt/Reconnect aufrufen: meldet Voice neu an bzw. tritt
    // automatisch wieder bei, wenn der Spieler Voice zuvor aktiviert hatte.
    function resume() {
        if (joined) { socket.emit('voice-join'); return; }
        if (sessionStorage.getItem('ww_voice') === '1') join();
    }

    return { resume };
}
