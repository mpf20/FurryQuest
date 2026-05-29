/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js  (v4 — Enhanced)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   §1  CHARACTER & LEVEL DATA
───────────────────────────────────────────────────────────────── */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: 'dog',
    img: 'images/Molly.png',
    sound: 'bark',
    level: 'THE HOUSE', setting: 'House littered with shirts and clothes',
    objective: 'Stash clothes & dodge the Vet!',
    reward: '🦴 BONE', rewardLabel: 'BONE',
    color: '#c860ff', colorRGB: '200,96,255',
    goalLabel: 'LAUNDRY BASKET',
    hidingSpots: [
      { label: 'Under Bed',    x: 0.18, y: 0.20, w: 0.14, h: 0.08, type: 'bed' },
      { label: 'Sofa',         x: 0.65, y: 0.55, w: 0.16, h: 0.10, type: 'sofa' },
      { label: 'Cabinet',      x: 0.35, y: 0.75, w: 0.12, h: 0.09, type: 'cabinet' },
    ],
    goalPos: { x: 0.80, y: 0.15 },
    playerStart: { x: 0.10, y: 0.85 },
    vetStart:    { x: 0.90, y: 0.90 },
    bgColors:    ['#0d0018','#1e0040','#3a0060'],
  },
  agata: {
    id: 'agata', name: 'AGATA', type: 'cat',
    img: 'images/Agata.png',
    sound: 'meow',
    level: 'THE FOREST', setting: 'Dense low-poly forest',
    objective: 'Flee the Vet\'s nail clippers!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#00e86a', colorRGB: '0,232,106',
    goalLabel: 'FOREST EXIT',
    hidingSpots: [
      { label: 'Tree Trunk',   x: 0.20, y: 0.30, w: 0.10, h: 0.14, type: 'tree' },
      { label: 'Bushes',       x: 0.55, y: 0.65, w: 0.15, h: 0.09, type: 'bush' },
      { label: 'Big Tree',     x: 0.75, y: 0.25, w: 0.10, h: 0.16, type: 'tree' },
    ],
    goalPos: { x: 0.85, y: 0.12 },
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.92, y: 0.85 },
    bgColors:    ['#000e04','#001e08','#003515'],
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: 'cat',
    img: 'images/Martin.png',
    sound: 'meow',
    level: 'THE DESERT', setting: 'Arid barren desert',
    objective: 'Reach the water well!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#ff9020', colorRGB: '255,144,32',
    goalLabel: 'WATER WELL',
    hidingSpots: [
      { label: 'Sand Dune',    x: 0.25, y: 0.35, w: 0.16, h: 0.10, type: 'dune' },
      { label: 'Ruins',        x: 0.60, y: 0.20, w: 0.14, h: 0.16, type: 'ruins' },
      { label: 'Rock',         x: 0.40, y: 0.70, w: 0.10, h: 0.10, type: 'rock' },
    ],
    goalPos: { x: 0.82, y: 0.10 },
    playerStart: { x: 0.08, y: 0.90 },
    vetStart:    { x: 0.88, y: 0.88 },
    bgColors:    ['#100600','#281000','#4a1c00'],
  },
  michi: {
    id: 'michi', name: 'MICHI', type: 'cat',
    img: 'images/Michi.png',
    sound: 'meow',
    level: 'THE BATHROOM', setting: 'Residential bathroom',
    objective: 'Avoid soap & towel!',
    reward: '🐟 FISH', rewardLabel: 'FISH',
    color: '#00b8ff', colorRGB: '0,184,255',
    goalLabel: 'CAT FLAP',
    hidingSpots: [
      { label: 'Closet',         x: 0.15, y: 0.22, w: 0.11, h: 0.15, type: 'closet' },
      { label: 'Laundry Basket', x: 0.62, y: 0.60, w: 0.13, h: 0.11, type: 'basket' },
      { label: 'Bookshelf',      x: 0.80, y: 0.40, w: 0.10, h: 0.18, type: 'shelf' },
    ],
    goalPos: { x: 0.82, y: 0.12 },
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.90, y: 0.90 },
    bgColors:    ['#00060f','#000e22','#001840'],
  },
};

const VET = {
  img: 'images/Veterinaria.png',
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
  particles: [], // Sistema de explosión

  game: {
    running:   false,
    paused:    false,
    rafId:     null,
    won:       false,
    lost:      false,
    exploding: false, // Bloquea movimientos durante la animación de muerte
    explodingTimer: 0,

    px: 0.1, py: 0.9,
    pSpeed: 0.003,
    hidden:  false,
    hiddenSpot: null,

    vx: 0.9, vy: 0.9,
    vAngle: 180,
    vetMode: 'patrol',
    lostTimer: 0,
    patrolTarget: null,
    patrolTimer: 0,

    timeLeft: 20.0, // 20 Segundos límite de juego
    lastTime: 0,

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
    case 'confirm':    buildConfirmScreen();              break;
    case 'game':       stopMenuBGM(); launchGame();       break;
    case 'win':        stopInGameMusic(); showResult(true);  break;
    case 'lose':       stopInGameMusic(); showResult(false); break;
  }
}


/* ─────────────────────────────────────────────────────────────────
   §5  ASSET PRELOADER
───────────────────────────────────────────────────────────────── */
const IMAGE_MANIFEST = [
  { key: 'molly',  src: 'images/Molly.png'       },
  { key: 'agata',  src: 'images/Agata.png'        },
  { key: 'martin', src: 'images/Martin.png'       },
  { key: 'michi',  src: 'images/Michi.png'        },
  { key: 'vet',    src: 'images/Veterinaria.png'  },
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
      img.onerror = () => {
        console.warn(`No se pudo cargar la imagen: ${src}. Usando respaldo visual geométrico.`);
        finish();
      };
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
  if (!ctx || !GS.game.running || GS.game.exploding) return;

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
      if (GS.game.running && !GS.game.paused && !GS.game.exploding) {
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
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.4);
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

function playExplosionSFX() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const bufLen = Math.floor(ctx.sampleRate * 0.6);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
  const src = ctx.createBufferSource();
  const lowpass = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  lowpass.type = 'lowpass'; lowpass.frequency.setValueAtTime(300, ctx.currentTime);
  gain.gain.setValueAtTime(0.7, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
  src.connect(lowpass); lowpass.connect(gain); gain.connect(ctx.destination);
  src.start();
}

function playSelectionSFX(soundType) {
  if (soundType === 'bark') playDogBark();
  else                      playCatMeow();
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
  const card = document.querySelector(`.quad[data-char="${charId}"]`);
  if (card) { card.classList.add('selected'); setTimeout(() => card.classList.remove('selected'), 400); }
  setTimeout(() => changeScreen('confirm'), 380);
}

function bindCharCards() {
  document.querySelectorAll('.quad[data-char]').forEach(card => {
    const id = card.dataset.char;
    card.addEventListener('click',   () => { ensureAudio(); selectCharacter(id); });
  });
}


/* ─────────────────────────────────────────────────────────────────
   §9  GAMEPLAY ENGINE & PARTICLE SYSTEM
───────────────────────────────────────────────────────────────── */
let gameCanvas, gameCtx;

function createExplosion(x, y, color) {
  for (let i = 0; i < 40; i++) {
    GS.particles.push({
      x: x, y: y,
      vx: (Math.random() * 2 - 1) * 0.01,
      vy: (Math.random() * 2 - 1) * 0.01,
      radius: Math.random() * 6 + 4,
      color: color,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.01
    });
  }
}

function launchGame() {
  const c = GS.char;
  if (!c) { changeScreen('charselect'); return; }

  const g = GS.game;
  g.running   = true;
  g.paused    = false;
  g.won       = false;
  g.lost      = false;
  g.exploding = false;
  g.explodingTimer = 0;
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
  g.timeLeft  = 20.0; // 20 segundos asignados
  g.lastTime  = performance.now();
  g.keys      = {};
  GS.particles = [];

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

function gameLoop() {
  const g = GS.game;
  if (!g.running) return;
  if (!g.paused) {
    updateGame();
    renderGame();
  }
  g.rafId = requestAnimationFrame(gameLoop);
}


/* ── 9B  UPDATE GAMEPLAY ── */
function updateGame() {
  const g  = GS.game;
  const c  = GS.char;
  const now = performance.now();
  const dt = (now - g.lastTime) / 1000;
  g.lastTime = now;

  // Si está en proceso de explosión, actualizar partículas e ir a la pantalla de fin
  if (g.exploding) {
    g.explodingTimer += dt;
    GS.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
    });
    GS.particles = GS.particles.filter(p => p.alpha > 0);

    if (g.explodingTimer >= 2.0) { // Duración de la animación antes de la redirección
      stopGame();
      changeScreen(g.won ? 'win' : 'lose');
    }
    return;
  }

  // Reducir minutero / temporizador
  g.timeLeft -= dt;
  if (g.timeLeft <= 0) {
    g.timeLeft = 0;
    triggerExplosionLose(); // Perder por tiempo agota la ronda y explota
    return;
  }

  // Movimiento Jugador
  const spd = g.pSpeed;
  let dx = 0, dy = 0;
  if (g.keys['w'] || g.keys['arrowup'])    dy -= spd;
  if (g.keys['s'] || g.keys['arrowdown'])  dy += spd;
  if (g.keys['a'] || g.keys['arrowleft'])  dx -= spd;
  if (g.keys['d'] || g.keys['arrowright']) dx += spd;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  if (g.keys['shift']) { dx *= 1.5; dy *= 1.5; }

  g.px = Math.max(0.01, Math.min(0.99, g.px + dx));
  g.py = Math.max(0.01, Math.min(0.99, g.py + dy));

  // Hiding spots
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

  // Meta alcanzada (Victoria)
  const goal = c.goalPos;
  const distToGoal = Math.hypot(g.px - goal.x, g.py - goal.y);
  if (distToGoal < 0.055) {
    g.exploding = true;
    g.won = true;
    createExplosion(g.px, g.py, '#fff500');
    return;
  }

  // Inteligencia de la veterinaria
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

  // Veterinaria atrapa a la mascota (Derrota)
  if (rawDist < 0.045 && !g.hidden) {
    triggerExplosionLose();
    return;
  }

  updateHUD();
}

function triggerExplosionLose() {
  const g = GS.game;
  stopInGameMusic();
  playExplosionSFX();
  g.exploding = true;
  g.lost = true;
  createExplosion(g.px, g.py, GS.char.color); // Explota la mascota
  createExplosion(g.vx, g.vy, '#ff2d78');     // Explota la Veterinaria
}

function _inCone(g) {
  const toPlayerAngle = Math.atan2(g.py - g.vy, g.px - g.vx) * 180 / Math.PI;
  let diff = toPlayerAngle - g.vAngle;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) < VET.visionAngle;
}


/* ── 9C  RENDERIZADO EN CANVAS (Escenarios Temáticos Incluidos) ── */
function renderGame() {
  const g = GS.game;
  const c = GS.char;
  const W = gameCanvas.width;
  const H = gameCanvas.height;
  const ctx = gameCtx;

  // Dibujar el Escenario Base según la locación elegida
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   c.bgColors[0]);
  grad.addColorStop(0.5, c.bgColors[1]);
  grad.addColorStop(1,   c.bgColors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Elementos Decorativos Temáticos en el Canvas para simular el escenario original
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  if (c.id === 'agata') { // Bosque: Dibujar pinos abstractos geométricos de fondo
    ctx.fillStyle = 'rgba(0, 232, 106, 0.04)';
    for(let i=1; i<=5; i++) {
      ctx.beginPath(); ctx.moveTo(W*(i*0.15), H*0.3); ctx.lineTo(W*(i*0.15+0.05), H*0.5); ctx.lineTo(W*(i*0.15-0.05), H*0.5); ctx.fill();
    }
  } else if (c.id === 'martin') { // Desierto: Líneas horizontales simulando dunas y calor
    ctx.strokeStyle = 'rgba(255, 144, 32, 0.05)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, H*0.4); ctx.quadraticCurveTo(W*0.4, H*0.3, W, H*0.5); ctx.stroke();
  } else if (c.id === 'michi') { // Baño: Dibujar un patrón de azulejos cuadriculado brillante
    ctx.strokeStyle = 'rgba(0, 184, 255, 0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  }

  // Dibujar Escondites
  c.hidingSpots.forEach(spot => {
    const sx = spot.x * W, sy = spot.y * H;
    const sw = spot.w * W, sh = spot.h * H;
    ctx.fillStyle   = g.hiddenSpot === spot ? `rgba(${c.colorRGB},0.35)` : `rgba(${c.colorRGB},0.12)`;
    ctx.strokeStyle = `rgba(${c.colorRGB},0.7)`;
    ctx.lineWidth   = 2;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);

    // Dibujar figura original simplificada si no carga la imagen
    ctx.fillStyle   = `rgba(${c.colorRGB},0.9)`;
    ctx.font        = `bold ${Math.max(10, W * 0.012)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText(spot.label, sx + sw / 2, sy + sh / 2 + 4);
  });

  // Dibujar Meta (Premio/Reward)
  const gx = c.goalPos.x * W, gy = c.goalPos.y * H, gr = W * 0.038;
  ctx.save();
  ctx.shadowColor = c.color; ctx.shadowBlur = 18;
  ctx.strokeStyle = c.color; ctx.lineWidth  = 3;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 350);
  ctx.fillStyle = `rgba(${c.colorRGB},${0.15 + 0.2 * pulse})`;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle   = c.color;
  ctx.font        = `bold ${Math.max(9, W * 0.011)}px monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText(c.goalLabel, gx, gy - 8);
  ctx.font        = `normal ${Math.max(11, W * 0.013)}px sans-serif`;
  ctx.fillText(c.reward, gx, gy + 12); // Muestra el premio aquí físicamente

  // Cono de Visión de la Veterinaria
  if (!g.hidden && !g.exploding) {
    const vxPx = g.vx * W, vyPx = g.vy * H;
    const coneRange = VET.visionRange * W;
    const halfAngle = VET.visionAngle * Math.PI / 180;
    const baseAngle = g.vAngle * Math.PI / 180;
    ctx.save();
    ctx.fillStyle = g.vetMode === 'chase' ? 'rgba(255,45,120,0.25)' : 'rgba(255,45,120,0.09)';
    ctx.beginPath(); ctx.moveTo(vxPx, vyPx);
    ctx.arc(vxPx, vyPx, coneRange, baseAngle - halfAngle, baseAngle + halfAngle);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Renderizar Personajes (Mascota / Veterinaria) si no hay explosión
  if (!g.exploding) {
    _drawSprite(ctx, 'vet', g.vx * W, g.vy * H, W * 0.095, H * 0.14);
    if (!g.hidden) {
      _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.080, H * 0.12);
    } else {
      ctx.save(); ctx.globalAlpha = 0.25;
      _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.080, H * 0.12);
      ctx.restore();
      ctx.fillStyle = c.color; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('👁 HIDING', g.px * W, g.py * H - 40);
    }
  }

  // Dibujar Partículas de la Explosión
  GS.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Alertas en pantalla
  if (g.vetMode === 'chase' && !g.exploding) {
    ctx.fillStyle = 'rgba(255,45,120,0.85)'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚠ SHE SEES YOU! ⚠', W / 2, H * 0.07);
  }
}

/**
 * Función encargada de pintar los rostros reales/originales de tus imágenes en PNG.
 * Si por algún motivo la URL falla en el servidor, autogenera una carita con ojos y boca
 * para que nunca más aparezcan íconos rotos sin gracia.
 */
function _drawSprite(ctx, key, cx, cy, w, h) {
  const img = GS.images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    // Si la imagen cargó desde la carpeta images/, se plasma con sus caras en la pantalla
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    // Fallback Inteligente: ¡Dibuja figuras con sus rostros pixel-art para que no se vea vacío!
    const radius = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = key === 'vet' ? '#ff2d78' : (GS.char?.color || '#00f5ff');
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Dibujar ojos y caritas interactivas para simular los personajes originales
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - radius*0.3, cy - radius*0.1, radius*0.12, 0, Math.PI*2); // Ojo izquierdo
    ctx.arc(cx + radius*0.3, cy - radius*0.1, radius*0.12, 0, Math.PI*2); // Ojo derecho
    ctx.fill();

    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath();
    if (key === 'vet') {
      ctx.arc(cx, cy + radius*0.3, radius*0.25, 0, Math.PI, true); // Boca seria/enojada de veterinaria
    } else {
      ctx.arc(cx, cy + radius*0.1, radius*0.3, 0, Math.PI, false); // Boca sonriente de mascota
    }
    ctx.stroke();

    // Inicial de Texto arriba
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(key === 'vet' ? 'VET' : key.toUpperCase(), cx, cy - radius - 6);
  }
}


/* ─────────────────────────────────────────────────────────────────
   §10  HUD & MINUTERO
───────────────────────────────────────────────────────────────── */
function initHUD() {
  const c = GS.char;
  if (!c) return;
  const nm = $('hudCharName');
  if (nm) nm.textContent = c.name;
  updateHUDStatus('EVADING...');
}

function updateHUD() {
  const g = GS.game;
  // Actualizar Minutero visual en la barra superior de estatus
  const elStatus = $('hudStatus');
  if (elStatus) {
    let statusText = g.hidden ? '🙈 HIDING!' : (g.vetMode === 'chase' ? '⚠ CHASED!' : 'EVADING...');
    elStatus.textContent = `⏱️ TIME: ${g.timeLeft.toFixed(1)}s | ${statusText}`;
  }

  const fill = $('hudProxFill');
  if (fill) {
    const pct = Math.min(1, g.proximity) * 100;
    fill.style.width = pct + '%';
  }
}

function updateHUDStatus(txt) {
  const el = $('hudStatus');
  if (el) el.textContent = txt;
}

function togglePause() {
  const g = GS.game;
  g.paused = !g.paused;
  const btn = $('btnPause');
  if (btn) btn.textContent = g.paused ? '▶ RESUME' : '⏸ PAUSE';
  if (!g.paused) { g.lastTime = performance.now(); startInGameMusic(); }
  else stopInGameMusic();
}


/* ─────────────────────────────────────────────────────────────────
   §11  WIN / GAME OVER RESULT SCREENS (Redirección automática incorporada)
───────────────────────────────────────────────────────────────── */
function showResult(won) {
  const c   = GS.char;
  const wrap = $('gameCanvasWrap');

  const overlay = document.createElement('div');
  overlay.id = 'resultOverlay';
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    background:rgba(10,5,5,0.92);z-index:500;
    font-family:'Press Start 2P',monospace;text-align:center;padding:2rem;
  `;

  if (won) {
    // Victoria: Reclama el premio estipulado
    overlay.innerHTML = `
      <div style="font-size:3.5rem;margin-bottom:1rem">🎉</div>
      <div style="font-size:2rem;color:${c.color};margin-bottom:1rem;">¡ESCAPASTE!</div>
      <div style="font-size:0.8rem;color:#fff;margin-bottom:2rem;line-height:2">
        ${c.name} ganó su recompensa:<br><span style="font-size:1.5rem">${c.reward} (${c.rewardLabel})</span>
      </div>
      <button id="btnToMenu" style="${_btnStyle(c.color)}">VOLVER A JUGAR</button>
    `;
  } else {
    // Derrota: Requerimiento de explosión + Letrero clásico GAME OVER
    overlay.innerHTML = `
      <div style="font-size:4rem;color:#ff2d78;text-shadow:0 0 15px #ff2d78;margin-bottom:1.5rem;letter-spacing:0.1em;">GAME OVER</div>
      <div style="font-size:0.7rem;color:#ccc;margin-bottom:2.5rem;line-height:1.8;">LA VETERINARIA ATROPÓ A ${c.name}</div>
      <button id="btnToMenu" style="${_btnStyle('#ff2d78')}">INTENTAR DE NUEVO</button>
    `;
  }

  $('screen-game').appendChild(overlay);

  // Redirecciona al menú principal de inmediato al dar clic para reiniciar el ciclo del juego limpio
  $('btnToMenu').addEventListener('click', () => {
    overlay.remove();
    stopInGameMusic();
    stopMenuBGM();
    changeScreen('mainmenu');
  });
}

function _btnStyle(color) {
  return `font-family:'Press Start 2P',monospace;font-size:0.7rem;
    cursor:pointer;padding:1em 2em;border:3px solid ${color};background:transparent;
    color:${color};letter-spacing:0.1em;transition:transform 0.1s;text-transform:uppercase;`;
}


/* ─────────────────────────────────────────────────────────────────
   §12  BUTTON BINDINGS
───────────────────────────────────────────────────────────────── */
function bindButtons() {
  $('btnStartGame')?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')    ?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')   ?.addEventListener('click', () => { startMenuBGM(); changeScreen('mainmenu'); });
  $('btnConfirmYes')?.addEventListener('click', () => { ensureAudio(); changeScreen('game'); });
  $('btnConfirmNo') ?.addEventListener('click', () => { GS.char = null; startMenuBGM(); changeScreen('charselect'); });
  $('btnPause')    ?.addEventListener('click', () => togglePause());
}


/* ─────────────────────────────────────────────────────────────────
   §13  KEYBOARD SHORTCUTS
───────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (GS.screen === 'mainmenu' && e.key === 'Enter') { ensureAudio(); changeScreen('charselect'); }
  if (e.key === 'Escape') {
    if (GS.screen === 'howtoplay' || GS.screen === 'charselect') changeScreen('mainmenu');
    if (GS.screen === 'confirm') { GS.char = null; startMenuBGM(); changeScreen('charselect'); }
  }
});


/* ─────────────────────────────────────────────────────────────────
   §14  INIT
───────────────────────────────────────────────────────────────── */
async function init() {
  console.log('🐾 Furry Escapades — Inicializando nueva versión...');
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  await preloadImages();
  await new Promise(r => setTimeout(r, 300));
  changeScreen('mainmenu');
}

document.addEventListener('DOMContentLoaded', init);
