/**
 * ═══════════════════════════════════════════════════════════════════
 * FURRY ESCAPADES: OUTSMART THE VET  ·  script.js (v14)
 *
 * CORRECCIONES vs v13:
 *  ✅ §2  GS: INITIAL_STATE snapshot → resetGameState() reconstruye GS
 *          limpio sin perder referencias de imágenes ni AudioContext
 *  ✅ §4  changeScreen(): llama resetGameState() en 'mainmenu' y 'game'
 *          - cancelAnimationFrame() explícito antes de cualquier cambio
 *          - GS.char = null al volver a mainmenu
 *          - listeners de teclado removidos siempre al salir del juego
 *  ✅ §13 showResultOverlay():
 *          RETRY → resetGameState() + removeOverlay + changeScreen('game')
 *          MENU  → resetGameState() + GS.char=null + removeOverlay
 *                   + changeScreen('mainmenu')
 *  ✅ §3  Audio: stopAll() usa try/catch por nodo; no lanza si ya stopped
 *  ✅ §3B startCharSelectBGM(): separado y funcional (sin depender bgmNode)
 *  ✅ §7A renderBackground(): fondos con paredes, vetas, decoraciones
 *  ✅ §7B renderHidingObject(): arte de producción por tipo
 *  ✅ §7D renderExitPortal(): portal animado
 *  ✅ §8  timer con centésimas, urgencia roja ≤5 s, TIMEOUT explosion
 *  ✅ §9  KABOOM: 150 partículas, screen-shake 22 frames, flash blanco
 *  ✅ CHARACTERS, GS.images, imgPath: intactos (regla de preservación)
 * ═══════════════════════════════════════════════════════════════════
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════════
   §1  DATOS PERSONAJES  ── SIN TOCAR (regla de preservación)
═══════════════════════════════════════════════════════════════════ */
const CHARACTERS = {
  molly: {
    id:'molly', name:'MOLLY', type:'🐶 DOG WARRIOR',
    mission:'Stash clothes & dodge the Vet!', mapName:'THE HOUSE',
    reward:'🦴 BONE', imgPath:'assets/images/Molly.png', speed:4.2, sprintMul:1.5,
    colors:{primary:'#c860ff',secondary:'rgba(200,96,255,0.2)'}
  },
  agata: {
    id:'agata', name:'AGATA', type:'🐱 FOREST MAGE',
    mission:"Flee the Vet's nail clippers!", mapName:'THE FOREST',
    reward:'🐟 FISH', imgPath:'assets/images/Agata.png', speed:4.5, sprintMul:1.4,
    colors:{primary:'#00e86a',secondary:'rgba(0,232,106,0.2)'}
  },
  martin: {
    id:'martin', name:'MARTÍN', type:'🐱 DESERT KNIGHT',
    mission:'Reach the well. Thirst is rising!', mapName:'THE DESERT',
    reward:'🐟 FISH', imgPath:'assets/images/Martin.png', speed:3.9, sprintMul:1.6,
    colors:{primary:'#ff9020',secondary:'rgba(255,144,32,0.2)'}
  },
  michi: {
    id:'michi', name:'MICHI', type:'🐱 ROGUE ALCHEMIST',
    mission:'Avoid soap, towel & wet doom!', mapName:'THE BATHROOM',
    reward:'🐟 FISH', imgPath:'assets/images/Michi.png', speed:4.8, sprintMul:1.3,
    colors:{primary:'#00b8ff',secondary:'rgba(0,184,255,0.2)'}
  }
};

/* ═══════════════════════════════════════════════════════════════════
   §2  ESTADO GLOBAL + resetGameState()
   
   GS contiene SIEMPRE referencias vivas (images, audioCtx).
   resetGameState() reconstruye SOLO la parte mutable del juego,
   preservando images y audioCtx que son costosas de recrear.
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen:       'loading',
  char:         null,
  images:       {},          // ← preservado en reset
  audioCtx:     null,        // ← preservado en reset
  bgmNode:      null,
  csNodes:      [],
  igMusicNodes: [],
  isPaused:     false,
  gameLoopId:   null,
  keys:         {},
  player:       { x:150, y:150, vx:0, vy:0, isSprinting:false, isHidden:false },
  vet: {
    x:1100, y:800, angle:0, speed:2.4,
    mode:'patrol', patrolTarget:{x:800,y:600}, patrolTimer:0, lostTimer:0
  },
  map:          { width:1600, height:1200 },
  hidingObjects:[],
  goal:         { x:1430, y:80, radius:52 },
  gameResult:   null,
  proximity:    0,
  particles:    [],
  explosion:    { active:false, timer:0, duration:100, shakeFrames:0 },
  touch:        { active:false, startX:0, startY:0, dx:0, dy:0, id:null },
  timer:        { seconds:20, msAcc:0, lastMs:0, running:false },
  ambient:      []
};

/**
 * Reinicia TODOS los parámetros mutables del juego.
 * Preserva: GS.images, GS.audioCtx, GS.screen (lo gestiona changeScreen).
 * Debe llamarse ANTES de cada changeScreen('game') y changeScreen('mainmenu').
 *
 * @param {boolean} fullReset - true → también limpia GS.char (volver al menú)
 */
function resetGameState(fullReset = false) {
  // ── 1. Detener el game loop activo ──────────────────────────────
  if (GS.gameLoopId) {
    cancelAnimationFrame(GS.gameLoopId);
    GS.gameLoopId = null;
  }

  // ── 2. Remover listeners de teclado/touch ──────────────────────
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup',   onKeyUp);

  // ── 3. Detener TODO el audio ───────────────────────────────────
  stopAll();

  // ── 4. Limpiar overlay de resultado si existe ──────────────────
  const ov = document.getElementById('resultOverlay');
  if (ov) ov.remove();

  // ── 5. Resetear jugador ────────────────────────────────────────
  GS.player.x = 150; GS.player.y = 150;
  GS.player.vx = 0;  GS.player.vy = 0;
  GS.player.isSprinting = false;
  GS.player.isHidden    = false;

  // ── 6. Resetear Vet ────────────────────────────────────────────
  GS.vet.x = 1100; GS.vet.y = 800;
  GS.vet.angle = 0; GS.vet.speed = 2.4;
  GS.vet.mode = 'patrol';
  GS.vet.patrolTarget = { x:800, y:600 };
  GS.vet.patrolTimer = 0;
  GS.vet.lostTimer = 0;

  // ── 7. Resetear timer ─────────────────────────────────────────
  GS.timer.seconds = 20;
  GS.timer.msAcc   = 0;
  GS.timer.lastMs  = 0;
  GS.timer.running = false;

  // ── 8. Limpiar estado de juego ────────────────────────────────
  GS.hidingObjects = [];
  GS.particles     = [];
  GS.ambient       = [];
  GS.gameResult    = null;
  GS.proximity     = 0;
  GS.isPaused      = false;
  GS.keys          = {};
  GS.touch         = { active:false, startX:0, startY:0, dx:0, dy:0, id:null };
  GS.explosion     = { active:false, timer:0, duration:100, shakeFrames:0 };
  GS.goal          = { x:1430, y:80, radius:52 };

  // ── 9. Reiniciar botón de pausa ───────────────────────────────
  const btn = document.getElementById('btnPause');
  if (btn) btn.textContent = '⏸ PAUSE';

  // ── 10. Si volvemos al menú, borrar personaje seleccionado ─────
  if (fullReset) {
    GS.char = null;
  }
}

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
  const bar=document.getElementById('loadBar'), txt=document.getElementById('loadPct');
  if(bar) bar.style.width=pct+'%';
  if(txt) txt.textContent=Math.round(pct)+'%';
}
async function preloadImages() {
  const keys=Object.keys(IMAGE_ASSETS), total=keys.length; let n=0;
  const promises=keys.map(key=>new Promise(resolve=>{
    const img=new Image(); img.src=IMAGE_ASSETS[key];
    const done=()=>{GS.images[key]=img;n++;setLoadBar((n/total)*100);resolve();};
    img.onload=done; img.onerror=done;
  }));
  await Promise.race([Promise.all(promises),new Promise(r=>setTimeout(r,2500))]);
}

/* ═══════════════════════════════════════════════════════════════════
   §3  AUDIO ENGINE — 100% Web Audio API
   OVERLAP PROTECTION: stopAll() limpia TODOS los canales.
   Cada arranque de audio llama stopAll() primero.
═══════════════════════════════════════════════════════════════════ */
function ensureAudio() {
  try {
    if (!GS.audioCtx) GS.audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if (GS.audioCtx.state==='suspended') GS.audioCtx.resume();
  } catch(e){}
}

/** Detiene y desconecta TODOS los nodos activos de todos los canales. */
function stopAll() {
  // bgmNode
  if (GS.bgmNode) { try{GS.bgmNode.stop();}catch(e){} GS.bgmNode=null; }
  // csNodes + igMusicNodes
  [...GS.csNodes, ...GS.igMusicNodes].forEach(n=>{
    try{n.stop();}catch(e){} try{n.disconnect();}catch(e){}
  });
  GS.csNodes      = [];
  GS.igMusicNodes = [];
}
function stopBGM()     { stopAll(); }
function stopIgMusic() { stopAll(); }

/* ── §3A  MAIN MENU BGM — pad suave atmosphérico ── */
function startMenuBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  try {
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.06,ctx.currentTime);
    master.connect(ctx.destination);

    const pad1=ctx.createOscillator(), pad2=ctx.createOscillator();
    pad1.type='sine';     pad1.frequency.value=146.83;  // D3
    pad2.type='triangle'; pad2.frequency.value=220.00;  // A3

    const mel=ctx.createOscillator(), mG=ctx.createGain();
    mel.type='triangle'; mG.gain.setValueAtTime(0.32,ctx.currentTime);
    const NOTES=[196,220,261.63,293.66,329.63,293.66,261.63,220];
    const now=ctx.currentTime;
    for(let i=0;i<96;i++) mel.frequency.setValueAtTime(NOTES[i%NOTES.length],now+i*0.52);

    const gP=ctx.createGain(); gP.gain.setValueAtTime(0.26,ctx.currentTime);
    pad1.connect(gP); pad2.connect(gP); gP.connect(master);
    mel.connect(mG); mG.connect(master);

    pad1.start(now); pad2.start(now); mel.start(now);
    GS.bgmNode=pad1;
    GS.csNodes=[pad2,mel,gP,mG,master];
  } catch(e){}
}

/* ── §3B  CHAR SELECT BGM — rítmico y entusiasta ── */
function startCharSelectBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  try {
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.09,ctx.currentTime);
    master.connect(ctx.destination);
    GS.csNodes.push(master);

    // Arpeggio square sobre escala mayor de C
    const ARP=[261.63,329.63,392,523.25,659.25,523.25,392,329.63];
    const arp=ctx.createOscillator(), aG=ctx.createGain();
    arp.type='square'; aG.gain.setValueAtTime(0.28,ctx.currentTime);
    const now=ctx.currentTime, aD=0.12;
    for(let i=0;i<130;i++) arp.frequency.setValueAtTime(ARP[i%ARP.length],now+i*aD);
    arp.connect(aG); aG.connect(master); arp.start(now);
    GS.csNodes.push(arp,aG);
    GS.bgmNode=arp;  // referencia principal

    // Bajo sawtooth C2 + G2
    const b1=ctx.createOscillator(),b2=ctx.createOscillator(),bG=ctx.createGain();
    b1.type='sawtooth'; b1.frequency.value=65.41;
    b2.type='sawtooth'; b2.frequency.value=98.00;
    bG.gain.setValueAtTime(0.20,ctx.currentTime);
    b1.connect(bG); b2.connect(bG); bG.connect(master);
    b1.start(now); b2.start(now);
    GS.csNodes.push(b1,b2,bG);

    // Kick + hi-hat 160 BPM
    const BEAT=60/160;
    for(let i=0;i<90;i++){
      const kt=now+i*BEAT;
      // Kick
      const ko=ctx.createOscillator(),kg=ctx.createGain();
      ko.type='sine';
      ko.frequency.setValueAtTime(200,kt);
      ko.frequency.exponentialRampToValueAtTime(40,kt+0.08);
      kg.gain.setValueAtTime(0.4,kt);
      kg.gain.exponentialRampToValueAtTime(0.001,kt+0.1);
      ko.connect(kg); kg.connect(master);
      ko.start(kt); ko.stop(kt+0.12);
      GS.csNodes.push(ko,kg);
    }
    for(let i=0;i<180;i++){
      const ht=now+i*BEAT*0.5;
      const hbuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.018),ctx.sampleRate);
      const hd=hbuf.getChannelData(0);
      for(let s=0;s<hd.length;s++) hd[s]=(Math.random()*2-1)*Math.pow(1-s/hd.length,1.4);
      const hs=ctx.createBufferSource(),hg=ctx.createGain();
      hs.buffer=hbuf; hg.gain.setValueAtTime(0.07,ht);
      hs.connect(hg); hg.connect(master); hs.start(ht);
      GS.csNodes.push(hs,hg);
    }
  } catch(e){}
}

/* ── §3C  IN-GAME BGM — Darbuka árabe 145 BPM + Maqam Hijaz ── */
function startInGameMusic() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  try {
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.10,ctx.currentTime);
    master.connect(ctx.destination);
    GS.igMusicNodes.push(master);

    const H1=[293.66,311.13,369.99,392.00,440.00,466.16,554.37,587.33];
    const H2=H1.map(f=>f*2), H0=H1.map(f=>f/2);
    const MOT=[0,2,3,2,1,0,4,3,2,3,5,4,3,2,1,0,6,5,4,3,2,1,0,7];
    const DUR=[.12,.08,.11,.08,.12,.16,.11,.08,.12,.11,.16,.11,.08,.12,.08,.16,.11,.08,.12,.11,.12,.08,.12,.20];

    function schedMel(freqs,startT,gv,wave){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type=wave||'sawtooth'; g.gain.setValueAtTime(gv,startT);
      let t=startT;
      for(let rep=0;rep<28;rep++){
        MOT.forEach((si,i)=>{o.frequency.setValueAtTime(freqs[si],t);t+=DUR[i]||0.11;});
      }
      o.connect(g); g.connect(master); o.start(startT);
      GS.igMusicNodes.push(o,g);
    }
    const now=ctx.currentTime;
    schedMel(H1,now,0.40,'sawtooth');
    schedMel(H2,now+0.05,0.18,'triangle');
    schedMel(H0,now,0.20,'sawtooth');

    // Darbuka 145 BPM
    const B=60/145;
    for(let i=0;i<220;i++){
      const bt=now+i*B;
      if(i%4===0||i%4===2){
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine'; o.frequency.setValueAtTime(220,bt); o.frequency.exponentialRampToValueAtTime(48,bt+0.10);
        g.gain.setValueAtTime(0.48,bt); g.gain.exponentialRampToValueAtTime(0.001,bt+0.14);
        o.connect(g); g.connect(master); o.start(bt); o.stop(bt+0.16);
        GS.igMusicNodes.push(o,g);
      }
      if(i%4===1){
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='triangle'; o.frequency.setValueAtTime(1100,bt); o.frequency.exponentialRampToValueAtTime(550,bt+0.04);
        g.gain.setValueAtTime(0.24,bt); g.gain.exponentialRampToValueAtTime(0.001,bt+0.06);
        o.connect(g); g.connect(master); o.start(bt); o.stop(bt+0.07);
        GS.igMusicNodes.push(o,g);
      }
      if(i%4===3){
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='triangle'; o.frequency.setValueAtTime(800,bt+B*0.75);
        g.gain.setValueAtTime(0.14,bt+B*0.75); g.gain.exponentialRampToValueAtTime(0.001,bt+B*0.75+0.04);
        o.connect(g); g.connect(master); o.start(bt+B*0.75); o.stop(bt+B*0.75+0.05);
        GS.igMusicNodes.push(o,g);
      }
      if(i%2===1){
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='square'; o.frequency.setValueAtTime(1600,bt+B*0.5);
        g.gain.setValueAtTime(0.09,bt+B*0.5); g.gain.exponentialRampToValueAtTime(0.001,bt+B*0.5+0.03);
        o.connect(g); g.connect(master); o.start(bt+B*0.5); o.stop(bt+B*0.5+0.04);
        GS.igMusicNodes.push(o,g);
      }
    }
    const drone=ctx.createOscillator(),dg=ctx.createGain();
    drone.type='sawtooth'; drone.frequency.value=69.30;
    dg.gain.setValueAtTime(0.07,now);
    drone.connect(dg); dg.connect(master); drone.start(now);
    GS.igMusicNodes.push(drone,dg);
  } catch(e){ console.warn('InGameMusic error:',e); }
}

function playSynthSFX(type){
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  try{
    const o=ctx.createOscillator(),g=ctx.createGain();
    if(type==='bark'){
      o.type='sawtooth'; o.frequency.setValueAtTime(180,ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+0.15);
      g.gain.setValueAtTime(0.15,ctx.currentTime);
    } else {
      o.type='triangle'; o.frequency.setValueAtTime(400,ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(700,ctx.currentTime+0.2);
      g.gain.setValueAtTime(0.12,ctx.currentTime);
    }
    g.gain.linearRampToValueAtTime(0.01,ctx.currentTime+0.2);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.25);
  } catch(e){}
}

function playWinJingle(){
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(); const t=ctx.currentTime+i*0.22;
    o.type='square'; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0.10,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.3);
  });
}

function playLoseJingle(){
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  [440,392,349.23,261.63].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(); const t=ctx.currentTime+i*0.28;
    o.type='sawtooth'; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.34);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.36);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §4  ROUTER — con resetGameState() en cada transición crítica
═══════════════════════════════════════════════════════════════════ */
function changeScreen(screenId) {
  // Limpiar overlay si existe antes de cambiar
  const ov=document.getElementById('resultOverlay');
  if(ov) ov.remove();

  // Si salimos del juego, siempre cancelamos el RAF y limpiamos listeners
  if (GS.screen === 'game') {
    if (GS.gameLoopId) { cancelAnimationFrame(GS.gameLoopId); GS.gameLoopId=null; }
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
  }

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const target=document.getElementById(`screen-${screenId}`);
  if(target) target.classList.add('active');
  GS.screen=screenId;

  if (screenId==='mainmenu') {
    stopAll();
    startMenuBGM();
  } else if (screenId==='charselect') {
    stopAll();
    startCharSelectBGM();
  } else if (screenId==='game') {
    stopAll();
    startGameplay();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §5  SELECCIÓN DE PERSONAJE
═══════════════════════════════════════════════════════════════════ */
function selectCharacter(charId){
  const data=CHARACTERS[charId]; if(!data) return;
  GS.char=data;
  playSynthSFX(charId==='molly'?'bark':'meow');
  const av=document.getElementById('confirmAvatar'); if(av) av.src=data.imgPath;
  document.getElementById('confirmName').textContent=data.name;
  document.getElementById('confirmName').className=`confirm-name ${charId}-text`;
  document.getElementById('confirmLevel').textContent=data.type;
  document.getElementById('confirmObj').textContent=`LOCATION: ${data.mapName}\n• OBJECTIVE: ${data.mission}`;
  changeScreen('confirm');
}

function bindCharCards(){
  document.querySelectorAll('.quad').forEach(card=>{
    const id=card.getAttribute('data-char');
    card.addEventListener('click',()=>{ ensureAudio(); selectCharacter(id); });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §6  SETUP DEL MAPA — llama resetGameState para limpiar el estado
═══════════════════════════════════════════════════════════════════ */
function setupGameMap(){
  // resetGameState(false) preserva GS.char; solo limpia el estado del juego
  resetGameState(false);

  const id=GS.char?GS.char.id:'molly';

  if(id==='molly'){
    GS.hidingObjects=[
      {x:190,y:170,w:280,h:145,label:'BED',      color:'#8a5cf6',type:'bed'    },
      {x:670,y:405,w:320,h:125,label:'SOFA',     color:'#7c4dff',type:'couch'  },
      {x:1080,y:175,w:155,h:215,label:'CABINET', color:'#5e35b1',type:'cabinet'},
      {x:375,y:675,w:215,h:135,label:'BED 2',    color:'#8a5cf6',type:'bed'    },
      {x:875,y:835,w:280,h:125,label:'SOFA 2',   color:'#7c4dff',type:'couch'  },
      {x:190,y:875,w:155,h:195,label:'WARDROBE', color:'#5e35b1',type:'cabinet'},
    ];
  } else if(id==='agata'){
    GS.hidingObjects=[
      {x:265,y:185,w:100,h:280,label:'TRUNK', color:'#5d4037',type:'trunk'},
      {x:600,y:365,w:240,h:115,label:'BUSH',  color:'#2e7d32',type:'bush' },
      {x:965,y:185,w:110,h:295,label:'TRUNK', color:'#5d4037',type:'trunk'},
      {x:385,y:685,w:255,h:125,label:'BUSH',  color:'#388e3c',type:'bush' },
      {x:1135,y:585,w:95,h:275,label:'TRUNK', color:'#4e342e',type:'trunk'},
      {x:685,y:835,w:215,h:115,label:'BUSH',  color:'#2e7d32',type:'bush' },
    ];
  } else if(id==='martin'){
    GS.hidingObjects=[
      {x:235,y:185,w:320,h:95, label:'WALL',  color:'#795548',type:'wall'  },
      {x:735,y:305,w:80,h:240, label:'COLUMN',color:'#8d6e63',type:'column'},
      {x:935,y:165,w:80,h:240, label:'COLUMN',color:'#8d6e63',type:'column'},
      {x:1175,y:385,w:145,h:145,label:'WELL', color:'#6d4c41',type:'well'  },
      {x:335,y:685,w:300,h:95, label:'WALL 2',color:'#795548',type:'wall'  },
      {x:785,y:835,w:175,h:90, label:'DUNE',  color:'#c8a165',type:'dune'  },
    ];
  } else {
    GS.hidingObjects=[
      {x:165,y:165,w:340,h:145,label:'BATHTUB', color:'#0288d1',type:'tub'   },
      {x:685,y:335,w:145,h:185,label:'BASKET',  color:'#00838f',type:'basket'},
      {x:1035,y:165,w:275,h:95,label:'SHELF',   color:'#006064',type:'shelf' },
      {x:335,y:705,w:320,h:135,label:'BATHTUB2',color:'#0288d1',type:'tub'   },
      {x:885,y:785,w:145,h:185,label:'BASKET2', color:'#00838f',type:'basket'},
      {x:1135,y:585,w:275,h:95,label:'SHELF 2', color:'#006064',type:'shelf' },
    ];
  }

  seedAmbient(id);
}

/* ═══════════════════════════════════════════════════════════════════
   §7  RENDER PIPELINE — fondos, objetos, portal
═══════════════════════════════════════════════════════════════════ */

/* ── §7-AMBIENT ── */
function seedAmbient(id){
  GS.ambient=[];
  const W=GS.map.width,H=GS.map.height;
  if(id==='agata'){
    for(let i=0;i<40;i++) GS.ambient.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.4,vy:-.2-Math.random()*.4,
      size:2+Math.random()*3,alpha:.4+Math.random()*.5,
      color:`hsl(${110+Math.random()*60},60%,${55+Math.random()*25}%)`,type:'spore'
    });
  } else if(id==='michi'){
    for(let i=0;i<35;i++) GS.ambient.push({
      x:Math.random()*W,y:H-20+Math.random()*80,
      vx:(Math.random()-.5)*.5,vy:-.5-Math.random()*.8,
      size:4+Math.random()*8,alpha:.35+Math.random()*.3,type:'bubble'
    });
  }
}

function updateAmbient(){
  const W=GS.map.width,H=GS.map.height;
  GS.ambient.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.y<-20) p.y=H+10;
    if(p.x<0) p.x=W; if(p.x>W) p.x=0;
  });
}

function renderAmbient(ctx){
  GS.ambient.forEach(p=>{
    ctx.save(); ctx.globalAlpha=p.alpha;
    if(p.type==='spore'){
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*.35,0,Math.PI*2); ctx.fill();
    } else {
      ctx.strokeStyle='rgba(100,220,255,0.7)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(180,240,255,0.15)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

/* ── §7A  FONDOS TEMÁTICOS ── */
function renderBackground(ctx){
  const id=GS.char?GS.char.id:'molly';
  const W=GS.map.width,H=GS.map.height;

  /* ══ MOLLY: THE HOUSE ══ */
  if(id==='molly'){
    // Parquet con tablas horizontales
    const PLANK=70;
    for(let row=0;row<Math.ceil(H/PLANK);row++){
      ctx.fillStyle=row%2===0?'#5d3a1a':'#6b4423';
      ctx.fillRect(0,row*PLANK,W,PLANK);
      ctx.fillStyle='rgba(40,18,8,0.22)';
      ctx.fillRect(0,row*PLANK,W,3);
      ctx.fillRect(0,row*PLANK+PLANK-3,W,3);
    }
    // Juntas verticales offset
    ctx.strokeStyle='rgba(35,15,5,0.32)'; ctx.lineWidth=2;
    for(let row=0;row<Math.ceil(H/PLANK);row++){
      const off=(row%2)*90;
      for(let x=off;x<W;x+=180){
        ctx.beginPath(); ctx.moveTo(x,row*PLANK); ctx.lineTo(x,row*PLANK+PLANK); ctx.stroke();
      }
    }
    // Vetas de madera
    ctx.strokeStyle='rgba(90,55,25,0.15)'; ctx.lineWidth=1;
    for(let i=0;i<28;i++){
      const wy=(i*193)%H, len=80+((i*47)%120);
      ctx.beginPath(); ctx.moveTo((i*311)%W,wy);
      ctx.bezierCurveTo((i*311)%W+len*.3,wy+5,(i*311)%W+len*.7,wy-4,(i*311)%W+len,wy+2);
      ctx.stroke();
    }
    // Paredes perimetrales
    ctx.fillStyle='#e8d5c4'; ctx.fillRect(0,0,W,40); ctx.fillRect(0,H-40,W,40);
    ctx.fillRect(0,0,40,H); ctx.fillRect(W-40,0,40,H);
    ctx.fillStyle='#8b6240';
    ctx.fillRect(0,38,W,8); ctx.fillRect(0,H-46,W,8);
    ctx.fillRect(38,0,8,H); ctx.fillRect(W-46,0,8,H);
    // Alfombra central con patrón
    ctx.fillStyle='#4a148c'; ctx.fillRect(270,310,780,460);
    ctx.fillStyle='#6a1cb7'; ctx.fillRect(286,326,748,428);
    ctx.strokeStyle='#9c4dcc'; ctx.lineWidth=5; ctx.strokeRect(302,342,716,396);
    ctx.strokeStyle='rgba(156,77,204,0.35)'; ctx.lineWidth=1;
    for(let i=1;i<9;i++){
      const cx=302+i*(716/9),cy=342+396/2;
      ctx.beginPath(); ctx.moveTo(cx,342); ctx.lineTo(cx-28,cy); ctx.lineTo(cx,342+396); ctx.lineTo(cx+28,cy); ctx.closePath(); ctx.stroke();
    }
    // Cuenco de comida
    ctx.fillStyle='#b71c1c'; ctx.beginPath(); ctx.ellipse(510,955,30,17,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ef9a9a'; ctx.beginPath(); ctx.ellipse(498,951,13,9,0,0,Math.PI); ctx.fill();
    // Calcetines
    [[340,535,36,19,'#e91e63'],[755,615,38,19,'#2196F3'],[1110,705,35,18,'#ff5722']].forEach(([sx,sy,sw,sh,sc])=>{
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(-.2);
      ctx.fillStyle=sc;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(-sw/2,-sh/2,sw,sh,8);ctx.fill();}
      else ctx.fillRect(-sw/2,-sh/2,sw,sh);
      ctx.restore();
    });

  /* ══ AGATA: THE FOREST ══ */
  } else if(id==='agata'){
    ctx.fillStyle='#064e3b'; ctx.fillRect(0,0,W,H);
    for(let i=0;i<60;i++){
      const gx=(i*347)%W,gy=(i*229)%H,hue=110+((i*17)%40);
      ctx.fillStyle=`hsla(${hue},55%,${18+((i*7)%15)}%,0.7)`;
      ctx.fillRect(gx,gy,50+(i%6)*22,30+(i%5)*14);
    }
    // Hierba
    ctx.strokeStyle='rgba(16,185,129,0.22)'; ctx.lineWidth=1;
    for(let i=0;i<200;i++){
      const gx=(i*113)%W,gy=(i*97)%H;
      ctx.beginPath(); ctx.moveTo(gx,gy+8); ctx.lineTo(gx-2,gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx,gy+8); ctx.lineTo(gx+2,gy); ctx.stroke();
    }
    // Paredes boscosas
    ctx.fillStyle='#022c22'; ctx.fillRect(0,0,W,38); ctx.fillRect(0,H-38,W,38);
    ctx.fillRect(0,0,38,H); ctx.fillRect(W-38,0,38,H);
    ctx.strokeStyle='#065f46'; ctx.lineWidth=2.5;
    for(let i=0;i<18;i++){
      const ex=(i*180)%(W-80)+40;
      ctx.beginPath(); ctx.moveTo(ex,0); ctx.quadraticCurveTo(ex+20,48,ex-10,90); ctx.stroke();
    }
    // Raíces
    ctx.strokeStyle='rgba(62,39,35,0.42)'; ctx.lineWidth=2.5;
    for(let i=0;i<16;i++){
      const rx=(i*503)%W,ry=(i*317)%H;
      ctx.beginPath(); ctx.moveTo(rx,ry);
      ctx.bezierCurveTo(rx+50,ry-25,rx+110,ry+35,rx+150,ry+12); ctx.stroke();
    }
    // Setas decorativas
    [[280,350],[620,580],[1050,760],[380,820],[900,400]].forEach(([mx,my])=>{
      ctx.fillStyle='#d7ccc8'; ctx.fillRect(mx-4,my-18,8,20);
      ctx.fillStyle='#b71c1c';
      ctx.beginPath(); ctx.ellipse(mx,my-18,18,10,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      [[0,-4],[8,-2],[-7,-5]].forEach(([dx,dy])=>{
        ctx.beginPath(); ctx.arc(mx+dx,my-18+dy,3,0,Math.PI*2); ctx.fill();
      });
    });

  /* ══ MARTÍN: THE DESERT ══ */
  } else if(id==='martin'){
    const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,'#fef9c3'); grad.addColorStop(0.4,'#fef08a');
    grad.addColorStop(0.75,'#eab308'); grad.addColorStop(1,'#ca8a04');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    // Ondas de arena
    ctx.strokeStyle='rgba(180,130,0,0.16)'; ctx.lineWidth=2;
    for(let i=0;i<24;i++){
      const wy=i*(H/24);
      ctx.beginPath(); ctx.moveTo(0,wy);
      for(let x=0;x<W;x+=60) ctx.quadraticCurveTo(x+30,wy+(i%2===0?8:-8),x+60,wy);
      ctx.stroke();
    }
    // Grietas
    ctx.strokeStyle='rgba(130,90,0,0.28)'; ctx.lineWidth=1;
    for(let i=0;i<28;i++){
      const cx=(i*521)%W,cy=(i*389)%H;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+22,cy+38); ctx.lineTo(cx+45,cy+12); ctx.stroke();
    }
    // Paredes de adobe
    ctx.fillStyle='#92400e'; ctx.fillRect(0,0,W,38); ctx.fillRect(0,H-38,W,38);
    ctx.fillRect(0,0,38,H); ctx.fillRect(W-38,0,38,H);
    // Cactus
    [[120,300],[145,705],[1445,255],[1475,805],[800,1105]].forEach(([cx,cy])=>{
      ctx.fillStyle='#16a34a';
      ctx.fillRect(cx-8,cy-50,16,55);
      ctx.fillRect(cx-22,cy-30,14,10); ctx.fillRect(cx-22,cy-40,6,12);
      ctx.fillRect(cx+8,cy-25,14,10);  ctx.fillRect(cx+16,cy-36,6,12);
      ctx.strokeStyle='#86efac'; ctx.lineWidth=1;
      for(let s=0;s<6;s++){
        ctx.beginPath(); ctx.moveTo(cx+(s%2===0?-8:8),cy-s*8);
        ctx.lineTo(cx+(s%2===0?-14:14),cy-s*8-4); ctx.stroke();
      }
    });

  /* ══ MICHI: THE BATHROOM ══ */
  } else {
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,W,H);
    const T=72;
    for(let row=0;row<Math.ceil(H/T);row++){
      for(let col=0;col<Math.ceil(W/T);col++){
        ctx.fillStyle=(row+col)%2===0?'#0f172a':'#1e293b';
        ctx.fillRect(col*T,row*T,T,T);
      }
    }
    ctx.strokeStyle='rgba(6,182,212,0.20)'; ctx.lineWidth=1.5;
    for(let r=0;r<=Math.ceil(H/T);r++){ ctx.beginPath(); ctx.moveTo(0,r*T); ctx.lineTo(W,r*T); ctx.stroke(); }
    for(let c=0;c<=Math.ceil(W/T);c++){ ctx.beginPath(); ctx.moveTo(c*T,0); ctx.lineTo(c*T,H); ctx.stroke(); }
    ctx.strokeStyle='rgba(6,182,212,0.42)'; ctx.lineWidth=2.5;
    for(let r=0;r<=Math.ceil(H/(T*4));r++){ ctx.beginPath(); ctx.moveTo(0,r*T*4); ctx.lineTo(W,r*T*4); ctx.stroke(); }
    for(let c=0;c<=Math.ceil(W/(T*4));c++){ ctx.beginPath(); ctx.moveTo(c*T*4,0); ctx.lineTo(c*T*4,H); ctx.stroke(); }
    ctx.fillStyle='#1e293b'; ctx.fillRect(0,0,W,38); ctx.fillRect(0,H-38,W,38);
    ctx.fillRect(0,0,38,H); ctx.fillRect(W-38,0,38,H);
    ctx.strokeStyle='rgba(6,182,212,0.55)'; ctx.lineWidth=3; ctx.strokeRect(38,38,W-76,H-76);
    for(let i=0;i<12;i++){
      ctx.fillStyle=`rgba(6,182,212,${0.04+((i*7)%8)*0.005})`;
      ctx.beginPath(); ctx.ellipse((i*370)%W,(i*270)%H,30+(i%4)*12,18+(i%3)*8,0,0,Math.PI*2); ctx.fill();
    }
  }
}

/* ── §7B  OBJETOS DE ESCONDITE ── */
function renderHidingObject(ctx,obj){
  const {x,y,w,h,color,type}=obj;
  ctx.save();

  switch(type){
    case 'bed':{
      ctx.fillStyle='#6d4c41'; ctx.fillRect(x,y+h*.72,w,h*.28);
      ctx.fillStyle='#ede7f6'; ctx.fillRect(x,y,w,h*.78);
      ctx.fillStyle='#7c4dff'; ctx.fillRect(x+8,y,w-16,h*.72);
      ctx.strokeStyle='rgba(124,77,255,0.38)'; ctx.lineWidth=2;
      for(let i=1;i<5;i++){ ctx.beginPath(); ctx.moveTo(x+i*(w/5),y+10); ctx.lineTo(x+i*(w/5),y+h*.72-10); ctx.stroke(); }
      ctx.fillStyle=color; ctx.fillRect(x,y,w,h*.22);
      ctx.fillStyle='#fff';
      ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x+12,y+h*.24,w*.36,h*.36,5);}else ctx.rect(x+12,y+h*.24,w*.36,h*.36);ctx.fill();
      ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x+w*.54,y+h*.24,w*.34,h*.36,5);}else ctx.rect(x+w*.54,y+h*.24,w*.34,h*.36);ctx.fill();
      ctx.fillStyle='#b39ddb'; ctx.fillRect(x,y+h*.68,w,h*.06);
      ctx.strokeStyle=color; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'couch':{
      ctx.fillStyle='#4a148c'; ctx.fillRect(x+10,y+h-4,12,14); ctx.fillRect(x+w-22,y+h-4,12,14);
      ctx.fillStyle='#5e35b1'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#4527a0'; ctx.fillRect(x,y,w,h*.38);
      ctx.fillStyle='#7e57c2'; ctx.fillRect(x,y+h*.38,w,h*.62);
      const cW2=w*.28,cH2=h*.52;
      [0,1,2].forEach(i=>{
        const cx2=x+10+i*(cW2+8);
        ctx.fillStyle=i%2===0?'#9c27b0':'#ab47bc';
        ctx.beginPath();if(ctx.roundRect){ctx.roundRect(cx2,y+h*.40,cW2,cH2,5);}else ctx.rect(cx2,y+h*.40,cW2,cH2);ctx.fill();
        ctx.fillStyle='#7b1fa2';
        ctx.beginPath(); ctx.arc(cx2+cW2/2,y+h*.40+cH2/2,4,0,Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle='#4a148c'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'cabinet':{
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x+8,y+8,w,h);
      ctx.fillStyle='#4e342e'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#6d4c41';
      ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x+6,y+8,w/2-10,h*.85,3);}else ctx.rect(x+6,y+8,w/2-10,h*.85);ctx.fill();
      ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x+w/2+4,y+8,w/2-10,h*.85,3);}else ctx.rect(x+w/2+4,y+8,w/2-10,h*.85);ctx.fill();
      ctx.strokeStyle='rgba(161,136,127,0.38)'; ctx.lineWidth=1;
      ctx.strokeRect(x+10,y+14,w/2-18,h*.78); ctx.strokeRect(x+w/2+8,y+14,w/2-18,h*.78);
      ctx.fillStyle='#f9a825';
      ctx.beginPath(); ctx.arc(x+w/2-10,y+h/2,7,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w/2+10,y+h/2,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#3e2723'; ctx.fillRect(x,y,w,14); ctx.fillRect(x,y+h-14,w,14);
      ctx.strokeStyle='#3e2723'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'trunk':{
      ctx.strokeStyle='rgba(62,39,35,0.55)'; ctx.lineWidth=4;
      [[-25,h*.85],[w+15,h*.7],[-18,h*.55]].forEach(([rx,ry])=>{
        ctx.beginPath(); ctx.moveTo(x+w/2,y+ry);
        ctx.quadraticCurveTo(x+w/2+rx*.45,y+ry+22,x+rx,y+h+12); ctx.stroke();
      });
      const g=ctx.createLinearGradient(x,0,x+w,0);
      g.addColorStop(0,'#3e2723'); g.addColorStop(0.4,color); g.addColorStop(1,'#4e342e');
      ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='rgba(30,15,10,0.38)'; ctx.lineWidth=2;
      for(let lx=x+10;lx<x+w-5;lx+=12){
        ctx.beginPath(); ctx.moveTo(lx,y+15);
        ctx.bezierCurveTo(lx+4,y+h/3,lx-4,y*2/3,lx+2,y+h-15); ctx.stroke();
      }
      ctx.strokeStyle='rgba(90,50,30,0.45)'; ctx.lineWidth=1.5;
      for(let ay=y+30;ay<y+h-20;ay+=42){ ctx.beginPath(); ctx.moveTo(x+5,ay); ctx.lineTo(x+w-5,ay); ctx.stroke(); }
      [[1.2,80,'#1b5e20'],[1.0,55,'#2e7d32'],[0.7,35,'#43a047']].forEach(([rx,ry,col])=>{
        ctx.fillStyle=col;
        ctx.beginPath(); ctx.ellipse(x+w/2,y-ry,w*rx,ry+25,0,0,Math.PI*2); ctx.fill();
      });
      break;
    }
    case 'bush':{
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(x+w/2+8,y+h*.65+8,w*.52,h*.45,0,0,Math.PI*2); ctx.fill();
      [{rx:.52,ry:.45,cy:.62,col:'#1b5e20'},
       {rx:.38,ry:.42,cy:.42,dx:-.22,col:'#2e7d32'},
       {rx:.35,ry:.40,cy:.38,dx:.22,col:'#388e3c'},
       {rx:.28,ry:.34,cy:.22,col:'#43a047'}].forEach(({rx,ry,cy,dx=0,col})=>{
        ctx.fillStyle=col;
        ctx.beginPath(); ctx.ellipse(x+w/2+dx*w,y+h*cy,w*rx,h*ry,0,0,Math.PI*2); ctx.fill();
      });
      break;
    }
    case 'wall':{
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x+6,y+6,w,h);
      ctx.fillStyle='#8d6e63'; ctx.fillRect(x,y,w,h);
      const BW=62,BH=22;
      for(let row=0;row<Math.ceil(h/BH)+1;row++){
        const off=(row%2)*(BW/2);
        for(let col=-1;col<Math.ceil(w/BW)+1;col++){
          const bx2=x+col*BW+off,by2=y+row*BH;
          ctx.fillStyle=(row+col)%3===0?'#795548':(row+col)%3===1?'#8d6e63':'#a1887f';
          ctx.fillRect(bx2+1,by2+1,BW-2,BH-2);
          ctx.strokeStyle='rgba(62,39,35,0.48)'; ctx.lineWidth=1.5;
          ctx.strokeRect(bx2,by2,BW,BH);
        }
      }
      ctx.fillStyle='rgba(46,125,50,0.28)';
      for(let i=0;i<10;i++) ctx.fillRect(x+(i*89)%w,y+h-12,18+((i*7)%20),12);
      ctx.strokeStyle='#5d4037'; ctx.lineWidth=4; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'column':{
      ctx.fillStyle='rgba(0,0,0,0.32)'; ctx.fillRect(x+7,y+7,w,h);
      const g2=ctx.createLinearGradient(x,0,x+w,0);
      g2.addColorStop(0,'#a1887f'); g2.addColorStop(0.4,color); g2.addColorStop(1,'#6d4c41');
      ctx.fillStyle=g2; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='rgba(100,70,55,0.42)'; ctx.lineWidth=2;
      for(let lx=x+10;lx<x+w-5;lx+=10){ ctx.beginPath(); ctx.moveTo(lx,y+22); ctx.lineTo(lx,y+h-22); ctx.stroke(); }
      ctx.fillStyle='#bcaaa4'; ctx.fillRect(x-14,y,w+28,22); ctx.fillStyle='#d7ccc8'; ctx.fillRect(x-8,y+4,w+16,14);
      ctx.fillStyle='#bcaaa4'; ctx.fillRect(x-14,y+h-22,w+28,22); ctx.fillStyle='#d7ccc8'; ctx.fillRect(x-8,y+h-18,w+16,14);
      ctx.strokeStyle='#795548'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'well':{
      ctx.fillStyle='#795548'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h*.72,w*.54,h*.22,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#6d4c41'; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.48,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#4e342e'; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.36,0,Math.PI*2); ctx.fill();
      const wG=ctx.createRadialGradient(x+w/2,y+h/2,2,x+w/2,y+h/2,w*.24);
      wG.addColorStop(0,'#4fc3f7'); wG.addColorStop(1,'#0277bd');
      ctx.fillStyle=wG; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.26,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#5d4037'; ctx.fillRect(x+w/2-5,y+5,10,h*.35); ctx.fillRect(x+w/2-w*.4,y+h*.1,w*.8,10);
      ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x+w*.25,y+h*.45); ctx.lineTo(x+w*.52,y+h*.48); ctx.stroke();
      ctx.strokeStyle='#3e2723'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*.48,0,Math.PI*2); ctx.stroke();
      break;
    }
    case 'dune':{
      ctx.fillStyle='#b45309';
      ctx.beginPath(); ctx.moveTo(x,y+h); ctx.quadraticCurveTo(x+w/2,y-30,x+w,y+h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ca8a04';
      ctx.beginPath(); ctx.moveTo(x,y+h); ctx.quadraticCurveTo(x+w/2,y-15,x+w,y+h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fef08a';
      ctx.beginPath(); ctx.moveTo(x+w*.1,y+h); ctx.quadraticCurveTo(x+w/2,y+5,x+w*.9,y+h); ctx.closePath(); ctx.fill();
      break;
    }
    case 'tub':{
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x+8,y+8,w,h);
      ctx.fillStyle='#f0fdff'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#b2ebf2'; ctx.fillRect(x,y,w,20); ctx.fillRect(x,y+h-20,w,20);
      ctx.fillRect(x,y,18,h); ctx.fillRect(x+w-18,y,18,h);
      ctx.fillStyle='#e0f7fa'; ctx.fillRect(x+18,y+20,w-36,h-40);
      const wg=ctx.createLinearGradient(x+18,y+20,x+18,y+h-20);
      wg.addColorStop(0,'rgba(77,208,225,0.28)'); wg.addColorStop(1,'rgba(77,208,225,0.62)');
      ctx.fillStyle=wg; ctx.fillRect(x+18,y+h*.55,w-36,h*.3);
      ctx.strokeStyle='rgba(255,255,255,0.38)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x+40,y+h*.62); ctx.lineTo(x+88,y+h*.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+w/2,y+h*.68); ctx.lineTo(x+w/2+48,y+h*.68); ctx.stroke();
      ctx.fillStyle='#90a4ae'; ctx.fillRect(x+w/2-14,y-22,28,26);
      ctx.beginPath(); ctx.arc(x+w/2,y-24,9,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'basket':{
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(x+6,y+6,w,h);
      ctx.fillStyle='#4dd0e1'; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='rgba(0,131,143,0.58)'; ctx.lineWidth=1.5;
      for(let cx3=x+14;cx3<x+w;cx3+=14){ ctx.beginPath(); ctx.moveTo(cx3,y); ctx.lineTo(cx3,y+h); ctx.stroke(); }
      for(let cy3=y+16;cy3<y+h;cy3+=16){ ctx.beginPath(); ctx.moveTo(x,cy3); ctx.lineTo(x+w,cy3); ctx.stroke(); }
      ctx.fillStyle='#00838f'; ctx.fillRect(x-7,y-18,w+14,22);
      ctx.strokeStyle='#004d40'; ctx.lineWidth=2; ctx.strokeRect(x-7,y-18,w+14,22);
      ctx.strokeStyle='#006064'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(x+w/2,y-22,16,Math.PI,0); ctx.stroke();
      ctx.strokeStyle='#00838f'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
    case 'shelf':{
      ctx.fillStyle='rgba(0,0,0,0.32)'; ctx.fillRect(x+7,y+7,w,h);
      ctx.fillStyle='#0c4a6e'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#1e40af'; ctx.fillRect(x,y+h-14,w,14);
      ctx.fillStyle='#0f172a'; ctx.fillRect(x+4,y+4,w-8,h-18);
      const BCOLS=['#e040fb','#00e5ff','#69f0ae','#ff6e40','#ffea00','#f50057','#7c4dff','#00bcd4'];
      const BW3=19,BH3=h-20,GAP=26;
      let bx3=x+10;
      for(let bi=0;bx3+BW3<x+w-8;bi++,bx3+=GAP){
        const bc=BCOLS[bi%BCOLS.length];
        const glow=0.5+0.5*Math.sin(Date.now()/400+bi);
        ctx.fillStyle=bc; ctx.fillRect(bx3,y+6,BW3,BH3);
        ctx.fillRect(bx3+4,y+2,BW3-8,6);
        ctx.fillStyle=`rgba(255,255,255,${0.22+glow*.14})`; ctx.fillRect(bx3+3,y+8,5,BH3*.38);
        ctx.fillStyle='#8d6e63'; ctx.fillRect(bx3+4,y+2,BW3-8,5);
        ctx.strokeStyle=`rgba(255,255,255,${0.12+glow*.09})`; ctx.lineWidth=1; ctx.strokeRect(bx3,y+6,BW3,BH3);
      }
      ctx.strokeStyle='#1d4ed8'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
      break;
    }
  }

  // Indicador activo
  const px=GS.player.x,py=GS.player.y;
  if(px>=x&&px<=x+w&&py>=y&&py<=y+h){
    const pulse=0.5+0.5*Math.sin(Date.now()/180);
    ctx.strokeStyle=`rgba(255,255,80,${pulse})`; ctx.lineWidth=4;
    ctx.strokeRect(x-5,y-5,w+10,h+10);
    ctx.fillStyle=`rgba(255,255,80,${pulse*.9})`;
    ctx.font='bold 12px monospace'; ctx.textAlign='center';
    ctx.fillText('HIDING!',x+w/2,y-12);
  }
  ctx.restore();
}

/* ── §7D  EXIT PORTAL ── */
function renderExitPortal(ctx){
  const {x,y,radius}=GS.goal;
  const t=Date.now()/1000,pulse=0.7+0.3*Math.sin(t*3);
  ctx.save(); ctx.translate(x,y); ctx.rotate(t*.8);
  for(let i=0;i<8;i++){
    ctx.save(); ctx.rotate(i*Math.PI/4);
    ctx.fillStyle=`rgba(255,230,0,${.3+.1*Math.sin(t+i)})`;
    ctx.fillRect(radius-6,0,12,8); ctx.restore();
  }
  ctx.restore();
  const aura=ctx.createRadialGradient(x,y,radius*.4,x,y,radius*1.6);
  aura.addColorStop(0,`rgba(255,230,0,${.25*pulse})`); aura.addColorStop(1,'rgba(255,200,0,0)');
  ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(x,y,radius*1.6,0,Math.PI*2); ctx.fill();
  const pG=ctx.createRadialGradient(x,y,4,x,y,radius);
  pG.addColorStop(0,`rgba(255,255,200,${pulse})`); pG.addColorStop(0.5,`rgba(255,215,0,${.8*pulse})`);
  pG.addColorStop(1,'rgba(200,150,0,0.3)');
  ctx.fillStyle=pG; ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=`rgba(255,230,0,${.8*pulse})`; ctx.lineWidth=4;
  ctx.shadowColor='#ffe600'; ctx.shadowBlur=16*pulse;
  ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='#000'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
  ctx.fillText('EXIT!',x,y+5);
}

/* ═══════════════════════════════════════════════════════════════════
   §8  COUNTDOWN TIMER — 20 s con centésimas
═══════════════════════════════════════════════════════════════════ */
function tickTimer(nowMs){
  const t=GS.timer;
  if(!t.running||GS.gameResult||GS.explosion.active) return;
  const delta=nowMs-t.lastMs; t.lastMs=nowMs; t.msAcc+=delta;
  const secsLost=Math.floor(t.msAcc/1000);
  if(secsLost>0){ t.msAcc-=secsLost*1000; t.seconds=Math.max(0,t.seconds-secsLost); }
  if(t.seconds<=0&&!GS.gameResult){
    GS.gameResult='TIMEOUT'; GS.timer.running=false;
    window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp);
    stopAll(); playLoseJingle();
    spawnExplosion(GS.player.x,GS.player.y); spawnExplosion(GS.vet.x,GS.vet.y);
  }
}

function renderTimerHUD(ctx,cW){
  const t=GS.timer;
  const isUrgent=t.seconds<=5;
  const cs=Math.floor((1000-t.msAcc)/10);
  const label=`${String(t.seconds).padStart(2,'0')}.${String(Math.min(99,cs)).padStart(2,'0')}`;
  const pulse=isUrgent?(0.6+0.4*Math.sin(Date.now()/160)):1;
  ctx.save(); ctx.textAlign='center';
  const bW=158,bH=44;
  const bx=cW/2-bW/2,by=12;
  ctx.fillStyle=isUrgent?`rgba(180,0,0,${.65*pulse})`:'rgba(0,0,0,0.62)';
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(bx,by,bW,bH,8); ctx.fill(); }
  else { ctx.fillRect(bx,by,bW,bH); }
  ctx.strokeStyle=isUrgent?`rgba(255,60,60,${pulse})`:'rgba(255,230,0,0.7)';
  ctx.lineWidth=2;
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(bx,by,bW,bH,8); ctx.stroke(); }
  else { ctx.strokeRect(bx,by,bW,bH); }
  ctx.font=`bold ${isUrgent?20:18}px 'Press Start 2P',monospace`;
  ctx.fillStyle=isUrgent?`rgba(255,80,80,${pulse})`:'#ffe600';
  if(isUrgent){ ctx.shadowColor='#ff2d00'; ctx.shadowBlur=14*pulse; }
  ctx.fillText(`⏱ ${label}`,cW/2,by+bH*.70);
  ctx.shadowBlur=0; ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §9  KABOOM — 150 partículas + screen-shake 22 frames + flash
═══════════════════════════════════════════════════════════════════ */
function spawnExplosion(cx,cy){
  const base=GS.char?GS.char.colors.primary:'#fff';
  const pal=[base,'#ff2d78','#ffe600','#00f5ff','#ff6e40','#69f0ae','#e040fb','#fff','#00e5ff'];
  for(let i=0;i<150;i++){
    const angle=Math.random()*Math.PI*2,speed=1.5+Math.random()*11;
    GS.particles.push({
      x:cx+(Math.random()-.5)*22, y:cy+(Math.random()-.5)*22,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-Math.random()*3,
      size:2+Math.random()*10,
      color:pal[Math.floor(Math.random()*pal.length)],
      life:1.0, decay:0.007+Math.random()*0.017,
      rotate:Math.random()*Math.PI*2, rotSpeed:(Math.random()-.5)*.38,
      isRect:Math.random()>.28
    });
  }
  GS.explosion.active=true; GS.explosion.timer=0; GS.explosion.shakeFrames=22;
}

function updateParticles(){
  for(let i=GS.particles.length-1;i>=0;i--){
    const p=GS.particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.vx*=0.96;
    p.life-=p.decay; p.rotate+=p.rotSpeed;
    if(p.life<=0) GS.particles.splice(i,1);
  }
  if(GS.explosion.active){
    GS.explosion.timer++;
    if(GS.explosion.shakeFrames>0) GS.explosion.shakeFrames--;
    if(GS.explosion.timer>=GS.explosion.duration&&GS.particles.length===0){
      GS.explosion.active=false;
      showResultOverlay(false);
    }
  }
}

function renderParticles(ctx){
  GS.particles.forEach(p=>{
    ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
    ctx.translate(p.x,p.y); ctx.rotate(p.rotate); ctx.fillStyle=p.color;
    if(p.isRect){ ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); }
    else { ctx.beginPath(); ctx.arc(0,0,p.size*.55,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §10  TOUCH CONTROLS
═══════════════════════════════════════════════════════════════════ */
function initTouchControls(canvas){
  canvas.removeEventListener('touchstart',onTouchStart);
  canvas.removeEventListener('touchmove', onTouchMove);
  canvas.removeEventListener('touchend',  onTouchEnd);
  canvas.addEventListener('touchstart',onTouchStart,{passive:false});
  canvas.addEventListener('touchmove', onTouchMove, {passive:false});
  canvas.addEventListener('touchend',  onTouchEnd,  {passive:false});
}
function onTouchStart(e){
  e.preventDefault();
  const t=e.changedTouches[0];
  GS.touch={active:true,id:t.identifier,startX:t.clientX,startY:t.clientY,dx:0,dy:0};
}
function onTouchMove(e){
  e.preventDefault();
  for(let i=0;i<e.changedTouches.length;i++){
    const t=e.changedTouches[i];
    if(t.identifier!==GS.touch.id) continue;
    const rdx=t.clientX-GS.touch.startX,rdy=t.clientY-GS.touch.startY;
    const len=Math.hypot(rdx,rdy)||1;
    if(len<8){GS.touch.dx=0;GS.touch.dy=0;return;}
    const cl=Math.min(len,60);
    GS.touch.dx=(rdx/len)*(cl/60); GS.touch.dy=(rdy/len)*(cl/60);
  }
}
function onTouchEnd(e){
  e.preventDefault();
  for(let i=0;i<e.changedTouches.length;i++){
    if(e.changedTouches[i].identifier===GS.touch.id){
      GS.touch.active=false; GS.touch.dx=0; GS.touch.dy=0;
    }
  }
}
function renderJoystick(ctx,cW,cH){
  if(!GS.touch.active&&GS.touch.dx===0&&GS.touch.dy===0) return;
  const jx=90,jy=cH-90,OR=52,IR=22;
  ctx.save();
  ctx.globalAlpha=0.40; ctx.strokeStyle='#fff'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(jx,jy,OR,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.65; ctx.fillStyle='#ffe600';
  ctx.beginPath(); ctx.arc(jx+GS.touch.dx*OR,jy+GS.touch.dy*OR,IR,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §11  VET AI
═══════════════════════════════════════════════════════════════════ */
const VET_VISION_RANGE=340, VET_VISION_ANGLE=55;

function updateVetAI(){
  const v=GS.vet,p=GS.player;
  const dist=Math.hypot(p.x-v.x,p.y-v.y);
  const toP=Math.atan2(p.y-v.y,p.x-v.x)*180/Math.PI;
  let diff=toP-v.angle*180/Math.PI;
  while(diff>180)diff-=360; while(diff<-180)diff+=360;
  const canSee=!p.isHidden&&dist<VET_VISION_RANGE&&Math.abs(diff)<VET_VISION_ANGLE;
  if(canSee){v.mode='chase';v.lostTimer=0;}
  else if(v.mode==='chase'){
    v.lostTimer++;
    if(v.lostTimer>80){v.mode='patrol';v.patrolTarget=rndP();}
  }
  if(v.mode==='chase'){
    v.angle=Math.atan2(p.y-v.y,p.x-v.x);
    v.x+=Math.cos(v.angle)*v.speed; v.y+=Math.sin(v.angle)*v.speed;
  } else {
    v.patrolTimer--;
    if(!v.patrolTarget||v.patrolTimer<=0){v.patrolTarget=rndP();v.patrolTimer=110+Math.random()*70;}
    const ta=Math.atan2(v.patrolTarget.y-v.y,v.patrolTarget.x-v.x);
    v.angle=ta; v.x+=Math.cos(ta)*v.speed*.55; v.y+=Math.sin(ta)*v.speed*.55;
  }
  v.x=Math.max(40,Math.min(GS.map.width-40,v.x));
  v.y=Math.max(40,Math.min(GS.map.height-40,v.y));
}
function rndP(){return{x:100+Math.random()*(GS.map.width-200),y:100+Math.random()*(GS.map.height-200)};}

/* ═══════════════════════════════════════════════════════════════════
   §12  GAMEPLAY — update + render + loop
═══════════════════════════════════════════════════════════════════ */
function startGameplay(){
  // setupGameMap llama resetGameState internamente
  setupGameMap();
  const hn=document.getElementById('hudCharName');
  if(hn){hn.textContent=GS.char.name;hn.style.color=GS.char.colors.primary;}
  window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp);
  window.addEventListener('keydown',onKeyDown); window.addEventListener('keyup',onKeyUp);
  const canvas=document.getElementById('gameCanvas');
  if(canvas){canvas.width=window.innerWidth;canvas.height=window.innerHeight;initTouchControls(canvas);}
  startInGameMusic();
  GS.gameLoopId=requestAnimationFrame(gameLoop);
}

function onKeyDown(e){
  GS.keys[e.key.toLowerCase()]=true;
  if(e.key==='Escape') togglePause();
}
function onKeyUp(e){GS.keys[e.key.toLowerCase()]=false;}

window.addEventListener('click',      ensureAudio);
window.addEventListener('touchstart', ensureAudio,{once:true});

function togglePause(){
  if(GS.gameResult||GS.explosion.active) return;
  GS.isPaused=!GS.isPaused;
  const btn=document.getElementById('btnPause');
  if(btn) btn.textContent=GS.isPaused?'▶ RESUME':'⏸ PAUSE';
}

function updateGame(nowMs){
  if(GS.isPaused) return;
  if(GS.explosion.active){updateParticles();updateAmbient();return;}
  if(GS.gameResult) return;
  if(!GS.timer.running){GS.timer.running=true;GS.timer.lastMs=nowMs;}
  tickTimer(nowMs);
  if(GS.gameResult) return;

  const p=GS.player;
  const speed=GS.char.speed*(GS.keys['shift']?GS.char.sprintMul:1);
  let dx=0,dy=0;
  if(GS.keys['w']||GS.keys['arrowup'])   dy=-1;
  if(GS.keys['s']||GS.keys['arrowdown']) dy=1;
  if(GS.keys['a']||GS.keys['arrowleft']) dx=-1;
  if(GS.keys['d']||GS.keys['arrowright'])dx=1;
  if(GS.touch.active){dx+=GS.touch.dx;dy+=GS.touch.dy;}
  const mv=Math.hypot(dx,dy); if(mv>1){dx/=mv;dy/=mv;}
  p.x+=dx*speed; p.y+=dy*speed;
  p.x=Math.max(50,Math.min(GS.map.width-50,p.x));
  p.y=Math.max(50,Math.min(GS.map.height-50,p.y));

  let inSpot=false;
  GS.hidingObjects.forEach(o=>{if(p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+o.h)inSpot=true;});
  GS.player.isHidden=inSpot&&(GS.touch.active||GS.keys['e']);

  const dist=Math.hypot(p.x-GS.vet.x,p.y-GS.vet.y);
  GS.proximity=Math.max(0,Math.min(1,1-dist/700));
  updateVetAI(); updateAmbient();

  if(Math.hypot(p.x-GS.goal.x,p.y-GS.goal.y)<GS.goal.radius+10){
    GS.gameResult='WIN'; GS.timer.running=false;
    window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp);
    stopAll(); playWinJingle();
    setTimeout(()=>showResultOverlay(true),300);
  }
  if(dist<45&&!GS.player.isHidden&&!GS.gameResult){
    GS.gameResult='LOSE'; GS.timer.running=false;
    window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp);
    stopAll(); playLoseJingle();
    spawnExplosion(p.x,p.y); spawnExplosion(GS.vet.x,GS.vet.y);
  }
}

function renderGame(){
  const canvas=document.getElementById('gameCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  if(canvas.width!==window.innerWidth)  canvas.width=window.innerWidth;
  if(canvas.height!==window.innerHeight)canvas.height=window.innerHeight;
  const cW=canvas.width,cH=canvas.height;
  let sX=0,sY=0;
  if(GS.explosion.shakeFrames>0){const m=GS.explosion.shakeFrames*.9;sX=(Math.random()-.5)*m;sY=(Math.random()-.5)*m;}
  ctx.fillStyle='#0a0d1a'; ctx.fillRect(0,0,cW,cH);
  if(GS.explosion.active&&GS.explosion.timer<10){
    const fa=(10-GS.explosion.timer)/10*.6;
    ctx.fillStyle=`rgba(255,255,255,${fa})`; ctx.fillRect(0,0,cW,cH);
  }
  ctx.save();
  ctx.translate(cW/2-GS.player.x+sX,cH/2-GS.player.y+sY);
  renderBackground(ctx); renderAmbient(ctx);
  ctx.strokeStyle=GS.char.colors.primary; ctx.lineWidth=5;
  ctx.strokeRect(0,0,GS.map.width,GS.map.height);
  GS.hidingObjects.forEach(o=>renderHidingObject(ctx,o));
  renderExitPortal(ctx);
  if(!GS.player.isHidden){
    ctx.save(); ctx.translate(GS.vet.x,GS.vet.y); ctx.rotate(GS.vet.angle);
    ctx.fillStyle=`rgba(255,45,120,${GS.vet.mode==='chase'?.22:.07})`;
    ctx.beginPath(); ctx.moveTo(0,0);
    const hA=VET_VISION_ANGLE*Math.PI/180;
    ctx.arc(0,0,VET_VISION_RANGE,-hA,hA); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if(!GS.explosion.active||(GS.gameResult!=='LOSE'&&GS.gameResult!=='TIMEOUT')){
    ctx.save(); ctx.translate(GS.player.x,GS.player.y);
    if(GS.player.isHidden) ctx.globalAlpha=0.3;
    const pImg=GS.images[GS.char.id];
    if(pImg&&pImg.complete&&pImg.naturalWidth!==0){ctx.drawImage(pImg,-30,-30,60,60);}
    else{ctx.fillStyle=GS.char.colors.primary;ctx.fillRect(-25,-25,50,50);}
    ctx.restore();
  }
  if(!GS.explosion.active||(GS.gameResult!=='LOSE'&&GS.gameResult!=='TIMEOUT')){
    ctx.save(); ctx.translate(GS.vet.x,GS.vet.y);
    const vImg=GS.images['vet'];
    if(vImg&&vImg.complete&&vImg.naturalWidth!==0){ctx.drawImage(vImg,-30,-40,60,80);}
    else{ctx.fillStyle='#ff2d78';ctx.fillRect(-25,-25,50,50);}
    ctx.restore();
  }
  if(GS.particles.length>0) renderParticles(ctx);
  ctx.restore();
  renderJoystick(ctx,cW,cH);
  if(GS.vet.mode==='chase'&&!GS.player.isHidden&&!GS.gameResult){
    ctx.save();
    const fa=0.45+0.45*Math.sin(Date.now()/100);
    ctx.strokeStyle=`rgba(255,45,120,${fa})`; ctx.lineWidth=8;
    ctx.strokeRect(4,4,cW-8,cH-8);
    ctx.fillStyle=`rgba(255,45,120,${fa*.06})`; ctx.fillRect(0,0,cW,cH);
    ctx.fillStyle=`rgba(255,45,120,${fa})`;
    ctx.font=`bold ${Math.max(12,cW*.022)}px 'Press Start 2P',monospace`;
    ctx.textAlign='center';
    ctx.fillText('⚠ SHE SEES YOU ⚠',cW/2,cH*.065);
    ctx.restore();
  }
  renderTimerHUD(ctx,cW);
  document.getElementById('hudProxFill').style.width=(GS.proximity*100)+'%';
  document.getElementById('hudStatus').textContent=
    GS.player.isHidden?'🙈 HIDING!':GS.vet.mode==='chase'?'⚠ RUN!':'EVADING...';
}

function gameLoop(nowMs){
  updateGame(nowMs); renderGame();
  if(GS.screen==='game') GS.gameLoopId=requestAnimationFrame(gameLoop);
}

/* ═══════════════════════════════════════════════════════════════════
   §13  OVERLAY DE RESULTADO
   RETRY → resetGameState(false) preserva char → changeScreen('game')
   MENU  → resetGameState(true)  limpia char  → changeScreen('mainmenu')
═══════════════════════════════════════════════════════════════════ */
function showResultOverlay(won){
  // Eliminar overlay previo
  const old=document.getElementById('resultOverlay'); if(old) old.remove();

  const c=GS.char;
  const isTO=GS.gameResult==='TIMEOUT';
  const color=won?(c?.colors.primary||'#00f5ff'):'#ff2d78';
  const emoji=won?'🎉':'😿';
  const title=won?'YOU ESCAPED!':(isTO?'TIME IS UP!':'THE VET GOT YOU!');
  const sub=won
    ?`${c?.name} earned ${c?.reward}! (${GS.timer.seconds}s left)`
    :`${c?.name||'Your pet'} ${isTO?'ran out of time':'was caught'}!`;

  const ov=document.createElement('div'); ov.id='resultOverlay';
  Object.assign(ov.style,{
    position:'fixed',inset:'0',zIndex:'9999',
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    background:'rgba(4,6,14,0.93)',fontFamily:"'Press Start 2P',monospace",
    textAlign:'center',padding:'2rem',boxSizing:'border-box'
  });

  const mk=(tag,st,tx)=>{const e=document.createElement(tag);Object.assign(e.style,st);if(tx)e.textContent=tx;return e;};
  const mkBtn=(lab,ac,cb)=>{
    const b=mk('button',{fontFamily:"'Press Start 2P',monospace",
      fontSize:'clamp(0.4rem,1.3vw,0.65rem)',cursor:'pointer',padding:'0.8em 1.8em',
      border:`3px solid ${ac}`,background:'transparent',color:ac,
      letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 8px'},lab);
    b.addEventListener('mouseover',()=>{b.style.background=`${ac}22`;});
    b.addEventListener('mouseout', ()=>{b.style.background='transparent';});
    b.addEventListener('click',cb); return b;
  };

  ov.appendChild(mk('div',{fontSize:'clamp(2.5rem,8vw,5rem)',marginBottom:'1rem'},emoji));
  ov.appendChild(mk('div',{
    fontSize:'clamp(0.9rem,3vw,2rem)',color,marginBottom:'0.8rem',
    textShadow:`0 0 14px ${color},3px 3px 0 rgba(0,0,0,0.8)`,letterSpacing:'0.12em'
  },title));
  ov.appendChild(mk('div',{
    fontSize:'clamp(0.35rem,1.2vw,0.75rem)',color:'#e0e0cc',
    lineHeight:'2',marginBottom:'2rem',letterSpacing:'0.06em'
  },sub));

  const row=mk('div',{display:'flex',justifyContent:'center',flexWrap:'wrap'});

  // ── RETRY: resetea estado del juego (conserva GS.char) y relanza ──
  row.appendChild(mkBtn('↩ RETRY', color, () => {
    ov.remove();
    // Cancelar RAF activo explícitamente antes de resetear
    if (GS.gameLoopId) { cancelAnimationFrame(GS.gameLoopId); GS.gameLoopId = null; }
    ensureAudio();
    // resetGameState(false) preserva GS.char para no repetir selección
    resetGameState(false);
    changeScreen('game');
  }));

  // ── MENU: limpia TODO incluido GS.char y va al menú principal ──
  row.appendChild(mkBtn('⌂ MENU', '#6a7a9a', () => {
    ov.remove();
    if (GS.gameLoopId) { cancelAnimationFrame(GS.gameLoopId); GS.gameLoopId = null; }
    // resetGameState(true) limpia GS.char → el usuario selecciona de nuevo
    resetGameState(true);
    changeScreen('mainmenu');
  }));

  ov.appendChild(row);

  const gs=document.getElementById('screen-game');
  if(gs){gs.style.position='relative';gs.appendChild(ov);}
  else document.body.appendChild(ov);
}

/* ═══════════════════════════════════════════════════════════════════
   §14  BOTONES
═══════════════════════════════════════════════════════════════════ */
function bindButtons(){
  const $=id=>document.getElementById(id);
  $('btnStartGame') ?.addEventListener('click',()=>{ensureAudio();changeScreen('charselect');});
  $('btnHowTo')     ?.addEventListener('click',()=>{ensureAudio();changeScreen('howtoplay');});
  $('btnHowToBack') ?.addEventListener('click',()=>changeScreen('mainmenu'));
  $('btnCSBack')    ?.addEventListener('click',()=>changeScreen('mainmenu'));
  $('btnConfirmYes')?.addEventListener('click',()=>changeScreen('game'));
  $('btnConfirmNo') ?.addEventListener('click',()=>changeScreen('charselect'));
  $('btnPause')     ?.addEventListener('click',()=>togglePause());
}

/* ═══════════════════════════════════════════════════════════════════
   §15  INIT
═══════════════════════════════════════════════════════════════════ */
async function init(){
  bindButtons(); bindCharCards();
  setLoadBar(0); await preloadImages();
  window.addEventListener('resize',()=>{
    const c=document.getElementById('gameCanvas');
    if(c&&GS.screen==='game'){c.width=window.innerWidth;c.height=window.innerHeight;}
  });
  setTimeout(()=>changeScreen('mainmenu'),100);
}
window.addEventListener('DOMContentLoaded',init);
