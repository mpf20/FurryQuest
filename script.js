/**
 * ═══════════════════════════════════════════════════════════════════
 *  FURRY ESCAPADES: OUTSMART THE VET  ·  script.js  (v3 — full rewrite)
 *
 *  KEY CHANGES vs previous version:
 *  ✅  All image paths use flat  images/  folder (no assets/ prefix)
 *  ✅  Zero file-based audio — 100% Web Audio API synthesis
 *  ✅  Arabic-style in-game BGM built from oscillators + rhythmic pulses
 *  ✅  Menu music, meow SFX, bark SFX — all synthesised
 *  ✅  Screen flow fixed: confirm → game launches an actual gameplay loop
 *  ✅  Gameplay loop: top-down 2-D canvas chase scene with Vet AI,
 *      hiding spots, win/lose states and animated HUD
 *
 *  IMAGE PATHS (flat, case-sensitive):
 *    images/Molly.png
 *    images/Agata.png
 *    images/Martin.png
 *    images/Michi.png
 *    images/Veterinaria.png
 *
 *  SCREEN STATE MACHINE:
 *    loading → mainmenu ⇄ howtoplay
 *    mainmenu → charselect → confirm → game → win | lose
 *    win / lose → mainmenu
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   §1  CHARACTER & LEVEL DATA
───────────────────────────────────────────────────────────────── */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: 'dog',
    img: 'images/Molly.png',          // flat images/ folder
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
    img: 'images/Agata.png',
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
    img: 'images/Martin.png',
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
    img: 'images/Michi.png',
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
  img: 'images/Veterinaria.png',
  patrolSpeed: 0.0018,   // fraction of canvas per frame
  chaseSpeed:  0.0036,
  visionAngle: 55,       // degrees half-cone
  visionRange: 0.32,     // fraction of canvas
};


/* ─────────────────────────────────────────────────────────────────
   §2  GAME STATE
───────────────────────────────────────────────────────────────── */
const GS = {
  screen:    'loading',   // active screen key
  char:      null,        // selected CharacterData
  images:    {},          // preloaded Image objects keyed by character id + 'vet'

  // 2-D gameplay state
  game: {
    running:   false,
    paused:    false,
    rafId:     null,
    won:       false,
    lost:      false,

    // Player
    px: 0.1, py: 0.9,    // normalised 0-1 canvas coords
    pSpeed: 0.003,
    hidden:  false,       // inside a hiding spot?
    hiddenSpot: null,

    // Vet
    vx: 0.9, vy: 0.9,
    vAngle: 180,          // facing direction degrees
    vetMode: 'patrol',    // 'patrol' | 'chase' | 'lost'
    lostTimer: 0,
    patrolTarget: null,
    patrolTimer: 0,

    // Input
    keys: {},

    // Proximity 0-1 drives music tempo
    proximity: 0,
  },

  // Audio
  audio: {
    ctx: null,
    bgmActive: false,
    bgmNodes: [],         // all oscillator/gain nodes for current BGM
    bgmTimer: null,
    inGameAudio: null,    // object with stop() for in-game music
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
  console.log('[Screen]', name);

  // Side-effects
  switch (name) {
    case 'mainmenu':   stopInGameMusic(); startMenuBGM(); break;
    case 'charselect': /* BGM continues */               break;
    case 'confirm':    buildConfirmScreen();              break;
    case 'game':       stopMenuBGM(); launchGame();       break;
    case 'win':        stopInGameMusic(); showResult(true);  break;
    case 'lose':       stopInGameMusic(); showResult(false); break;
  }
}


/* ─────────────────────────────────────────────────────────────────
   §5  ASSET PRELOADER  (images only — no audio files)
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
      img.onerror = finish;   // don't block on missing files
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
   §6  WEB AUDIO ENGINE  — 100% synthesised, zero file fetches
───────────────────────────────────────────────────────────────── */

/** Boot (or resume) the AudioContext after a user gesture. */
function ensureAudio() {
  if (!GS.audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { GS.audio.ctx = new Ctx(); }
    catch(e) { console.warn('Web Audio unavailable', e); return false; }
  }
  if (GS.audio.ctx.state === 'suspended') GS.audio.ctx.resume();
  return true;
}

/* ── 6A  MENU BGM: energetic pentatonic square-wave arpeggio ── */
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

// Pentatonic major scale (two octaves) for menu
const MENU_FREQS = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  783.99, 659.25, 587.33, 523.25, 440.00,
  392.00, 329.63, 293.66,
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

  // Loop: schedule next batch just before this one ends
  GS.audio.bgmTimer = setTimeout(
    _scheduleMenuArpeggio,
    (MENU_FREQS.length * noteDur - 0.05) * 1000
  );
}

/* ── 6B  IN-GAME BGM: Arabic-style maqam with rhythmic pulse ── */
/*
 *  Uses Maqam Hijaz intervals (characteristic b2 + augmented 2nd):
 *  Root, b2, M3, P4, P5, b6, M7, octave
 *  Scale degrees relative to D (293.66 Hz root):
 *  D  Eb  F#  G  A  Bb  C#  D'
 */
const MAQAM_HIJAZ = [
  293.66,  // D4
  311.13,  // Eb4
  369.99,  // F#4
  392.00,  // G4
  440.00,  // A4
  466.16,  // Bb4
  554.37,  // C#5
  587.33,  // D5
];

// A simple melodic motif using Hijaz scale indices
const HIJAZ_MELODY = [0,2,3,2,1,0,4,3,2,3,0,5,4,3,2,1,0,6,5,4,3,2,1,0];
// Rhythmic durations matching a 4/4 feel at roughly 120 BPM
const HIJAZ_DURS   = [0.25,0.15,0.20,0.15,0.25,0.30,0.20,0.15,0.25,0.20,0.30,
                      0.20,0.15,0.25,0.15,0.20,0.30,0.20,0.15,0.25,0.20,0.15,0.20,0.35];

function startInGameMusic() {
  if (!ensureAudio()) return;
  // Will be looped; proximity drives speed in _tickInGameMusic
  _launchInGameLoop(1.0);   // tempo multiplier starts at 1×
}

function _launchInGameLoop(tempoMult) {
  const ctx = GS.audio.ctx;
  if (!ctx || !GS.game.running) return;

  const nodes = [];
  let t = ctx.currentTime;

  // Master gain for the whole phrase
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.06, t);
  masterGain.connect(ctx.destination);

  HIJAZ_MELODY.forEach((scaleIdx, i) => {
    const freq = MAQAM_HIJAZ[scaleIdx];
    const dur  = (HIJAZ_DURS[i] || 0.2) / tempoMult;

    // Melody: sawtooth for nasal oud-like timbre
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.01);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + dur);
    nodes.push(osc, gain);

    // Rhythmic low-end pulse every 4 notes (doumbek kick simulation)
    if (i % 4 === 0) {
      const kick = ctx.createOscillator();
      const kGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(180, t);
      kick.frequency.exponentialRampToValueAtTime(60, t + 0.06);
      kGain.gain.setValueAtTime(0.35, t);
      kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      kick.connect(kGain); kGain.connect(masterGain);
      kick.start(t); kick.stop(t + 0.12);
      nodes.push(kick, kGain);
    }

    // Off-beat click (req) on beats 2&4
    if (i % 4 === 2) {
      const click = ctx.createOscillator();
      const cGain = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(600, t);
      cGain.gain.setValueAtTime(0.12, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      click.connect(cGain); cGain.connect(masterGain);
      click.start(t); click.stop(t + 0.06);
      nodes.push(click, cGain);
    }

    t += dur;
  });

  nodes.push(masterGain);

  const phraseDurMs = (t - ctx.currentTime) * 1000 - 50;

  // Store reference so we can stop it
  GS.audio.inGameAudio = {
    nodes,
    timer: setTimeout(() => {
      if (GS.game.running && !GS.game.paused) {
        // Re-launch with updated tempo based on current proximity
        const prox = GS.game.proximity;
        const newMult = 1.0 + prox * 1.6;  // up to 2.6× faster when vet is right there
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

/* ── 6C  SELECTION SFX ── */
function playCatMeow() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.25);
  osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.45);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.50);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.5);
}

function playDogBark() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  // White-noise burst shaped into a bark
  const bufLen = Math.floor(ctx.sampleRate * 0.18);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.5);
  const src  = ctx.createBufferSource();
  const bpf  = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  bpf.type = 'bandpass'; bpf.frequency.value = 850; bpf.Q.value = 0.7;
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  src.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination);
  src.start();
}

function playSelectionSFX(soundType) {
  if (soundType === 'bark') playDogBark();
  else                      playCatMeow();
}

/* ── 6D  WIN / LOSE jingles ── */
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
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.3);
    t += 0.22;
  });
}

function playLoseJingle() {
  if (!ensureAudio()) return;
  const ctx = GS.audio.ctx;
  const notes = [440, 392, 349.23, 261.63];
  let t = ctx.currentTime;
  notes.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.38);
    t += 0.30;
  });
}

/* ── 6E  Utility ── */
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
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ensureAudio(); selectCharacter(id); }
    });
  });
}


/* ─────────────────────────────────────────────────────────────────
   §9  GAMEPLAY ENGINE  — 2-D canvas chase scene
   Renders a top-down level using the HTML5 Canvas 2D API.
   Player controlled with WASD/Arrow keys.
   Vet patrols then chases using a simplified vision-cone check.
   Hiding spots grant invisibility while the player stays inside.
   Reaching the goal triggers WIN; Vet catching player triggers LOSE.
───────────────────────────────────────────────────────────────── */

let gameCanvas, gameCtx;

function launchGame() {
  const c = GS.char;
  if (!c) { changeScreen('charselect'); return; }

  // Reset gameplay state
  const g = GS.game;
  g.running   = true;
  g.paused    = false;
  g.won       = false;
  g.lost      = false;
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

  // Set up canvas
  const wrap = $('gameCanvasWrap');
  wrap.innerHTML = '';
  gameCanvas = document.createElement('canvas');
  gameCanvas.id = 'gameCanvas';
  gameCanvas.style.cssText = 'width:100%;height:100%;display:block;background:#000;';
  wrap.appendChild(gameCanvas);
  resizeCanvas();

  gameCtx = gameCanvas.getContext('2d');

  // Input
  window.addEventListener('keydown',  onKeyDown);
  window.addEventListener('keyup',    onKeyUp);

  // HUD
  initHUD();

  // Start music
  startInGameMusic();

  // Run loop
  if (g.rafId) cancelAnimationFrame(g.rafId);
  g.rafId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  if (!gameCanvas) return;
  gameCanvas.width  = gameCanvas.offsetWidth  || window.innerWidth;
  gameCanvas.height = gameCanvas.offsetHeight || window.innerHeight;
}
window.addEventListener('resize', () => { resizeCanvas(); });

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


/* ── 9A  MAIN GAME LOOP ── */
function gameLoop() {
  const g = GS.game;
  if (!g.running) return;
  if (!g.paused) {
    updateGame();
    renderGame();
  }
  g.rafId = requestAnimationFrame(gameLoop);
}


/* ── 9B  UPDATE ── */
function updateGame() {
  const g  = GS.game;
  const c  = GS.char;
  const W  = gameCanvas.width;
  const H  = gameCanvas.height;

  // — Player movement —
  const spd = g.pSpeed;
  let dx = 0, dy = 0;
  if (g.keys['w'] || g.keys['arrowup'])    dy -= spd;
  if (g.keys['s'] || g.keys['arrowdown'])  dy += spd;
  if (g.keys['a'] || g.keys['arrowleft'])  dx -= spd;
  if (g.keys['d'] || g.keys['arrowright']) dx += spd;
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }  // diagonal normalise
  if (g.keys['shift']) { dx *= 1.65; dy *= 1.65; }

  g.px = Math.max(0.01, Math.min(0.99, g.px + dx));
  g.py = Math.max(0.01, Math.min(0.99, g.py + dy));

  // — Hiding spot check —
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

  // — Goal check (WIN) —
  const goal = c.goalPos;
  const distToGoal = Math.hypot(g.px - goal.x, g.py - goal.y);
  if (distToGoal < 0.055) {
    stopGame();
    playWinJingle();
    setTimeout(() => changeScreen('win'), 400);
    return;
  }

  // — Vet proximity —
  const rawDist = Math.hypot(g.px - g.vx, g.py - g.vy);
  g.proximity   = Math.max(0, 1 - rawDist / VET.visionRange);

  // — Vet AI —
  const canSee = !g.hidden && rawDist < VET.visionRange && _inCone(g);

  if (canSee) {
    g.vetMode   = 'chase';
    g.lostTimer = 0;
  } else if (g.vetMode === 'chase') {
    g.lostTimer++;
    if (g.lostTimer > 90) { g.vetMode = 'patrol'; g.patrolTarget = null; }
  }

  if (g.vetMode === 'chase') {
    // Chase: move toward player
    const ang = Math.atan2(g.py - g.vy, g.px - g.vx);
    g.vx += Math.cos(ang) * VET.chaseSpeed;
    g.vy += Math.sin(ang) * VET.chaseSpeed;
    g.vAngle = ang * 180 / Math.PI;
  } else {
    // Patrol: wander between random points
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

  // — Catch check (LOSE) —
  if (rawDist < 0.045 && !g.hidden) {
    stopGame();
    playLoseJingle();
    setTimeout(() => changeScreen('lose'), 400);
    return;
  }

  // — Update HUD —
  updateHUD();
}

/** True if player is within the Vet's vision cone */
function _inCone(g) {
  const toPlayerAngle = Math.atan2(g.py - g.vy, g.px - g.vx) * 180 / Math.PI;
  let diff = toPlayerAngle - g.vAngle;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) < VET.visionAngle;
}


/* ── 9C  RENDER ── */
function renderGame() {
  const g = GS.game;
  const c = GS.char;
  const W = gameCanvas.width;
  const H = gameCanvas.height;
  const ctx = gameCtx;

  // — Background —
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   c.bgColors[0]);
  grad.addColorStop(0.5, c.bgColors[1]);
  grad.addColorStop(1,   c.bgColors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines (low-poly feel)
  ctx.strokeStyle = `rgba(${c.colorRGB},0.06)`;
  ctx.lineWidth = 1;
  const grid = 60;
  for (let x = 0; x < W; x += grid) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += grid) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // — Hiding spots —
  c.hidingSpots.forEach(spot => {
    const sx = spot.x * W, sy = spot.y * H;
    const sw = spot.w * W, sh = spot.h * H;
    ctx.fillStyle   = g.hiddenSpot === spot
      ? `rgba(${c.colorRGB},0.35)`
      : `rgba(${c.colorRGB},0.12)`;
    ctx.strokeStyle = `rgba(${c.colorRGB},0.7)`;
    ctx.lineWidth   = 2;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    // Label
    ctx.fillStyle   = `rgba(${c.colorRGB},0.9)`;
    ctx.font        = `bold ${Math.max(8, W * 0.012)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillText(spot.label, sx + sw / 2, sy + sh / 2 + 4);
  });

  // — Goal —
  const gx = c.goalPos.x * W;
  const gy = c.goalPos.y * H;
  const gr = W * 0.038;
  ctx.save();
  ctx.shadowColor = c.color; ctx.shadowBlur = 18;
  ctx.strokeStyle = c.color; ctx.lineWidth  = 3;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Pulsing fill
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 350);
  ctx.fillStyle = `rgba(${c.colorRGB},${0.15 + 0.2 * pulse})`;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle   = c.color;
  ctx.font        = `bold ${Math.max(9, W * 0.013)}px monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText(c.goalLabel, gx, gy + 4);

  // — Vet vision cone —
  if (!g.hidden || g.vetMode === 'chase') {
    const vxPx = g.vx * W, vyPx = g.vy * H;
    const coneRange = VET.visionRange * W;
    const halfAngle = VET.visionAngle * Math.PI / 180;
    const baseAngle = g.vAngle * Math.PI / 180;
    ctx.save();
    const alpha = g.vetMode === 'chase' ? 0.22 : 0.10;
    ctx.fillStyle = `rgba(255,45,120,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(vxPx, vyPx);
    ctx.arc(vxPx, vyPx, coneRange, baseAngle - halfAngle, baseAngle + halfAngle);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // — Draw Vet sprite or fallback shape —
  _drawSprite(ctx, 'vet', g.vx * W, g.vy * H, W * 0.095, H * 0.14);

  // — Player sprite or fallback shape —
  if (!g.hidden) {
    _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.080, H * 0.12);
  } else {
    // Show faint silhouette while hiding
    ctx.save();
    ctx.globalAlpha = 0.22;
    _drawSprite(ctx, c.id, g.px * W, g.py * H, W * 0.080, H * 0.12);
    ctx.restore();
    // HIDING indicator
    ctx.fillStyle = c.color;
    ctx.font      = `bold ${Math.max(10, W * 0.016)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('👁 HIDING', g.px * W, g.py * H - H * 0.07);
  }

  // — Chase warning overlay —
  if (g.vetMode === 'chase') {
    ctx.save();
    const flash = Math.sin(Date.now() / 120) > 0;
    if (flash) {
      ctx.fillStyle = 'rgba(255,45,120,0.07)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = 'rgba(255,45,120,0.9)';
    ctx.font      = `bold ${Math.max(12, W * 0.022)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ SHE SEES YOU! ⚠', W / 2, H * 0.06);
    ctx.restore();
  }
}

/**
 * Draw a preloaded billboard sprite centred at (cx, cy),
 * falling back to a coloured circle if the image isn't ready.
 */
function _drawSprite(ctx, key, cx, cy, w, h) {
  const img = GS.images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    // Fallback: filled circle with initial
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.fillStyle = key === 'vet' ? '#ff2d78' : (GS.char?.color || '#00f5ff');
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font      = `bold ${Math.min(w, h) * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key === 'vet' ? 'V' : (GS.char?.name[0] || '?'), cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
}


/* ─────────────────────────────────────────────────────────────────
   §10  HUD
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
  const fill = $('hudProxFill');
  if (fill) {
    const pct = Math.min(1, g.proximity) * 100;
    fill.style.width    = pct + '%';
    fill.style.boxShadow = pct > 70 ? '0 0 10px #ff2d78' : 'none';
  }
  // Status text
  if (g.hidden)              updateHUDStatus('🙈 HIDING!');
  else if (g.vetMode === 'chase') updateHUDStatus('⚠ SHE SEES YOU!');
  else                       updateHUDStatus('EVADING...');
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
  updateHUDStatus(g.paused ? '⏸ PAUSED' : 'EVADING...');
  if (!g.paused) startInGameMusic();
  else stopInGameMusic();
}


/* ─────────────────────────────────────────────────────────────────
   §11  WIN / LOSE RESULT SCREENS
   Dynamically builds an overlay inside screen-game
   so we don't need extra HTML screens.
───────────────────────────────────────────────────────────────── */
function showResult(won) {
  const c   = GS.char;
  const wrap = $('gameCanvasWrap');

  if (won) playWinJingle();
  else     playLoseJingle();

  const overlay = document.createElement('div');
  overlay.id = 'resultOverlay';
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    background:rgba(4,6,14,0.88);z-index:500;
    font-family:'Press Start 2P',monospace;text-align:center;padding:2rem;
  `;

  const accentColor = won ? (c?.color || '#00f5ff') : '#ff2d78';
  const emoji       = won ? '🎉' : '😿';
  const headline    = won ? 'YOU ESCAPED!' : 'CAUGHT!';
  const sub         = won
    ? `${c?.name || 'YOUR PET'} earned ${c?.reward || '🏆 REWARD'}!`
    : `THE VET GOT ${c?.name || 'YOUR PET'}!`;

  overlay.innerHTML = `
    <div style="font-size:clamp(2rem,6vw,4rem);margin-bottom:1rem">${emoji}</div>
    <div style="font-size:clamp(1rem,3vw,2rem);color:${accentColor};
         text-shadow:0 0 12px ${accentColor},3px 3px 0 rgba(0,0,0,0.8);
         margin-bottom:0.8rem;letter-spacing:0.12em">${headline}</div>
    <div style="font-size:clamp(0.45rem,1.4vw,0.8rem);color:#e0e0cc;
         margin-bottom:2rem;line-height:2">${sub}</div>
    <div style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center;">
      <button id="btnRetry"  style="${_btnStyle(accentColor)}">↩ RETRY</button>
      <button id="btnToMenu" style="${_btnStyle('#6a7a9a')}">⌂ MAIN MENU</button>
    </div>
  `;

  $('screen-game').appendChild(overlay);

  $('btnRetry') ?.addEventListener('click', () => {
    overlay.remove(); stopInGameMusic(); ensureAudio(); launchGame();
  });
  $('btnToMenu')?.addEventListener('click', () => {
    overlay.remove(); stopInGameMusic(); stopMenuBGM(); changeScreen('mainmenu');
  });
}

function _btnStyle(color) {
  return `font-family:'Press Start 2P',monospace;font-size:clamp(0.45rem,1.3vw,0.65rem);
    cursor:pointer;padding:0.8em 1.8em;border:3px solid ${color};background:transparent;
    color:${color};letter-spacing:0.1em;transition:transform 0.1s;text-transform:uppercase;`;
}


/* ─────────────────────────────────────────────────────────────────
   §12  BUTTON BINDINGS
───────────────────────────────────────────────────────────────── */
function bindButtons() {
  // Main menu
  $('btnStartGame')?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')    ?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });

  // How to play
  $('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));

  // Char select back
  $('btnCSBack')   ?.addEventListener('click', () => { startMenuBGM(); changeScreen('mainmenu'); });

  // Confirm
  $('btnConfirmYes')?.addEventListener('click', () => { ensureAudio(); changeScreen('game'); });
  $('btnConfirmNo') ?.addEventListener('click', () => {
    GS.char = null;
    startMenuBGM();
    changeScreen('charselect');
  });

  // HUD pause
  $('btnPause')?.addEventListener('click', () => togglePause());
}


/* ─────────────────────────────────────────────────────────────────
   §13  KEYBOARD SHORTCUTS (global)
───────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (GS.screen === 'mainmenu' && e.key === 'Enter') {
    ensureAudio(); changeScreen('charselect'); return;
  }
  if (e.key === 'Escape') {
    switch (GS.screen) {
      case 'howtoplay':  changeScreen('mainmenu');   break;
      case 'charselect': changeScreen('mainmenu');   break;
      case 'confirm':
        GS.char = null; startMenuBGM(); changeScreen('charselect');
        break;
      // game ESC is handled in onKeyDown (registered per-game)
    }
  }
});


/* ─────────────────────────────────────────────────────────────────
   §14  INIT
───────────────────────────────────────────────────────────────── */
async function init() {
  console.log('🐾 Furry Escapades — booting…');

  bindButtons();
  bindCharCards();

  setLoadBar(0);
  await preloadImages();
  await new Promise(r => setTimeout(r, 400));

  console.log('✅ Assets ready. Images loaded:', Object.keys(GS.images).join(', '));
  changeScreen('mainmenu');
}

document.addEventListener('DOMContentLoaded', init);
