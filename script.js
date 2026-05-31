/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v11)
 *
 * MEJORAS vs v10:
 *  ✅  §3  BGM en mainmenu + track energético al iniciar partida
 *  ✅  §4  changeScreen arranca BGM también en 'mainmenu'
 *  ✅  §5  startGameplay: remove listeners antes de añadir (no acumulación)
 *  ✅  §5  onKeyDown: 'Escape' con mayúscula correcta
 *  ✅  §6  setupGameMap: objetos rect con { x,y,w,h } (no radius)
 *  ✅  §6  isHidden: colisión AABB con rectángulos de muebles
 *  ✅  §7  renderBackground: fondos temáticos + muebles/naturaleza por personaje
 *  ✅  §8  Vet AI: modo patrol / chase real con cono de visión
 *  ✅  §9  Explosion particles en derrota — sin alert(), overlay limpio
 *  ✅  §10 Touch controls: joystick virtual en canvas (móvil)
 *  ✅  §11 endGame: overlay HTML en lugar de alert()
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
   §2  ESTADO GLOBAL  (sin tocar estructura base — regla de preservación)
   Se añaden: particles, vetPatrol, touch, explosion
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen: 'loading',
  char: null,
  images: {},
  audioCtx: null,
  bgmNode: null,
  igMusicNodes: [],   // nodos del track in-game (para poder detenerlos)
  isPaused: false,
  gameLoopId: null,
  keys: {},
  player: { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: {
    x: 900, y: 700, angle: 0, speed: 2.4,
    mode: 'patrol',           // 'patrol' | 'chase'
    patrolTarget: { x: 800, y: 600 },
    patrolTimer: 0,
    lostTimer: 0
  },
  map: { width: 1600, height: 1200 },
  hidingObjects: [],          // array de { x,y,w,h,label }
  goal: { x: 1450, y: 1050, radius: 45 },
  gameResult: null,
  proximity: 0,
  // Nuevos: partículas de explosión
  particles: [],
  explosion: { active: false, timer: 0, duration: 90 },
  // Touch joystick
  touch: {
    active: false,
    startX: 0, startY: 0,
    dx: 0, dy: 0,
    id: null
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
  let loadedCount = 0;
  const promises = keys.map(key => new Promise(resolve => {
    const img = new Image();
    img.src = IMAGE_ASSETS[key];
    const done = () => { GS.images[key] = img; loadedCount++; setLoadBar((loadedCount / total) * 100); resolve(); };
    img.onload = done;
    img.onerror = done;
  }));
  const timeout = new Promise(r => setTimeout(r, 2500));
  await Promise.race([Promise.all(promises), timeout]);
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

/* ── 3A  Menú principal: arpeggio pentatónico suave ── */
function startMenuBGM() {
  ensureAudio();
  stopBGM();
  stopIgMusic();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.08, ctx.currentTime);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    // Melodía pentatónica de 4 notas que se repite (~3 octavos por minuto)
    const notes = [196.00, 220.00, 261.63, 293.66, 329.63, 293.66, 261.63, 220.00];
    const dur = 0.45;
    const now = ctx.currentTime;
    for (let i = 0; i < 64; i++) {
      const t = now + i * dur;
      osc.frequency.setValueAtTime(notes[i % notes.length], t);
    }

    osc.connect(master);
    osc.start(now);
    GS.bgmNode = osc;
  } catch(e) {}
}

/* ── 3B  In-game: track árabe energético con ritmo percusivo ── */
function startInGameMusic() {
  ensureAudio();
  stopBGM();
  stopIgMusic();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.09, ctx.currentTime);
    master.connect(ctx.destination);
    GS.igMusicNodes.push(master);

    // Melodía Maqam Hijaz (D Eb F# G A Bb C# D) — sawtooth para timbre de oud
    const HIJAZ = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
    const motif  = [0,2,3,2,1,0,4,3,2,3,5,4,3,2,1,0,6,5,4,3,2,1,0,7];
    const durs   = [.18,.11,.15,.11,.18,.22,.15,.11,.18,.15,.22,.15,.11,.18,.11,.22,.15,.11,.18,.15,.11,.15,.18,.28];

    const mel = ctx.createOscillator();
    mel.type = 'sawtooth';
    let t = ctx.currentTime;
    motif.forEach((si, i) => {
      mel.frequency.setValueAtTime(HIJAZ[si], t);
      t += (durs[i] || 0.15);
    });
    // Repetir el motif varias veces (24 repeticiones ≈ 3–4 min)
    for (let rep = 1; rep < 24; rep++) {
      let tr = ctx.currentTime;
      motif.forEach((si, i) => {
        mel.frequency.setValueAtTime(HIJAZ[si], tr + rep * t + i * 0.15);
      });
    }
    const melGain = ctx.createGain();
    melGain.gain.setValueAtTime(0.4, ctx.currentTime);
    mel.connect(melGain); melGain.connect(master);
    mel.start();
    GS.igMusicNodes.push(mel, melGain);

    // Kick Doumbek: seno 180 → 55 Hz cada ~0.42 s
    const bpm = 0.42;
    for (let i = 0; i < 200; i++) {
      const kt = ctx.currentTime + i * bpm;
      const ko = ctx.createOscillator(), kg = ctx.createGain();
      ko.type = 'sine';
      ko.frequency.setValueAtTime(180, kt);
      ko.frequency.exponentialRampToValueAtTime(55, kt + 0.08);
      kg.gain.setValueAtTime(0.38, kt);
      kg.gain.exponentialRampToValueAtTime(0.001, kt + 0.12);
      ko.connect(kg); kg.connect(master);
      ko.start(kt); ko.stop(kt + 0.14);
      GS.igMusicNodes.push(ko, kg);

      // Riq off-beat (cada 2 kicks)
      if (i % 2 === 1) {
        const ro = ctx.createOscillator(), rg = ctx.createGain();
        ro.type = 'triangle';
        ro.frequency.setValueAtTime(620, kt);
        rg.gain.setValueAtTime(0.10, kt);
        rg.gain.exponentialRampToValueAtTime(0.001, kt + 0.04);
        ro.connect(rg); rg.connect(master);
        ro.start(kt); ro.stop(kt + 0.05);
        GS.igMusicNodes.push(ro, rg);
      }
    }
  } catch(e) {}
}

/* ── 3C  SFX selección personaje ── */
function playSynthSFX(type) {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    if (type === 'bark') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
    }
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/* ── 3D  Jingle WIN ── */
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

/* ── 3E  Jingle LOSE ── */
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

  // ── FIX: BGM en mainmenu también ──
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
   §5  SELECTION MECHANICS
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
  document.getElementById('confirmObj').textContent = `LOCATION: ${data.mapName}\n• OBJECTIVE: ${data.mission}`;
  changeScreen('confirm');
}

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card => {
    const charId = card.getAttribute('data-char');
    card.addEventListener('click', () => { ensureAudio(); selectCharacter(charId); });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §6  GAME MAP SETUP — objetos rect temáticos por personaje
   Cada objeto: { x, y, w, h, label, color, type }
   La colisión AABB reemplaza el viejo Math.hypot con radius.
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
  GS.explosion = { active: false, timer: 0, duration: 90 };

  const id = GS.char ? GS.char.id : 'molly';

  if (id === 'molly') {
    // THE HOUSE: cama, sofá, armario
    GS.hidingObjects = [
      { x: 200, y: 180, w: 260, h: 130, label: 'CAMA',    color: '#8a5cf6', type: 'bed'     },
      { x: 700, y: 420, w: 300, h: 110, label: 'SOFÁ',    color: '#7c4dff', type: 'couch'   },
      { x: 1100, y: 200, w: 140, h: 200, label: 'ARMARIO', color: '#5e35b1', type: 'cabinet' },
      { x: 400, y: 700, w: 200, h: 120, label: 'CAMA 2',  color: '#8a5cf6', type: 'bed'     },
      { x: 900, y: 850, w: 260, h: 110, label: 'SOFÁ 2',  color: '#7c4dff', type: 'couch'   },
      { x: 200, y: 900, w: 140, h: 180, label: 'CAJÓN',   color: '#5e35b1', type: 'cabinet' },
    ];
  } else if (id === 'agata') {
    // THE FOREST: troncos y arbustos
    GS.hidingObjects = [
      { x: 280, y: 200, w: 90,  h: 260, label: 'TRONCO',   color: '#5d4037', type: 'trunk' },
      { x: 620, y: 380, w: 220, h: 100, label: 'ARBUSTO',  color: '#2e7d32', type: 'bush'  },
      { x: 980, y: 200, w: 100, h: 280, label: 'TRONCO',   color: '#5d4037', type: 'trunk' },
      { x: 400, y: 700, w: 240, h: 110, label: 'ARBUSTO',  color: '#388e3c', type: 'bush'  },
      { x: 1150, y: 600, w: 85, h: 260, label: 'TRONCO',   color: '#4e342e', type: 'trunk' },
      { x: 700, y: 850, w: 200, h: 100, label: 'ARBUSTO',  color: '#2e7d32', type: 'bush'  },
    ];
  } else if (id === 'martin') {
    // THE DESERT: ruinas, columnas, pozo
    GS.hidingObjects = [
      { x: 250, y: 200, w: 300, h: 80,  label: 'MURO',     color: '#795548', type: 'wall'   },
      { x: 750, y: 320, w: 70,  h: 220, label: 'COLUMNA',  color: '#8d6e63', type: 'column' },
      { x: 950, y: 180, w: 70,  h: 220, label: 'COLUMNA',  color: '#8d6e63', type: 'column' },
      { x: 1200, y: 400, w: 130, h: 130, label: 'POZO',    color: '#6d4c41', type: 'well'   },
      { x: 350, y: 700, w: 280, h: 80,  label: 'MURO 2',   color: '#795548', type: 'wall'   },
      { x: 800, y: 850, w: 160, h: 80,  label: 'DUNA',     color: '#c8a165', type: 'dune'   },
    ];
  } else {
    // THE BATHROOM: bañera, cesto, estante
    GS.hidingObjects = [
      { x: 180, y: 180, w: 320, h: 130, label: 'BAÑERA',   color: '#0288d1', type: 'tub'    },
      { x: 700, y: 350, w: 130, h: 170, label: 'CESTO',    color: '#00838f', type: 'basket' },
      { x: 1050, y: 180, w: 260, h: 80, label: 'ESTANTE',  color: '#006064', type: 'shelf'  },
      { x: 350, y: 720, w: 300, h: 120, label: 'BAÑERA 2', color: '#0288d1', type: 'tub'    },
      { x: 900, y: 800, w: 130, h: 170, label: 'CESTO 2',  color: '#00838f', type: 'basket' },
      { x: 1150, y: 600, w: 260, h: 80, label: 'ESTANTE',  color: '#006064', type: 'shelf'  },
    ];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §7  FONDO TEMÁTICO + DIBUJO DE MUEBLES/NATURALEZA EN CANVAS
═══════════════════════════════════════════════════════════════════ */

/* ── 7A  Fondo y decoración estática por nivel ── */
function renderBackground(ctx) {
  const id = GS.char ? GS.char.id : 'molly';
  const W = GS.map.width, H = GS.map.height;

  if (id === 'molly') {
    // Suelo de madera
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, W, H);
    // Tablas del suelo
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    // Alfombra central
    ctx.fillStyle = '#4a148c';
    ctx.fillRect(300, 350, 700, 400);
    ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 6;
    ctx.strokeRect(320, 370, 660, 360);

  } else if (id === 'agata') {
    // Suelo de bosque
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(0, 0, W, H);
    // Manchas de hierba oscura
    ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 347) % W, gy = (i * 229) % H;
      ctx.fillRect(gx, gy, 60 + (i % 5) * 20, 40 + (i % 4) * 15);
    }

  } else if (id === 'martin') {
    // Arena del desierto
    ctx.fillStyle = '#e6b87a';
    ctx.fillRect(0, 0, W, H);
    // Manchas de arena más oscura
    ctx.fillStyle = '#d4a05a';
    for (let i = 0; i < 30; i++) {
      const gx = (i * 413) % W, gy = (i * 317) % H;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 80 + (i % 4)*30, 30 + (i%3)*12, 0, 0, Math.PI*2);
      ctx.fill();
    }
    // Grietas
    ctx.strokeStyle = '#bf9040'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const cx = (i * 521) % W, cy = (i * 389) % H;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 30, cy + 50); ctx.stroke();
    }

  } else {
    // Baldosas de baño
    ctx.fillStyle = '#b2ebf2';
    ctx.fillRect(0, 0, W, H);
    const TILE = 80;
    for (let row = 0; row < Math.ceil(H/TILE); row++) {
      for (let col = 0; col < Math.ceil(W/TILE); col++) {
        ctx.strokeStyle = '#80cbc4'; ctx.lineWidth = 1.5;
        ctx.strokeRect(col*TILE, row*TILE, TILE, TILE);
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = 'rgba(0,188,212,0.08)';
          ctx.fillRect(col*TILE+1, row*TILE+1, TILE-2, TILE-2);
        }
      }
    }
  }
}

/* ── 7B  Dibujar objetos de escondite con aspecto visual temático ── */
function renderHidingObject(ctx, obj) {
  const { x, y, w, h, color, type } = obj;

  ctx.save();

  if (type === 'bed') {
    // Sábana
    ctx.fillStyle = '#ede7f6'; ctx.fillRect(x, y, w, h);
    // Cabecero
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h * 0.28);
    // Almohadas
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 20, y + h*0.32, w*0.38, h*0.38);
    ctx.fillRect(x + w*0.55, y + h*0.32, w*0.38, h*0.38);
    // Borde
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

  } else if (type === 'couch') {
    // Cuerpo sofá
    ctx.fillStyle = '#7c4dff'; ctx.fillRect(x, y, w, h);
    // Respaldo
    ctx.fillStyle = '#5e35b1'; ctx.fillRect(x, y, w, h * 0.4);
    // Cojines
    ctx.fillStyle = '#b39ddb';
    ctx.fillRect(x + 10, y + h*0.42, w*0.3, h*0.5);
    ctx.fillRect(x + w*0.36, y + h*0.42, w*0.3, h*0.5);
    ctx.fillRect(x + w*0.68, y + h*0.42, w*0.28, h*0.5);
    ctx.strokeStyle = '#4527a0'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

  } else if (type === 'cabinet') {
    // Marco
    ctx.fillStyle = '#4e342e'; ctx.fillRect(x, y, w, h);
    // Puertas
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(x+6, y+6, w/2-9, h*0.88);
    ctx.fillRect(x+w/2+3, y+6, w/2-9, h*0.88);
    // Pomos
    ctx.fillStyle = '#ffcc02';
    ctx.beginPath(); ctx.arc(x+w/2-8, y+h/2, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+8, y+h/2, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

  } else if (type === 'trunk') {
    // Tronco de árbol
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x, y, w, h);
    // Anillos de madera
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2;
    for (let ry = y + 30; ry < y + h - 20; ry += 40) {
      ctx.beginPath(); ctx.moveTo(x+4, ry); ctx.lineTo(x+w-4, ry); ctx.stroke();
    }
    // Copa
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y - 40, w * 0.9, 80, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 3; ctx.stroke();

  } else if (type === 'bush') {
    // Arbusto
    ctx.fillStyle = '#388e3c';
    ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(x + w*0.3, y + h*0.35, w*0.32, h*0.42, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w*0.72, y + h*0.38, w*0.3, h*0.38, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2); ctx.stroke();

  } else if (type === 'wall') {
    // Muro de ruinas
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x, y, w, h);
    // Ladrillos
    const brickW = 70, brickH = 28;
    for (let row = 0; row < Math.ceil(h / brickH) + 1; row++) {
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < Math.ceil(w / brickW) + 1; col++) {
        const bx = x + col * brickW + offset;
        const by = y + row * brickH;
        ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, brickW, brickH);
      }
    }
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);

  } else if (type === 'column') {
    // Columna romana
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    // Franjas
    ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 3;
    for (let cy = y + 30; cy < y + h - 20; cy += 50) {
      ctx.beginPath(); ctx.moveTo(x+3, cy); ctx.lineTo(x+w-3, cy); ctx.stroke();
    }
    // Capitel
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(x - 10, y, w + 20, 22);
    ctx.fillRect(x - 10, y + h - 22, w + 20, 22);
    ctx.strokeStyle = '#795548'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

  } else if (type === 'well') {
    // Pozo circular
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath(); ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4e342e';
    ctx.beginPath(); ctx.arc(x + w/2, y + h/2, w*0.35, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0288d1';
    ctx.beginPath(); ctx.arc(x + w/2, y + h/2, w*0.25, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI*2); ctx.stroke();

  } else if (type === 'dune') {
    // Duna de arena
    ctx.fillStyle = '#c8a165';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w/2, y - 20, x + w, y + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d4b483';
    ctx.beginPath();
    ctx.moveTo(x + w*0.15, y + h);
    ctx.quadraticCurveTo(x + w/2, y + 10, x + w*0.85, y + h);
    ctx.closePath(); ctx.fill();

  } else if (type === 'tub') {
    // Bañera
    ctx.fillStyle = '#e0f7fa'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#b2ebf2'; ctx.fillRect(x + 15, y + 20, w - 30, h - 35);
    ctx.fillStyle = '#4dd0e1';
    ctx.fillRect(x + 15, y + h - 30, w - 30, 15); // agua
    ctx.fillStyle = color; ctx.fillRect(x, y, w, 18);  // borde
    ctx.fillRect(x, y + h - 18, w, 18);
    ctx.strokeStyle = '#00838f'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    // Grifo
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(x + w/2 - 10, y - 18, 20, 22);

  } else if (type === 'basket') {
    // Cesto de ropa
    ctx.fillStyle = '#80cbc4'; ctx.fillRect(x, y, w, h);
    // Rejilla
    ctx.strokeStyle = '#00838f'; ctx.lineWidth = 2;
    for (let cx2 = x + 16; cx2 < x + w; cx2 += 16) {
      ctx.beginPath(); ctx.moveTo(cx2, y); ctx.lineTo(cx2, y + h); ctx.stroke();
    }
    for (let cy2 = y + 20; cy2 < y + h; cy2 += 20) {
      ctx.beginPath(); ctx.moveTo(x, cy2); ctx.lineTo(x + w, cy2); ctx.stroke();
    }
    // Tapa
    ctx.fillStyle = '#00838f';
    ctx.fillRect(x - 5, y - 15, w + 10, 20);
    ctx.strokeStyle = '#006064'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

  } else if (type === 'shelf') {
    // Estante
    ctx.fillStyle = '#004d40'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#00695c'; ctx.fillRect(x, y + h - 12, w, 12);
    // Frascos
    const bottleColors = ['#e040fb','#00e5ff','#69f0ae','#ff6e40'];
    const bw = 22, bh = h - 16, bGap = 32;
    for (let bi = 0; bi < 5; bi++) {
      const bx = x + 20 + bi * bGap;
      if (bx + bw > x + w - 10) break;
      ctx.fillStyle = bottleColors[bi % 4];
      ctx.fillRect(bx, y + 4, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx + 4, y + 8, 6, bh * 0.4);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, y + 4, bw, bh);
    }
    ctx.strokeStyle = '#00695c'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  }

  // Indicador "HIDE" cuando el jugador está dentro
  const px = GS.player.x, py = GS.player.y;
  const inside = px >= x && px <= x+w && py >= y && py <= y+h;
  if (inside) {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
    ctx.strokeStyle = `rgba(255,255,100,${pulse})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = `rgba(255,255,100,${pulse * 0.9})`;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ E ] HIDE', x + w/2, y - 10);
  }
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §8  VET AI — patrol + chase con cono de visión
═══════════════════════════════════════════════════════════════════ */
const VET_VISION_RANGE = 340;
const VET_VISION_ANGLE = 55;  // grados, medio-cono

function updateVetAI() {
  const v = GS.vet, p = GS.player;
  const dist = Math.hypot(p.x - v.x, p.y - v.y);

  // Cono de visión
  const toPlayer = Math.atan2(p.y - v.y, p.x - v.x) * 180 / Math.PI;
  let diff = toPlayer - v.angle * 180 / Math.PI;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  const canSee = !p.isHidden && dist < VET_VISION_RANGE && Math.abs(diff) < VET_VISION_ANGLE;

  if (canSee) {
    v.mode = 'chase';
    v.lostTimer = 0;
  } else if (v.mode === 'chase') {
    v.lostTimer++;
    if (v.lostTimer > 80) { v.mode = 'patrol'; v.patrolTarget = randomPatrolPoint(); }
  }

  if (v.mode === 'chase') {
    v.angle = Math.atan2(p.y - v.y, p.x - v.x);
    v.x += Math.cos(v.angle) * v.speed;
    v.y += Math.sin(v.angle) * v.speed;
  } else {
    // Patrulla
    v.patrolTimer--;
    if (!v.patrolTarget || v.patrolTimer <= 0) {
      v.patrolTarget = randomPatrolPoint();
      v.patrolTimer = 100 + Math.random() * 80;
    }
    const ta = Math.atan2(v.patrolTarget.y - v.y, v.patrolTarget.x - v.x);
    v.angle = ta;
    v.x += Math.cos(ta) * v.speed * 0.55;
    v.y += Math.sin(ta) * v.speed * 0.55;
  }

  // Limites del mapa
  v.x = Math.max(40, Math.min(GS.map.width - 40, v.x));
  v.y = Math.max(40, Math.min(GS.map.height - 40, v.y));
}

function randomPatrolPoint() {
  return {
    x: 100 + Math.random() * (GS.map.width  - 200),
    y: 100 + Math.random() * (GS.map.height - 200)
  };
}

/* ═══════════════════════════════════════════════════════════════════
   §9  SISTEMA DE PARTÍCULAS — explosión cinemática de derrota
═══════════════════════════════════════════════════════════════════ */
function spawnExplosion(cx, cy) {
  const colors = [
    GS.char ? GS.char.colors.primary : '#fff',
    '#ff2d78', '#ffe600', '#00f5ff', '#ff6e40', '#69f0ae', '#e040fb'
  ];
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    const size  = 3 + Math.random() * 8;
    GS.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1.0,
      decay: 0.012 + Math.random() * 0.02,
      rotate: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3
    });
  }
  GS.explosion.active  = true;
  GS.explosion.timer   = 0;
}

function updateParticles() {
  for (let i = GS.particles.length - 1; i >= 0; i--) {
    const p = GS.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;    // gravedad leve
    p.vx *= 0.97;    // fricción
    p.life -= p.decay;
    p.rotate += p.rotSpeed;
    if (p.life <= 0) GS.particles.splice(i, 1);
  }
  if (GS.explosion.active) {
    GS.explosion.timer++;
    if (GS.explosion.timer >= GS.explosion.duration && GS.particles.length === 0) {
      GS.explosion.active = false;
      // Ahora sí, mostrar el overlay de game-over
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
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §10  TOUCH CONTROLS — joystick virtual
═══════════════════════════════════════════════════════════════════ */
function initTouchControls(canvas) {
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
    const rawDx = touch.clientX - GS.touch.startX;
    const rawDy = touch.clientY - GS.touch.startY;
    const len = Math.hypot(rawDx, rawDy) || 1;
    const deadzone = 8;
    if (len < deadzone) { GS.touch.dx = 0; GS.touch.dy = 0; return; }
    const clamped = Math.min(len, 60);
    GS.touch.dx = (rawDx / len) * (clamped / 60);
    GS.touch.dy = (rawDy / len) * (clamped / 60);
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

/* Dibuja el joystick visual en pantalla (esquina inferior izquierda del canvas visible) */
function renderJoystick(ctx, canvasW, canvasH) {
  if (!GS.touch.active && GS.touch.dx === 0 && GS.touch.dy === 0) return;
  const jx = 90, jy = canvasH - 90;
  const outerR = 52, innerR = 22;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(jx, jy, outerR, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.arc(jx + GS.touch.dx * outerR, jy + GS.touch.dy * outerR, innerR, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §11  CORE GAMEPLAY
═══════════════════════════════════════════════════════════════════ */
function startGameplay() {
  setupGameMap();
  const hudName = document.getElementById('hudCharName');
  if (hudName) {
    hudName.textContent = GS.char.name;
    hudName.style.color = GS.char.colors.primary;
  }
  GS.keys = {};

  // ── FIX: remover antes de añadir ──
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup',   onKeyUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);

  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initTouchControls(canvas);
  }

  // Track energético al iniciar
  startInGameMusic();

  if (GS.gameLoopId) cancelAnimationFrame(GS.gameLoopId);
  GS.gameLoopId = requestAnimationFrame(gameLoop);
}

function onKeyDown(e) {
  GS.keys[e.key.toLowerCase()] = true;
  // ── FIX: 'Escape' mayúscula ──
  if (e.key === 'Escape') togglePause();
}
function onKeyUp(e) {
  GS.keys[e.key.toLowerCase()] = false;
}

window.addEventListener('click',      ensureAudio);
window.addEventListener('touchstart', ensureAudio, { once: true });

function togglePause() {
  GS.isPaused = !GS.isPaused;
  const btn = document.getElementById('btnPause');
  if (btn) btn.textContent = GS.isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

function updateGame() {
  if (GS.isPaused) return;
  if (GS.explosion.active) { updateParticles(); return; }  // sólo partículas durante explosión
  if (GS.gameResult) return;

  const p = GS.player;
  const speed = GS.char.speed * (GS.keys['shift'] ? GS.char.sprintMul : 1);

  // Movimiento teclado + touch combinados
  let dx = 0, dy = 0;
  if (GS.keys['w'] || GS.keys['arrowup'])    dy = -1;
  if (GS.keys['s'] || GS.keys['arrowdown'])  dy =  1;
  if (GS.keys['a'] || GS.keys['arrowleft'])  dx = -1;
  if (GS.keys['d'] || GS.keys['arrowright']) dx =  1;
  if (GS.touch.active) { dx += GS.touch.dx; dy += GS.touch.dy; }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }

  p.x += dx * speed;
  p.y += dy * speed;
  p.x = Math.max(40, Math.min(GS.map.width - 40, p.x));
  p.y = Math.max(40, Math.min(GS.map.height - 40, p.y));

  // Colisión AABB con objetos de escondite
  let nearSpot = false;
  GS.hidingObjects.forEach(obj => {
    if (p.x >= obj.x && p.x <= obj.x + obj.w &&
        p.y >= obj.y && p.y <= obj.y + obj.h) {
      nearSpot = true;
    }
  });
  // E para esconderse cuando está dentro del objeto
  GS.player.isHidden = nearSpot && GS.keys['e'];

  // Proximidad
  const dist = Math.hypot(p.x - GS.vet.x, p.y - GS.vet.y);
  GS.proximity = Math.max(0, Math.min(1, 1 - dist / 700));

  // Vet AI
  updateVetAI();

  // WIN
  if (Math.hypot(p.x - GS.goal.x, p.y - GS.goal.y) < GS.goal.radius + 10) {
    GS.gameResult = 'WIN';
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    stopIgMusic();
    playWinJingle();
    setTimeout(() => showResultOverlay(true), 300);
  }

  // LOSE — detonamos explosión, NO llamamos alert()
  if (dist < 45 && !GS.player.isHidden && !GS.gameResult) {
    GS.gameResult = 'LOSE';
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    stopIgMusic();
    playLoseJingle();
    spawnExplosion(p.x, p.y);
    spawnExplosion(GS.vet.x, GS.vet.y);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §12  RENDER LOOP
═══════════════════════════════════════════════════════════════════ */
function renderGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (canvas.width  !== window.innerWidth)  canvas.width  = window.innerWidth;
  if (canvas.height !== window.innerHeight) canvas.height = window.innerHeight;

  const cW = canvas.width, cH = canvas.height;
  ctx.fillStyle = '#0a0d1a'; ctx.fillRect(0, 0, cW, cH);

  // Cámara centrada en el jugador
  ctx.save();
  ctx.translate(cW / 2 - GS.player.x, cH / 2 - GS.player.y);

  // Fondo temático
  renderBackground(ctx);

  // Borde del mapa
  ctx.strokeStyle = GS.char.colors.primary; ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, GS.map.width, GS.map.height);

  // Objetos de escondite
  GS.hidingObjects.forEach(obj => renderHidingObject(ctx, obj));

  // Meta
  const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
  ctx.fillStyle = `rgba(255,230,0,${pulse})`;
  ctx.beginPath(); ctx.arc(GS.goal.x, GS.goal.y, GS.goal.radius, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText('META', GS.goal.x, GS.goal.y + 5);

  // Cono de visión de la vet
  if (!GS.player.isHidden) {
    ctx.save();
    ctx.translate(GS.vet.x, GS.vet.y);
    ctx.rotate(GS.vet.angle);
    const alpha = GS.vet.mode === 'chase' ? 0.20 : 0.07;
    ctx.fillStyle = `rgba(255,45,120,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const halfA = VET_VISION_ANGLE * Math.PI / 180;
    ctx.arc(0, 0, VET_VISION_RANGE, -halfA, halfA);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Jugador
  if (!GS.explosion.active || GS.gameResult !== 'LOSE') {
    ctx.save(); ctx.translate(GS.player.x, GS.player.y);
    if (GS.player.isHidden) ctx.globalAlpha = 0.3;
    const pImg = GS.images[GS.char.id];
    if (pImg && pImg.complete && pImg.naturalWidth !== 0) {
      ctx.drawImage(pImg, -30, -30, 60, 60);
    } else {
      ctx.fillStyle = GS.char.colors.primary; ctx.fillRect(-25, -25, 50, 50);
    }
    ctx.restore();
  }

  // Vet
  if (!GS.explosion.active || GS.gameResult !== 'LOSE') {
    ctx.save(); ctx.translate(GS.vet.x, GS.vet.y);
    const vImg = GS.images['vet'];
    if (vImg && vImg.complete && vImg.naturalWidth !== 0) {
      ctx.drawImage(vImg, -30, -40, 60, 80);
    } else {
      ctx.fillStyle = '#ff2d78'; ctx.fillRect(-25, -25, 50, 50);
    }
    ctx.restore();
  }

  // Partículas (en espacio del mapa)
  if (GS.particles.length > 0) renderParticles(ctx);

  ctx.restore(); // fin transformación de cámara

  // Joystick (en espacio de pantalla)
  renderJoystick(ctx, cW, cH);

  // Alerta de persecución
  if (GS.vet.mode === 'chase' && !GS.player.isHidden) {
    ctx.save();
    const fAlpha = 0.55 + 0.45 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(255,45,120,${fAlpha * 0.08})`;
    ctx.fillRect(0, 0, cW, cH);
    ctx.fillStyle = `rgba(255,45,120,${fAlpha})`;
    ctx.font = `bold ${Math.max(14, cW * 0.025)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ SHE SEES YOU ⚠', cW / 2, cH * 0.07);
    ctx.restore();
  }

  // HUD
  document.getElementById('hudProxFill').style.width = (GS.proximity * 100) + '%';
  document.getElementById('hudStatus').textContent  =
    GS.player.isHidden ? '🙈 HIDING!'
    : GS.vet.mode === 'chase' ? '⚠ RUN!'
    : 'EVADING...';
}

function gameLoop() {
  updateGame();
  renderGame();
  if (GS.screen === 'game') GS.gameLoopId = requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   §13  OVERLAY DE RESULTADO — sin alert(), sin changeScreen abrupto
═══════════════════════════════════════════════════════════════════ */
function showResultOverlay(won) {
  // Quitar overlay anterior si existe
  const old = document.getElementById('resultOverlay');
  if (old) old.remove();

  const c     = GS.char;
  const color = won ? (c?.colors.primary || '#00f5ff') : '#ff2d78';
  const emoji = won ? '🎉' : '😿';
  const title = won ? 'YOU ESCAPED!' : 'THE VET GOT YOU!';
  const sub   = won
    ? `${c?.name} earned ${c?.reward}!`
    : `${c?.name || 'Your pet'} was caught!`;

  const ov = document.createElement('div');
  ov.id = 'resultOverlay';
  Object.assign(ov.style, {
    position: 'fixed', inset: '0', zIndex: '9999',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(4,6,14,0.92)',
    fontFamily: "'Press Start 2P', monospace",
    textAlign: 'center', padding: '2rem', boxSizing: 'border-box'
  });

  const mkEl = (tag, styles, text) => {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    if (text) el.textContent = text;
    return el;
  };

  const mkBtn = (label, accent, onClick) => {
    const btn = mkEl('button', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 'clamp(0.4rem,1.3vw,0.65rem)',
      cursor: 'pointer', padding: '0.8em 1.8em',
      border: `3px solid ${accent}`, background: 'transparent',
      color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
      margin: '0 8px'
    }, label);
    btn.addEventListener('mouseover', () => { btn.style.background = `${accent}22`; });
    btn.addEventListener('mouseout',  () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', onClick);
    return btn;
  };

  ov.appendChild(mkEl('div', { fontSize: 'clamp(2.5rem,8vw,5rem)', marginBottom: '1rem' }, emoji));
  ov.appendChild(mkEl('div', {
    fontSize: 'clamp(1rem,3.5vw,2.2rem)', color, marginBottom: '0.8rem',
    textShadow: `0 0 14px ${color}, 3px 3px 0 rgba(0,0,0,0.8)`, letterSpacing: '0.12em'
  }, title));
  ov.appendChild(mkEl('div', {
    fontSize: 'clamp(0.4rem,1.4vw,0.8rem)', color: '#e0e0cc',
    lineHeight: '2', marginBottom: '2rem', letterSpacing: '0.06em'
  }, sub));

  const row = mkEl('div', { display: 'flex', justifyContent: 'center', flexWrap: 'wrap' });
  row.appendChild(mkBtn('↩ RETRY', color, () => {
    ov.remove();
    ensureAudio();
    changeScreen('game');
  }));
  row.appendChild(mkBtn('⌂ MENU', '#6a7a9a', () => {
    ov.remove();
    changeScreen('mainmenu');
  }));
  ov.appendChild(row);

  const gameScreen = document.getElementById('screen-game');
  if (gameScreen) {
    gameScreen.style.position = 'relative';
    gameScreen.appendChild(ov);
  } else {
    document.body.appendChild(ov);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §14  EVENTOS DE BOTONES
═══════════════════════════════════════════════════════════════════ */
function bindButtons() {
  const $ = id => document.getElementById(id);
  $('btnStartGame') ?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')     ?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack') ?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')    ?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnConfirmYes')?.addEventListener('click', () => changeScreen('game'));
  $('btnConfirmNo') ?.addEventListener('click', () => changeScreen('charselect'));
  $('btnPause')     ?.addEventListener('click', () => togglePause());
}

/* ═══════════════════════════════════════════════════════════════════
   §15  INIT
═══════════════════════════════════════════════════════════════════ */
async function init() {
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  await preloadImages();
  window.addEventListener('resize', () => {
    const c = document.getElementById('gameCanvas');
    if (c && GS.screen === 'game') { c.width = window.innerWidth; c.height = window.innerHeight; }
  });
  setTimeout(() => { changeScreen('mainmenu'); }, 100);
}
window.addEventListener('DOMContentLoaded', init);
