/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v14 — Full Restoration)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════════
   §1  DATOS PERSONAJES  ── SIN TOCAR (regla de preservación)
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
   §2  ESTADO GLOBAL  ── Estructura base preservada + corrección de bucle
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen:       'loading',
  char:         null,
  images:       {},
  audioCtx:     null,
  bgmNode:      null,         // Nodo principal de música
  csNodes:      [],           // Nodos auxiliares de menú / selección
  igMusicNodes: [],           // Nodos de la música del juego
  isPaused:     false,
  gameLoopId:   null,
  keys:         {},
  player:   { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet: {
    x: 1100, y: 800, angle: 0, speed: 2.4,
    mode: 'patrol', patrolTarget: { x:800, y:600 }, patrolTimer: 0, lostTimer: 0
  },
  map:          { width: 1600, height: 1200 },
  hidingObjects:[],
  goal:         { x: 1430, y: 80, radius: 50 },
  gameResult:   null,
  proximity:    0,
  particles:    [],
  explosion:    { active: false, timer: 0, duration: 100, shakeFrames: 0 },
  touch:        { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null },
  timer:        { seconds: 20, msAcc: 0, lastMs: 0, running: false },
  ambient:      []
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
  const keys = Object.keys(IMAGE_ASSETS), total = keys.length;
  let n = 0;
  const promises = keys.map(key => new Promise(resolve => {
    const img = new Image();
    img.src = IMAGE_ASSETS[key];
    const done = () => { GS.images[key]=img; n++; setLoadBar((n/total)*100); resolve(); };
    img.onload=done; img.onerror=done;
  }));
  await Promise.race([Promise.all(promises), new Promise(r=>setTimeout(r,2500))]);
}

/* ═══════════════════════════════════════════════════════════════════
   §3  AUDIO ENGINE ── Protección Absoluta Contra Superposición
═══════════════════════════════════════════════════════════════════ */
function ensureAudio() {
  try {
    if (!GS.audioCtx) GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (GS.audioCtx.state === 'suspended') GS.audioCtx.resume();
  } catch(e) {}
}

function stopAll() {
  // Forzar parada y desconexión inmediata de todos los osciladores y ganancias en ejecución
  if (GS.bgmNode) { try { GS.bgmNode.stop(); } catch(e){} GS.bgmNode = null; }
  
  GS.csNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
  GS.csNodes = [];
  
  GS.igMusicNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
  GS.igMusicNodes = [];
}

function stopBGM()     { stopAll(); }
function stopIgMusic() { stopAll(); }

// MENU BGM (Loop atmosférico suave)
function startMenuBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.06, ctx.currentTime);
    master.connect(ctx.destination);

    const pad1 = ctx.createOscillator(); pad1.type = 'sine'; pad1.frequency.value = 146.83;
    const pad2 = ctx.createOscillator(); pad2.type = 'triangle'; pad2.frequency.value = 220.00;

    const gPad = ctx.createGain(); gPad.gain.setValueAtTime(0.28, ctx.currentTime);
    pad1.connect(gPad); pad2.connect(gPad); gPad.connect(master);

    pad1.start(); pad2.start();
    GS.bgmNode = pad1;
    GS.csNodes.push(pad2, gPad, master);
  } catch(e){}
}

// CHAR SELECT BGM (Música de Selección Dinámica e Interactiva)
function startCharSelectBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.08, ctx.currentTime);
    master.connect(ctx.destination);

    const ARP = [261.63, 329.63, 392, 523.25, 659.25, 523.25];
    const arp = ctx.createOscillator(); arp.type = 'square';
    const now = ctx.currentTime, aDur = 0.12;
    for(let i=0; i<200; i++) arp.frequency.setValueAtTime(ARP[i % ARP.length], now + i * aDur);
    
    const aGain = ctx.createGain(); aGain.gain.setValueAtTime(0.25, now);
    arp.connect(aGain); aGain.connect(master);
    arp.start(now);

    const bass = ctx.createOscillator(); bass.type = 'sawtooth'; bass.frequency.value = 65.41;
    const bGain = ctx.createGain(); bGain.gain.setValueAtTime(0.3, now);
    bass.connect(bGain); bGain.connect(master);
    bass.start(now);

    GS.bgmNode = arp;
    GS.csNodes.push(arp, aGain, bass, bGain, master);
  } catch(e){}
}

// IN-GAME BGM (Ritmo árabe de alta tensión)
function startInGameMusic() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.10, ctx.currentTime);
    master.connect(ctx.destination);

    const H1 = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
    const MOT = [0, 2, 3, 2, 1, 0, 4, 3, 5, 4, 3, 2, 1, 0];
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    let t = ctx.currentTime;
    for(let r=0; r<40; r++) {
      MOT.forEach(si => { o.frequency.setValueAtTime(H1[si], t); t += 0.12; });
    }
    
    const oGain = ctx.createGain(); oGain.gain.setValueAtTime(0.35, ctx.currentTime);
    o.connect(oGain); oGain.connect(master); o.start();

    const drone = ctx.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 69.30;
    const dg = ctx.createGain(); dg.gain.setValueAtTime(0.1, ctx.currentTime);
    drone.connect(dg); dg.connect(master); drone.start();

    GS.bgmNode = o;
    GS.igMusicNodes.push(o, oGain, drone, dg, master);
  } catch(e){}
}

function playSynthSFX(type) {
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = (type==='bark') ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(type==='bark'? 180 : 400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(type==='bark'? 60 : 700, ctx.currentTime+0.15);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.01, ctx.currentTime+0.18);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.2);
  } catch(e){}
}

function playWinJingle() {
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); const t = ctx.currentTime + i * 0.15;
    o.type = 'square'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.22);
  });
}

function playLoseJingle() {
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  [440, 392, 349.23, 261.63].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); const t = ctx.currentTime + i * 0.2;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.10, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.28);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §4  ROUTER & SCREEN MANAGEMENT (Fijación Absoluta de Botones)
═══════════════════════════════════════════════════════════════════ */
function changeScreen(screenId) {
  // Cerrar bucles activos si nos salimos del juego
  if (screenId !== 'game' && GS.gameLoopId) {
    cancelAnimationFrame(GS.gameLoopId);
    GS.gameLoopId = null;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  
  GS.screen = screenId;

  if (screenId === 'mainmenu') {
    stopAll();
    GS.char = null; // Liberar selección de personaje anterior
    startMenuBGM();
  } else if (screenId === 'charselect') {
    stopAll();
    GS.char = null;
    startCharSelectBGM();
  } else if (screenId === 'game') {
    stopAll();
    setupGameMap();
    startInGameMusic();
    GS.timer.running = true;
    GS.timer.lastMs = performance.now();
    GS.gameLoopId = requestAnimationFrame(gameLoop);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §5  SELECCIÓN DE PERSONAJE
═══════════════════════════════════════════════════════════════════ */
function selectCharacter(charId) {
  const data = CHARACTERS[charId]; if(!data) return;
  GS.char = data;
  playSynthSFX(charId==='molly' ? 'bark' : 'meow');
  const av = document.getElementById('confirmAvatar'); if(av) av.src = data.imgPath;
  
  document.getElementById('confirmName').textContent = data.name;
  document.getElementById('confirmName').className = `confirm-name ${charId}-text`;
  document.getElementById('confirmLevel').textContent = data.type;
  document.getElementById('confirmObj').textContent = `LOCATION: ${data.mapName}\n• OBJECTIVE: ${data.mission}`;
  changeScreen('confirm');
}

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card => {
    const id = card.getAttribute('data-char');
    // Eliminar oyentes antiguos clonando el nodo para evitar fugas/doble clicks
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
    newCard.addEventListener('click', () => { ensureAudio(); selectCharacter(id); });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §6  SETUP DEL MAPA
═══════════════════════════════════════════════════════════════════ */
function setupGameMap() {
  GS.player.x = 150; GS.player.y = 150; GS.player.vx = 0; GS.player.vy = 0; GS.player.isHidden = false;
  GS.vet.x = 1100; GS.vet.y = 800; GS.vet.mode = 'patrol';
  GS.vet.patrolTarget = {x:800, y:600}; GS.vet.patrolTimer = 0; GS.vet.lostTimer = 0;
  GS.hidingObjects = []; GS.gameResult = null; GS.isPaused = false;
  GS.particles = []; GS.ambient = [];
  GS.explosion = { active: false, timer: 0, duration: 80, shakeFrames: 0 };
  GS.timer = { seconds: 20.00, msAcc: 0, lastMs: performance.now(), running: true };
  GS.goal = { x: 1450, y: 150, radius: 55 };

  const id = GS.char ? GS.char.id : 'molly';

  if(id === 'molly'){
    GS.hidingObjects = [
      {x:220, y:200, w:260, h:150, label:'BED', color:'#8a5cf6', type:'bed'},
      {x:700, y:450, w:300, h:130, label:'SOFA', color:'#7c4dff', type:'couch'},
      {x:1100, y:200, w:160, h:220, label:'CABINET', color:'#5e35b1', type:'cabinet'},
      {x:400, y:700, w:220, h:140, label:'BED 2', color:'#8a5cf6', type:'bed'},
      {x:900, y:850, w:290, h:130, label:'SOFA 2', color:'#7c4dff', type:'couch'}
    ];
  } else if(id === 'agata'){
    GS.hidingObjects = [
      {x:300, y:200, w:110, h:260, label:'TRUNK', color:'#5d4037', type:'trunk'},
      {x:650, y:400, w:250, h:130, label:'BUSH', color:'#2e7d32', type:'bush'},
      {x:1000, y:250, w:120, h:280, label:'TRUNK', color:'#5d4037', type:'trunk'},
      {x:400, y:750, w:260, h:130, label:'BUSH', color:'#388e3c', type:'bush'},
      {x:1150, y:650, w:110, h:260, label:'TRUNK', color:'#4e342e', type:'trunk'}
    ];
  } else if(id === 'martin'){
    GS.hidingObjects = [
      {x:250, y:200, w:320, h:100, label:'WALL', color:'#795548', type:'wall'},
      {x:750, y:350, w:90, h:240, label:'COLUMN', color:'#8d6e63', type:'column'},
      {x:1000, y:200, w:90, h:240, label:'COLUMN', color:'#8d6e63', type:'column'},
      {x:350, y:750, w:310, h:100, label:'WALL 2', color:'#795548', type:'wall'}
    ];
  } else {
    GS.hidingObjects = [
      {x:200, y:200, w:340, h:150, label:'BATHTUB', color:'#0288d1', type:'tub'},
      {x:700, y:350, w:150, h:180, label:'BASKET', color:'#00838f', type:'basket'},
      {x:1050, y:200, w:260, h:100, label:'SHELF', color:'#006064', type:'shelf'},
      {x:350, y:750, w:330, h:150, label:'BATHTUB2', color:'#0288d1', type:'tub'}
    ];
  }
  seedAmbient(id);
}

/* ═══════════════════════════════════════════════════════════════════
   §7  RENDER PIPELINE (Escenarios Reales con Personificación)
═══════════════════════════════════════════════════════════════════ */
function seedAmbient(id) {
  GS.ambient = [];
  const W = GS.map.width, H = GS.map.height;
  if(id === 'agata'){
    for(let i=0; i<50; i++) GS.ambient.push({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*0.6, vy: -0.3 - Math.random()*0.5,
      size: 3 + Math.random()*4, alpha: 0.4 + Math.random()*0.5, type: 'spore'
    });
  } else if(id === 'michi'){
    for(let i=0; i<40; i++) GS.ambient.push({
      x: Math.random()*W, y: H - 20 + Math.random()*40,
      vx: (Math.random()-.5)*0.5, vy: -0.6 - Math.random()*1.0,
      size: 4 + Math.random()*9, alpha: 0.3 + Math.random()*0.4, type: 'bubble'
    });
  }
}

function updateAmbient() {
  const W = GS.map.width, H = GS.map.height;
  GS.ambient.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if(p.y < -20) p.y = H + 10;
    if(p.x < 0) p.x = W; if(p.x > W) p.x = 0;
  });
}

function renderAmbient(ctx) {
  GS.ambient.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.alpha;
    if(p.type === 'spore'){
      ctx.fillStyle = '#86efac';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(180, 245, 255, 0.15)'; ctx.fill();
    }
    ctx.restore();
  });
}

function renderBackground(ctx) {
  const id = GS.char ? GS.char.id : 'molly';
  const W = GS.map.width, H = GS.map.height;

  if(id === 'molly'){
    // MOLLY: Real Hardwood Wood-Grain Texture Canvas Grid
    ctx.fillStyle = '#3e2723'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = '#271510'; ctx.lineWidth = 3;
    for(let y=0; y<H; y+=60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      // Diseñar vetas aleatorias sobre las tablas
      ctx.fillStyle = 'rgba(28, 12, 4, 0.15)';
      ctx.fillRect(0, y + 10, W, 4);
    }
    // Añadir una Alfombra Persa Central elegante
    ctx.fillStyle = '#4a148c'; ctx.fillRect(300, 300, 1000, 600);
    ctx.strokeStyle = '#9c4dcc'; ctx.lineWidth = 6; ctx.strokeRect(320, 320, 960, 560);
  } 
  else if(id === 'agata') {
    // ÁGATA: Organic Dark Forest moss landscape
    ctx.fillStyle = '#064e3b'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#022c22';
    for(let i=0; i<40; i++) {
      ctx.beginPath(); ctx.arc((i*230)%W, (i*190)%H, 80 + (i%3)*30, 0, Math.PI*2); ctx.fill();
    }
  } 
  else if(id === 'martin') {
    // MARTÍN: Textured shifting warm yellow-orange sand dunes
    let sandGrad = ctx.createLinearGradient(0,0,W,H);
    sandGrad.addColorStop(0, '#fef08a'); sandGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = sandGrad; ctx.fillRect(0,0,W,H);
    
    // Líneas de dunas movidas por viento
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2;
    for(let i=1; i<10; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * 130);
      ctx.bezierCurveTo(W*0.25, i*130 + 50, W*0.75, i*130 - 50, W, i*130);
      ctx.stroke();
    }
  } 
  else {
    // MICHI: Double-Tone Slate Retro Tile Grid Layout
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
    for(let x=0; x<W; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // Bordes neon cian estilizados
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4; ctx.strokeRect(10,10,W-20,H-20);
  }
}

function renderHidingObject(ctx, obj) {
  const {x, y, w, h, color, type} = obj;
  ctx.save();
  ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.3)';

  if(type === 'bed') {
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x, y, w, h); // Estructura madera
    ctx.fillStyle = '#7c4dff'; ctx.fillRect(x + 10, y + 10, w - 20, h - 20); // Manta morada
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 20, y + 20, 50, h - 40); // Almohada
  } else if (type === 'couch') {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#4527a0'; ctx.fillRect(x + 10, y + h - 30, w - 20, 20); // Cojines de base
  } else if (type === 'trunk') {
    ctx.fillStyle = '#78350f'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#451a03'; ctx.fillRect(x + w/2 - 5, y, 10, h); // Textura de corteza
  } else if (type === 'bush') {
    ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill();
  } else if (type === 'wall' || type === 'column') {
    ctx.fillStyle = '#b45309'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#451a03'; ctx.strokeRect(x, y, w, h);
  } else {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawExitPortal(ctx) {
  const g = GS.goal;
  ctx.save();
  // Crear el Arco de Luz del Portal del Destino
  let portGrad = ctx.createRadialGradient(g.x, g.y, 5, g.x, g.y, g.radius);
  portGrad.addColorStop(0, '#ffffff');
  portGrad.addColorStop(0.4, '#00e86a');
  portGrad.addColorStop(1, 'rgba(0,232,106,0)');
  
  ctx.fillStyle = portGrad;
  ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
  
  // Anillo exterior digital
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.arc(g.x, g.y, g.radius - 10, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §8  KABOOM EXPLOSION SYSTEM (Vaporización sin text alerts)
═══════════════════════════════════════════════════════════════════ */
function triggerKaboom(px, py) {
  GS.explosion.active = true;
  GS.explosion.timer = GS.explosion.duration;
  GS.explosion.shakeFrames = 25;
  GS.particles = [];
  
  const palette = ['#ff2d78', '#ff9020', '#fef08a', '#ffffff', '#c860ff'];
  for(let i=0; i<120; i++) {
    GS.particles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      size: 3 + Math.random()*6,
      color: palette[Math.floor(Math.random()*palette.length)],
      alpha: 1.0
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §9  GAME ENGINE MAIN CYCLE (Loop del juego)
═══════════════════════════════════════════════════════════════════ */
function updateGame() {
  if (GS.screen !== 'game' || GS.isPaused) return;

  // Manejo del conteo del temporizador de escape (20 Segundos)
  if (GS.timer.running && !GS.explosion.active) {
    const now = performance.now();
    let diff = (now - GS.timer.lastMs) / 1000;
    GS.timer.lastMs = now;
    GS.timer.seconds -= diff;

    if(GS.timer.seconds <= 0) {
      GS.timer.seconds = 0;
      GS.timer.running = false;
      GS.gameResult = 'lose';
      playLoseJingle();
      triggerKaboom(GS.player.x, GS.player.y);
    }
  }

  if (GS.explosion.active) {
    GS.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.alpha -= 0.015;
    });
    GS.explosion.timer--;
    if (GS.explosion.shakeFrames > 0) GS.explosion.shakeFrames--;
    
    if (GS.explosion.timer <= 0) {
      GS.explosion.active = false;
      showEndGameScreen();
    }
    return;
  }

  // Físicas del Jugador
  let speed = GS.char ? GS.char.speed : 4;
  if (GS.keys['ArrowUp'] || GS.keys['w']) GS.player.y -= speed;
  if (GS.keys['ArrowDown'] || GS.keys['s']) GS.player.y += speed;
  if (GS.keys['ArrowLeft'] || GS.keys['a']) GS.player.x -= speed;
  if (GS.keys['ArrowRight'] || GS.keys['d']) GS.player.x += speed;

  // Límites de mapa
  if (GS.player.x < 50) GS.player.x = 50;
  if (GS.player.x > GS.map.width - 50) GS.player.x = GS.map.width - 50;
  if (GS.player.y < 50) GS.player.y = 50;
  if (GS.player.y > GS.map.height - 50) GS.player.y = GS.map.height - 50;

  // Comprobar zonas de escondite
  let hiddenThisFrame = false;
  for(let obj of GS.hidingObjects) {
    if (GS.player.x > obj.x && GS.player.x < obj.x + obj.w &&
        GS.player.y > obj.y && GS.player.y < obj.y + obj.h) {
      hiddenThisFrame = true;
      break;
    }
  }
  GS.player.isHidden = hiddenThisFrame;

  // Lógica de Persecución de la Veterinaria
  if (!GS.player.isHidden) {
    let dx = GS.player.x - GS.vet.x;
    let dy = GS.player.y - GS.vet.y;
    let angle = Math.atan2(dy, dx);
    GS.vet.x += Math.cos(angle) * GS.vet.speed;
    GS.vet.y += Math.sin(angle) * GS.vet.speed;
  }

  // Comprobar Colisión Letal con Veterinaria
  let distToVet = Math.hypot(GS.player.x - GS.vet.x, GS.player.y - GS.vet.y);
  if (distToVet < 40) {
    GS.gameResult = 'lose';
    GS.timer.running = false;
    playLoseJingle();
    triggerKaboom(GS.player.x, GS.player.y);
  }

  // Comprobar zona de Escape (Victoria)
  let distToGoal = Math.hypot(GS.player.x - GS.goal.x, GS.player.y - GS.goal.y);
  if (distToGoal < GS.goal.radius) {
    GS.gameResult = 'win';
    GS.timer.running = false;
    playWinJingle();
    showEndGameScreen();
  }

  // Calcular barra de proximidad del HUD
  GS.proximity = Math.max(0, Math.min(1.0, (600 - distToVet) / 600));
  updateAmbient();
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Efecto Temblor de Pantalla por Explosión (Screen Shake)
  if (GS.explosion.active && GS.explosion.shakeFrames > 0) {
    let sx = (Math.random() - 0.5) * 15;
    let sy = (Math.random() - 0.5) * 15;
    ctx.translate(sx, sy);
  }

  // Renderizar la cámara centrada en el jugador
  let camX = GS.player.x - canvas.width / 2;
  let camY = GS.player.y - canvas.height / 2;
  if(camX < 0) camX = 0; if(camY < 0) camY = 0;
  if(camX > GS.map.width - canvas.width) camX = GS.map.width - canvas.width;
  if(camY > GS.map.height - canvas.height) camY = GS.map.height - canvas.height;

  ctx.translate(-camX, -camY);

  renderBackground(ctx);
  GS.hidingObjects.forEach(obj => renderHidingObject(ctx, obj));
  drawExitPortal(ctx);
  renderAmbient(ctx);

  // Dibujar Entidades vivas si no hay explosión completa
  if (!GS.explosion.active) {
    // Veterinaria
    if(GS.images.vet) {
      ctx.drawImage(GS.images.vet, GS.vet.x - 30, GS.vet.y - 40, 60, 80);
    } else {
      ctx.fillStyle = '#ff2d78'; ctx.fillRect(GS.vet.x - 25, GS.vet.y - 25, 50, 50);
    }

    // Mascota del Jugador
    let pKey = GS.char ? GS.char.id : 'molly';
    if(GS.images[pKey]) {
      ctx.save();
      if(GS.player.isHidden) ctx.globalAlpha = 0.4; // Transparencia al ocultarse
      ctx.drawImage(GS.images[pKey], GS.player.x - 25, GS.player.y - 25, 50, 50);
      ctx.restore();
    }
  } else {
    // Dibujar fragmentos de la explosión
    GS.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    });
  }

  ctx.restore();

  // Actualizar elementos HUD HTML
  const fill = document.getElementById('hudProxFill'); if(fill) fill.style.width = (GS.proximity * 100) + '%';
  const status = document.getElementById('hudStatus'); if(status) status.textContent = GS.player.isHidden ? 'ESCONDIDO' : 'EVADIENDO...';
  
  // Dibujar reloj digital de milisegundos en pantalla directamente
  const clk = document.getElementById('hudTimer');
  if(clk) {
    clk.textContent = GS.timer.seconds.toFixed(2);
    if(GS.timer.seconds <= 5) clk.style.color = '#ff2d78';
    else clk.style.color = '#00e86a';
  }
}

function gameLoop() {
  if (GS.screen === 'game') {
    updateGame();
    renderGame();
    GS.gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function showEndGameScreen() {
  if (GS.gameLoopId) cancelAnimationFrame(GS.gameLoopId);
  stopAll();
  
  // Redireccionar a la pantalla correspondiente según el archivo index.html
  if (GS.gameResult === 'win') {
    alert("✨ ¡ZONA DE SALVACIÓN ALCANZADA! HAS ESCAPADO CON ÉXITO ✨");
    changeScreen('charselect');
  } else {
    alert("💥 KABOOM! Capturado por la Veterinaria. Reinténtalo.");
    changeScreen('charselect');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §10  EVENTS & INITIALIZATION (Arreglo definitivo de controles)
═══════════════════════════════════════════════════════════════════ */
function bindButtons() {
  const listen = (id, fn) => {
    const el = document.getElementById(id);
    if(el) {
      const newEl = el.cloneNode(true); el.parentNode.replaceChild(newEl, el);
      newEl.addEventListener('click', fn);
    }
  };

  listen('btnStartGame', () => { ensureAudio(); changeScreen('charselect'); });
  listen('btnHowTo', () => { ensureAudio(); changeScreen('howtoplay'); });
  listen('btnHowToBack', () => changeScreen('mainmenu'));
  listen('btnCSBack', () => changeScreen('mainmenu'));
  listen('btnConfirmYes', () => changeScreen('game'));
  listen('btnConfirmNo', () => changeScreen('charselect'));
  
  // Agregar soporte para botones que existan en las plantillas de fin de juego/pausa
  listen('btnRetry', () => changeScreen('game'));
  listen('btnMenu', () => changeScreen('mainmenu'));
}

window.addEventListener('keydown', e => { GS.keys[e.key] = true; });
window.addEventListener('keyup', e => { GS.keys[e.key] = false; });

async function init() {
  bindButtons();
  bindCharCards();
  setLoadBar(0);
  await preloadImages();
  setLoadBar(100);
  setTimeout(() => { changeScreen('mainmenu'); }, 400);
}

window.addEventListener('DOMContentLoaded', init);
