/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v12)
 *
 * NUEVAS FEATURES vs v11:
 *  ✅  §2   GS: + timer { seconds, lastMs, hudEl } para el contador
 *  ✅  §3B  startInGameMusic: track árabe más denso y energético
 *           (melodía dual, bajo de cuerdas, Doumbek 140 BPM, shimmer)
 *  ✅  §6   setupGameMap: goal reubicado cerca pero no trivial
 *  ✅  §8   COUNTDOWN TIMER 20 s: tick via performance.now(), HUD propio
 *  ✅  §8   LOSE por tiempo agotado → explosión igual que captura
 *  ✅  §9   Explosión KABOOM mejorada: 120 partículas, sprites mixtos,
 *           screen-shake, flash de pantalla
 *  ✅  §11  updateGame: isHidden automático (sin tecla E) al entrar en AABB
 *  ✅  §12  renderGame: HUD del timer en canvas, meta con label MAP
 *  ✅  §13  showResultOverlay: muestra tiempo restante al ganar
 *  ✅  Touch, patrol AI, AABB, fondos temáticos: preservados de v11
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════════
   §1  DATOS PERSONAJES  (sin tocar — regla de preservación)
═══════════════════════════════════════════════════════════════════ */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: '🐶 DOG WARRIOR',
    mission: 'Stash clothes & dodge the Vet!', mapName: 'THE HOUSE',
    reward: '🦴 BONE', imgPath: 'assets/images/Molly.png', speed: 4.2, sprintMul: 1.5,
    colors: { primary: '#c860ff', secondary: 'rgba(200,96,255,0.2)' }
  },
  agata: {
    id: 'agata', name: 'AGATA', type: '🐱 FOREST MAGE',
    mission: "Flee the Vet's nail clippers!", mapName: 'THE FOREST',
    reward: '🐟 FISH', imgPath: 'assets/images/Agata.png', speed: 4.5, sprintMul: 1.4,
    colors: { primary: '#00e86a', secondary: 'rgba(0,232,106,0.2)' }
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: '🐱 DESERT KNIGHT',
    mission: 'Reach the well. Thirst is rising!', mapName: 'THE DESERT',
    reward: '🐟 FISH', imgPath: 'assets/images/Martin.png', speed: 3.9, sprintMul: 1.6,
    colors: { primary: '#ff9020', secondary: 'rgba(255,144,32,0.2)' }
  },
  michi: {
    id: 'michi', name: 'MICHI', type: '🐱 ROGUE ALCHEMIST',
    mission: 'Avoid soap, towel & wet doom!', mapName: 'THE BATHROOM',
    reward: '🐟 FISH', imgPath: 'assets/images/Michi.png', speed: 4.8, sprintMul: 1.3,
    colors: { primary: '#00b8ff', secondary: 'rgba(0,184,255,0.2)' }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   §2  ESTADO GLOBAL  (estructura base preservada + extensiones v12)
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen: 'loading',
  char: null,
  images: {},
  audioCtx: null,
  bgmNode: null,
  igMusicNodes: [],
  isPaused: false,
  gameLoopId: null,
  keys: {},
  player: { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: {
    x: 1100, y: 800, angle: 0, speed: 2.4,
    mode: 'patrol',
    patrolTarget: { x: 800, y: 600 },
    patrolTimer: 0,
    lostTimer: 0
  },
  map: { width: 1600, height: 1200 },
  hidingObjects: [],
  goal: { x: 1450, y: 1050, radius: 50 },
  gameResult: null,
  proximity: 0,
  // Partículas de explosión
  particles: [],
  explosion: { active: false, timer: 0, duration: 100, shakeFrames: 0 },
  // Joystick táctil
  touch: { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null },
  // ── v12 NEW ── Countdown timer
  timer: {
    seconds: 20,       // segundos restantes
    lastMs: 0,         // timestamp del último tick
    msAcc: 0,          // acumulador de milisegundos
    running: false
  }
};

const IMAGE_ASSETS = {
  molly:  'assets/images/Molly.png',
  agata:  'assets/images/Agata.png',
  martin: 'assets/images/Martin.png',
  michi:  'assets/images/Michi.png',
  vet:    'assets/images/Veterinaria.png'
};

/* ═══════════════════════════════════════════════════════════════════
   §2b  PRELOADER
═══════════════════════════════════════════════════════════════════ */
function setLoadBar(pct) {
  const bar = document.getElementById('loadBar');
  const txt = document.getElementById('loadPct');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = Math.round(pct) + '%';
}

async function preloadImages() {
  const keys = Object.keys(IMAGE_ASSETS);
  const total = keys.length;
  let n = 0;
  const promises = keys.map(key => new Promise(resolve => {
    const img = new Image();
    img.src = IMAGE_ASSETS[key];
    const done = () => { GS.images[key] = img; n++; setLoadBar((n / total) * 100); resolve(); };
    img.onload = done; img.onerror = done;
  }));
  await Promise.race([Promise.all(promises), new Promise(r => setTimeout(r, 2500))]);
}

/* ═══════════════════════════════════════════════════════════════════
   §3  AUDIO ENGINE — 100 % Web Audio API
═══════════════════════════════════════════════════════════════════ */
function ensureAudio() {
  try {
    if (!GS.audioCtx) GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (GS.audioCtx.state === 'suspended') GS.audioCtx.resume();
  } catch(e) {}
}

function stopBGM() {
  if (GS.bgmNode) { try { GS.bgmNode.stop(); } catch(e){} GS.bgmNode = null; }
}

function stopIgMusic() {
  GS.igMusicNodes.forEach(n => { try { n.stop(); } catch(e){} });
  GS.igMusicNodes = [];
}

/* ─────────────────────────────────────────────────────────────────
   §3A  Menu BGM — melodía pentatónica en triángulo, loop largo
───────────────────────────────────────────────────────────────── */
function startMenuBGM() {
  ensureAudio();
  stopBGM();
  stopIgMusic();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.07, ctx.currentTime);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const notes = [196.00, 220.00, 261.63, 293.66, 329.63, 293.66, 261.63, 220.00];
    const dur = 0.45;
    const now = ctx.currentTime;
    for (let i = 0; i < 80; i++) {
      osc.frequency.setValueAtTime(notes[i % notes.length], now + i * dur);
    }
    osc.connect(master);
    osc.start(now);
    GS.bgmNode = osc;
  } catch(e) {}
}

/* ─────────────────────────────────────────────────────────────────
   §3B  In-game BGM — track árabe denso y energético (v12 upgrade)
   Arquitectura: melodía Hijaz (sawtooth) + contra-melodía una octava
   abajo (triangle) + bajo de cuerdas (sawtooth grave) +
   Doumbek a 140 BPM + Riq off-beat + shimmer de alta frecuencia.
───────────────────────────────────────────────────────────────── */
function startInGameMusic() {
  ensureAudio();
  stopBGM();
  stopIgMusic();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.10, ctx.currentTime);
    master.connect(ctx.destination);
    GS.igMusicNodes.push(master);

    // Escala Maqam Hijaz enriquecida (D Eb F# G A Bb C# D — dos octavas)
    const H1 = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
    const H2 = H1.map(f => f * 2); // octava alta
    const H0 = H1.map(f => f / 2); // octava baja

    // Motif principal (índices en H1)
    const MOT_IDX  = [0,2,3,2,1,0, 4,3,2,3, 5,4,3,2,1,0, 6,5,4,3, 2,1,0, 7];
    const MOT_DUR  = [.13,.09,.12,.09,.13,.17, .12,.09,.13,.12, .17,.12,.09,.13,.09,.17, .12,.09,.13,.12, .13,.09,.13,.22];

    /* ── Melodía sawtooth (voz principal) ── */
    function scheduleMelody(freqs, startT, gainVal, waveType) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = waveType || 'sawtooth';
      g.gain.setValueAtTime(gainVal, startT);
      let t = startT;
      const REPS = 30;
      for (let rep = 0; rep < REPS; rep++) {
        MOT_IDX.forEach((si, i) => {
          osc.frequency.setValueAtTime(freqs[si], t);
          // Vibrato leve
          const vib = ctx.createOscillator();
          vib.frequency.value = 5.5;
          const vibGain = ctx.createGain();
          vibGain.gain.setValueAtTime(3, t);
          vib.connect(vibGain); vibGain.connect(osc.frequency);
          vib.start(t); vib.stop(t + (MOT_DUR[i] || 0.12));
          t += (MOT_DUR[i] || 0.12);
        });
      }
      osc.connect(g); g.connect(master);
      osc.start(startT);
      GS.igMusicNodes.push(osc, g);
    }

    const now = ctx.currentTime;
    scheduleMelody(H1, now,        0.38, 'sawtooth');   // voz principal
    scheduleMelody(H2, now + 0.06, 0.18, 'triangle');   // shimmer alta
    scheduleMelody(H0, now,        0.22, 'sawtooth');   // bajo

    /* ── Percusión: Doumbek 140 BPM (~0.428 s/beat) ── */
    const BEAT = 60 / 140;
    const BARS = 200;
    for (let i = 0; i < BARS; i++) {
      const bt = now + i * BEAT;

      // Kick grave (Doumbek DUM)
      if (i % 4 === 0 || i % 4 === 2) {
        const ko = ctx.createOscillator(), kg = ctx.createGain();
        ko.type = 'sine';
        ko.frequency.setValueAtTime(200, bt);
        ko.frequency.exponentialRampToValueAtTime(50, bt + 0.09);
        kg.gain.setValueAtTime(0.45, bt);
        kg.gain.exponentialRampToValueAtTime(0.001, bt + 0.13);
        ko.connect(kg); kg.connect(master);
        ko.start(bt); ko.stop(bt + 0.15);
        GS.igMusicNodes.push(ko, kg);
      }

      // Tek (golpe agudo del Doumbek)
      if (i % 4 === 1) {
        const to = ctx.createOscillator(), tg = ctx.createGain();
        to.type = 'triangle';
        to.frequency.setValueAtTime(900, bt);
        to.frequency.exponentialRampToValueAtTime(450, bt + 0.04);
        tg.gain.setValueAtTime(0.22, bt);
        tg.gain.exponentialRampToValueAtTime(0.001, bt + 0.06);
        to.connect(tg); tg.connect(master);
        to.start(bt); to.stop(bt + 0.07);
        GS.igMusicNodes.push(to, tg);
      }

      // Riq (pandereta árabe) — off-beat en 2.5
      if (i % 4 === 3) {
        const ro = ctx.createOscillator(), rg = ctx.createGain();
        ro.type = 'square';
        ro.frequency.setValueAtTime(1400, bt + BEAT * 0.5);
        rg.gain.setValueAtTime(0.10, bt + BEAT * 0.5);
        rg.gain.exponentialRampToValueAtTime(0.001, bt + BEAT * 0.5 + 0.035);
        ro.connect(rg); rg.connect(master);
        ro.start(bt + BEAT * 0.5);
        ro.stop(bt + BEAT * 0.5 + 0.04);
        GS.igMusicNodes.push(ro, rg);
      }
    }

    /* ── Bordón de 4ª (nota pedal grave continua) ── */
    const drone = ctx.createOscillator(), dg = ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(73.42, now); // D2
    dg.gain.setValueAtTime(0.06, now);
    drone.connect(dg); dg.connect(master);
    drone.start(now);
    GS.igMusicNodes.push(drone, dg);

  } catch(e) { console.warn('InGameMusic error:', e); }
}

/* ── 3C  SFX Selección ── */
function playSynthSFX(type) {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'bark') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
    }
    g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/* ── 3D  WIN jingle ── */
function playWinJingle() {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const t = ctx.currentTime + i * 0.22;
    o.type = 'square';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.10, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.3);
  });
}

/* ── 3E  LOSE jingle ── */
function playLoseJingle() {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  [440, 392, 349.23, 261.63].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const t = ctx.currentTime + i * 0.28;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.36);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §4  ROUTER
═══════════════════════════════════════════════════════════════════ */
function changeScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  GS.screen = screenId;

  if (screenId === 'mainmenu') {
    stopIgMusic();
    startMenuBGM();
  } else if (screenId === 'charselect') {
    startMenuBGM();
  } else if (screenId === 'game') {
    stopBGM();
    startGameplay();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §5  SELECCIÓN DE PERSONAJE
═══════════════════════════════════════════════════════════════════ */
function selectCharacter(charId) {
  const data = CHARACTERS[charId];
  if (!data) return;
  GS.char = data;
  playSynthSFX(charId === 'molly' ? 'bark' : 'meow');
  const avatar = document.getElementById('confirmAvatar');
  if (avatar) avatar.src = data.imgPath;
  document.getElementById('confirmName').textContent = data.name;
  document.getElementById('confirmName').className = `confirm-name ${charId}-text`;
  document.getElementById('confirmLevel').textContent = data.type;
  document.getElementById('confirmObj').textContent =
    `LOCATION: ${data.mapName}\n• OBJECTIVE: ${data.mission}`;
  changeScreen('confirm');
}

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card => {
    const id = card.getAttribute('data-char');
    card.addEventListener('click', () => { ensureAudio(); selectCharacter(id); });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §6  SETUP DEL MAPA — objetos AABB temáticos por personaje
═══════════════════════════════════════════════════════════════════ */
function setupGameMap() {
  GS.player.x = 150; GS.player.y = 150;
  GS.player.isHidden = false;
  GS.vet.x = 1100; GS.vet.y = 800;
  GS.vet.mode = 'patrol';
  GS.vet.patrolTarget = { x: 800, y: 600 };
  GS.vet.patrolTimer = 0;
  GS.vet.lostTimer = 0;
  GS.hidingObjects = [];
  GS.gameResult = null;
  GS.isPaused = false;
  GS.particles = [];
  GS.explosion = { active: false, timer: 0, duration: 100, shakeFrames: 0 };
  // Reset timer
  GS.timer.seconds = 20;
  GS.timer.msAcc   = 0;
  GS.timer.lastMs  = performance.now();
  GS.timer.running = false; // arrancará en el primer frame de updateGame

  const id = GS.char ? GS.char.id : 'molly';

  // META: siempre en la esquina superior derecha del mapa
  GS.goal = { x: 1430, y: 80, radius: 50 };

  /* — Molly: THE HOUSE — */
  if (id === 'molly') {
    GS.hidingObjects = [
      { x: 190, y: 170, w: 270, h: 140, label: 'CAMA',     color: '#8a5cf6', type: 'bed'     },
      { x: 680, y: 410, w: 310, h: 120, label: 'SOFÁ',     color: '#7c4dff', type: 'couch'   },
      { x: 1080, y: 180, w: 150, h: 210, label: 'ARMARIO', color: '#5e35b1', type: 'cabinet' },
      { x: 380, y: 680, w: 210, h: 130, label: 'CAMA 2',   color: '#8a5cf6', type: 'bed'     },
      { x: 880, y: 840, w: 270, h: 120, label: 'SOFÁ 2',   color: '#7c4dff', type: 'couch'   },
      { x: 190, y: 880, w: 150, h: 190, label: 'CAJÓN',    color: '#5e35b1', type: 'cabinet' },
    ];

  /* — Agata: THE FOREST — */
  } else if (id === 'agata') {
    GS.hidingObjects = [
      { x: 270, y: 190, w: 95,  h: 270, label: 'TRONCO',  color: '#5d4037', type: 'trunk' },
      { x: 610, y: 370, w: 230, h: 110, label: 'ARBUSTO', color: '#2e7d32', type: 'bush'  },
      { x: 970, y: 190, w: 105, h: 290, label: 'TRONCO',  color: '#5d4037', type: 'trunk' },
      { x: 390, y: 690, w: 250, h: 120, label: 'ARBUSTO', color: '#388e3c', type: 'bush'  },
      { x: 1140, y: 590, w: 90, h: 270, label: 'TRONCO',  color: '#4e342e', type: 'trunk' },
      { x: 690, y: 840, w: 210, h: 110, label: 'ARBUSTO', color: '#2e7d32', type: 'bush'  },
    ];

  /* — Martín: THE DESERT — */
  } else if (id === 'martin') {
    GS.hidingObjects = [
      { x: 240, y: 190, w: 310, h: 90,  label: 'MURO',    color: '#795548', type: 'wall'   },
      { x: 740, y: 310, w: 75,  h: 230, label: 'COLUMNA', color: '#8d6e63', type: 'column' },
      { x: 940, y: 170, w: 75,  h: 230, label: 'COLUMNA', color: '#8d6e63', type: 'column' },
      { x: 1180, y: 390, w: 140, h: 140, label: 'POZO',   color: '#6d4c41', type: 'well'   },
      { x: 340, y: 690, w: 290, h: 90,  label: 'MURO 2',  color: '#795548', type: 'wall'   },
      { x: 790, y: 840, w: 170, h: 85,  label: 'DUNA',    color: '#c8a165', type: 'dune'   },
    ];

  /* — Michi: THE BATHROOM — */
  } else {
    GS.hidingObjects = [
      { x: 170, y: 170, w: 330, h: 140, label: 'BAÑERA',   color: '#0288d1', type: 'tub'    },
      { x: 690, y: 340, w: 140, h: 180, label: 'CESTO',    color: '#00838f', type: 'basket' },
      { x: 1040, y: 170, w: 270, h: 90, label: 'ESTANTE',  color: '#006064', type: 'shelf'  },
      { x: 340, y: 710, w: 310, h: 130, label: 'BAÑERA 2', color: '#0288d1', type: 'tub'    },
      { x: 890, y: 790, w: 140, h: 180, label: 'CESTO 2',  color: '#00838f', type: 'basket' },
      { x: 1140, y: 590, w: 270, h: 90, label: 'ESTANTE',  color: '#006064', type: 'shelf'  },
    ];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §7  RENDER — FONDOS TEMÁTICOS Y OBJETOS DE ESCONDITE
═══════════════════════════════════════════════════════════════════ */

/* ── 7A  Suelo temático ── */
function renderBackground(ctx) {
  const id = GS.char ? GS.char.id : 'molly';
  const W = GS.map.width, H = GS.map.height;

  if (id === 'molly') {
    // Parquet de madera
    ctx.fillStyle = '#3e2723'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5;
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    for (let x = 0; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    // Nudo de madera decorativo
    for (let i = 0; i < 12; i++) {
      const kx = (i*389)%W, ky = (i*271)%H;
      ctx.strokeStyle = 'rgba(78,52,46,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(kx, ky, 14, 8, (i%3)*0.5, 0, Math.PI*2); ctx.stroke();
    }
    // Alfombra central
    ctx.fillStyle = '#4a148c'; ctx.fillRect(290, 330, 720, 420);
    ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 7; ctx.strokeRect(308, 348, 684, 384);
    ctx.strokeStyle = '#ab47bc'; ctx.lineWidth = 2; ctx.strokeRect(325, 365, 650, 350);

  } else if (id === 'agata') {
    // Suelo de bosque con musgo
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, 0, W, H);
    // Variación de color: parches de musgo
    for (let i = 0; i < 50; i++) {
      const gx = (i*347)%W, gy = (i*229)%H;
      ctx.fillStyle = i%3===0 ? '#2e7d32' : (i%3===1 ? '#33691e' : '#1b5e20');
      ctx.fillRect(gx, gy, 60+(i%5)*22, 38+(i%4)*14);
    }
    // Raíces en el suelo
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const rx = (i*503)%W, ry = (i*317)%H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.bezierCurveTo(rx+40, ry-20, rx+80, ry+30, rx+120, ry+10);
      ctx.stroke();
    }

  } else if (id === 'martin') {
    // Arenas del desierto
    ctx.fillStyle = '#e6b87a'; ctx.fillRect(0, 0, W, H);
    // Ondas de arena
    for (let i = 0; i < 35; i++) {
      const gx = (i*413)%W, gy = (i*317)%H;
      ctx.fillStyle = i%2===0 ? '#d4a05a' : '#edd89a';
      ctx.beginPath(); ctx.ellipse(gx, gy, 90+(i%4)*32, 28+(i%3)*10, 0, 0, Math.PI*2); ctx.fill();
    }
    // Grietas del suelo
    ctx.strokeStyle = '#bf9040'; ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const cx = (i*521)%W, cy = (i*389)%H;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+25, cy+40); ctx.lineTo(cx+50, cy+15); ctx.stroke();
    }

  } else {
    // Baldosas de baño
    ctx.fillStyle = '#b2ebf2'; ctx.fillRect(0, 0, W, H);
    const T = 80;
    for (let row = 0; row < Math.ceil(H/T); row++) {
      for (let col = 0; col < Math.ceil(W/T); col++) {
        if ((row+col)%2===0) { ctx.fillStyle='rgba(0,188,212,0.09)'; ctx.fillRect(col*T+1,row*T+1,T-2,T-2); }
        ctx.strokeStyle='#80cbc4'; ctx.lineWidth=1.2; ctx.strokeRect(col*T, row*T, T, T);
      }
    }
    // Junta de azulejo más oscura cada 4
    ctx.strokeStyle='rgba(0,131,143,0.35)'; ctx.lineWidth=2.5;
    for (let r=0; r<Math.ceil(H/(T*4)); r++) { ctx.beginPath(); ctx.moveTo(0,r*T*4); ctx.lineTo(W,r*T*4); ctx.stroke(); }
    for (let c=0; c<Math.ceil(W/(T*4)); c++) { ctx.beginPath(); ctx.moveTo(c*T*4,0); ctx.lineTo(c*T*4,H); ctx.stroke(); }
  }
}

/* ── 7B  Objetos de escondite ── */
function renderHidingObject(ctx, obj) {
  const { x, y, w, h, color, type } = obj;
  ctx.save();

  switch (type) {

    case 'bed': {
      ctx.fillStyle='#ede7f6'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle=color; ctx.fillRect(x,y,w,h*0.3);
      // Almohadas
      ctx.fillStyle='#fff';
      ctx.fillRect(x+15,y+h*0.34,w*0.36,h*0.4);
      ctx.fillRect(x+w*0.52,y+h*0.34,w*0.36,h*0.4);
      // Dobladillo sábana
      ctx.fillStyle='#d1c4e9'; ctx.fillRect(x,y+h*0.76,w,h*0.06);
      ctx.strokeStyle=color; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'couch': {
      // Patas
      ctx.fillStyle='#5e35b1';
      [[x+8,y+h],[x+w-18,y+h]].forEach(([lx,ly])=>{ ctx.fillRect(lx,ly-8,10,14); });
      // Cuerpo
      ctx.fillStyle='#7c4dff'; ctx.fillRect(x,y,w,h);
      // Respaldo
      ctx.fillStyle='#5e35b1'; ctx.fillRect(x,y,w,h*0.4);
      // Cojines
      ctx.fillStyle='#b39ddb';
      ctx.fillRect(x+8,y+h*0.44,w*0.29,h*0.5);
      ctx.fillRect(x+w*0.365,y+h*0.44,w*0.28,h*0.5);
      ctx.fillRect(x+w*0.68,y+h*0.44,w*0.28,h*0.5);
      ctx.strokeStyle='#4527a0'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'cabinet': {
      ctx.fillStyle='#4e342e'; ctx.fillRect(x,y,w,h);
      // Puertas
      ctx.fillStyle='#6d4c41';
      ctx.fillRect(x+6,y+8,w/2-10,h*0.86);
      ctx.fillRect(x+w/2+4,y+8,w/2-10,h*0.86);
      // Pomos
      ctx.fillStyle='#ffd600';
      ctx.beginPath(); ctx.arc(x+w/2-10,y+h/2,7,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w/2+10,y+h/2,7,0,Math.PI*2); ctx.fill();
      // Zócalo
      ctx.fillStyle='#3e2723'; ctx.fillRect(x,y+h-14,w,14);
      ctx.strokeStyle='#3e2723'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'trunk': {
      // Raíces
      ctx.strokeStyle='#3e2723'; ctx.lineWidth=4;
      [[-20,h*0.85],[w+10,h*0.7],[-15,h*0.6]].forEach(([rx,ry])=>{
        ctx.beginPath(); ctx.moveTo(x+w/2,y+ry); ctx.quadraticCurveTo(x+w/2+rx*0.5,y+ry+20,x+rx,y+h+10); ctx.stroke();
      });
      // Tronco
      const grad = ctx.createLinearGradient(x,0,x+w,0);
      grad.addColorStop(0,'#4e342e'); grad.addColorStop(0.4,color); grad.addColorStop(1,'#3e2723');
      ctx.fillStyle=grad; ctx.fillRect(x,y,w,h);
      // Anillos
      ctx.strokeStyle='rgba(62,39,35,0.6)'; ctx.lineWidth=2;
      for(let ry=y+35;ry<y+h-20;ry+=45){
        ctx.beginPath(); ctx.moveTo(x+4,ry); ctx.lineTo(x+w-4,ry); ctx.stroke();
      }
      // Copa del árbol
      ctx.fillStyle='#1b5e20';
      ctx.beginPath(); ctx.ellipse(x+w/2,y-50,w*1.1,85,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#2e7d32';
      ctx.beginPath(); ctx.ellipse(x+w/2-15,y-70,w*0.7,60,-.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#1b5e20'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x+w/2,y-50,w*1.1,85,0,0,Math.PI*2); ctx.stroke();
      break;
    }

    case 'bush': {
      ctx.fillStyle='#2e7d32';
      ctx.beginPath(); ctx.ellipse(x+w/2,y+h*0.6,w*0.52,h*0.48,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#388e3c';
      ctx.beginPath(); ctx.ellipse(x+w*0.28,y+h*0.42,w*0.34,h*0.45,-.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+w*0.72,y+h*0.38,w*0.32,h*0.42,.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#43a047';
      ctx.beginPath(); ctx.ellipse(x+w/2,y+h*0.25,w*0.3,h*0.36,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#1b5e20'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x+w/2,y+h*0.6,w*0.52,h*0.48,0,0,Math.PI*2); ctx.stroke();
      break;
    }

    case 'wall': {
      ctx.fillStyle='#8d6e63'; ctx.fillRect(x,y,w,h);
      const BW=65, BH=25;
      for(let row=0; row<Math.ceil(h/BH)+1; row++){
        const off=(row%2)*(BW/2);
        for(let col=-1; col<Math.ceil(w/BW)+1; col++){
          ctx.strokeStyle='#6d4c41'; ctx.lineWidth=1.8;
          ctx.strokeRect(x+col*BW+off, y+row*BH, BW, BH);
        }
      }
      // Musgo en el muro
      ctx.fillStyle='rgba(46,125,50,0.25)';
      for(let i=0;i<8;i++){
        ctx.fillRect(x+(i*89)%w, y+h-10, 22, 10);
      }
      ctx.strokeStyle='#5d4037'; ctx.lineWidth=4; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'column': {
      const grad2 = ctx.createLinearGradient(x,0,x+w,0);
      grad2.addColorStop(0,'#a1887f'); grad2.addColorStop(0.5,color); grad2.addColorStop(1,'#795548');
      ctx.fillStyle=grad2; ctx.fillRect(x,y,w,h);
      // Estrías de columna clásica
      ctx.strokeStyle='rgba(121,85,72,0.5)'; ctx.lineWidth=2;
      for(let lx=x+10; lx<x+w-5; lx+=10){ ctx.beginPath(); ctx.moveTo(lx,y+22); ctx.lineTo(lx,y+h-22); ctx.stroke(); }
      // Capitel y basa
      ctx.fillStyle='#a1887f';
      ctx.fillRect(x-12,y,w+24,22);
      ctx.fillRect(x-12,y+h-22,w+24,22);
      ctx.strokeStyle='#795548'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'well': {
      // Base de piedra
      ctx.fillStyle='#795548';
      ctx.beginPath(); ctx.ellipse(x+w/2,y+h*0.7,w*0.52,h*0.25,0,0,Math.PI*2); ctx.fill();
      // Boca del pozo
      ctx.fillStyle='#6d4c41';
      ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.48,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#4e342e';
      ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.36,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#0288d1';
      ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.26,0,Math.PI*2); ctx.fill();
      // Brocal de piedra
      ctx.strokeStyle='#3e2723'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.48,0,Math.PI*2); ctx.stroke();
      // Travesaño
      ctx.fillStyle='#5d4037'; ctx.fillRect(x+w/2-4,y+5,8,h*0.35);
      ctx.fillRect(x+w/2-w*0.4,y+h*0.1,w*0.8,10);
      break;
    }

    case 'dune': {
      ctx.fillStyle='#c8a165';
      ctx.beginPath();
      ctx.moveTo(x,y+h);
      ctx.quadraticCurveTo(x+w/2,y-25,x+w,y+h);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#d4b483';
      ctx.beginPath();
      ctx.moveTo(x+w*0.12,y+h);
      ctx.quadraticCurveTo(x+w/2,y+8,x+w*0.88,y+h);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(184,140,64,0.5)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x,y+h*0.6); ctx.quadraticCurveTo(x+w/2,y+5,x+w,y+h*0.5); ctx.stroke();
      break;
    }

    case 'tub': {
      // Cuerpo exterior
      ctx.fillStyle='#e0f7fa'; ctx.fillRect(x,y,w,h);
      // Interior con agua
      ctx.fillStyle='#b2ebf2'; ctx.fillRect(x+16,y+22,w-32,h-40);
      ctx.fillStyle='rgba(77,208,225,0.6)'; ctx.fillRect(x+16,y+h-32,w-32,16);
      // Bordes
      ctx.fillStyle=color; ctx.fillRect(x,y,w,20); ctx.fillRect(x,y+h-20,w,20);
      ctx.fillRect(x,y,16,h); ctx.fillRect(x+w-16,y,16,h);
      // Grifo
      ctx.fillStyle='#bdbdbd'; ctx.fillRect(x+w/2-12,y-20,24,24);
      ctx.beginPath(); ctx.arc(x+w/2,y-22,8,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#00838f'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'basket': {
      ctx.fillStyle='#80cbc4'; ctx.fillRect(x,y,w,h);
      // Mimbre tejido
      ctx.strokeStyle='#00838f'; ctx.lineWidth=1.5;
      for(let cx2=x+16;cx2<x+w;cx2+=16){ ctx.beginPath(); ctx.moveTo(cx2,y); ctx.lineTo(cx2,y+h); ctx.stroke(); }
      for(let cy2=y+18;cy2<y+h;cy2+=18){ ctx.beginPath(); ctx.moveTo(x,cy2); ctx.lineTo(x+w,cy2); ctx.stroke(); }
      // Tapa
      ctx.fillStyle='#00838f';
      ctx.fillRect(x-6,y-18,w+12,22);
      ctx.strokeStyle='#006064'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }

    case 'shelf': {
      ctx.fillStyle='#004d40'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#00695c'; ctx.fillRect(x,y+h-14,w,14);
      // Frascos de poción
      const BCS=['#e040fb','#00e5ff','#69f0ae','#ff6e40','#ffea00','#f50057'];
      const BW2=20, BH2=h-18, GAP=28;
      let bx=x+16;
      for(let bi=0;bx+BW2<x+w-10;bi++,bx+=GAP){
        ctx.fillStyle=BCS[bi%BCS.length];
        ctx.fillRect(bx,y+4,BW2,BH2);
        // Brillo
        ctx.fillStyle='rgba(255,255,255,0.38)';
        ctx.fillRect(bx+3,y+7,6,BH2*0.38);
        // Corcho
        ctx.fillStyle='#8d6e63'; ctx.fillRect(bx+4,y+2,BW2-8,5);
        ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1;
        ctx.strokeRect(bx,y+4,BW2,BH2);
      }
      ctx.strokeStyle='#00695c'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
  }

  // Indicador de zona de escondite (pulsa cuando el jugador está dentro)
  const px=GS.player.x, py=GS.player.y;
  if (px>=x && px<=x+w && py>=y && py<=y+h) {
    const pulse = 0.5 + 0.5*Math.sin(Date.now()/190);
    ctx.strokeStyle=`rgba(255,255,80,${pulse})`;
    ctx.lineWidth=4;
    ctx.strokeRect(x-5,y-5,w+10,h+10);
    ctx.fillStyle=`rgba(255,255,80,${pulse*0.9})`;
    ctx.font='bold 13px monospace';
    ctx.textAlign='center';
    ctx.fillText('HIDING!', x+w/2, y-12);
  }

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §8  COUNTDOWN TIMER — 20 segundos, tick via deltaTime
═══════════════════════════════════════════════════════════════════ */
function tickTimer(nowMs) {
  const t = GS.timer;
  if (!t.running || GS.gameResult || GS.explosion.active) return;

  const delta = nowMs - t.lastMs;
  t.lastMs = nowMs;
  t.msAcc += delta;

  const secsLost = Math.floor(t.msAcc / 1000);
  if (secsLost > 0) {
    t.msAcc -= secsLost * 1000;
    t.seconds = Math.max(0, t.seconds - secsLost);
  }

  // Tiempo agotado → explosión de derrota
  if (t.seconds <= 0 && !GS.gameResult) {
    GS.gameResult = 'TIMEOUT';
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    stopIgMusic();
    playLoseJingle();
    spawnExplosion(GS.player.x, GS.player.y);
    spawnExplosion(GS.vet.x, GS.vet.y);
  }
}

/* HUD del timer — dibujado en espacio de pantalla (fuera de ctx.save cámara) */
function renderTimerHUD(ctx, cW) {
  const t = GS.timer;
  const isUrgent = t.seconds <= 5;
  const label = `⏱ ${t.seconds}s`;
  const pulse = isUrgent ? (0.6 + 0.4 * Math.sin(Date.now() / 180)) : 1;

  ctx.save();
  ctx.textAlign = 'center';

  // Caja de fondo
  const boxW = 130, boxH = 38;
  const bx = cW / 2 - boxW / 2, by = 14;
  ctx.fillStyle = isUrgent
    ? `rgba(180,0,0,${0.6 * pulse})`
    : 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = isUrgent ? `rgba(255,50,50,${pulse})` : 'rgba(255,230,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, boxW, boxH);

  // Texto
  ctx.font = `bold ${isUrgent ? 18 : 16}px 'Press Start 2P', monospace`;
  ctx.fillStyle = isUrgent ? `rgba(255,80,80,${pulse})` : '#ffe600';
  if (isUrgent) ctx.shadowColor = '#ff2d00';
  if (isUrgent) ctx.shadowBlur  = 12 * pulse;
  ctx.fillText(label, cW / 2, by + boxH * 0.68);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §9  SISTEMA DE PARTÍCULAS KABOOM — explosión cinemática v12
   Genera 120 fragmentos: píxeles cuadrados + "astillas" de sprite,
   con screen-shake y flash de pantalla.
═══════════════════════════════════════════════════════════════════ */
function spawnExplosion(cx, cy) {
  const base = GS.char ? GS.char.colors.primary : '#fff';
  const palette = [base, '#ff2d78', '#ffe600', '#00f5ff', '#ff6e40', '#69f0ae', '#e040fb', '#fff'];

  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 10;
    GS.particles.push({
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3, // impulso hacia arriba
      size: 3 + Math.random() * 9,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 1.0,
      decay: 0.008 + Math.random() * 0.018,
      rotate: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.35,
      isRect: Math.random() > 0.3   // mezcla de cuadrados y círculos
    });
  }

  GS.explosion.active = true;
  GS.explosion.timer  = 0;
  GS.explosion.shakeFrames = 18;   // fotogramas de screen-shake
}

function updateParticles() {
  for (let i = GS.particles.length - 1; i >= 0; i--) {
    const p = GS.particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.18;    // gravedad
    p.vx *= 0.96;
    p.life -= p.decay;
    p.rotate += p.rotSpeed;
    if (p.life <= 0) GS.particles.splice(i, 1);
  }
  if (GS.explosion.active) {
    GS.explosion.timer++;
    if (GS.explosion.shakeFrames > 0) GS.explosion.shakeFrames--;
    if (GS.explosion.timer >= GS.explosion.duration && GS.particles.length === 0) {
      GS.explosion.active = false;
      showResultOverlay(false);
    }
  }
}

function renderParticles(ctx) {
  GS.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotate);
    ctx.fillStyle = p.color;
    if (p.isRect) {
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §10  TOUCH CONTROLS — joystick virtual
═══════════════════════════════════════════════════════════════════ */
function initTouchControls(canvas) {
  // Limpiar listeners previos para no acumularlos en retry
  canvas.removeEventListener('touchstart', onTouchStart);
  canvas.removeEventListener('touchmove',  onTouchMove);
  canvas.removeEventListener('touchend',   onTouchEnd);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  GS.touch.active = true;
  GS.touch.id     = touch.identifier;
  GS.touch.startX = touch.clientX;
  GS.touch.startY = touch.clientY;
  GS.touch.dx = 0; GS.touch.dy = 0;
}

function onTouchMove(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (touch.identifier !== GS.touch.id) continue;
    const rdx = touch.clientX - GS.touch.startX;
    const rdy = touch.clientY - GS.touch.startY;
    const len = Math.hypot(rdx, rdy) || 1;
    if (len < 8) { GS.touch.dx = 0; GS.touch.dy = 0; return; }
    const cl = Math.min(len, 60);
    GS.touch.dx = (rdx/len)*(cl/60);
    GS.touch.dy = (rdy/len)*(cl/60);
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === GS.touch.id) {
      GS.touch.active = false;
      GS.touch.dx = 0; GS.touch.dy = 0;
    }
  }
}

function renderJoystick(ctx, cW, cH) {
  if (!GS.touch.active && GS.touch.dx === 0 && GS.touch.dy === 0) return;
  const jx=90, jy=cH-90, OR=52, IR=22;
  ctx.save();
  ctx.globalAlpha=0.42;
  ctx.strokeStyle='#fff'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(jx,jy,OR,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.68;
  ctx.fillStyle='#ffe600';
  ctx.beginPath();
  ctx.arc(jx+GS.touch.dx*OR, jy+GS.touch.dy*OR, IR, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §11  VET AI — patrol + chase con cono de visión
═══════════════════════════════════════════════════════════════════ */
const VET_VISION_RANGE = 340;
const VET_VISION_ANGLE = 55;

function updateVetAI() {
  const v=GS.vet, p=GS.player;
  const dist=Math.hypot(p.x-v.x, p.y-v.y);
  const toPlayer=Math.atan2(p.y-v.y, p.x-v.x)*180/Math.PI;
  let diff=toPlayer-v.angle*180/Math.PI;
  while(diff>180)diff-=360; while(diff<-180)diff+=360;
  const canSee=!p.isHidden && dist<VET_VISION_RANGE && Math.abs(diff)<VET_VISION_ANGLE;

  if (canSee) { v.mode='chase'; v.lostTimer=0; }
  else if (v.mode==='chase') {
    v.lostTimer++;
    if (v.lostTimer>80){ v.mode='patrol'; v.patrolTarget=rndPatrol(); }
  }

  if (v.mode==='chase') {
    v.angle=Math.atan2(p.y-v.y, p.x-v.x);
    v.x+=Math.cos(v.angle)*v.speed;
    v.y+=Math.sin(v.angle)*v.speed;
  } else {
    v.patrolTimer--;
    if (!v.patrolTarget||v.patrolTimer<=0){ v.patrolTarget=rndPatrol(); v.patrolTimer=110+Math.random()*70; }
    const ta=Math.atan2(v.patrolTarget.y-v.y, v.patrolTarget.x-v.x);
    v.angle=ta;
    v.x+=Math.cos(ta)*v.speed*0.55;
    v.y+=Math.sin(ta)*v.speed*0.55;
  }
  v.x=Math.max(40,Math.min(GS.map.width-40,v.x));
  v.y=Math.max(40,Math.min(GS.map.height-40,v.y));
}
function rndPatrol(){ return { x:100+Math.random()*(GS.map.width-200), y:100+Math.random()*(GS.map.height-200) }; }

/* ═══════════════════════════════════════════════════════════════════
   §12  CORE GAMEPLAY — updateGame + renderGame + gameLoop
═══════════════════════════════════════════════════════════════════ */
function startGameplay() {
  setupGameMap();
  const hudName=document.getElementById('hudCharName');
  if (hudName){ hudName.textContent=GS.char.name; hudName.style.color=GS.char.colors.primary; }
  GS.keys={};
  window.removeEventListener('keydown',onKeyDown);
  window.removeEventListener('keyup',  onKeyUp);
  window.addEventListener('keydown',   onKeyDown);
  window.addEventListener('keyup',     onKeyUp);
  const canvas=document.getElementById('gameCanvas');
  if (canvas){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; initTouchControls(canvas); }
  startInGameMusic();
  if (GS.gameLoopId) cancelAnimationFrame(GS.gameLoopId);
  GS.gameLoopId=requestAnimationFrame(gameLoop);
}

function onKeyDown(e){
  GS.keys[e.key.toLowerCase()]=true;
  if (e.key==='Escape') togglePause();
}
function onKeyUp(e){ GS.keys[e.key.toLowerCase()]=false; }

window.addEventListener('click',      ensureAudio);
window.addEventListener('touchstart', ensureAudio, { once:true });

function togglePause(){
  GS.isPaused=!GS.isPaused;
  const btn=document.getElementById('btnPause');
  if(btn) btn.textContent=GS.isPaused?'▶ RESUME':'⏸ PAUSE';
}

function updateGame(nowMs) {
  if (GS.isPaused) return;
  if (GS.explosion.active){ updateParticles(); return; }
  if (GS.gameResult) return;

  // Arrancar timer en el primer frame de juego real
  if (!GS.timer.running){ GS.timer.running=true; GS.timer.lastMs=nowMs; }
  tickTimer(nowMs);
  if (GS.gameResult) return; // TIMEOUT puede setear gameResult en tickTimer

  const p=GS.player;
  const speed=GS.char.speed*(GS.keys['shift']?GS.char.sprintMul:1);

  let dx=0,dy=0;
  if(GS.keys['w']||GS.keys['arrowup'])    dy=-1;
  if(GS.keys['s']||GS.keys['arrowdown'])  dy= 1;
  if(GS.keys['a']||GS.keys['arrowleft'])  dx=-1;
  if(GS.keys['d']||GS.keys['arrowright']) dx= 1;
  if(GS.touch.active){ dx+=GS.touch.dx; dy+=GS.touch.dy; }
  const mv=Math.hypot(dx,dy);
  if(mv>1){dx/=mv;dy/=mv;}
  p.x+=dx*speed; p.y+=dy*speed;
  p.x=Math.max(40,Math.min(GS.map.width-40,p.x));
  p.y=Math.max(40,Math.min(GS.map.height-40,p.y));

  // Escondite AABB — automático al entrar (sin tecla E en móvil)
  let inSpot=false;
  GS.hidingObjects.forEach(obj=>{
    if(p.x>=obj.x&&p.x<=obj.x+obj.w&&p.y>=obj.y&&p.y<=obj.y+obj.h) inSpot=true;
  });
  // En desktop: E requerida para esconderse; en touch: automático
  GS.player.isHidden = inSpot && (GS.touch.active || GS.keys['e']);

  const dist=Math.hypot(p.x-GS.vet.x, p.y-GS.vet.y);
  GS.proximity=Math.max(0,Math.min(1,1-dist/700));
  updateVetAI();

  // WIN
  if(Math.hypot(p.x-GS.goal.x,p.y-GS.goal.y)<GS.goal.radius+10){
    GS.gameResult='WIN';
    GS.timer.running=false;
    window.removeEventListener('keydown',onKeyDown);
    window.removeEventListener('keyup',  onKeyUp);
    stopIgMusic(); playWinJingle();
    setTimeout(()=>showResultOverlay(true),300);
  }

  // LOSE por captura
  if(dist<45&&!GS.player.isHidden&&!GS.gameResult){
    GS.gameResult='LOSE';
    GS.timer.running=false;
    window.removeEventListener('keydown',onKeyDown);
    window.removeEventListener('keyup',  onKeyUp);
    stopIgMusic(); playLoseJingle();
    spawnExplosion(p.x,p.y);
    spawnExplosion(GS.vet.x,GS.vet.y);
  }
}

function renderGame() {
  const canvas=document.getElementById('gameCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  if(canvas.width!==window.innerWidth)  canvas.width=window.innerWidth;
  if(canvas.height!==window.innerHeight)canvas.height=window.innerHeight;
  const cW=canvas.width, cH=canvas.height;

  // Screen-shake durante la explosión
  let shakeX=0, shakeY=0;
  if(GS.explosion.shakeFrames>0){
    const mag=GS.explosion.shakeFrames*0.8;
    shakeX=(Math.random()-0.5)*mag;
    shakeY=(Math.random()-0.5)*mag;
  }

  ctx.fillStyle='#0a0d1a'; ctx.fillRect(0,0,cW,cH);

  // Flash de pantalla en los primeros frames de la explosión
  if(GS.explosion.active&&GS.explosion.timer<8){
    const fAlpha=(8-GS.explosion.timer)/8*0.55;
    ctx.fillStyle=`rgba(255,255,255,${fAlpha})`;
    ctx.fillRect(0,0,cW,cH);
  }

  // Cámara
  ctx.save();
  ctx.translate(cW/2-GS.player.x+shakeX, cH/2-GS.player.y+shakeY);

  renderBackground(ctx);

  ctx.strokeStyle=GS.char.colors.primary; ctx.lineWidth=5;
  ctx.strokeRect(0,0,GS.map.width,GS.map.height);

  GS.hidingObjects.forEach(obj=>renderHidingObject(ctx,obj));

  // META con animación de pulso
  const pulse2=0.6+0.4*Math.sin(Date.now()/300);
  const g2=ctx.createRadialGradient(GS.goal.x,GS.goal.y,5,GS.goal.x,GS.goal.y,GS.goal.radius);
  g2.addColorStop(0,`rgba(255,255,0,${pulse2})`);
  g2.addColorStop(1,'rgba(255,200,0,0.2)');
  ctx.fillStyle=g2;
  ctx.beginPath(); ctx.arc(GS.goal.x,GS.goal.y,GS.goal.radius,0,Math.PI*2); ctx.fill();
  // Aro exterior pulsante
  ctx.strokeStyle=`rgba(255,230,0,${pulse2*0.8})`; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(GS.goal.x,GS.goal.y,GS.goal.radius+8+pulse2*5,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#000'; ctx.font='bold 13px monospace'; ctx.textAlign='center';
  ctx.fillText('EXIT!',GS.goal.x,GS.goal.y+5);

  // Cono de visión
  if(!GS.player.isHidden){
    ctx.save();
    ctx.translate(GS.vet.x,GS.vet.y); ctx.rotate(GS.vet.angle);
    ctx.fillStyle=`rgba(255,45,120,${GS.vet.mode==='chase'?0.22:0.07})`;
    ctx.beginPath(); ctx.moveTo(0,0);
    const hA=VET_VISION_ANGLE*Math.PI/180;
    ctx.arc(0,0,VET_VISION_RANGE,-hA,hA);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Jugador
  if(!GS.explosion.active||GS.gameResult!=='LOSE'){
    ctx.save(); ctx.translate(GS.player.x,GS.player.y);
    if(GS.player.isHidden) ctx.globalAlpha=0.3;
    const pImg=GS.images[GS.char.id];
    if(pImg&&pImg.complete&&pImg.naturalWidth!==0){ ctx.drawImage(pImg,-30,-30,60,60); }
    else { ctx.fillStyle=GS.char.colors.primary; ctx.fillRect(-25,-25,50,50); }
    ctx.restore();
  }

  // Vet
  if(!GS.explosion.active||GS.gameResult!=='LOSE'){
    ctx.save(); ctx.translate(GS.vet.x,GS.vet.y);
    const vImg=GS.images['vet'];
    if(vImg&&vImg.complete&&vImg.naturalWidth!==0){ ctx.drawImage(vImg,-30,-40,60,80); }
    else { ctx.fillStyle='#ff2d78'; ctx.fillRect(-25,-25,50,50); }
    ctx.restore();
  }

  if(GS.particles.length>0) renderParticles(ctx);
  ctx.restore(); // fin cámara

  // Joystick (pantalla)
  renderJoystick(ctx,cW,cH);

  // Alerta de persecución
  if(GS.vet.mode==='chase'&&!GS.player.isHidden&&!GS.gameResult){
    ctx.save();
    const fA=0.5+0.5*Math.sin(Date.now()/110);
    ctx.fillStyle=`rgba(255,45,120,${fA*0.07})`; ctx.fillRect(0,0,cW,cH);
    ctx.fillStyle=`rgba(255,45,120,${fA})`;
    ctx.font=`bold ${Math.max(13,cW*0.024)}px 'Press Start 2P',monospace`;
    ctx.textAlign='center';
    ctx.fillText('⚠ SHE SEES YOU ⚠',cW/2,cH*0.07);
    ctx.restore();
  }

  // Timer HUD (siempre visible en pantalla)
  renderTimerHUD(ctx, cW);

  // HUD DOM
  document.getElementById('hudProxFill').style.width=(GS.proximity*100)+'%';
  document.getElementById('hudStatus').textContent=
    GS.player.isHidden?'🙈 HIDING!':GS.vet.mode==='chase'?'⚠ RUN!':'EVADING...';
}

function gameLoop(nowMs) {
  updateGame(nowMs);
  renderGame();
  if(GS.screen==='game') GS.gameLoopId=requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   §13  OVERLAY DE RESULTADO — sin alert()
═══════════════════════════════════════════════════════════════════ */
function showResultOverlay(won) {
  const old=document.getElementById('resultOverlay');
  if(old) old.remove();

  const c=GS.char;
  const isTimeout=GS.gameResult==='TIMEOUT';
  const color=won?(c?.colors.primary||'#00f5ff'):'#ff2d78';
  const emoji=won?'🎉':'😿';
  const title=won?'YOU ESCAPED!':(isTimeout?'TIME IS UP!':'THE VET GOT YOU!');
  const timeSaved=won?GS.timer.seconds:0;
  const sub=won
    ?`${c?.name} earned ${c?.reward}! (${timeSaved}s left)`
    :`${c?.name||'Your pet'} ${isTimeout?'ran out of time':'was caught'}!`;

  const ov=document.createElement('div');
  ov.id='resultOverlay';
  Object.assign(ov.style,{
    position:'fixed',inset:'0',zIndex:'9999',
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    background:'rgba(4,6,14,0.93)',
    fontFamily:"'Press Start 2P',monospace",
    textAlign:'center',padding:'2rem',boxSizing:'border-box'
  });

  const mk=(tag,styles,text)=>{ const el=document.createElement(tag); Object.assign(el.style,styles); if(text)el.textContent=text; return el; };
  const mkBtn=(label,accent,cb)=>{
    const btn=mk('button',{
      fontFamily:"'Press Start 2P',monospace",fontSize:'clamp(0.4rem,1.3vw,0.65rem)',
      cursor:'pointer',padding:'0.8em 1.8em',border:`3px solid ${accent}`,background:'transparent',
      color:accent,letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 8px'
    },label);
    btn.addEventListener('mouseover',()=>{ btn.style.background=`${accent}22`; });
    btn.addEventListener('mouseout', ()=>{ btn.style.background='transparent'; });
    btn.addEventListener('click',cb);
    return btn;
  };

  ov.appendChild(mk('div',{fontSize:'clamp(2.5rem,8vw,5rem)',marginBottom:'1rem'},emoji));
  ov.appendChild(mk('div',{
    fontSize:'clamp(0.9rem,3vw,2rem)',color,marginBottom:'0.8rem',
    textShadow:`0 0 14px ${color},3px 3px 0 rgba(0,0,0,0.8)`,letterSpacing:'0.12em'
  },title));
  ov.appendChild(mk('div',{
    fontSize:'clamp(0.35rem,1.2vw,0.75rem)',color:'#e0e0cc',
    lineHeight:'2',marginBottom:'2rem',letterSpacing:'0.06em'
  },sub));

  const row=mk('div',{display:'flex',justifyContent:'center',flexWrap:'wrap'});
  row.appendChild(mkBtn('↩ RETRY',color,()=>{ ov.remove(); ensureAudio(); changeScreen('game'); }));
  row.appendChild(mkBtn('⌂ MENU','#6a7a9a',()=>{ ov.remove(); changeScreen('mainmenu'); }));
  ov.appendChild(row);

  const gs=document.getElementById('screen-game');
  if(gs){ gs.style.position='relative'; gs.appendChild(ov); }
  else   document.body.appendChild(ov);
}

/* ═══════════════════════════════════════════════════════════════════
   §14  BOTONES
═══════════════════════════════════════════════════════════════════ */
function bindButtons() {
  const $=id=>document.getElementById(id);
  $('btnStartGame') ?.addEventListener('click',()=>{ ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')     ?.addEventListener('click',()=>{ ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack') ?.addEventListener('click',()=> changeScreen('mainmenu'));
  $('btnCSBack')    ?.addEventListener('click',()=> changeScreen('mainmenu'));
  $('btnConfirmYes')?.addEventListener('click',()=> changeScreen('game'));
  $('btnConfirmNo') ?.addEventListener('click',()=> changeScreen('charselect'));
  $('btnPause')     ?.addEventListener('click',()=> togglePause());
}

/* ═══════════════════════════════════════════════════════════════════
   §15  INIT
═══════════════════════════════════════════════════════════════════ */
async function init() {
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  await preloadImages();
  window.addEventListener('resize',()=>{
    const c=document.getElementById('gameCanvas');
    if(c&&GS.screen==='game'){ c.width=window.innerWidth; c.height=window.innerHeight; }
  });
  setTimeout(()=>changeScreen('mainmenu'),100);
}
window.addEventListener('DOMContentLoaded',init);
