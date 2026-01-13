// Contexto de Audio
let audioCtx;
const activeOscillators = {};

// Frecuencias extendidas (C4 hasta B6)
const frequencies = {
    'C4': 261.63, 'Cs4': 277.18, 'D4': 293.66, 'Ds4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'Fs4': 369.99, 'G4': 392.00, 'Gs4': 415.30, 'A4': 440.00, 'As4': 466.16, 'B4': 493.88,
    
    'C5': 523.25, 'Cs5': 554.37, 'D5': 587.33, 'Ds5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'Fs5': 739.99, 'G5': 783.99, 'Gs5': 830.61, 'A5': 880.00, 'As5': 932.33, 'B5': 987.77,
    
    'C6': 1046.50, 'Cs6': 1108.73, 'D6': 1174.66, 'Ds6': 1244.51, 'E6': 1318.51, 'F6': 1396.91,
    'Fs6': 1479.98, 'G6': 1567.98
};

// Mapeo por Código Físico (e.code)
const keyMap = {
    // --- FILA INFERIOR ---
    'KeyZ': 'C4', 'KeyS': 'Cs4', 'KeyX': 'D4', 'KeyD': 'Ds4', 'KeyC': 'E4', 'KeyV': 'F4',
    'KeyG': 'Fs4', 'KeyB': 'G4', 'KeyH': 'Gs4', 'KeyN': 'A4', 'KeyJ': 'As4', 'KeyM': 'B4',
    'Comma': 'C5', 'KeyL': 'Cs5', 'Period': 'D5', 'Semicolon': 'Ds5', 'Slash': 'E5',
    
    // --- FILA SUPERIOR ---
    'KeyQ': 'C5', 'Digit2': 'Cs5', 'KeyW': 'D5', 'Digit3': 'Ds5', 'KeyE': 'E5', 'KeyR': 'F5',
    'Digit5': 'Fs5', 'KeyT': 'G5', 'Digit6': 'Gs5', 'KeyY': 'A5', 'Digit7': 'As5', 'KeyU': 'B5',
    'KeyI': 'C6', 'Digit9': 'Cs6', 'KeyO': 'D6', 'Digit0': 'Ds6', 'KeyP': 'E6', 
    'BracketLeft': 'F6', 'Equal': 'Fs6', 'BracketRight': 'G6'
};

// Inicialización silenciosa e inteligente
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.connect(audioCtx.destination);
        window.masterOut = compressor;
    } 
    // Asegurar que si está suspendido (autoplay policy), se reanude
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playNote(note) {
    // Intentamos iniciar el audio con cada nota
    initAudio();

    if (!frequencies[note]) return;
    if (activeOscillators[note]) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequencies[note], audioCtx.currentTime);

    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(window.masterOut || audioCtx.destination);

    osc.start();
    activeOscillators[note] = { osc, gainNode };

    const keyElements = document.querySelectorAll(`[data-note="${note}"]`);
    keyElements.forEach(el => el.classList.add('active'));
}

function stopNote(note) {
    // Si no hay audio context, no hay nada que parar
    if (!activeOscillators[note] || !audioCtx) return;

    const { osc, gainNode } = activeOscillators[note];
    const now = audioCtx.currentTime;
    const releaseTime = 0.15;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    osc.stop(now + releaseTime);
    
    setTimeout(() => {
        osc.disconnect();
        gainNode.disconnect();
    }, releaseTime * 1000 + 100);

    delete activeOscillators[note];

    const keyElements = document.querySelectorAll(`[data-note="${note}"]`);
    keyElements.forEach(el => el.classList.remove('active'));
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (!e.metaKey && !e.ctrlKey && keyMap[code]) {
        e.preventDefault();
        playNote(keyMap[code]);
    }
});

window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (keyMap[code]) {
        stopNote(keyMap[code]);
    }
});

// Detener todas las notas cuando la ventana pierde el foco
function stopAllNotes() {
    Object.keys(activeOscillators).forEach(note => {
        stopNote(note);
    });
}
window.addEventListener('blur', stopAllNotes);

document.querySelectorAll('.white-key, .black-key').forEach(key => {
    // mousedown / touchstart sirven como "gesto de usuario" para desbloquear audio
    const press = (e) => {
        // e.preventDefault(); // Opcional, cuidado con bloquear scroll táctil
        const note = key.dataset.note;
        playNote(note);
    };
    
    const release = () => {
        const note = key.dataset.note;
        stopNote(note);
    };

    key.addEventListener('mousedown', press);
    key.addEventListener('mouseup', release);
    key.addEventListener('mouseleave', release);
    
    key.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Evita scroll y mouse emulation
        press(e);
    });
    key.addEventListener('touchend', (e) => {
        e.preventDefault();
        release();
    });
});