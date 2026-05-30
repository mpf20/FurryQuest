/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v6 — Dynamic Injection)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   §1  CHARACTER & LEVEL DATA
───────────────────────────────────────────────────────────────── */
const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: '🐶 DOG WARRIOR',
    mission: 'Stash clothes & dodge the Vet!', mapName: 'THE HOUSE',
    reward: '🦴 BONE', imgPath: 'images/Molly.png', speed: 4.2, sprintMul: 1.5,
    colors: { primary: '#c860ff', secondary: 'rgba(200,96,255,0.2)' },
    hidingSpots: ['Under Bed', 'Sofa', 'Cabinet']
  },
  agata: {
    id: 'agata', name: 'AGATA', type: '🐱 FOREST MAGE',
    mission: "Flee the Vet's nail clippers!", mapName: 'THE FOREST',
    reward: '🐟 FISH', imgPath: 'images/Agata.png', speed: 4.5, sprintMul: 1.4,
    colors: { primary: '#00e86a', secondary: 'rgba(0,232,106,0.2)' },
    hidingSpots: ['Tree Trunks', 'Bushes']
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: '🐱 DESERT KNIGHT',
    mission: 'Reach the well. Thirst is rising!', mapName: 'THE DESERT',
    reward: '🐟 FISH', imgPath: 'images/Martin.png', speed: 3.9, sprintMul: 1.6,
    colors: { primary: '#ff9020', secondary: 'rgba(255,144,32,0.2)' },
    hidingSpots: ['Sand Dunes', 'Ruins']
  },
  michi: {
    id: 'michi', name: 'MICHI', type: '🐱 ROGUE ALCHEMIST',
    mission: 'Avoid soap, towel & wet doom!', mapName: 'THE BATHROOM',
    reward: '🐟 FISH', imgPath: 'images/Michi.png', speed: 4.8, sprintMul: 1.3,
    colors: { primary: '#00b8ff', secondary: 'rgba(0,184,255,0.2)' },
    hidingSpots: ['Closets', 'Laundry Basket', 'Bookshelf']
  }
};

const GS = {
  screen: 'loading',
  char: null,
  images: {},
  audioCtx: null,
  bgmNode: null,
  isPaused: false,
  gameLoopId: null,
  keys: {},
  player: { x: 100, y: 100, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: { x: 500, y: 400, angle: 0, speed: 2.2 },
  map: { width: 1600, height: 1200 },
  hidingObjects: [],
  goal: { x: 1450, y: 1050, radius: 40 },
  gameResult: null,
  proximity: 0
};

// Rutas base estándar
const IMAGE_ASSETS = {
  molly: 'images/Molly.png',
  agata: 'images/Agata.png',
  martin: 'images/Martin.png',
  michi: 'images/Michi.png',
  vet: 'images/Veterinaria.png'
};

/* ─────────────────────────────────────────────────────────────────
   §2  PRELOADER & INJECTION ENGINE
───────────────────────────────────────────────────────────────── */
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

  const promises = keys.map(key => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = IMAGE_ASSETS[key];
      img.onload = () => {
        GS.images[key] = img;
        loadedCount++;
        setLoadBar((loadedCount / total) * 100);
        resolve();
      };
      img.onerror = () => {
        // Segundo intento forzando minúsculas por si acaso
        const altImg = new Image();
        altImg.src = IMAGE_ASSETS[key].toLowerCase();
        altImg.onload = () => {
          GS.images[key] = altImg;
          loadedCount++;
          setLoadBar((loadedCount / total) * 100);
          resolve();
        };
        altImg.onerror = () => {
          console.error('❌ Imposible cargar recurso:', IMAGE_ASSETS[key]);
          loadedCount++;
          setLoadBar((loadedCount / total) * 100);
          resolve();
        };
      };
    });
  });

  await Promise.all(promises);
}

/**
 * Fuerza al HTML del menú de selección a usar las imágenes
 * que el cargador de JavaScript ya procesó con éxito en memoria.
 */
function injectLoadedImagesToDOM() {
  if (GS.images['vet'] && document.getElementById('vetTitleImg')) {
    document.getElementById('vetTitleImg').src = GS.images['vet'].src;
  }
  if (GS.images['molly'] && document.getElementById('avatarMolly')) {
    document.getElementById('avatarMolly').src = GS.images['molly'].src;
  }
  if (GS.images['agata'] && document.getElementById('avatarAgata')) {
    document.getElementById('avatarAgata').src = GS.images['agata'].src;
  }
  if (GS.images['martin'] && document.getElementById('avatarMartin')) {
    document.getElementById('avatarMartin').src = GS.images['martin'].src;
  }
  if (GS.images['michi'] && document.getElementById('avatarMichi')) {
    document.getElementById('avatarMichi').src = GS.images['michi'].src;
  }
}

/* ─────────────────────────────────────────────────────────────────
   §3  AUDIO SYNTHESIS ENGINE (Procedural Web Audio API)
───────────────────────────────────────────────────────────────── */
function ensureAudio() {
  if (!GS.audioCtx) {
    GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (GS.audioCtx.state === 'suspended') {
    GS.audioCtx.resume();
  }
}

function stopBGM() {
  if (GS.bgmNode) {
    try { GS.bgmNode.stop(); } catch(e){}
    GS.bgmNode = null;
  }
}

function startMenuBGM() {
  ensureAudio();
  stopBGM();
  
  const ctx = GS.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  
  const now = ctx.currentTime;
  for (let i = 0; i < 100; i++) {
    const t = now + i * 0.4;
    osc.frequency.setValueAtTime(146.83, t);
    osc.frequency.setValueAtTime(164.81, t + 0.1);
    osc.frequency.setValueAtTime(196.00, t + 0.2);
    osc.frequency.setValueAtTime(220.00, t + 0.3);
  }

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  GS.bgmNode = osc;
}

function playSynthSFX(type) {
  ensureAudio();
  const ctx = GS.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  if (type === 'bark') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  } else {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  }
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/* ─────────────────────────────────────────────────────────────────
   §4  STATE MACHINE ROUTER
───────────────────────────────────────────────────────────────── */
function changeScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  
  GS.screen = screenId;

  if (screenId === 'mainmenu') {
    stopBGM();
  } else if (screenId === 'charselect') {
    startMenuBGM();
  } else if (screenId === 'game') {
    stopBGM();
    startGameplay();
  }
}

/* ─────────────────────────────────────────────────────────────────
   §5  SELECTION DECK MECHANICS
───────────────────────────────────────────────────────────────── */
function selectCharacter(charId) {
  const data = CHARACTERS[charId];
  if (!data) return;

  GS.char = data;
  playSynthSFX(charId === 'molly' ? 'bark' : 'meow');

  const avatar = document.getElementById('confirmAvatar');
  if (avatar && GS.images[charId]) {
    avatar.src = GS.images[charId].src;
  }
  
  const cName = document.getElementById('confirmName');
  if (cName) {
    cName.textContent = data.name;
    cName.className = `confirm-name ${charId}-text`;
  }
  
  const cLvl = document.getElementById('confirmLevel');
  if (cLvl) cLvl.textContent = data.type;
  
  const cObj = document.getElementById('confirmObj');
  if (cObj) cObj.textContent = `LOCATION: ${data.mapName} \n• OBJECTIVE: ${data.mission}`;

  changeScreen('confirm');
}

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card => {
    const charId = card.getAttribute('data-char');
    card.addEventListener('click', () => selectCharacter(charId));
  });
}

/* ─────────────────────────────────────────────────────────────────
   §6  GAMEPLAY CANVAS ENGINE
───────────────────────────────────────────────────────────────── */
function setupGameMap() {
  GS.player.x = 150; GS.player.y = 150; GS.player.vx = 0; GS.player.vy = 0;
  GS.player.isHidden = false; GS.player.isSprinting = false;
  GS.vet.x = 1000; GS.vet.y = 800; GS.vet.angle = Math.PI;
  GS.hidingObjects = [];
  for (let i = 0; i < 8; i++) {
    GS.hidingObjects.push({
      x: 300 + Math.random() * 900,
      y: 200 + Math.random() * 800,
      radius: 45
    });
  }
  GS.gameResult = null;
  GS.isPaused = false;
}

function startGameplay() {
  setupGameMap();
  const hudName = document.getElementById('hudCharName');
  if (hudName) {
    hudName.textContent = GS.char.name;
    hudName.style.color = GS.char.colors.primary;
  }
  GS.keys = {};
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  if (GS.gameLoopId) cancelAnimationFrame(GS.gameLoopId);
  GS.gameLoopId = requestAnimationFrame(gameLoop);
}

function onKeyDown(e) {
  GS.keys[e.key.toLowerCase()] = true;
  if (e.key === 'escape') togglePause();
}
function onKeyUp(e) {
  GS.keys[e.key.toLowerCase()] = false;
}

function togglePause() {
  GS.isPaused = !GS.isPaused;
  const btn = document.getElementById('btnPause');
  if (btn) btn.textContent = GS.isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

function updateGame() {
  if (GS.isPaused || GS.gameResult) return;
  const p = GS.player;
  const speed = GS.char.speed * (GS.keys['shift'] ? GS.char.sprintMul : 1);
  
  let dx = 0, dy = 0;
  if (GS.keys['w'] || GS.keys['arrowup']) dy = -1;
  if (GS.keys['s'] || GS.keys['arrowdown']) dy = 1;
  if (GS.keys['a'] || GS.keys['arrowleft']) dx = -1;
  if (GS.keys['d'] || GS.keys['arrowright']) dx = 1;

  if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
  p.x += dx * speed; p.y += dy * speed;

  if (p.x < 30) p.x = 30; if (p.x > GS.map.width - 30) p.x = GS.map.width - 30;
  if (p.y < 30) p.y = 30; if (p.y > GS.map.height - 30) p.y = GS.map.height - 30;

  let nearSpot = false;
  GS.hidingObjects.forEach(spot => {
    const dist = Math.hypot(p.x - spot.x, p.y - spot.y);
    if (dist < spot.radius) nearSpot = true;
  });
  p.isHidden = nearSpot && GS.keys['e'];

  const vet = GS.vet;
  const distToPlayer = Math.hypot(p.x - vet.x, p.y - vet.y);
  let prox = 1 - (distToPlayer / 800);
  if (prox < 0) prox = 0; if (prox > 1) prox = 1;
  GS.proximity = prox;

  if (!p.isHidden) {
    const targetAngle = Math.atan2(p.y - vet.y, p.x - vet.x);
    vet.angle = targetAngle;
    vet.x += Math.cos(vet.angle) * vet.speed;
    vet.y += Math.sin(vet.angle) * vet.speed;
  }

  const distToGoal = Math.hypot(p.x - GS.goal.x, p.y - GS.goal.y);
  if (distToGoal < GS.goal.radius + 15) { GS.gameResult = 'WIN'; endGame(); }
  if (distToPlayer < 45 && !p.isHidden) { GS.gameResult = 'LOSE'; endGame(); }
}

function endGame() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  alert(GS.gameResult === 'WIN' ? '🏆 YOU ESCAPED THE VET! WIN!' : '🚨 OH NO! THE VET CAUGHT YOU! GAME OVER!');
  changeScreen('mainmenu');
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  }
  ctx.fillStyle = '#111424'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2 - GS.player.x, canvas.height/2 - GS.player.y);

  ctx.strokeStyle = GS.char.colors.primary; ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, GS.map.width, GS.map.height);

  GS.hidingObjects.forEach(spot => {
    ctx.fillStyle = 'rgba(40, 50, 90, 0.6)'; ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#4f6096'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.fillText('HIDE [E]', spot.x - 22, spot.y + 4);
  });

  ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.arc(GS.goal.x, GS.goal.y, GS.goal.radius, 0, Math.PI*2); ctx.fill();

  ctx.save(); ctx.translate(GS.player.x, GS.player.y);
  if (GS.player.isHidden) ctx.globalAlpha = 0.3;
  const pImg = GS.images[GS.char.id];
  if (pImg) { ctx.drawImage(pImg, -30, -30, 60, 60); } else { ctx.fillStyle = GS.char.colors.primary; ctx.fillRect(-20, -20, 40, 40); }
  ctx.restore();

  ctx.save(); ctx.translate(GS.vet.x, GS.vet.y);
  const vImg = GS.images['vet'];
  if (vImg) { ctx.drawImage(vImg, -35, -45, 70, 90); } else { ctx.fillStyle = '#ff2d78'; ctx.fillRect(-25, -25, 50, 50); }
  ctx.restore();
  ctx.restore();

  const fill = document.getElementById('hudProxFill');
  if (fill) fill.style.width = (GS.proximity * 100) + '%';
  const status = document.getElementById('hudStatus');
  if (status) {
    status.textContent = GS.player.isHidden ? 'HIDDEN' : (GS.keys['shift'] ? 'SPRINTING' : 'EVADING...');
    status.style.color = GS.player.isHidden ? '#ffe600' : '#00e86a';
  }
}

function gameLoop() {
  updateGame(); renderGame();
  if (GS.screen === 'game') GS.gameLoopId = requestAnimationFrame(gameLoop);
}

/* ─────────────────────────────────────────────────────────────────
   §7  DOM EVENT HOOKS
───────────────────────────────────────────────────────────────── */
function bindButtons() {
  const $ = id => document.getElementById(id);
  $('btnStartGame')?.addEventListener('click', () => changeScreen('charselect'));
  $('btnHowTo')?.addEventListener('click', () => changeScreen('howtoplay'));
  $('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnConfirmYes')?.addEventListener('click', () => { ensureAudio(); changeScreen('game'); });
  $('btnConfirmNo')?.addEventListener('click', () => { GS.char = null; startMenuBGM(); changeScreen('charselect'); });
  $('btnPause')?.addEventListener('click', () => togglePause());
}

/* ─────────────────────────────────────────────────────────────────
   §8  INIT BOOTSTRAPPER
───────────────────────────────────────────────────────────────── */
async function init() {
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  
  await preloadImages();
  await new Promise(r => setTimeout(r, 100));

  // Inyectar imágenes validadas al árbol del HTML antes de pasar de pantalla
  injectLoadedImagesToDOM();
  
  changeScreen('mainmenu');
}

window.addEventListener('DOMContentLoaded', init);
