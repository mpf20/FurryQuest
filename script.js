/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v10 — Absolute Fix)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

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

const GS = {
  screen: 'loading',
  char: null,
  images: {},
  audioCtx: null,
  bgmNode: null,
  isPaused: false,
  gameLoopId: null,
  keys: {},
  player: { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: { x: 900, y: 700, angle: 0, speed: 2.4 },
  map: { width: 1600, height: 1200 },
  hidingObjects: [],
  goal: { x: 1450, y: 1050, radius: 45 },
  gameResult: null,
  proximity: 0
};

// Rutas exactas a tus archivos en minúsculas
const IMAGE_ASSETS = {
  molly: 'assets/images/Molly.png',
  agata: 'assets/images/Agata.png',
  martin: 'assets/images/Martin.png',
  michi: 'assets/images/Michi.png',
  vet: 'assets/images/Veterinaria.png'
};

/* ─────────────────────────────────────────────────────────────────
   §2  PRELOADER (Con bypass de seguridad anti-congelamiento)
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
        // Si falla en Vercel, sigue adelante igual para no congelar la pantalla
        loadedCount++;
        setLoadBar((loadedCount / total) * 100);
        resolve();
      };
    });
  });

  // Si tarda más de 2.5 segundos, salta al menú automáticamente
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(promises), timeoutPromise]);
}

/* ─────────────────────────────────────────────────────────────────
   §3  AUDIO SYNTHESIS ENGINE
───────────────────────────────────────────────────────────────── */
function ensureAudio() {
  try {
    if (!GS.audioCtx) {
      GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (GS.audioCtx.state === 'suspended') {
      GS.audioCtx.resume();
    }
  } catch (e) {
    console.log("Audio bloqueado temporalmente.");
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
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    const now = ctx.currentTime;
    for (let i = 0; i < 60; i++) {
      const t = now + i * 0.4;
      osc.frequency.setValueAtTime(146.83, t);
      osc.frequency.setValueAtTime(164.81, t + 0.1);
      osc.frequency.setValueAtTime(196.00, t + 0.2);
    }
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    GS.bgmNode = osc;
  } catch(e) {}
}

function playSynthSFX(type) {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
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
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/* ─────────────────────────────────────────────────────────────────
   §4  ROUTER
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
   §5  SELECTION MECHANICS
───────────────────────────────────────────────────────────────── */
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
  document.getElementById('confirmObj').textContent = `LOCATION: ${data.mapName} \n• OBJECTIVE: ${data.mission}`;

  changeScreen('confirm');
}

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card => {
    const charId = card.getAttribute('data-char');
    card.addEventListener('click', () => {
      ensureAudio();
      selectCharacter(charId);
    });
  });
}

/* ─────────────────────────────────────────────────────────────────
   §6  GAMEPLAY ENGINE
───────────────────────────────────────────────────────────────── */
function setupGameMap() {
  GS.player.x = 150; GS.player.y = 150;
  GS.player.isHidden = false;
  GS.vet.x = 1100; GS.vet.y = 800;
  GS.hidingObjects = [];
  for (let i = 0; i < 6; i++) {
    GS.hidingObjects.push({
      x: 400 + i * 180,
      y: 300 + Math.sin(i) * 200,
      radius: 55
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

window.addEventListener('click', ensureAudio);

function togglePause() {
  GS.isPaused = !GS.isPaused;
  document.getElementById('btnPause').textContent = GS.isPaused ? '▶ RESUME' : '⏸ PAUSE';
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

  if (p.x < 40) p.x = 40; if (p.x > GS.map.width - 40) p.x = GS.map.width - 40;
  if (p.y < 40) p.y = 40; if (p.y > GS.map.height - 40) p.y = GS.map.height - 40;

  let nearSpot = false;
  GS.hidingObjects.forEach(spot => {
    if (Math.hypot(p.x - spot.x, p.y - spot.y) < spot.radius) nearSpot = true;
  });
  GS.player.isHidden = nearSpot && GS.keys['e'];

  const vet = GS.vet;
  const dist = Math.hypot(p.x - vet.x, p.y - vet.y);
  GS.proximity = Math.max(0, Math.min(1, 1 - (dist / 700)));

  if (!GS.player.isHidden) {
    vet.angle = Math.atan2(p.y - vet.y, p.x - vet.x);
    vet.x += Math.cos(vet.angle) * vet.speed;
    vet.y += Math.sin(vet.angle) * vet.speed;
  }

  if (Math.hypot(p.x - GS.goal.x, p.y - GS.goal.y) < GS.goal.radius + 10) {
    GS.gameResult = 'WIN'; endGame();
  }
  if (dist < 45 && !GS.player.isHidden) {
    GS.gameResult = 'LOSE'; endGame();
  }
}

function endGame() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  alert(GS.gameResult === 'WIN' ? '🏆 ESCAPASTE DE LA VETERINARIA! GANASTE!' : '🚨 LA VETERINARIA TE ATRAPÓ! GAME OVER!');
  changeScreen('mainmenu');
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  }
  
  ctx.fillStyle = '#0a0d1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2 - GS.player.x, canvas.height / 2 - GS.player.y);

  ctx.strokeStyle = GS.char.colors.primary; ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, GS.map.width, GS.map.height);

  GS.hidingObjects.forEach(spot => {
    ctx.fillStyle = 'rgba(30, 40, 80, 0.5)'; ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3a4b7c'; ctx.stroke();
  });

  ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.arc(GS.goal.x, GS.goal.y, GS.goal.radius, 0, Math.PI*2); ctx.fill();

  // RENDER JUGADOR
  ctx.save(); ctx.translate(GS.player.x, GS.player.y);
  if (GS.player.isHidden) ctx.globalAlpha = 0.3;
  const pImg = GS.images[GS.char.id];
  if (pImg && pImg.complete && pImg.naturalWidth !== 0) {
    ctx.drawImage(pImg, -30, -30, 60, 60);
  } else {
    ctx.fillStyle = GS.char.colors.primary; ctx.fillRect(-25, -25, 50, 50);
  }
  ctx.restore();

  // RENDER VETERINARIA
  ctx.save(); ctx.translate(GS.vet.x, GS.vet.y);
  const vImg = GS.images['vet'];
  if (vImg && vImg.complete && vImg.naturalWidth !== 0) {
    ctx.drawImage(vImg, -30, -40, 60, 80);
  } else {
    ctx.fillStyle = '#ff2d78'; ctx.fillRect(-25, -25, 50, 50);
  }
  ctx.restore();
  ctx.restore();

  document.getElementById('hudProxFill').style.width = (GS.proximity * 100) + '%';
  document.getElementById('hudStatus').textContent = GS.player.isHidden ? 'ESCONDIDO' : 'EVADIENDO...';
}

function gameLoop() {
  updateGame(); renderGame();
  if (GS.screen === 'game') GS.gameLoopId = requestAnimationFrame(gameLoop);
}

/* ─────────────────────────────────────────────────────────────────
   §7  EVENTS
───────────────────────────────────────────────────────────────── */
function bindButtons() {
  const $ = id => document.getElementById(id);
  $('btnStartGame')?.addEventListener('click', () => { ensureAudio(); changeScreen('charselect'); });
  $('btnHowTo')?.addEventListener('click', () => { ensureAudio(); changeScreen('howtoplay'); });
  $('btnHowToBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnCSBack')?.addEventListener('click', () => changeScreen('mainmenu'));
  $('btnConfirmYes')?.addEventListener('click', () => changeScreen('game'));
  $('btnConfirmNo')?.addEventListener('click', () => changeScreen('charselect'));
  $('btnPause')?.addEventListener('click', () => togglePause());
}

async function init() {
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  await preloadImages();
  setTimeout(() => { changeScreen('mainmenu'); }, 100);
}
window.addEventListener('DOMContentLoaded', init);
