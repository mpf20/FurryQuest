/**
 * ═══════════════════════════════════════════════════════════════════
 *  FURRY ESCAPADES: OUTSMART THE VET  ·  script.js  (v4)
 *
 *  CHANGES FROM v3:
 *  ✅  Image paths corrected → assets/images/  (matches repo structure)
 *  ✅  Win condition: survive 30-second countdown (no goal circle)
 *  ✅  Loss condition: Vet touches player while not hidden
 *  ✅  HUD shows live countdown timer
 *  ✅  Win/Lose overlay rebuilt — no DOM crashes, renders over canvas
 *  ✅  Thematic canvas decorations per level (clothes, trees, dunes, tiles)
 *  ✅  All audio 100% Web Audio API synthesised (zero file fetches)
 *
 *  IMAGE PATHS (assets/images/ folder, case-sensitive):
 *    assets/images/Molly.png
 *    assets/images/Agata.png
 *    assets/images/Martin.png
 *    assets/images/Michi.png
 *    assets/images/Veterinaria.png
 *
 *  STATE MACHINE:
 *    loading → mainmenu ⇄ howtoplay
 *    mainmenu → charselect → confirm → game
 *    game (timer=0, survived) → WIN overlay
 *    game (vet catches player)  → LOSE overlay
 *    WIN / LOSE overlay → retry (game) | menu (mainmenu)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════════
   §1  CHARACTER REGISTRY
   All paths use  assets/images/  to match the repo's folder structure.
═══════════════════════════════════════════════════════════════════ */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: 'dog',
    img: 'assets/images/Molly.png',
    sound: 'bark',
    level: 'THE HOUSE',
    objective: 'Survive 30s hiding from the Vet!',
    reward: '🦴 BONE',
    color: '#c860ff', colorRGB: [200, 96, 255],
    bgColors: ['#0d0018', '#1e0040', '#3a0060'],
    hidingSpots: [
      { label: 'Under Bed',  x: 0.10, y: 0.12, w: 0.18, h: 0.10 },
      { label: 'Sofa',       x: 0.60, y: 0.50, w: 0.20, h: 0.11 },
      { label: 'Cabinet',    x: 0.30, y: 0.72, w: 0.14, h: 0.10 },
    ],
    playerStart: { x: 0.12, y: 0.82 },
    vetStart:    { x: 0.85, y: 0.85 },
    // Thematic decoration function key
    decor: 'house',
  },
  agata: {
    id: 'agata', name: 'AGATA', type: 'cat',
    img: 'assets/images/Agata.png',
    sound: 'meow',
    level: 'THE FOREST',
    objective: 'Survive 30s hiding from the Vet!',
    reward: '🐟 FISH',
    color: '#00e86a', colorRGB: [0, 232, 106],
    bgColors: ['#000e04', '#001e08', '#003515'],
    hidingSpots: [
      { label: 'Tree Trunk', x: 0.15, y: 0.25, w: 0.10, h: 0.16 },
      { label: 'Bushes',     x: 0.55, y: 0.60, w: 0.16, h: 0.10 },
      { label: 'Big Tree',   x: 0.72, y: 0.20, w: 0.11, h: 0.18 },
    ],
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.90, y: 0.85 },
    decor: 'forest',
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: 'cat',
    img: 'assets/images/Martin.png',
    sound: 'meow',
    level: 'THE DESERT',
    objective: 'Survive 30s hiding from the Vet!',
    reward: '🐟 FISH',
    color: '#ff9020', colorRGB: [255, 144, 32],
    bgColors: ['#100600', '#281000', '#4a1c00'],
    hidingSpots: [
      { label: 'Sand Dune', x: 0.22, y: 0.30, w: 0.18, h: 0.11 },
      { label: 'Ruins',     x: 0.58, y: 0.18, w: 0.15, h: 0.18 },
      { label: 'Rock',      x: 0.38, y: 0.68, w: 0.12, h: 0.11 },
    ],
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.88, y: 0.85 },
    decor: 'desert',
  },
  michi: {
    id: 'michi', name: 'MICHI', type: 'cat',
    img: 'assets/images/Michi.png',
    sound: 'meow',
    level: 'THE BATHROOM',
    objective: 'Survive 30s hiding from the Vet!',
    reward: '🐟 FISH',
    color: '#00b8ff', colorRGB: [0, 184, 255],
    bgColors: ['#00060f', '#000e22', '#001840'],
    hidingSpots: [
      { label: 'Closet',      x: 0.12, y: 0.18, w: 0.12, h: 0.17 },
      { label: 'Laundry',     x: 0.60, y: 0.58, w: 0.14, h: 0.12 },
      { label: 'Bookshelf',   x: 0.76, y: 0.35, w: 0.11, h: 0.20 },
    ],
    playerStart: { x: 0.08, y: 0.88 },
    vetStart:    { x: 0.88, y: 0.88 },
    decor: 'bathroom',
  },
};

const VET = {
  img:          'assets/images/Veterinaria.png',
  patrolSpeed:  0.0020,   // canvas-fraction per frame while patrolling
  chaseSpeed:   0.0042,   // canvas-fraction per frame while chasing
  visionAngle:  52,       // half-cone degrees
  visionRange:  0.33,     // canvas-fraction
};

const SURVIVE_SECONDS = 30;  // countdown duration


/* ═══════════════════════════════════════════════════════════════════
   §2  GLOBAL STATE
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen: 'loading',
  char:   null,       // selected CharacterData object
  images: {},         // key → HTMLImageElement

  game: {
    running:      false,
    paused:       false,
    rafId:        null,
    over:         false,   // true once win or lose fires

    // Player
    px: 0.1, py: 0.9,
    hidden:       false,
    hiddenSpot:   null,

    // Vet
    vx: 0.9, vy: 0.9,
    vAngle: 180,                // facing direction, degrees
    vetMode: 'patrol',          // 'patrol' | 'chase'
    lostTimer: 0,
    patrolTarget: null,
    patrolTimer:  0,

    // Countdown
    timeLeft:     SURVIVE_SECONDS,  // seconds remaining
    lastTick:     0,                // timestamp of last whole-second decrement

    // HUD
    proximity:    0,

    // Input map
    keys: {},
  },

  audio: {
    ctx:        null,
    bgmActive:  false,
    bgmNodes:   [],
    bgmTimer:   null,
    igAudio:    null,   // in-game audio handle { stop() }
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §3  UTILITY
═══════════════════════════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function rgba(colorRGB, a) {
  return `rgba(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]},${a})`;
}

/** Clamp a value between min and max */
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }


/* ═══════════════════════════════════════════════════════════════════
   §4  SCREEN MANAGER
═══════════════════════════════════════════════════════════════════ */
const SCREEN_ELS = {
  loading:    $('screen-loading'),
  mainmenu:   $('screen-mainmenu'),
  howtoplay:  $('screen-howtoplay'),
  charselect: $('screen-charselect'),
  confirm:    $('screen-confirm'),
  game:       $('screen-game'),
};

function changeScreen(name) {
  if (!SCREEN_ELS[name]) { console.error('[Screen] unknown:', name); return; }
  const prev = SCREEN_ELS[GS.screen];
  if (prev) prev.classList.remove('active');
  GS.screen = name;
  SCREEN_ELS[name].classList.add('active');
  console.log('[Screen →]', name);

  switch (name) {
    case 'mainmenu':   stopInGameAudio(); startMenuBGM(); break;
    case 'confirm':    buildConfirmScreen();               break;
    case 'game':       stopMenuBGM();     launchGame();   break;
  }
}


/* ═══════════════════════════════════════════════════════════════════
   §5  ASSET PRELOADER  — images only, no audio files
═══════════════════════════════════════════════════════════════════ */
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
      img.onerror = finish;   // never block on a missing file
      img.src = src;
    });
  });
}

function setLoadBar(pct) {
  const bar = $('loadBar'), lbl = $('loadPct');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent  = pct + '%';
}


/* ═══════════════════════════════════════════════════════════════════
   §6  WEB AUDIO ENGINE  — 100% synthesised, zero file fetches
═══════════════════════════════════════════════════════════════════ */

function ensureAudio() {
  if (!GS.audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { GS.audio.ctx = new Ctx(); } catch (e) { return false; }
  }
  if (GS.audio.ctx.state === 'suspended') GS.audio.ctx.resume();
  return true;
}

/* ── 6A  Menu BGM: pentatonic square-wave arpeggio ── */
const MENU_FREQS = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  783.99, 659.25, 587.33, 523.25, 440.00, 392.00, 329.63,
];

function startMenuBGM() {
  if (GS.audio.bgmActive) return;
  if (!ensureAudio()) return;
  GS.audio.bgmActive = true;
  _loopMenuArp();
}

function stopMenuBGM() {
  GS.audio.bgmActive = false;
  clearTimeout(GS.audio.bgmTimer);
  _killNodes(GS.audio.bgmNodes);
  GS.audio.bgmNodes = [];
}

function _loopMenuArp() {
  const ctx = GS.audio.ctx;
  if (!ctx || !GS.audio.bgmActive) return;
  const dur = 0.13;
  let t = ctx.currentTime;
  MENU_FREQS.forEach(freq => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur - 0.01);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
    GS.audio.bgmNodes.push(o, g);
    t += dur;
  });
  GS.audio.bgmTimer = setTimeout(_loopMenuArp, (MENU_FREQS.length * dur - 0.04) * 1000);
}

/* ── 6B  In-game BGM: Maqam Hijaz Arabic melody + percussion ── */
/*
 *  Maqam Hijaz characteristic intervals rooted on D4:
 *  D4(293.66) Eb4(311.13) F#4(369.99) G4(392) A4(440) Bb4(466.16) C#5(554.37) D5(587.33)
 *  The flat-2 (Eb) and augmented-2 (Eb→F#) give the Arabic/flamenco colour.
 */
const HIJAZ = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
const HIJAZ_MOTIF = [0,2,3,2,1,0,4,3,2,3,0,5,4,3,2,1,0,6,5,4,3,2,1,0];
const HIJAZ_DURS  = [.25,.15,.20,.15,.25,.30,.20,.15,.25,.20,.30,
                     .20,.15,.25,.15,.20,.30,.20,.15,.25,.20,.15,.20,.35];

function startInGameAudio() {
  if (!ensureAudio()) return;
  _scheduleHijazPhrase(1.0);
}

function _scheduleHijazPhrase(tempoMult) {
  const ctx = GS.audio.ctx;
  if (!ctx || !GS.game.running) return;

  const nodes   = [];
  const master  = ctx.createGain();
  master.gain.setValueAtTime(0.07, ctx.currentTime);
  master.connect(ctx.destination);
  nodes.push(master);

  let t = ctx.currentTime;

  HIJAZ_MOTIF.forEach((si, i) => {
    const freq = HIJAZ[si];
    const dur  = (HIJAZ_DURS[i] || 0.2) / tempoMult;

    // Melody — sawtooth (oud-like)
    const mo = ctx.createOscillator(), mg = ctx.createGain();
    mo.type = 'sawtooth';
    mo.frequency.setValueAtTime(freq, t);
    mg.gain.setValueAtTime(0.4, t);
    mg.gain.exponentialRampToValueAtTime(0.0001, t + dur - 0.01);
    mo.connect(mg); mg.connect(master);
    mo.start(t); mo.stop(t + dur);
    nodes.push(mo, mg);

    // Doumbek kick on beats 0, 4, 8...
    if (i % 4 === 0) {
      const ko = ctx.createOscillator(), kg = ctx.createGain();
      ko.type = 'sine';
      ko.frequency.setValueAtTime(190, t);
      ko.frequency.exponentialRampToValueAtTime(55, t + 0.07);
      kg.gain.setValueAtTime(0.38, t);
      kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      ko.connect(kg); kg.connect(master);
      ko.start(t); ko.stop(t + 0.13);
      nodes.push(ko, kg);
    }

    // Off-beat click (riq frame drum)
    if (i % 4 === 2) {
      const co = ctx.createOscillator(), cg = ctx.createGain();
      co.type = 'triangle';
      co.frequency.setValueAtTime(620, t);
      cg.gain.setValueAtTime(0.10, t);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      co.connect(cg); cg.connect(master);
      co.start(t); co.stop(t + 0.06);
      nodes.push(co, cg);
    }

    t += dur;
  });

  const phraseDurMs = (t - ctx.currentTime) * 1000 - 50;

  const timer = setTimeout(() => {
    if (GS.game.running && !GS.game.paused && !GS.game.over) {
      // Recalculate tempo from current proximity (up to 2.8× faster)
      const mult = 1.0 + GS.game.proximity * 1.8;
      _scheduleHijazPhrase(mult);
    }
  }, phraseDurMs);

  GS.audio.igAudio = {
    nodes, timer,
    stop() {
      clearTimeout(this.timer);
      _killNodes(this.nodes);
    },
  };
}

function stopInGameAudio() {
  if (GS.audio.igAudio) { GS.audio.igAudio.stop(); GS.audio.igAudio = null; }
}

/* ── 6C  Selection SFX ── */
function playCatMeow() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(710, t);
  o.frequency.exponentialRampToValueAtTime(340, t + 0.26);
  o.frequency.exponentialRampToValueAtTime(530, t + 0.46);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.5);
}

function playDogBark() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const len = Math.floor(ctx.sampleRate * 0.18);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  const src = ctx.createBufferSource(), bpf = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  bpf.type = 'bandpass'; bpf.frequency.value = 860; bpf.Q.value = 0.7;
  g.gain.setValueAtTime(0.5, ctx.currentTime);
  src.connect(bpf); bpf.connect(g); g.connect(ctx.destination);
  src.start();
}

function playSelectionSFX(type) { type === 'bark' ? playDogBark() : playCatMeow(); }

/* ── 6D  Result jingles ── */
function playWinJingle() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const t = ctx.currentTime + i * 0.22;
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.10, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.3);
  });
}

function playLoseJingle() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  [440, 392, 349.23, 261.63].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const t = ctx.currentTime + i * 0.28;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.36);
  });
}

/* ── 6E  Utility ── */
function _killNodes(arr) {
  if (!arr) return;
  arr.forEach(n => { try { n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} });
  arr.length = 0;
}


/* ═══════════════════════════════════════════════════════════════════
   §7  CONFIRM SCREEN
═══════════════════════════════════════════════════════════════════ */
function buildConfirmScreen() {
  const c = GS.char; if (!c) return;
  const av = $('confirmAvatar'), nm = $('confirmName'), lv = $('confirmLevel'), ob = $('confirmObj');
  if (av)  { av.src = c.img; av.alt = c.name; }
  if (nm)  nm.textContent  = c.name;
  if (lv)  lv.textContent  = `📍 ${c.level}  ·  ${c.reward}`;
  if (ob)  ob.textContent  = c.objective;
}


/* ═══════════════════════════════════════════════════════════════════
   §8  CHARACTER CARD SELECTION
═══════════════════════════════════════════════════════════════════ */
function selectCharacter(charId) {
  const c = CHARACTERS[charId]; if (!c) return;
  GS.char = c;
  stopMenuBGM();
  ensureAudio();
  playSelectionSFX(c.sound);
  const card = document.querySelector(`.quad[data-char="${charId}"]`);
  if (card) { card.classList.add('selected'); setTimeout(() => card.classList.remove('selected'), 400); }
  setTimeout(() => changeScreen('confirm'), 380);
}

function bindCharCards() {
  $$('.quad[data-char]').forEach(card => {
    const id = card.dataset.char;
    card.addEventListener('click',   () => { ensureAudio(); selectCharacter(id); });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ensureAudio(); selectCharacter(id); }
    });
  });
}


/* ═══════════════════════════════════════════════════════════════════
   §9  GAMEPLAY ENGINE
   2-D top-down canvas. WASD/Arrows to move. E to hide (when in zone).
   Survive 30 seconds → WIN. Vet catches you → LOSE.
═══════════════════════════════════════════════════════════════════ */

let gCanvas, gCtx;

/* ── 9A  Launch ── */
function launchGame() {
  const c = GS.char;
  if (!c) { changeScreen('charselect'); return; }

  // Remove any previous result overlay
  const old = $('resultOverlay');
  if (old) old.remove();

  // Reset game state
  const g = GS.game;
  g.running      = true;
  g.paused       = false;
  g.over         = false;
  g.px           = c.playerStart.x;
  g.py           = c.playerStart.y;
  g.hidden       = false;
  g.hiddenSpot   = null;
  g.vx           = c.vetStart.x;
  g.vy           = c.vetStart.y;
  g.vAngle       = 180;
  g.vetMode      = 'patrol';
  g.lostTimer    = 0;
  g.patrolTarget = null;
  g.patrolTimer  = 0;
  g.proximity    = 0;
  g.timeLeft     = SURVIVE_SECONDS;
  g.lastTick     = performance.now();
  g.keys         = {};

  // Build canvas
  const wrap = $('gameCanvasWrap');
  wrap.innerHTML = '';
  gCanvas = document.createElement('canvas');
  gCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.appendChild(gCanvas);
  resizeCanvas();

  gCtx = gCanvas.getContext('2d');

  // Seed deterministic decorations for this run
  seedDecor(c);

  // Input
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);

  // HUD
  updateHUDName(c.name);
  updateHUDStatus('EVADING...');
  updateHUDTimer(SURVIVE_SECONDS);

  // Audio
  stopInGameAudio();
  startInGameAudio();

  // Start loop
  if (g.rafId) cancelAnimationFrame(g.rafId);
  g.rafId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  if (!gCanvas) return;
  const w = gCanvas.parentElement?.clientWidth  || window.innerWidth;
  const h = gCanvas.parentElement?.clientHeight || window.innerHeight;
  gCanvas.width  = w;
  gCanvas.height = h;
}
window.addEventListener('resize', resizeCanvas);

function stopGameLoop() {
  GS.game.running = false;
  if (GS.game.rafId) { cancelAnimationFrame(GS.game.rafId); GS.game.rafId = null; }
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup',   onKeyUp);
}

function onKeyDown(e) {
  GS.game.keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape' && GS.screen === 'game') togglePause();
}
function onKeyUp(e) { GS.game.keys[e.key.toLowerCase()] = false; }

/* ── 9B  Main game loop ── */
function gameLoop(ts) {
  const g = GS.game;
  if (!g.running) return;
  if (!g.paused && !g.over) {
    updateGame(ts);
    renderGame();
  } else if (g.paused) {
    renderGame();   // keep canvas visible while paused
  }
  g.rafId = requestAnimationFrame(gameLoop);
}

/* ── 9C  Update ── */
function updateGame(ts) {
  const g = GS.game;
  const c = GS.char;

  /* — 30-second countdown — */
  const elapsed = (ts - g.lastTick) / 1000;
  if (elapsed >= 1) {
    g.timeLeft  = Math.max(0, g.timeLeft - Math.floor(elapsed));
    g.lastTick  = ts;
    updateHUDTimer(g.timeLeft);
    if (g.timeLeft <= 0) {
      triggerOutcome(true);   // survived — WIN
      return;
    }
  }

  /* — Player movement (WASD / Arrows) — */
  let dx = 0, dy = 0;
  const spd = 0.003;
  if (g.keys['w'] || g.keys['arrowup'])    dy -= spd;
  if (g.keys['s'] || g.keys['arrowdown'])  dy += spd;
  if (g.keys['a'] || g.keys['arrowleft'])  dx -= spd;
  if (g.keys['d'] || g.keys['arrowright']) dx += spd;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  if (g.keys['shift']) { dx *= 1.6; dy *= 1.6; }
  g.px = clamp(g.px + dx, 0.01, 0.99);
  g.py = clamp(g.py + dy, 0.01, 0.99);

  /* — Hiding spot detection — */
  g.hidden     = false;
  g.hiddenSpot = null;
  for (const spot of c.hidingSpots) {
    if (g.px >= spot.x && g.px <= spot.x + spot.w &&
        g.py >= spot.y && g.py <= spot.y + spot.h) {
      g.hidden     = true;
      g.hiddenSpot = spot;
      break;
    }
  }

  /* — Proximity — */
  const rawDist = Math.hypot(g.px - g.vx, g.py - g.vy);
  g.proximity   = clamp(1 - rawDist / VET.visionRange, 0, 1);

  /* — Catch check (LOSE) — */
  if (rawDist < 0.045 && !g.hidden) {
    triggerOutcome(false);
    return;
  }

  /* — Vet vision cone — */
  const canSee = !g.hidden && rawDist < VET.visionRange && _playerInCone(g);

  if (canSee) {
    g.vetMode   = 'chase';
    g.lostTimer = 0;
  } else if (g.vetMode === 'chase') {
    g.lostTimer++;
    if (g.lostTimer > 100) { g.vetMode = 'patrol'; g.patrolTarget = null; }
  }

  /* — Vet movement — */
  if (g.vetMode === 'chase') {
    const ang = Math.atan2(g.py - g.vy, g.px - g.vx);
    g.vx += Math.cos(ang) * VET.chaseSpeed;
    g.vy += Math.sin(ang) * VET.chaseSpeed;
    g.vAngle = ang * 180 / Math.PI;
  } else {
    g.patrolTimer--;
    if (!g.patrolTarget || g.patrolTimer <= 0) {
      g.patrolTarget = { x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.84 };
      g.patrolTimer  = 130 + Math.floor(Math.random() * 80);
    }
    const ang = Math.atan2(g.patrolTarget.y - g.vy, g.patrolTarget.x - g.vx);
    g.vx += Math.cos(ang) * VET.patrolSpeed;
    g.vy += Math.sin(ang) * VET.patrolSpeed;
    g.vAngle = ang * 180 / Math.PI;
  }
  g.vx = clamp(g.vx, 0.01, 0.99);
  g.vy = clamp(g.vy, 0.01, 0.99);

  /* — HUD update — */
  refreshHUD();
}

function _playerInCone(g) {
  const toP = Math.atan2(g.py - g.vy, g.px - g.vx) * 180 / Math.PI;
  let diff = toP - g.vAngle;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) < VET.visionAngle;
}

/* ── 9D  triggerOutcome — safe win/lose handler ── */
function triggerOutcome(won) {
  const g = GS.game;
  if (g.over) return;     // prevent double-fire
  g.over    = true;
  g.running = false;      // stop update; keep RAF for one last render

  stopInGameAudio();
  cancelAnimationFrame(g.rafId);
  g.rafId = null;

  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup',   onKeyUp);

  if (won) playWinJingle();
  else     playLoseJingle();

  // Render the final frame before overlay so canvas isn't blank
  renderGame();

  // Small delay so the jingle has a moment and the last frame is visible
  setTimeout(() => showResultOverlay(won), 550);
}

/* ── 9E  Result overlay — injected safely into #screen-game ── */
function showResultOverlay(won) {
  // Remove any stale overlay
  const stale = $('resultOverlay');
  if (stale) stale.remove();

  const c     = GS.char;
  const color = won ? (c?.color || '#00f5ff') : '#ff2d78';
  const emoji = won ? '🎉' : '😿';
  const title = won ? 'YOU SURVIVED!' : 'CAUGHT!';
  const sub   = won
    ? `${c?.name} earned ${c?.reward}!`
    : `The Vet caught ${c?.name || 'you'}!`;

  // Build overlay as a plain div — no innerHTML for buttons
  // (keeps CSP-friendly and avoids broken event listener edge-cases)
  const ov = document.createElement('div');
  ov.id = 'resultOverlay';

  // All styles inline so they don't depend on style.css being loaded
  Object.assign(ov.style, {
    position:       'absolute',
    inset:          '0',
    zIndex:         '9999',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'rgba(4,6,14,0.90)',
    fontFamily:     "'Press Start 2P', monospace",
    textAlign:      'center',
    padding:        '2rem',
    boxSizing:      'border-box',
  });

  // Emoji
  const eEl = document.createElement('div');
  eEl.textContent = emoji;
  Object.assign(eEl.style, { fontSize: 'clamp(2.5rem,8vw,5rem)', marginBottom: '1rem' });

  // Title
  const tEl = document.createElement('div');
  tEl.textContent = title;
  Object.assign(tEl.style, {
    fontSize:    'clamp(1rem,3.5vw,2.2rem)',
    color:       color,
    textShadow:  `0 0 14px ${color}, 3px 3px 0 rgba(0,0,0,0.8)`,
    letterSpacing: '0.12em',
    marginBottom: '0.8rem',
  });

  // Sub-line
  const sEl = document.createElement('div');
  sEl.textContent = sub;
  Object.assign(sEl.style, {
    fontSize:     'clamp(0.4rem,1.4vw,0.8rem)',
    color:        '#e0e0cc',
    lineHeight:   '2',
    marginBottom: '2.2rem',
    letterSpacing: '0.06em',
  });

  // Button row
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' });

  const mkBtn = (label, accent, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      fontFamily:    "'Press Start 2P', monospace",
      fontSize:      'clamp(0.4rem,1.3vw,0.65rem)',
      cursor:        'pointer',
      padding:       '0.8em 1.8em',
      border:        `3px solid ${accent}`,
      background:    'transparent',
      color:         accent,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    });
    btn.addEventListener('mouseover', () => { btn.style.background = `${accent}22`; });
    btn.addEventListener('mouseout',  () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', onClick);
    return btn;
  };

  const retryBtn = mkBtn('↩ RETRY', color, () => {
    ov.remove();
    ensureAudio();
    launchGame();
  });

  const menuBtn = mkBtn('⌂ MAIN MENU', '#6a7a9a', () => {
    ov.remove();
    stopMenuBGM();
    changeScreen('mainmenu');
  });

  row.appendChild(retryBtn);
  row.appendChild(menuBtn);

  ov.appendChild(eEl);
  ov.appendChild(tEl);
  ov.appendChild(sEl);
  ov.appendChild(row);

  // Mount onto #screen-game (position:relative/absolute parent)
  const gameScreen = $('screen-game');
  if (gameScreen) {
    gameScreen.style.position = 'relative'; // ensure overlay positions correctly
    gameScreen.appendChild(ov);
  } else {
    document.body.appendChild(ov);         // ultimate fallback
  }
}


/* ═══════════════════════════════════════════════════════════════════
   §10  CANVAS RENDERER
═══════════════════════════════════════════════════════════════════ */

/* ── 10A  Thematic decoration data (pre-seeded each level start) ── */
let _decorShapes = [];   // array of shape descriptors, built once per run

function seedDecor(c) {
  _decorShapes = [];
  const rng = mulberry32(Date.now());   // simple deterministic RNG

  switch (c.decor) {

    case 'house': {
      // Scattered shirts / blouses — coloured rectangles with a collar notch
      for (let i = 0; i < 22; i++) {
        _decorShapes.push({
          type: 'shirt',
          nx: rng() * 0.92 + 0.04,
          ny: rng() * 0.92 + 0.04,
          rot: (rng() - 0.5) * 1.4,
          hue: Math.floor(rng() * 360),
        });
      }
      // Floor tiles
      for (let i = 0; i < 8; i++) {
        _decorShapes.push({
          type: 'tile',
          nx: (i % 4) * 0.25 + 0.02,
          ny: Math.floor(i / 4) * 0.5 + 0.05,
          colorRGB: c.colorRGB,
        });
      }
      break;
    }

    case 'forest': {
      // Trees — green triangles (canopy) + brown rectangles (trunks)
      for (let i = 0; i < 18; i++) {
        _decorShapes.push({
          type: 'tree',
          nx: rng() * 0.88 + 0.06,
          ny: rng() * 0.80 + 0.06,
          size: 0.03 + rng() * 0.04,
          dark: rng() > 0.5,
        });
      }
      // Ground bushes — ellipses
      for (let i = 0; i < 12; i++) {
        _decorShapes.push({
          type: 'bush',
          nx: rng() * 0.90 + 0.05,
          ny: rng() * 0.90 + 0.05,
          size: 0.02 + rng() * 0.025,
        });
      }
      break;
    }

    case 'desert': {
      // Sand dunes — flat orange-ish triangles
      for (let i = 0; i < 14; i++) {
        _decorShapes.push({
          type: 'dune',
          nx: rng() * 0.90 + 0.05,
          ny: rng() * 0.80 + 0.10,
          w: 0.06 + rng() * 0.10,
          h: 0.03 + rng() * 0.04,
        });
      }
      // Scattered rocks — small dark ellipses
      for (let i = 0; i < 10; i++) {
        _decorShapes.push({
          type: 'rock',
          nx: rng() * 0.90 + 0.05,
          ny: rng() * 0.90 + 0.05,
          rx: 0.015 + rng() * 0.02,
          ry: 0.010 + rng() * 0.012,
        });
      }
      // Ruin pillars — tall rectangles
      for (let i = 0; i < 6; i++) {
        _decorShapes.push({
          type: 'pillar',
          nx: rng() * 0.85 + 0.08,
          ny: rng() * 0.70 + 0.10,
          w: 0.012,
          h: 0.055 + rng() * 0.04,
        });
      }
      break;
    }

    case 'bathroom': {
      // Floor tiles — grid of small squares
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 10; col++) {
          _decorShapes.push({
            type: 'bathtile',
            nx: col * 0.10 + 0.01,
            ny: row * 0.13 + 0.02,
          });
        }
      }
      // Soap bars — white rounded rectangles
      for (let i = 0; i < 5; i++) {
        _decorShapes.push({
          type: 'soap',
          nx: rng() * 0.85 + 0.07,
          ny: rng() * 0.85 + 0.07,
          rot: (rng() - 0.5) * 0.9,
        });
      }
      // Water puddles — translucent ellipses
      for (let i = 0; i < 8; i++) {
        _decorShapes.push({
          type: 'puddle',
          nx: rng() * 0.88 + 0.06,
          ny: rng() * 0.88 + 0.06,
          rx: 0.03 + rng() * 0.04,
          ry: 0.015 + rng() * 0.02,
        });
      }
      break;
    }
  }
}

/** Mulberry32 seeded pseudo-random generator → returns function giving [0,1) */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── 10B  Draw decorations ── */
function drawDecor(ctx, W, H, c) {
  _decorShapes.forEach(s => {
    const x = s.nx * W, y = s.ny * H;
    ctx.save();

    switch (s.type) {

      case 'shirt': {
        // Simple T-shirt silhouette: body rectangle + two sleeve stumps
        ctx.translate(x, y);
        ctx.rotate(s.rot);
        const sw = W * 0.045, sh = H * 0.034;
        ctx.fillStyle = `hsla(${s.hue},70%,55%,0.28)`;
        ctx.strokeStyle = `hsla(${s.hue},70%,70%,0.40)`;
        ctx.lineWidth = 1;
        // Body
        ctx.fillRect(-sw / 2, -sh * 0.2, sw, sh);
        ctx.strokeRect(-sw / 2, -sh * 0.2, sw, sh);
        // Left sleeve
        ctx.fillRect(-sw / 2 - sw * 0.32, -sh * 0.2, sw * 0.32, sh * 0.42);
        // Right sleeve
        ctx.fillRect(sw / 2, -sh * 0.2, sw * 0.32, sh * 0.42);
        // Collar notch (small dark triangle at top-centre)
        ctx.fillStyle = `hsla(${s.hue},30%,20%,0.5)`;
        ctx.beginPath();
        ctx.moveTo(-sw * 0.12, -sh * 0.2);
        ctx.lineTo( sw * 0.12, -sh * 0.2);
        ctx.lineTo(0, sh * 0.06);
        ctx.closePath(); ctx.fill();
        break;
      }

      case 'tile': {
        const tw = W * 0.22, th = H * 0.44;
        ctx.strokeStyle = rgba(c.colorRGB, 0.08);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tw, th);
        break;
      }

      case 'tree': {
        const sz = s.size * Math.min(W, H);
        // Trunk
        ctx.fillStyle = 'rgba(80,50,20,0.55)';
        ctx.fillRect(x - sz * 0.18, y, sz * 0.36, sz * 0.55);
        // Canopy — two overlapping triangles for depth
        const g1 = s.dark ? 'rgba(0,90,30,0.65)' : 'rgba(0,150,60,0.55)';
        const g2 = s.dark ? 'rgba(0,60,20,0.50)' : 'rgba(0,120,45,0.45)';
        [{ col: g1, dy: 0 }, { col: g2, dy: -sz * 0.28 }].forEach(({ col, dy }) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(x, y - sz * 0.85 + dy);
          ctx.lineTo(x - sz * 0.55, y + dy);
          ctx.lineTo(x + sz * 0.55, y + dy);
          ctx.closePath(); ctx.fill();
        });
        break;
      }

      case 'bush': {
        const r = s.size * Math.min(W, H);
        ctx.fillStyle = 'rgba(0,110,40,0.42)';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,160,55,0.30)';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.4, y - r * 0.3, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'dune': {
        const dw = s.w * W, dh = s.h * H;
        ctx.fillStyle = 'rgba(200,140,40,0.30)';
        ctx.beginPath();
        ctx.moveTo(x - dw / 2, y + dh * 0.5);
        ctx.quadraticCurveTo(x, y - dh, x + dw / 2, y + dh * 0.5);
        ctx.closePath(); ctx.fill();
        // Highlight crest
        ctx.strokeStyle = 'rgba(240,190,80,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - dw * 0.3, y);
        ctx.quadraticCurveTo(x, y - dh * 0.85, x + dw * 0.3, y);
        ctx.stroke();
        break;
      }

      case 'rock': {
        ctx.fillStyle = 'rgba(90,70,50,0.40)';
        ctx.beginPath();
        ctx.ellipse(x, y, s.rx * W, s.ry * H, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pillar': {
        ctx.fillStyle = 'rgba(140,110,70,0.35)';
        ctx.strokeStyle = 'rgba(180,150,100,0.30)';
        ctx.lineWidth = 1;
        const pw = s.w * W, ph = s.h * H;
        ctx.fillRect(x - pw / 2, y - ph, pw, ph);
        ctx.strokeRect(x - pw / 2, y - ph, pw, ph);
        // Top cap
        ctx.fillStyle = 'rgba(180,150,100,0.38)';
        ctx.fillRect(x - pw * 0.7, y - ph, pw * 1.4, ph * 0.12);
        break;
      }

      case 'bathtile': {
        const ts = W * 0.088;
        ctx.strokeStyle = rgba(c.colorRGB, 0.10);
        ctx.lineWidth = 0.8;
        ctx.fillStyle = rgba(c.colorRGB, 0.025);
        ctx.fillRect(x, y, ts, ts * 1.1);
        ctx.strokeRect(x, y, ts, ts * 1.1);
        break;
      }

      case 'soap': {
        ctx.translate(x, y); ctx.rotate(s.rot);
        const bw = W * 0.038, bh = H * 0.022;
        ctx.fillStyle   = 'rgba(255,255,240,0.35)';
        ctx.strokeStyle = 'rgba(200,220,255,0.45)';
        ctx.lineWidth   = 1;
        const r2 = Math.min(bw, bh) * 0.35;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, r2);
        ctx.fill(); ctx.stroke();
        // Bubbles
        ctx.fillStyle = 'rgba(200,220,255,0.28)';
        [[0, -bh * 0.9], [bw * 0.3, -bh * 1.2], [-bw * 0.2, -bh * 1.1]].forEach(([bx, by]) => {
          ctx.beginPath(); ctx.arc(bx, by, bh * 0.22, 0, Math.PI * 2); ctx.fill();
        });
        break;
      }

      case 'puddle': {
        ctx.fillStyle = rgba(c.colorRGB, 0.12);
        ctx.beginPath();
        ctx.ellipse(x, y, s.rx * W, s.ry * H, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  });
}

/* ── 10C  Sprite draw: billboard image or coloured-circle fallback ── */
function drawSprite(ctx, key, cx, cy, w, h) {
  const img = GS.images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    // Use globalCompositeOperation to strip near-black BG from photos
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(img, cx - w / 2, cy - h * 0.9, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  } else {
    // Fallback circle
    const r = Math.min(w, h) * 0.42;
    ctx.save();
    ctx.fillStyle = key === 'vet' ? '#ff2d78' : (GS.char?.color || '#00f5ff');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r * 1.1}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(key === 'vet' ? 'V' : (GS.char?.name[0] || '?'), cx, cy);
    ctx.restore();
  }
}

/* ── 10D  Full render ── */
function renderGame() {
  const g   = GS.game;
  const c   = GS.char;
  const ctx = gCtx;
  const W   = gCanvas.width;
  const H   = gCanvas.height;

  /* — Background gradient — */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   c.bgColors[0]);
  bg.addColorStop(0.5, c.bgColors[1]);
  bg.addColorStop(1,   c.bgColors[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* — Thematic decorations — */
  drawDecor(ctx, W, H, c);

  /* — Hiding spots — */
  c.hidingSpots.forEach(spot => {
    const sx = spot.x * W, sy = spot.y * H;
    const sw = spot.w * W, sh = spot.h * H;
    const active = g.hiddenSpot === spot;

    ctx.fillStyle   = active ? rgba(c.colorRGB, 0.38) : rgba(c.colorRGB, 0.13);
    ctx.strokeStyle = active ? c.color                : rgba(c.colorRGB, 0.65);
    ctx.lineWidth   = active ? 3 : 2;

    ctx.fillRect  (sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);

    // Label
    ctx.fillStyle   = c.color;
    ctx.font        = `bold ${clamp(W * 0.012, 8, 13)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spot.label, sx + sw / 2, sy + sh / 2);
    ctx.textBaseline = 'alphabetic';

    // "HIDING" pulse when active
    if (active) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = `rgba(${c.colorRGB[0]},${c.colorRGB[1]},${c.colorRGB[2]},${pulse})`;
      ctx.lineWidth   = 4;
      ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
    }
  });

  /* — Vet vision cone — */
  {
    const vxp = g.vx * W, vyp = g.vy * H;
    const range = VET.visionRange * Math.min(W, H);
    const half  = VET.visionAngle * Math.PI / 180;
    const base  = g.vAngle * Math.PI / 180;
    const alpha = g.vetMode === 'chase' ? 0.24 : 0.09;
    ctx.save();
    ctx.fillStyle = `rgba(255,45,120,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(vxp, vyp);
    ctx.arc(vxp, vyp, range, base - half, base + half);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* — Vet sprite — */
  const vs = Math.min(W, H) * 0.11;
  drawSprite(ctx, 'vet', g.vx * W, g.vy * H, vs * 0.9, vs * 1.35);

  /* — Player sprite — */
  const ps = Math.min(W, H) * 0.10;
  if (!g.hidden) {
    drawSprite(ctx, c.id, g.px * W, g.py * H, ps * 0.9, ps * 1.30);
  } else {
    // Faint ghost silhouette + "HIDING" label
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawSprite(ctx, c.id, g.px * W, g.py * H, ps * 0.9, ps * 1.30);
    ctx.restore();
    ctx.fillStyle   = c.color;
    ctx.font        = `bold ${clamp(W * 0.015, 9, 15)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText('👁 HIDING', g.px * W, g.py * H - ps * 0.82);
  }

  /* — Chase flash border — */
  if (g.vetMode === 'chase') {
    const flash = Math.sin(Date.now() / 110) > 0;
    if (flash) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,45,120,0.07)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle   = 'rgba(255,45,120,0.92)';
    ctx.font        = `bold ${clamp(W * 0.024, 12, 22)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText('⚠ SHE SEES YOU! ⚠', W / 2, H * 0.065);
    ctx.restore();
  }

  /* — Paused overlay — */
  if (g.paused) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,14,0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle   = '#ffe600';
    ctx.font        = `bold ${clamp(W * 0.030, 14, 28)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText('⏸  PAUSED', W / 2, H / 2);
    ctx.fillStyle   = '#6a7a9a';
    ctx.font        = `bold ${clamp(W * 0.014, 8, 14)}px monospace`;
    ctx.fillText('Press ESC or PAUSE to resume', W / 2, H / 2 + 50);
    ctx.restore();
  }
}


/* ═══════════════════════════════════════════════════════════════════
   §11  HUD  (DOM overlay above canvas)
═══════════════════════════════════════════════════════════════════ */
function updateHUDName(name) {
  const el = $('hudCharName'); if (el) el.textContent = name;
}

function updateHUDStatus(txt) {
  const el = $('hudStatus'); if (el) el.textContent = txt;
}

function updateHUDTimer(secs) {
  // Try to find an existing timer element; create one if not present
  let el = $('hudTimer');
  if (!el) {
    // Build it once and insert into #hud
    el = document.createElement('div');
    el.id = 'hudTimer';
    Object.assign(el.style, {
      fontFamily:    "'Press Start 2P', monospace",
      fontSize:      'clamp(0.5rem, 1.6vw, 0.85rem)',
      letterSpacing: '0.06em',
      whiteSpace:    'nowrap',
    });
    const hud = $('hud');
    if (hud) hud.appendChild(el);
  }
  const urgent = secs <= 10;
  el.textContent  = `⏱ ${secs}s`;
  el.style.color  = urgent ? '#ff2d78' : '#ffe600';
  el.style.textShadow = urgent
    ? '0 0 8px #ff2d78, 0 0 16px rgba(255,45,120,0.5)'
    : '0 0 8px #ffe600, 0 0 14px rgba(255,230,0,0.4)';
}

function refreshHUD() {
  const g = GS.game, c = GS.char;
  // Proximity bar
  const fill = $('hudProxFill');
  if (fill) {
    const pct = clamp(g.proximity, 0, 1) * 100;
    fill.style.width     = pct + '%';
    fill.style.boxShadow = pct > 65 ? '0 0 10px #ff2d78' : 'none';
  }
  // Status text
  if (g.hidden)                updateHUDStatus('🙈 HIDING!');
  else if (g.vetMode === 'chase') updateHUDStatus('⚠ RUN!');
  else                         updateHUDStatus('EVADING...');
}

function togglePause() {
  const g = GS.game;
  if (g.over) return;
  g.paused = !g.paused;
  const btn = $('btnPause');
  if (btn) btn.textContent = g.paused ? '▶ RESUME' : '⏸ PAUSE';
  if (g.paused) stopInGameAudio();
  else          startInGameAudio();
}


/* ═══════════════════════════════════════════════════════════════════
   §12  BUTTON BINDINGS
═══════════════════════════════════════════════════════════════════ */
function bindButtons() {
  $('btnStartGame') ?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')     ?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack') ?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')    ?.addEventListener('click', () => { startMenuBGM(); changeScreen('mainmenu'); });
  $('btnConfirmYes')?.addEventListener('click', () => { ensureAudio(); changeScreen('game'); });
  $('btnConfirmNo') ?.addEventListener('click', () => {
    GS.char = null; startMenuBGM(); changeScreen('charselect');
  });
  $('btnPause')?.addEventListener('click', togglePause);
}


/* ═══════════════════════════════════════════════════════════════════
   §13  GLOBAL KEYBOARD
═══════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (GS.screen === 'mainmenu' && e.key === 'Enter') {
    ensureAudio(); changeScreen('charselect'); return;
  }
  if (e.key === 'Escape') {
    switch (GS.screen) {
      case 'howtoplay':  changeScreen('mainmenu');                           break;
      case 'charselect': changeScreen('mainmenu');                           break;
      case 'confirm':    GS.char = null; startMenuBGM(); changeScreen('charselect'); break;
      // 'game' ESC is handled by onKeyDown registered per-run
    }
  }
});


/* ═══════════════════════════════════════════════════════════════════
   §14  INIT
═══════════════════════════════════════════════════════════════════ */
async function init() {
  console.log('🐾 Furry Escapades v4 — booting…');

  bindButtons();
  bindCharCards();

  setLoadBar(0);
  await preloadImages();
  await new Promise(r => setTimeout(r, 400));

  console.log('✅ Images loaded:', Object.keys(GS.images).join(', '));
  changeScreen('mainmenu');
}

document.addEventListener('DOMContentLoaded', init);
