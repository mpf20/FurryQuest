/**
 * ═══════════════════════════════════════════════════════════════
 *  FURRY ESCAPADES: OUTSMART THE VET  ·  script.js
 *  Step 1 — State Management, Character Selection, Audio Engine
 * ═══════════════════════════════════════════════════════════════
 *
 *  ASSET FILE REFERENCES (exact, case-sensitive):
 *  ┌────────────────────────────────────────────────────────────┐
 *  │  assets/images/Molly.png       → Molly the Pomeranian dog  │
 *  │  assets/images/Agata.png       → Agata the forest cat      │
 *  │  assets/images/Martin.png      → Martín the desert cat     │
 *  │  assets/images/Michi.png       → Michi the bathroom cat    │
 *  │  assets/images/Veterinaria.png → The Vet (antagonist)      │
 *  └────────────────────────────────────────────────────────────┘
 *
 *  SCREEN FLOW (state machine):
 *    loading ──► mainmenu ──► charselect ──► confirm ──► game
 *                    └──► howtoplay ──► mainmenu
 *
 *  AUDIO HOOKS (replace oscillators with real files in Step 2):
 *    assets/audio/menu_music.mp3   → looping BGM during selection
 *    assets/audio/meow_sfx.mp3     → cat selection SFX
 *    assets/audio/bark_sfx.mp3     → Molly selection SFX
 *    assets/audio/arabic_bgm.mp3   → dynamic in-game track
 *    assets/audio/win_jingle.mp3   → victory screen
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. CHARACTER REGISTRY
   Central data store for all playable characters.
   Extend each entry in Step 2 with Three.js scene config,
   spawn points, patrol routes, etc.
   ═══════════════════════════════════════════════════════════════ */
const CHARACTERS = {
  molly: {
    id:          'molly',
    name:        'MOLLY',
    type:        'dog',
    /** FILE: assets/images/Molly.png — Pomeranian in battle armor */
    img:         'images/Molly.png',
    sound:       'bark',              // triggers playDogBark()
    level:       'THE HOUSE',
    setting:     'House littered with shirts and clothes',
    objective:   'Stash clothes & dodge\nthe Vet at all costs!',
    reward:      '🦴 BONE',
    color:       '#c860ff',           // CSS --molly
    hidingSpots: ['under-bed', 'sofa', 'kitchen-cabinet'],
  },
  agata: {
    id:          'agata',
    name:        'AGATA',
    type:        'cat',
    /** FILE: assets/images/Agata.png — Gray armored cat w/ backpack */
    img:         'images/Agata.png',
    sound:       'meow',
    level:       'THE FOREST',
    setting:     'Dense low-poly forest',
    objective:   'Flee the Vet\'s nail\nclippers deep in the woods!',
    reward:      '🐟 FISH',
    color:       '#00e86a',           // CSS --agata
    hidingSpots: ['tree-trunk', 'bush-cluster'],
  },
  martin: {
    id:          'martin',
    name:        'MARTÍN',
    type:        'cat',
    /** FILE: assets/images/Martin.png — Brown/white cat in leather armor */
    img:         'images/Martin.png',
    sound:       'meow',
    level:       'THE DESERT',
    setting:     'Arid, barren desert with ancient ruins',
    objective:   'Reach the water well.\nThirst is rising fast!',
    reward:      '🐟 FISH',
    color:       '#ff9020',           // CSS --martin
    hidingSpots: ['sand-dune', 'ancient-ruins'],
  },
  michi: {
    id:          'michi',
    name:        'MICHI',
    type:        'cat',
    /** FILE: assets/images/Michi.png — White/black cat in scale armor */
    img:         'images/Michi.png',
    sound:       'meow',
    level:       'THE BATHROOM',
    setting:     'Residential house — bath time horror',
    objective:   'Avoid soap, towel and\nwet bathroom doom!',
    reward:      '🐟 FISH',
    color:       '#00b8ff',           // CSS --michi
    hidingSpots: ['closet', 'laundry-basket', 'bookshelf-top'],
  },
};

/**
 * Antagonist data.
 * FILE: assets/images/Veterinaria.png — Young vet in white lab coat.
 * Three.js billboard setup, patrol AI, and raycasting vision cone
 * are implemented in Step 2.
 */
const VET = {
  id:          'vet',
  name:        'THE VET',
  img:         'images/Veterinaria.png',
  patrolSpeed: 2.5,   // world units/sec
  chaseSpeed:  5.0,
  visionDeg:   60,    // half-angle of vision cone
  visionRange: 12,    // world units
};


/* ═══════════════════════════════════════════════════════════════
   2. GAME STATE  (single source of truth)
   All runtime state lives here. Modify only through helpers.
   ═══════════════════════════════════════════════════════════════ */
const gameState = {
  /**
   * Which screen is currently active.
   * @type {'loading'|'mainmenu'|'howtoplay'|'charselect'|'confirm'|'game'|'paused'|'win'|'lose'}
   */
  currentScreen: 'loading',

  /**
   * The character the player has chosen (or null before selection).
   * @type {object|null}
   */
  selectedCharacter: null,

  /** Asset loading progress */
  loading: {
    total:      0,
    loaded:     0,
    complete:   false,
    /** Preloaded HTMLImageElement cache  key → img */
    cache:      new Map(),
  },

  /** Audio engine references */
  audio: {
    /** @type {AudioContext|null} */
    ctx:             null,
    /** Currently running BGM source node */
    bgmSource:       null,
    /** Whether looping menu BGM is active */
    bgmActive:       false,
    /** Vet proximity 0–1; drives in-game tempo in Step 2 */
    vetProximity:    0,
    /** Internal timer handle for arpeggio loop */
    _arpeggioTimer:  null,
    /** Live oscillator nodes (for cleanup) */
    _oscNodes:       [],
  },

  /** Three.js references — all null until Step 2 */
  scene: {
    /** @type {THREE.WebGLRenderer|null} */
    renderer:    null,
    /** @type {THREE.Scene|null} */
    three:       null,
    /** @type {THREE.PerspectiveCamera|null} */
    camera:      null,
    running:     false,
    /** 'patrol' | 'chase' | 'lost' */
    vetMode:     'patrol',
  },
};


/* ═══════════════════════════════════════════════════════════════
   3. SCREEN MANAGEMENT  (changeScreen / goToScreen)
   ═══════════════════════════════════════════════════════════════ */

/** DOM handles for every screen */
const SCREENS = {
  loading:    document.getElementById('screen-loading'),
  mainmenu:   document.getElementById('screen-mainmenu'),
  howtoplay:  document.getElementById('screen-howtoplay'),
  charselect: document.getElementById('screen-charselect'),
  confirm:    document.getElementById('screen-confirm'),
  game:       document.getElementById('screen-game'),
};

/**
 * changeScreen — the primary state-machine transition function.
 * Hides the current screen, updates gameState, shows the next.
 * All screen-specific side-effects (music, setup) fire here.
 *
 * @param {string} name — key in SCREENS
 */
function changeScreen(name) {
  if (!SCREENS[name]) {
    console.error(`[changeScreen] Unknown screen: "${name}"`);
    return;
  }

  // Deactivate current
  const prev = SCREENS[gameState.currentScreen];
  if (prev) prev.classList.remove('active');

  gameState.currentScreen = name;

  // Activate next
  const next = SCREENS[name];
  next.classList.add('active');

  console.log(`[Screen] → ${name}`);

  // Per-screen side effects
  switch (name) {
    case 'mainmenu':
      startBGM();
      break;
    case 'charselect':
      // BGM continues from mainmenu; nothing extra needed
      break;
    case 'confirm':
      buildConfirmScreen();
      break;
    case 'game':
      stopBGM(); // Hard-stop the moment the level loads
      initGameHUD();
      // ── Step 2 hook ──
      // initThreeJsScene(gameState.selectedCharacter);
      console.log('[Step 2 hook] initThreeJsScene()', gameState.selectedCharacter?.id);
      break;
    default:
      break;
  }
}


/* ═══════════════════════════════════════════════════════════════
   4. ASSET PRELOADER
   Preloads all PNG/JPG sprites before the title screen appears.
   Shows a progress bar. Extend this array to include audio,
   environment textures, etc. in Step 2.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Images to preload. Keys must match CHARACTERS[id].img and VET.img.
 *
 * IMPORTANT — exact filenames (case-sensitive):
 *   Molly.png, Agata.png, Martin.png, Michi.png, Veterinaria.png
 */
const PRELOAD_IMAGES = [
  { key: 'molly',       src: 'images/Molly.png' },
  { key: 'agata',       src: 'images/Agata.png' },
  { key: 'martin',      src: 'images/Martin.png' },
  { key: 'michi',       src: 'images/Michi.png' },
  { key: 'vet',         src: 'images/Veterinaria.png' },
];

const $loadBar = document.getElementById('loadBar');
const $loadPct = document.getElementById('loadPct');

/**
 * Preload all images; resolve once every image has settled.
 * @returns {Promise<void>}
 */
function preloadAssets() {
  return new Promise(resolve => {
    const total = PRELOAD_IMAGES.length;
    gameState.loading.total = total;
    if (total === 0) { setLoadProgress(100); resolve(); return; }

    let done = 0;

    PRELOAD_IMAGES.forEach(({ key, src }) => {
      const img = new Image();
      const finish = () => {
        done++;
        gameState.loading.cache.set(key, img);
        setLoadProgress(Math.round(done / total * 100));
        if (done === total) { gameState.loading.complete = true; resolve(); }
      };
      img.onload  = finish;
      img.onerror = () => { console.warn(`[Preload] Failed: ${src}`); finish(); };
      img.src = src;
    });
  });
}

/** Update the loading bar and percentage label. */
function setLoadProgress(pct) {
  if ($loadBar) $loadBar.style.width = pct + '%';
  if ($loadPct) $loadPct.textContent  = pct + '%';
}


/* ═══════════════════════════════════════════════════════════════
   5. AUDIO ENGINE
   Procedural Web Audio API sounds as placeholders.
   Swap with real files by uncommenting the fetch patterns below
   and placing your MP3s in assets/audio/.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Initialise (or resume) the AudioContext.
 * Must be called inside a user-gesture handler.
 */
function initAudio() {
  if (!gameState.audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try {
      gameState.audio.ctx = new Ctx();
    } catch (e) {
      console.warn('[Audio] Web Audio unavailable:', e);
      return;
    }
  }
  if (gameState.audio.ctx.state === 'suspended') {
    gameState.audio.ctx.resume();
  }
}

/* ── BGM: startBGM / stopBGM ─────────────────────────────────── */

/**
 * Start the looping menu background music.
 * Currently procedural (square-wave arpeggio).
 *
 * TO REPLACE WITH REAL FILE:
 *   fetch('assets/audio/menu_music.mp3')
 *     .then(r => r.arrayBuffer())
 *     .then(buf => gameState.audio.ctx.decodeAudioData(buf))
 *     .then(decoded => {
 *       const src = gameState.audio.ctx.createBufferSource();
 *       src.buffer = decoded; src.loop = true;
 *       src.connect(gameState.audio.ctx.destination);
 *       src.start();
 *       gameState.audio.bgmSource = src;
 *     });
 */
function startBGM() {
  if (gameState.audio.bgmActive || !gameState.audio.ctx) return;
  gameState.audio.bgmActive = true;
  _playArpeggioLoop();
}

/**
 * Hard-stop the BGM immediately.
 * Called the instant a character is confirmed or the game begins.
 */
function stopBGM() {
  gameState.audio.bgmActive = false;
  clearTimeout(gameState.audio._arpeggioTimer);
  if (gameState.audio.bgmSource) {
    try { gameState.audio.bgmSource.stop(); } catch (_) {}
    gameState.audio.bgmSource = null;
  }
  // Kill all live oscillators
  gameState.audio._oscNodes.forEach(n => { try { n.stop(); } catch (_) {} });
  gameState.audio._oscNodes.length = 0;
  console.log('[Audio] BGM hard-stopped');
}

/**
 * Internal: looping arpeggio using square-wave oscillators.
 * Mimics an energetic retro BGM feel as a placeholder.
 */
function _playArpeggioLoop() {
  const ctx = gameState.audio.ctx;
  if (!ctx || !gameState.audio.bgmActive) return;

  // Upbeat pentatonic sequence (major feel)
  const freqs = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 523.25, 392.00, 329.63, 261.63];
  const dur   = 0.16; // seconds per note
  let t = ctx.currentTime;

  freqs.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.01);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur);
    gameState.audio._oscNodes.push(osc);
    t += dur;
  });

  const loopMs = freqs.length * dur * 1000 - 40;
  gameState.audio._arpeggioTimer = setTimeout(_playArpeggioLoop, loopMs);
}

/* ── SFX: Animal sounds ──────────────────────────────────────── */

/**
 * Play a cat meow SFX.
 * TO REPLACE: fetch/decode assets/audio/meow_sfx.mp3 and play once.
 */
function playCatMeow() {
  const ctx = gameState.audio.ctx;
  if (!ctx) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(680, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.28);
  osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.48);
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.5);
  console.log('[Audio] 🐱 Meow');
}

/**
 * Play a small-dog bark SFX.
 * TO REPLACE: fetch/decode assets/audio/bark_sfx.mp3 and play once.
 */
function playDogBark() {
  const ctx = gameState.audio.ctx;
  if (!ctx) return;
  const bufLen = Math.floor(ctx.sampleRate * 0.14);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.2);
  }
  const src    = ctx.createBufferSource();
  const bpf    = ctx.createBiquadFilter();
  const gain   = ctx.createGain();
  src.buffer   = buf;
  bpf.type     = 'bandpass'; bpf.frequency.value = 900; bpf.Q.value = 0.6;
  gain.gain.setValueAtTime(0.42, ctx.currentTime);
  src.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination);
  src.start();
  console.log('[Audio] 🐶 Bark');
}

/**
 * Route to the correct SFX based on character type.
 * @param {'meow'|'bark'} soundType
 */
function playSelectionSFX(soundType) {
  initAudio();
  if (soundType === 'bark') playDogBark();
  else                      playCatMeow();
}


/* ═══════════════════════════════════════════════════════════════
   6. CHARACTER SELECTION — CARD INTERACTIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Handle a character card being activated (click or keyboard).
 * Sequence: SFX → hard-stop BGM → visual feedback → confirm screen.
 * @param {string} charId — key in CHARACTERS
 */
function selectCharacter(charId) {
  const char = CHARACTERS[charId];
  if (!char) { console.error('[selectCharacter] Unknown:', charId); return; }

  gameState.selectedCharacter = char;
  console.log(`[Select] ${char.name} chosen`);

  // Stop BGM the instant they click — GDD requirement
  stopBGM();

  // Play animal SFX
  playSelectionSFX(char.sound);

  // Brief card pop animation
  const card = document.getElementById('card' + charId.charAt(0).toUpperCase() + charId.slice(1));
  if (card) {
    card.classList.add('selected');
    setTimeout(() => card.classList.remove('selected'), 400);
  }

  // Short pause for SFX, then go to confirm
  setTimeout(() => changeScreen('confirm'), 360);
}

/** Bind click + keyboard (Enter/Space) to all four character cards. */
function bindCharCards() {
  document.querySelectorAll('.quad[data-char]').forEach(card => {
    const charId = card.dataset.char;

    card.addEventListener('click', () => {
      initAudio();
      selectCharacter(charId);
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        initAudio();
        selectCharacter(charId);
      }
    });
  });
}


/* ═══════════════════════════════════════════════════════════════
   7. CONFIRM SCREEN
   ═══════════════════════════════════════════════════════════════ */

/** Populate the confirm screen with the selected character's data. */
function buildConfirmScreen() {
  const c = gameState.selectedCharacter;
  if (!c) return;

  const avatar = document.getElementById('confirmAvatar');
  const name   = document.getElementById('confirmName');
  const level  = document.getElementById('confirmLevel');
  const obj    = document.getElementById('confirmObj');

  if (avatar) { avatar.src = c.img; avatar.alt = c.name; }
  if (name)   name.textContent  = c.name;
  if (level)  level.textContent = `📍 ${c.level}  ·  ${c.reward}`;
  if (obj)    obj.textContent   = c.objective;
}


/* ═══════════════════════════════════════════════════════════════
   8. BUTTON BINDINGS
   ═══════════════════════════════════════════════════════════════ */

function bindButtons() {
  // Main Menu
  grab('btnStartGame')?.addEventListener('click', () => { initAudio(); changeScreen('charselect'); });
  grab('btnHowTo')    ?.addEventListener('click', () => { initAudio(); changeScreen('howtoplay'); });

  // How To Play
  grab('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));

  // Char Select back
  grab('btnCSBack')   ?.addEventListener('click', () => { startBGM(); changeScreen('mainmenu'); });

  // Confirm
  grab('btnConfirmYes')?.addEventListener('click', () => changeScreen('game'));
  grab('btnConfirmNo') ?.addEventListener('click', () => {
    gameState.selectedCharacter = null;
    startBGM();
    changeScreen('charselect');
  });

  // HUD Pause
  grab('btnPause')?.addEventListener('click', () => {
    // Step 2: toggle pause state / render loop
    console.log('[Step 2 hook] Pause pressed');
  });
}

/** Shorthand for getElementById */
function grab(id) { return document.getElementById(id); }


/* ═══════════════════════════════════════════════════════════════
   9. HUD UTILITIES  (called from Step 2 game loop)
   ═══════════════════════════════════════════════════════════════ */

/** Set character name label in HUD. Called once on game start. */
function initGameHUD() {
  const c = gameState.selectedCharacter;
  if (!c) return;
  const el = grab('hudCharName');
  if (el) el.textContent = c.name;
  updateHUDStatus('EVADING...');
}

/**
 * Update the vet-proximity bar (0 = safe, 1 = caught).
 * Call this from the Three.js animation loop in Step 2.
 * @param {number} p — 0 to 1
 */
function updateVetProximity(p) {
  gameState.audio.vetProximity = p;
  const fill = grab('hudProxFill');
  if (fill) {
    fill.style.width = Math.min(1, Math.max(0, p)) * 100 + '%';
    fill.style.boxShadow = p > 0.7 ? '0 0 10px #ff2d78' : 'none';
  }
  // Step 2: also drive the Arabic-track pitch/tempo here
}

/**
 * Update the HUD status text.
 * @param {string} txt — e.g. 'HIDING!', 'CAUGHT!', 'RUN!'
 */
function updateHUDStatus(txt) {
  const el = grab('hudStatus');
  if (el) el.textContent = txt;
}


/* ═══════════════════════════════════════════════════════════════
   10. WIN / LOSE  (Step 2 will flesh these out)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Show win screen for the active character.
 * Step 2: play win_jingle.mp3, show reward item (Fish / Bone),
 * display character billboard large with particle burst.
 */
function showWinScreen() {
  const c = gameState.selectedCharacter;
  console.log(`[Win] 🎉 ${c?.name} earns: ${c?.reward}`);
  // Step 2: proper win overlay
}

/**
 * Show caught/lose screen.
 * Step 2: show Vet billboard, "THE VET GOT YOU!" text, retry/quit.
 */
function showLoseScreen() {
  console.log('[Lose] 😿 The Vet caught the player!');
  // Step 2: proper lose overlay
}


/* ═══════════════════════════════════════════════════════════════
   11. THREE.JS STUBS  (Step 2 implementations)
   These stubs document the exact integration points where the
   3D level code will hook into this state machine.
   ═══════════════════════════════════════════════════════════════ */

/**
 * STUB — Step 2: Initialise the Three.js 3D scene.
 * Creates WebGLRenderer, Scene, Camera, Lighting, level geometry,
 * character billboard, Vet billboard, and starts the game loop.
 *
 * Billboard technique summary:
 *   const tex = new THREE.TextureLoader().load(char.img);
 *   tex.minFilter = tex.magFilter = THREE.NearestFilter; // retro pixelated
 *   const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
 *   const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
 *   // In animation loop: mesh.quaternion.copy(camera.quaternion); // always face camera
 *
 * @param {object} char — entry from CHARACTERS
 */
function initThreeJsScene(char) {
  /*
   * Step 2 — full implementation here:
   *
   * const canvas   = document.getElementById('gameCanvas');
   * const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
   * renderer.setPixelRatio(0.75);  // intentional low-res retro look
   * renderer.setSize(window.innerWidth, window.innerHeight);
   *
   * const scene  = new THREE.Scene();
   * const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
   *
   * // Build level geometry for char.level
   * // Add player billboard (char.img), Vet billboard (VET.img)
   * // Set up patrol AI using VET.visionDeg, VET.visionRange
   *
   * gameState.scene.renderer = renderer;
   * gameState.scene.three    = scene;
   * gameState.scene.camera   = camera;
   * gameState.scene.running  = true;
   *
   * function animate() {
   *   if (!gameState.scene.running) return;
   *   requestAnimationFrame(animate);
   *   // updateVetAI(), updatePlayer(), checkCollisions()
   *   // updateVetProximity(computeProximity())
   *   renderer.render(scene, camera);
   * }
   * animate();
   */
  console.log('[Step 2 STUB] initThreeJsScene — char:', char.id, 'level:', char.level);
}

/**
 * STUB — Step 2: Vet vision cone check.
 * Returns true if the player is within the Vet's cone of vision
 * AND no hiding-spot geometry blocks the ray.
 *
 * @param {THREE.Vector3} vetPos
 * @param {THREE.Vector3} playerPos
 * @param {THREE.Vector3} vetDir    normalised facing direction
 * @returns {boolean}
 */
function checkVetVision(vetPos, playerPos, vetDir) {
  /*
   * Step 2:
   * const toPlayer = playerPos.clone().sub(vetPos);
   * if (toPlayer.length() > VET.visionRange) return false;
   * const angle = THREE.MathUtils.radToDeg(vetDir.angleTo(toPlayer.normalize()));
   * if (angle >= VET.visionDeg) return false;
   * // Raycast through hiding spots — if blocked, return false
   * return true;
   */
  return false;
}


/* ═══════════════════════════════════════════════════════════════
   12. KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (gameState.currentScreen === 'mainmenu' && e.key === 'Enter') {
    initAudio(); changeScreen('charselect');
    return;
  }
  if (e.key === 'Escape') {
    switch (gameState.currentScreen) {
      case 'howtoplay':  changeScreen('mainmenu');   break;
      case 'charselect': changeScreen('mainmenu');   break;
      case 'confirm':
        gameState.selectedCharacter = null;
        startBGM();
        changeScreen('charselect');
        break;
    }
  }
});


/* ═══════════════════════════════════════════════════════════════
   13. WINDOW RESIZE
   ═══════════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  // Step 2 will update renderer + camera aspect ratio here
  if (gameState.scene.renderer && gameState.scene.camera) {
    // gameState.scene.renderer.setSize(innerWidth, innerHeight);
    // gameState.scene.camera.aspect = innerWidth / innerHeight;
    // gameState.scene.camera.updateProjectionMatrix();
  }
});


/* ═══════════════════════════════════════════════════════════════
   14. INIT — entry point
   ═══════════════════════════════════════════════════════════════ */
async function init() {
  console.log('🐾 [Furry Escapades] Starting…');
  console.log('Assets expected at:',
    PRELOAD_IMAGES.map(a => a.src).join(', '));

  // Wire up all UI interactions before loading starts
  bindButtons();
  bindCharCards();

  // Kick off asset preload with progress bar
  setLoadProgress(0);
  await preloadAssets();

  // Brief pause so 100% is visible
  await new Promise(r => setTimeout(r, 500));

  console.log('[Init] ✅ Assets loaded. Going to main menu.');
  changeScreen('mainmenu');
}

document.addEventListener('DOMContentLoaded', init);
