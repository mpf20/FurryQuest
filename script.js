/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v11 — Mobile & Maps)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

const CHARACTERS = {
  molly: {
    id: 'molly', name: 'MOLLY', type: '🐶 DOG WARRIOR',
    mission: 'Stash clothes & dodge the Vet!', mapName: 'THE HOUSE', bgColor: '#2e1f3c', spotColor: '#5c3d75',
    reward: '🦴 BONE', imgPath: 'assets/images/Molly.png', speed: 4.5, sprintMul: 1.5,
    colors: { primary: '#c860ff', secondary: 'rgba(200,96,255,0.2)' }
  },
  agata: {
    id: 'agata', name: 'AGATA', type: '🐱 FOREST MAGE',
    mission: "Flee the Vet's nail clippers!", mapName: 'THE FOREST', bgColor: '#143319', spotColor: '#2d5a34',
    reward: '🐟 FISH', imgPath: 'assets/images/Agata.png', speed: 4.8, sprintMul: 1.4,
    colors: { primary: '#00e86a', secondary: 'rgba(0,232,106,0.2)' }
  },
  martin: {
    id: 'martin', name: 'MARTÍN', type: '🐱 DESERT KNIGHT',
    mission: 'Reach the well. Thirst is rising!', mapName: 'THE DESERT', bgColor: '#4a3319', spotColor: '#8a6235',
    reward: '🐟 FISH', imgPath: 'assets/images/Martin.png', speed: 4.2, sprintMul: 1.6,
    colors: { primary: '#ff9020', secondary: 'rgba(255,144,32,0.2)' }
  },
  michi: {
    id: 'michi', name: 'MICHI', type: '🐱 ROGUE ALCHEMIST',
    mission: 'Avoid soap, towel & wet doom!', mapName: 'THE BATHROOM', bgColor: '#1c3345', spotColor: '#345a78',
    reward: '🐟 FISH', imgPath: 'assets/images/Michi.png', speed: 5.2, sprintMul: 1.3,
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
  // Mobile Joystick State
  touch: { isDragging: false, startX: 0, startY: 0, moveX: 0, moveY: 0, dirX: 0, dirY: 0, forceHide: false },
  player: { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: { x: 1200, y: 900, angle: 0, speed: 2.6, visionAngle: 0.75, range: 350 },
  map: { width: 1800, height: 1400 },
  hidingObjects: [],
  particles: [], // Para la explosión de bomba
  goal: { x: 1650, y: 1250, radius: 50 },
  gameResult: null,
  proximity: 0
};

const IMAGE_ASSETS = {
  molly: 'assets/images/Molly.png',
  agata: 'assets/images/Agata.png',
  martin: 'assets/images/Martin.png',
  michi: 'assets/images/Michi.png',
  vet: 'assets/images/Veterinaria.png'
};

/* ─────────────────────────────────────────────────────────────────
   §2  PRELOADER
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
      img.onload = () => { GS.images[key] = img; loadedCount++; setLoadBar((loadedCount/total)*100); resolve(); };
      img.onerror = () => { loadedCount++; setLoadBar((loadedCount/total)*100); resolve(); };
    });
  });

  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2200));
  await Promise.race([Promise.all(promises), timeoutPromise]);
}

/* ─────────────────────────────────────────────────────────────────
   §3  AUDIO
───────────────────────────────────────────────────────────────── */
function ensureAudio() {
  try {
    if (!GS.audioCtx) GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (GS.audioCtx.state === 'suspended') GS.audioCtx.resume();
  } catch (e) {}
}
function stopBGM() { if (GS.bgmNode) { try { GS.bgmNode.stop(); }catch(e){} GS.bgmNode = null; } }

function playExplosionSFX() {
  ensureAudio();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(10, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch(e){}
}

/* ─────────────────────────────────────────────────────────────────
   §4  ROUTER & SCREEN MANAGEMENT
───────────────────────────────────────────────────────────────── */
function changeScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  GS.screen = screenId;

  const joyZone = document.getElementById('joystick-zone');
  const actBtn = document.getElementById('mobile-action-btn');
  
  if (screenId === 'game') {
    // Detectar si es dispositivo móvil/táctil para mostrar joystick
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      if (joyZone) joyZone.style.display = 'block';
      if (actBtn) actBtn.style.display = 'flex';
    }
    stopBGM();
    startGameplay();
  } else {
    if (joyZone) joyZone.style.display = 'none';
    if (actBtn) actBtn.style.display = 'none';
    if (screenId === 'mainmenu') stopBGM();
  }
}

/* ─────────────────────────────────────────────────────────────────
   §5  GAMEPLAY SETUP
───────────────────────────────────────────────────────────────── */
function setupGameMap() {
  GS.player.x = 150; GS.player.y = 150;
  GS.player.isHidden = false;
  GS.vet.x = 1300; GS.vet.y = 1000;
  GS.hidingObjects = [];
  GS.particles = [];
  GS.gameResult = null;
  GS.isPaused = false;

  // Generar escondites distribuidos por el mapa
  const coordinates = [
    {x: 450, y: 350}, {x: 900, y: 300}, {x: 1350, y: 450},
    {x: 400, y: 800}, {x: 850, y: 900}, {x: 1300, y: 950}
  ];
  coordinates.forEach(c => {
    GS.hidingObjects.push({ x: c.x, y: c.y, radius: 65 });
  });
}

function createExplosion(x, y) {
  playExplosionSFX();
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    GS.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4 + Math.random() * 6,
      color: Math.random() > 0.4 ? '#ff3700' : '#ffdd00',
      alpha: 1,
      decay: 0.02 + Math.random() * 0.03
    });
  }
}

function startGameplay() {
  setupGameMap();
  const hudName = document.getElementById('hudCharName');
  if (hudName) {
    hudName.textContent = GS.char.name;
    hudName.style.color = GS.char.colors.primary;
  }
  GS.keys = {};
  
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  setupMobileEvents();

  if (GS.gameLoopId) cancelAnimationFrame(GS.gameLoopId);
  GS.gameLoopId = requestAnimationFrame(gameLoop);
}

function onKeyDown(e) { GS.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') togglePause(); }
function onKeyUp(e) { GS.keys[e.key.toLowerCase()] = false; }

function togglePause() {
  GS.isPaused = !GS.isPaused;
  document.getElementById('btnPause').textContent = GS.isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

/* ─────────────────────────────────────────────────────────────────
   §6  JOYSTICK Y EVENTOS TÁCTILES MÓVILES
───────────────────────────────────────────────────────────────── */
function setupMobileEvents() {
  const zone = document.getElementById('joystick-zone');
  const stick = document.getElementById('joystick-stick');
  const btn = document.getElementById('mobile-action-btn');
  if (!zone || !stick) return;

  zone.addEventListener('touchstart', (e) => {
    GS.touch.isDragging = true;
    const t = e.touches[0];
    const rect = zone.getBoundingClientRect();
    GS.touch.startX = rect.left + rect.width / 2;
    GS.touch.startY = rect.top + rect.height / 2;
  });

  window.addEventListener('touchmove', (e) => {
    if (!GS.touch.isDragging) return;
    const t = e.touches[0];
    let dx = t.clientX - GS.touch.startX;
    let dy = t.clientY - GS.touch.startY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 40;

    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;

    // Convertir dirección a multiplicadores [-1, 1]
    GS.touch.dirX = dx / maxDist;
    GS.touch.dirY = dy / maxDist;
  }, { passive: false });

  window.addEventListener('touchend', () => {
    GS.touch.isDragging = false;
    GS.touch.dirX = 0; GS.touch.dirY = 0;
    stick.style.transform = 'translate(0px, 0px)';
  });

  if (btn) {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); GS.touch.forceHide = true; btn.textContent = "HIDING"; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); GS.touch.forceHide = false; btn.textContent = "HIDE"; });
  }
}

/* ─────────────────────────────────────────────────────────────────
   §7  GAME LOOP ENGINE (LÓGICA Y ESCENARIOS)
───────────────────────────────────────────────────────────────── */
function updateGame() {
  // Actualizar partículas de la explosión aunque el juego acabe
  GS.particles.forEach((p, idx) => {
    p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
    if (p.alpha <= 0) GS.particles.splice(idx, 1);
  });

  if (GS.isPaused || GS.gameResult) return;

  const p = GS.player;
  // En móviles el sprint está siempre activo por comodidad
  const isMobile = GS.touch.dirX !== 0 || GS.touch.dirY !== 0;
  const speed = GS.char.speed * ((GS.keys['shift'] || isMobile) ? GS.char.sprintMul : 1);
  
  let dx = 0, dy = 0;
  
  // Controles teclado (PC)
  if (GS.keys['w'] || GS.keys['arrowup']) dy = -1;
  if (GS.keys['s'] || GS.keys['arrowdown']) dy = 1;
  if (GS.keys['a'] || GS.keys['arrowleft']) dx = -1;
  if (GS.keys['d'] || GS.keys['arrowright']) dx = 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

  // Controles Joystick (Móviles) override
  if (isMobile) { dx = GS.touch.dirX; dy = GS.touch.dirY; }

  p.x += dx * speed; p.y += dy * speed;

  // Bordes del mapa
  if (p.x < 40) p.x = 40; if (p.x > GS.map.width - 40) p.x = GS.map.width - 40;
  if (p.y < 40) p.y = 40; if (p.y > GS.map.height - 40) p.y = GS.map.height - 40;

  // Lógica de escondite
  let nearSpot = false;
  GS.hidingObjects.forEach(spot => {
    if (Math.hypot(p.x - spot.x, p.y - spot.y) < spot.radius) nearSpot = true;
  });
  GS.player.isHidden = nearSpot && (GS.keys['e'] || GS.touch.forceHide);

  // Inteligencia de la Veterinaria (Villana)
  const vet = GS.vet;
  const distToPlayer = Math.hypot(p.x - vet.x, p.y - vet.y);
  GS.proximity = Math.max(0, Math.min(1, 1 - (distToPlayer / 800)));

  if (!GS.player.isHidden) {
    vet.angle = Math.atan2(p.y - vet.y, p.x - vet.x);
    vet.x += Math.cos(vet.angle) * vet.speed;
    vet.y += Math.sin(vet.angle) * vet.speed;
  } else {
    // Si el jugador se esconde, la villana camina errante cerca
    vet.x += Math.cos(window.performance.now() / 1000) * 0.5;
    vet.y += Math.sin(window.performance.now() / 500) * 0.5;
  }

  // Verificar ganar
  if (Math.hypot(p.x - GS.goal.x, p.y - GS.goal.y) < GS.goal.radius + 15) {
    GS.gameResult = 'WIN'; 
    setTimeout(() => { alert(`🏆 ¡GANASTE! Conseguiste tu recompensa: ${GS.char.reward}`); changeScreen('mainmenu'); }, 300);
  }

  // Verificar perder (¡BOMBA!)
  if (distToPlayer < 50 && !GS.player.isHidden) {
    GS.gameResult = 'LOSE';
    createExplosion(p.x, p.y);
    setTimeout(() => { alert('🚨 ¡BOOM! La veterinaria te atrapó y estallaste en pedazos.'); changeScreen('mainmenu'); }, 1200);
  }
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  }
  
  // FONDO PRINCIPAL DEL MAPA SEGÚN ESCENARIO
  ctx.fillStyle = '#111424'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  // Cámara centrada en el jugador
  ctx.translate(canvas.width / 2 - GS.player.x, canvas.height / 2 - GS.player.y);

  // DIBUJAR ESCENARIO TEMÁTICO EN EL ÁREA DEL MAPA
  ctx.fillStyle = GS.char.bgColor;
  ctx.fillRect(0, 0, GS.map.width, GS.map.height);

  // DETALLES TEXTURIZADOS DE LOS ESCENARIOS (Cuadrículas/Líneas de Diseño)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2;
  const tileSize = 80;
  for (let x = 0; x < GS.map.width; x += tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GS.map.height); ctx.stroke();
  }
  for (let y = 0; y < GS.map.height; y += tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GS.map.width, y); ctx.stroke();
  }

  // Bordes del Escenario
  ctx.strokeStyle = GS.char.colors.primary; ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, GS.map.width, GS.map.height);

  // DIBUJAR LOS ESCONDITES CON TEMÁTICA
  GS.hidingObjects.forEach(spot => {
    ctx.fillStyle = GS.char.spotColor;
    ctx.beginPath(); ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GS.char.colors.primary; ctx.lineWidth = 2; ctx.stroke();
    
    // Icono decorativo según mapa
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    let label = '🙈';
    if (GS.char.id === 'molly') label = '📦';
    if (GS.char.id === 'agata') label = '🌳';
    if (GS.char.id === 'martin') label = '🪨';
    if (GS.char.id === 'michi') label = '🧺';
    ctx.fillText(label, spot.x, spot.y + 6);
  });

  // ZONA DE META (RECOMPENSA)
  ctx.fillStyle = 'rgba(255, 230, 0, 0.2)'; ctx.beginPath(); ctx.arc(GS.goal.x, GS.goal.y, GS.goal.radius + 15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.arc(GS.goal.x, GS.goal.y, GS.goal.radius, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000000'; ctx.font = '10px "Press Start 2P"'; ctx.textAlign = 'center';
  ctx.fillText('GOAL', GS.goal.x, GS.goal.y + 4);

  // RENDER JUGADOR (SI NO HA EXPLOTADO)
  if (GS.gameResult !== 'LOSE') {
    ctx.save(); ctx.translate(GS.player.x, GS.player.y);
    if (GS.player.isHidden) ctx.globalAlpha = 0.35;
    const pImg = GS.images[GS.char.id];
    if (pImg && pImg.complete && pImg.naturalWidth !== 0) {
      ctx.drawImage(pImg, -35, -35, 70, 70);
    } else {
      ctx.fillStyle = GS.char.colors.primary; ctx.fillRect(-25, -25, 50, 50);
    }
    ctx.restore();
  }

  // RENDER VILLANA (VETERINARIA)
  ctx.save(); ctx.translate(GS.vet.x, GS.vet.y);
  // Cono de Visión
  ctx.fillStyle = 'rgba(255, 45, 120, 0.15)';
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.arc(0, 0, GS.vet.range, GS.vet.angle - GS.vet.visionAngle, GS.vet.angle + GS.vet.visionAngle);
  ctx.closePath(); ctx.fill();

  const vImg = GS.images['vet'];
  if (vImg && vImg.complete && vImg.naturalWidth !== 0) {
    ctx.drawImage(vImg, -35, -45, 70, 90);
  } else {
    ctx.fillStyle = '#ff2d78'; ctx.fillRect(-25, -25, 50, 50);
  }
  ctx.restore();

  // RENDER DE PARTÍCULAS (EXPLOSIÓN DE BOMBA)
  GS.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore(); // Restaurar cámara

  // ACTUALIZACIÓN DEL HUD SUPERIOR
  const fill = document.getElementById('hudProxFill');
  if (fill) fill.style.width = (GS.proximity * 100) + '%';
  const stat = document.getElementById('hudStatus');
  if (stat) stat.textContent = GS.player.isHidden ? 'ESCONDIDO' : 'EVADIENDO...';
}

function gameLoop() {
  updateGame(); renderGame();
  if (GS.screen === 'game') GS.gameLoopId = requestAnimationFrame(gameLoop);
}

/* ─────────────────────────────────────────────────────────────────
   §8  BOTONES DE NAVEGACIÓN
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
