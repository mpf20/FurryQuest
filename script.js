/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js  (v5 — Explosion Fix)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   §1  CHARACTER & LEVEL DATA (Rutas de carpetas apuntando a assets/)
───────────────────────────────────────────────────────────────── */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: 'dog',
    img: 'assets/images/Molly.png',
    sound: 'bark',
    level: 'THE HOUSE', setting: 'House littered with shirts and clothes',
    objective: 'Stash clothes & dodge the Vet!',
    reward: '🦴 BONE', rewardLabel: 'BONE',
    color: '#c860ff', colorRGB: '200,96,255',
    goalLabel: 'LAUNDRY BASKET',
    hidingSpots: [
      { label: 'Under Bed',    x: 0.18, y: 0.20, w: 0.14, h: 0.08 },
      { label: 'Sofa',         x: 0.65, y: 0.55, w: 0.16, h: 0.10 },
      { label: 'Cabinet',      x: 0.35, y: 0.75, w: 0.12, h: 0.09 },
    ],
    goalPos: { x: 0.80, y: 0.15 },
    playerStart: { x: 0.10, y: 0.85 },
    vetStart:    { x: 0.90, y: 0.90 },
    bgColors:    ['#0d0018','#1e0040','#3a0060'],
  },
  agata: {
    id: 'agata', name: 'AGATA', type: 'cat',
    img: 'assets/images/Agata.png',
    sound: 'meow',
    level: 'THE FOREST', setting: 'Dense low-poly forest',
    objective: 'Flee the Vet\'s nail clippers!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#00e86a', colorRGB: '0,232,106',
    goalLabel: 'FOREST EXIT',
    hidingSpots: [
      { label: 'Tree Trunk',   x: 0.20, y: 0.30, w: 0.10, h: 0.14 },
      { label: 'Bushes',       x: 0.55, y: 0.65, w: 0.15, h: 0.09 },
      { label: 'Big Tree',     x: 0.75, y: 0.25, w: 0.10, h: 0.16 },
    ],
    goalPos: { x: 0.85, y: 0.12 },
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.92, y: 0.85 },
    bgColors:    ['#000e04','#001e08','#003515'],
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: 'cat',
    img: 'assets/images/Martin.png',
    sound: 'meow',
    level: 'THE DESERT', setting: 'Arid barren desert',
    objective: 'Reach the water well!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#ff9020', colorRGB: '255,144,32',
    goalLabel: 'WATER WELL',
    hidingSpots: [
      { label: 'Sand Dune',    x: 0.25, y: 0.35, w: 0.16, h: 0.10 },
      { label: 'Ruins',        x: 0.60, y: 0.20, w: 0.14, h: 0.16 },
      { label: 'Rock',         x: 0.40, y: 0.70, w: 0.10, h: 0.10 },
    ],
    goalPos: { x: 0.82, y: 0.10 },
    playerStart: { x: 0.08, y: 0.90 },
    vetStart:    { x: 0.88, y: 0.88 },
    bgColors:    ['#100600','#281000','#4a1c00'],
  },
  michi: {
    id: 'michi', name: 'MICHI', type: 'cat',
    img: 'assets/images/Michi.png',
    sound: 'meow',
    level: 'THE BATHROOM', setting: 'Residential bathroom',
    objective: 'Avoid soap & towel!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#00b8ff', colorRGB: '0,184,255',
    goalLabel: 'CAT FLAP',
    hidingSpots: [
      { label: 'Closet',         x: 0.15, y: 0.22, w: 0.11, h: 0.15 },
      { label: 'Laundry Basket', x: 0.62, y: 0.60, w: 0.13, h: 0.11 },
      { label: 'Bookshelf',      x: 0.80, y: 0.40, w: 0.10, h: 0.18 },
    ],
    goalPos: { x: 0.82, y: 0.12 },
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.90, y: 0.90 },
    bgColors:    ['#00060f','#000e22','#001840'],
  },
};

const VET = {
  img: 'assets/images/Veterinaria.png',
  patrolSpeed: 0.0018,
  chaseSpeed:  0.0036,
  visionAngle: 55,
  visionRange: 0.32,
};


/* ─────────────────────────────────────────────────────────────────
   §2  GAME STATE
───────────────────────────────────────────────────────────────── */
const GS = {
  screen:    'loading',
  char:      null,
  images:    {},

  game: {
    running:   false,
    paused:    false,
    rafId:     null,
    won:       false,
    lost:      false,

    // Temporizador
    timeLeft:  20.0,
    lastTime:  0,

    // Sistema de Partículas Explosivas incorporado
    particles: [],
    exploding: false,
    explosionTimer: 0,

    // Player
    px: 0.1, py: 0.9,
    pSpeed: 0.003,
    hidden:  false,
    hiddenSpot: null,

    // Vet
    vx: 0.9, vy: 0.9,
    vAngle: 180,
    vetMode: 'patrol',
    lostTimer: 0,
    patrolTarget: null,
    patrolTimer: 0,

    keys: {},
    proximity: 0,
  },

  audio: {
    ctx: null,
    bgmActive: false,
    bgmNodes: [],
    bgmTimer: null,
    inGameAudio: null,
  },
};


/* ─────────────────────────────────────────────────────────────────
   §3  DOM REFS
───────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const SCREENS_EL = {
  loading:    $('screen-loading'),
  mainmenu:   $('screen-mainmenu'),
  howtoplay:  $('screen-howtoplay'),
  charselect: $('screen-charselect'),
  confirm:    $('screen-confirm'),
  game:       $('screen-game'),
};


/* ─────────────────────────────────────────────────────────────────
   §4  SCREEN MANAGER
───────────────────────────────────────────────────────────────── */
function changeScreen(name) {
  if (!SCREENS_EL[name]) { console.error('Unknown screen:', name); return; }

  const prev = SCREENS_EL[GS.screen];
  if (prev) prev.classList.remove('active');

  GS.screen = name;
  SCREENS_EL[name].classList.add('active');

  switch (name) {
    case 'mainmenu':   stopInGameMusic(); startMenuBGM(); break;
    case 'game':       stopMenuBGM(); launchGame();       break;
    case 'win':        stopInGameMusic(); showResult(true);  break;
    case 'lose':       stopInGameMusic(); showResult(false); break;
  }
}


/* ─────────────────────────────────────────────────────────────────
   §5  ASSET PRELOADER
───────────────────────────────────────────────────────────────── */
const IMAGE_MANIFEST = [
  { key: 'molly',  src: 'assets/images/Molly.png'       },
  { key: 'agata',  src: 'assets/images/Agata.png'        },
  { key: 'martin', src: 'assets/images/Martin.png'       },
  { key: 'michi',  src: 'assets/images/Michi.png'        },
  { key: 'vet',    src: 'assets/images/Veterinaria.png'  },
];

function preloadImages() {
  return new Promise(resolve => {
    let done = 0;
    const total = IMAGE_MANIFEST.length;
    IMAGE_MANIFEST.forEach(({ key, src }) => {
      const img = new Image();
      const finish = () => {
        GS.images[key] = img;
        done++;
        setLoadBar(Math.round(done / total * 100));
        if (done === total) resolve();
      };
      img.onload  = finish;
      img.onerror = finish;
      img.src = src;
    });
  });
}

function setLoadBar(pct) {
  const bar = $('loadBar'), lbl = $('loadPct');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent  = pct + '%';
}


/* ─────────────────────────────────────────────────────────────────
   §6  WEB AUDIO ENGINE
───────────────────────────────────────────────────────────────── */
function ensureAudio() {
  if (!GS.audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { GS.audio.ctx = new Ctx(); }
    catch(e) { console.warn('Web Audio unavailable', e); return false; }
  }
  if (GS.audio.ctx.state === 'suspended') GS.audio.ctx.resume();
  return true;
}

function startMenuBGM() {
  if (GS.audio.bgmActive) return;
  if (!ensureAudio()) return;
  GS.audio.bgmActive = true;
  _scheduleMenuArpeggio();
}

function stopMenuBGM() {
  GS.audio.bgmActive = false;
  clearTimeout(GS.audio.bgmTimer);
  _killNodes(GS.audio.bgmNodes);
  GS.audio.bgmNodes = [];
}

const MENU_FREQS = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
];

function _scheduleMenuArpeggio() {
  const ctx = GS.audio.ctx;
  if (!ctx || !GS.audio.bgmActive) return;
  const noteDur = 0.14;
  let t = ctx.currentTime;

  MENU_FREQS.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur - 0.01);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + noteDur);
    GS.audio.bgmNodes.push(osc, gain);
    t += noteDur;
  });

  GS.audio.bgmTimer = setTimeout(
    _scheduleMenuArpeggio,
    (MENU_FREQS.length * noteDur - 0.05) * 1000
  );
}

const MAQAM_HIJAZ = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
const HIJAZ_MELODY = [0,2,3,2,1,0,4,3,2,3,0,5,4,3,2,1];
const HIJAZ_DURS   = [0.25,0.15,0.20,0.15,0.25,0.30,0.20,0.15,0.25,0.20,0.30,0.20,0.15,0.25,0.15,0.20];

function startInGameMusic() {
  if (!ensureAudio()) return;
  _launchInGameLoop(1.0);
}

function _launchInGameLoop(tempoMult) {
  const ctx = GS.audio.ctx;
  if (!ctx || !GS.game.running) return;

  const nodes = [];
  let t = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.06, t);
  masterGain.connect(ctx.destination);

  HIJAZ_MELODY.forEach((scaleIdx, i) => {
    const freq = MAQAM_HIJAZ[scaleIdx];
    const dur  = (HIJAZ_DURS[i] || 0.2) / tempoMult;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.01);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + dur);
    nodes.push(osc, gain);
    t += dur;
  });

  nodes.push(masterGain);
  const phraseDurMs = (t - ctx.currentTime) * 1000 - 50;

  GS.audio.inGameAudio = {
    nodes,
    timer: setTimeout(() => {
      if (GS.game.running && !GS.game.paused) {
        const prox = GS.game.proximity;
        const newMult = 1.0 + prox * 1.6;
        _launchInGameLoop(newMult);
      }
    }, phraseDurMs),
    stop() {
      clearTimeout(this.timer);
      _killNodes(nodes);
    },
  };
}

function stopInGameMusic() {
  if (GS.audio.inGameAudio) {
    GS.audio.inGameAudio.stop();
    GS.audio.inGameAudio = null;
  }
}

function playCatMeow() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
}

function playDogBark() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const bufLen = Math.floor(ctx.sampleRate * 0.15);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
  const src  = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  src.connect(gain); gain.connect(ctx.destination);
  src.start();
}

function playSelectionSFX(soundType) {
  if (soundType === 'bark') playDogBark();
  else                      playCatMeow();
}

function playWinJingle() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  let t = ctx.currentTime;
  notes.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.22);
    t += 0.15;
  });
}

function playLoseJingle() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const notes = [440, 349.23, 261.63];
  let t = ctx.currentTime;
  notes.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.32);
    t += 0.25;
  });
}

function _killNodes(arr) {
  arr.forEach(n => { try { n.stop(); } catch(_) {} try { n.disconnect(); } catch(_) {} });
  arr.length = 0;
}


/* ─────────────────────────────────────────────────────────────────
   §7  CONFIRM SCREEN
───────────────────────────────────────────────────────────────── */
function buildConfirmScreen() {
  const c = GS.char;
  if (!c) return;
  const av  = $('confirmAvatar');
  const nm  = $('confirmName');
  const lv  = $('confirmLevel');
  const obj = $('confirmObj');
  if (av)  { av.src = c.img; av.alt = c.name; }
  if (nm)  nm.textContent  = c.name;
  if (lv)  lv.textContent  = `📍 ${c.level}  ·  ${c.reward}`;
  if (obj) obj.textContent = c.objective;
}


/* ─────────────────────────────────────────────────────────────────
   §8  CHARACTER CARD SELECTION
───────────────────────────────────────────────────────────────── */
function selectCharacter(charId) {
  const c = CHARACTERS[charId];
  if (!c) return;
  GS.char = c;
  stopMenuBGM();
  ensureAudio();
  playSelectionSFX(c.sound);
  setTimeout(() => changeScreen('confirm'), 380);
}

function bindCharCards() {
  document.querySelectorAll('.quad[data-char]').forEach(card => {
    const id = card.dataset.char;
    card.addEventListener('click',   () => { ensureAudio(); selectCharacter(id); });
  });
}


/* ─────────────────────────────────────────────────────────────────
   §9  GAMEPLAY ENGINE (Con detonaciones dinámicas de partículas)
───────────────────────────────────────────────────────────────── */
let gameCanvas, gameCtx;

function launchGame() {
  const c = GS.char;
  if (!c) { changeScreen('charselect'); return; }

  const g = GS.game;
  g.running   = true;
  g.paused    = false;
  g.won       = false;
  g.lost      = false;
  
  g.timeLeft  = 20.0;
  g.lastTime  = performance.now();
  
  // Reset Completo del Sistema de Explosión
  g.particles = [];
  g.exploding = false;
  g.explosionTimer = 0;

  g.px        = c.playerStart.x;
  g.py        = c.playerStart.y;
  g.vx        = c.vetStart.x;
  g.vy        = c.vetStart.y;
  g.vAngle    = 180;
  g.vetMode   = 'patrol';
  g.lostTimer = 0;
  g.patrolTimer = 0;
  g.patrolTarget = null;
  g.hidden    = false;
  g.hiddenSpot = null;
  g.proximity = 0;
  g.keys      = {};

  const wrap = $('gameCanvasWrap');
  wrap.innerHTML = '';
  gameCanvas = document.createElement('canvas');
  gameCanvas.id = 'gameCanvas';
  gameCanvas.style.cssText = 'width:100%;height:100%;display:block;background:#000;';
  wrap.appendChild(gameCanvas);
  resizeCanvas();

  gameCtx = gameCanvas.getContext('2d');

  window.addEventListener('keydown',  onKeyDown);
  window.addEventListener('keyup',    onKeyUp);

  initHUD();
  startInGameMusic();

  if (g.rafId) cancelAnimationFrame(g.rafId);
  g.rafId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  if (!gameCanvas) return;
  gameCanvas.width  = gameCanvas.offsetWidth  || window.innerWidth;
  gameCanvas.height = gameCanvas.offsetHeight || window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function stopGame() {
  const g = GS.game;
  g.running = false;
  if (g.rafId) { cancelAnimationFrame(g.rafId); g.rafId = null; }
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup',   onKeyUp);
}

function onKeyDown(e) {
  GS.game.keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && GS.screen === 'game') togglePause();
}
function onKeyUp(e)   { GS.game.keys[e.key.toLowerCase()] = false; }

// Generador de estallidos expansivos tipo bomba pixelada
function triggerExplosion(x, y, color, count = 65) {
  const g = GS.game;
  g.exploding = true;
  g.explosionTimer = 65; // Duración extendida para apreciar la onda expansiva
  g.particles = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 0.012 + 0.004; // Fuerza del estallido inicial
    g.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      radius: Math.random() * 6 + 3,
      alpha: 1.0,
      decay: Math.random() * 0.015 + 0.01,
      color: color
    });
  }
}

/* ── Loop Principal ── */
function gameLoop() {
  const g = GS.game;
  if (!g.running) return;
  if (!g.paused) {
    updateGame();
    renderGame();
  }
  g.rafId = requestAnimationFrame(gameLoop);
}

/* ── Actualizaciones Físicas y de Lógica ── */
function updateGame() {
  const g  = GS.game;
  const c  = GS.char;
  const now = performance.now();
  const deltaTime = (now - g.lastTime) / 1000;
  g.lastTime = now;

  // Lógica Física si la onda de partículas está activa
  if (g.exploding) {
    g.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96; // Fricción del aire simulada
      p.vy *= 0.96;
      p.alpha -= p.decay; // Desvanecimiento progresivo
    });
    g.particles = g.particles.filter(p => p.alpha > 0);
    g.explosionTimer--;
    
    if (g.explosionTimer <= 0) {
      stopGame();
      if (g.won)  setTimeout(() => changeScreen('win'), 100);
      if (g.lost) setTimeout(() => changeScreen('lose'), 100);
    }
    return;
  }

  // Descontar tiempo (Reloj oficial)
  g.timeLeft -= deltaTime;
  if (g.timeLeft <= 0) {
    g.timeLeft = 0;
    g.lost = true;
    stopInGameMusic();
    playLoseJingle();
    triggerExplosion(g.px, g.py, '#ff2d78'); // Explosión por fin del tiempo
    return;
  }

  // Movimiento del jugador
  const spd = g.pSpeed;
  let dx = 0, dy = 0;
  if (g.keys['w'] || g.keys['arrowup'])    dy -= spd;
  if (g.keys['s'] || g.keys['arrowdown'])  dy += spd;
  if (g.keys['a'] || g.keys['arrowleft'])  dx -= spd;
  if (g.keys['d'] || g.keys['arrowright']) dx += spd;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  if (g.keys['shift']) { dx *= 1.5; dy *= 1.5; }

  g.px = Math.max(0.02, Math.min(0.98, g.px + dx));
  g.py = Math.max(0.02, Math.min(0.98, g.py + dy));

  // Zonas de escondite
  g.hidden = false;
  g.hiddenSpot = null;
  for (const spot of c.hidingSpots) {
    if (g.px >= spot.x && g.px <= spot.x + spot.w &&
        g.py >= spot.y && g.py <= spot.y + spot.h) {
      g.hidden = true;
      g.hiddenSpot = spot;
      break;
    }
  }

  // Ganar la partida (Meta alcanzada) -> Detona pirotecnia festiva
  const goal = c.goalPos;
  if (Math.hypot(g.px - goal.x, g.py - goal.y) < 0.055) {
    g.won = true;
    stopInGameMusic();
    playWinJingle();
    triggerExplosion(goal.x, goal.y, c.color, 80); // Fuegos artificiales de la victoria
    return;
  }

  // Inteligencia de la Veterinaria
  const rawDist = Math.hypot(g.px - g.vx, g.py - g.vy);
  g.proximity   = Math.max(0, 1 - rawDist / VET.visionRange);
  const canSee = !g.hidden && rawDist < VET.visionRange && _inCone(g);

  if (canSee) {
    g.vetMode   = 'chase';
    g.lostTimer = 0;
  } else if (g.vetMode === 'chase') {
    g.lostTimer++;
    if (g.lostTimer > 90) { g.vetMode = 'patrol'; g.patrolTarget = null; }
  }

  if (g.vetMode === 'chase') {
    const ang = Math.atan2(g.py - g.vy, g.px - g.vx);
    g.vx += Math.cos(ang) * VET.chaseSpeed;
    g.vy += Math.sin(ang) * VET.chaseSpeed;
    g.vAngle = ang * 180 / Math.PI;
  } else {
    g.patrolTimer--;
    if (!g.patrolTarget || g.patrolTimer <= 0) {
      g.patrolTarget = { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 };
      g.patrolTimer  = 120 + Math.random() * 80;
    }
    const ang = Math.atan2(g.patrolTarget.y - g.vy, g.patrolTarget.x - g.vx);
    g.vx += Math.cos(ang) * VET.patrolSpeed;
    g.vy += Math.sin(ang) * VET.patrolSpeed;
    g.vAngle = ang * 180 / Math.PI;
  }

  g.vx = Math.max(0.01, Math.min(0.99, g.vx));
  g.vy = Math.max(0.01, Math.min(0.99, g.vy));

  // Atrapado por la veterinaria -> Detona bomba expansiva destructiva
  if (rawDist < 0.045 && !g.hidden) {
    g.lost = true;
    stopInGameMusic();
    playLoseJingle();
    triggerExplosion(g.px, g.py, '#ff2d78', 70); // Bomba de captura
    return;
  }

  updateHUD();
}

function _inCone(g) {
  const toPlayerAngle = Math.atan2(g.py - g.vy, g.px - g.vx) * 180 / Math.PI;
  let diff = toPlayerAngle - g.vAngle;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) < VET.visionAngle;
}


/* ── Pintar en Pantalla (Fondo de escenarios simulados en Canvas) ── */
function renderGame() {
  const g = GS.game;
  const c = GS.char;
  const W = gameCanvas.width;
  const H = gameCanvas.height;
  const ctx = gameCtx;

  // Fondo Dinámico según nivel seleccionado
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   c.bgColors[0]);
  grad.addColorStop(1,   c.bgColors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Rejilla de Luces Neón Retro
  ctx.strokeStyle = `rgba(${c.colorRGB},0.07)`;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Detalles Temáticos del Escenario
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  if (c.id === 'agata') {
    ctx.fillStyle = 'rgba(0, 232, 106, 0.04)';
    for(let i=1; i<=6; i++) {
      ctx.beginPath(); ctx.moveTo(W*(i*0.14), H*0.25); ctx.lineTo(W*(i*0.14+0.04), H*0.45); ctx.lineTo(W*(i*0.14-0.04), H*0.45); ctx.fill();
    }
  } else if (c.id === 'martin') {
    ctx.strokeStyle = 'rgba(255, 144, 32, 0.04)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, H*0.5); ctx.quadraticCurveTo(W*0.3, H*0.4, W, H*0.6); ctx.stroke();
  } else if (c.id === 'michi') {
    ctx.strokeStyle = 'rgba(0, 184, 255, 0.06)'; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  }

  // Escondites
  c.hidingSpots.forEach(spot => {
    const sx = spot.x * W, sy = spot.y * H;
    const sw = spot.w * W, sh = spot.h * H;
    ctx.fillStyle   = g.hiddenSpot === spot ? `rgba(${c.colorRGB},0.35)` : `rgba(${c.colorRGB},0.12)`;
    ctx.strokeStyle = `rgba(${c.colorRGB},0.7)`;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle   = '#fff';
    ctx.font        = `12px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText(spot.label, sx + sw / 2, sy + sh / 2 + 4);
  });

  // Zona Meta
  const gx = c.goalPos.x * W, gy = c.goalPos.y * H, gr = W * 0.035;
  ctx.strokeStyle = c.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(${c.colorRGB},0.2)`;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(c.goalLabel, gx, gy + 4);

  // Cono de la Veterinaria
  if (!g.hidden && !g.exploding) {
    const vxPx = g.vx * W, vyPx = g.vy * H;
    const coneRange = VET.visionRange * W;
    const halfAngle = VET.visionAngle * Math.PI / 180;
    const baseAngle = g.vAngle * Math.PI / 180;
    ctx.fillStyle = g.vetMode === 'chase' ? 'rgba(255,45,120,0.25)' : 'rgba(255,45,120,0.1)';
    ctx.beginPath(); ctx.moveTo(vxPx, vyPx);
    ctx.arc(vxPx, vyPx, coneRange, baseAngle - halfAngle, baseAngle + halfAngle);
    ctx.closePath(); ctx.fill();
  }

  // Dibujar Veterinaria (Si no hemos ganado la partida)
  if (!g.won) {
    _drawSprite(ctx, 'vet', g.vx * W, g.vy * H, W * 0.07, H * 0.12);
  }

  // Dibujar Mascota activa (Solo si no ha explotado)
  if (!g.exploding) {
    if (!g.hidden) {
      _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.06, H * 0.1);
    } else {
      ctx.save(); ctx.globalAlpha = 0.25;
      _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.06, H * 0.1);
      ctx.restore();
      ctx.fillStyle = c.color; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('👁 OCULTO', g.px * W, g.py * H - 40);
    }
  }

  // Renderizar e imprimir partículas de explosión activas en pantalla
  if (g.exploding) {
    g.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Letreros de Persecución Directa
  if (g.vetMode === 'chase' && !g.exploding) {
    ctx.fillStyle = 'rgba(255,45,120,0.8)';
    ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚠ ¡LA VETERINARIA TE VIO! ⚠', W / 2, H * 0.07);
  }

  // Impresión del Minutero Oficial
  ctx.fillStyle = g.timeLeft < 5 ? '#ff2d78' : '#fff';
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`TIEMPO: ${g.timeLeft.toFixed(1)}s`, 20, 40);
}

function _drawSprite(ctx, key, cx, cy, w, h) {
  const img = GS.images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.fillStyle = key === 'vet' ? '#ff2d78' : (GS.char?.color || '#00f5ff');
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(w, h) * 0.5}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(key === 'vet' ? 'V' : (GS.char?.name[0] || '?'), cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
}


/* ─────────────────────────────────────────────────────────────────
   §10  HUD
───────────────────────────────────────────────────────────────── */
function initHUD() {
  const c = GS.char;
  if (c) {
    const nm = $('hudCharName');
    if (nm) nm.textContent = c.name;
  }
}

function updateHUD() {
  const g = GS.game;
  const fill = $('hudProxFill');
  if (fill) {
    const pct = Math.min(1, g.proximity) * 100;
    fill.style.width = pct + '%';
  }
  
  let txt = 'EVADIENDO...';
  if (g.hidden) txt = '🙈 ¡ESCONDIDO!';
  else if (g.vetMode === 'chase') txt = '⚠ ¡TE PERSIGUEN!';
  
  const el = $('hudStatus');
  if (el) el.textContent = `${txt} | ⏱ ${g.timeLeft.toFixed(1)}s`;
}

function togglePause() {
  const g = GS.game;
  g.paused = !g.paused;
  if (!g.paused) {
    g.lastTime = performance.now();
    startInGameMusic();
  } else {
    stopInGameMusic();
  }
}


/* ─────────────────────────────────────────────────────────────────
   §11  PANTALLAS DE RESULTADO
───────────────────────────────────────────────────────────────── */
function showResult(won) {
  const c = GS.char;
  const overlay = document.createElement('div');
  overlay.id = 'resultOverlay';
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;background:rgba(4,6,14,0.95);z-index:500;
    font-family:monospace;text-align:center;padding:2rem;
  `;

  const accentColor = won ? (c?.color || '#00f5ff') : '#ff2d78';
  const headline = won ? '¡LOGRASTE ESCAPAR!' : 'GAME OVER';
  const sub = won ? `¡Felicidades! ${c?.name} ganó su recompensa: ${c?.reward || 'premio'}!` : `LA VETERINARIA ATRAPÓ A ${c?.name || 'TU MASCOTA'}.`;

  overlay.innerHTML = `
    <div style="font-size:3.5rem;margin-bottom:1rem;text-shadow:0 0 10px ${accentColor}">${won ? '🎉' : '💥'}</div>
    <div style="font-size:2.5rem;color:${accentColor};margin-bottom:1rem;font-weight:bold;letter-spacing:2px;text-shadow:0 0 15px ${accentColor};">${headline}</div>
    <div style="font-size:1.1rem;color:#fff;margin-bottom:2.5rem;max-width:500px;line-height:1.6;">${sub}</div>
    <div style="display:flex;gap:1.5rem;">
      <button id="btnRetry" style="${_btnStyle(accentColor)}">VOLVER A INTENTAR</button>
      <button id="btnToMenu" style="${_btnStyle('#fff')}">MENÚ PRINCIPAL</button>
    </div>
  `;

  $('screen-game').appendChild(overlay);

  $('btnRetry')?.addEventListener('click', () => { overlay.remove(); launchGame(); });
  $('btnToMenu')?.addEventListener('click', () => { overlay.remove(); changeScreen('mainmenu'); });
}

function _btnStyle(color) {
  return `font-family:monospace;font-size:14px;cursor:pointer;padding:12px 24px;
    border:2px solid ${color};background:transparent;color:${color};font-weight:bold;letter-spacing:1px;text-transform:uppercase;`;
}


/* ─────────────────────────────────────────────────────────────────
   §12  BUTTON BINDINGS
───────────────────────────────────────────────────────────────── */
function bindButtons() {
  $('btnStartGame')?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')?.addEventListener('click', () => { startMenuBGM(); changeScreen('mainmenu'); });
  $('btnConfirmYes')?.addEventListener('click', () => { ensureAudio(); changeScreen('game'); });
  $('btnConfirmNo')?.addEventListener('click', () => { GS.char = null; startMenuBGM(); changeScreen('charselect'); });
  $('btnPause')?.addEventListener('click', () => togglePause());
}


/* ─────────────────────────────────────────────────────────────────
   §13  INIT
───────────────────────────────────────────────────────────────── */
async function init() {
  bindButtons();
  bindCharCards();
  await preloadImages();
  changeScreen('mainmenu');
}

document.addEventListener('DOMContentLoaded', init);
