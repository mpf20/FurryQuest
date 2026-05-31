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
   §2  ESTADO GLOBAL
═══════════════════════════════════════════════════════════════════ */
const GS = {
  screen:       'loading',
  char:         null,
  images:       {},
  audioCtx:     null,
  bgmNode:      null,         
  csNodes:      [],           
  igMusicNodes: [],           
  isPaused:     false,
  gameLoopId:   null,
  keys:         {},
  player:       { x: 150, y: 150, vx: 0, vy: 0, isSprinting: false, isHidden: false },
  vet:          { x: 1100, y: 800, angle: 0, speed: 2.4, mode: 'patrol', patrolTarget: { x:800, y:600 }, patrolTimer: 0, lostTimer: 0 },
  map:          { width: 1600, height: 1200 },
  hidingObjects:[],
  goal:         { x: 1430, y: 80, radius: 52 },
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
   §3  AUDIO ENGINE (Web Audio API) — Overlap Protection total
═══════════════════════════════════════════════════════════════════ */
function ensureAudio() {
  try {
    if (!GS.audioCtx) GS.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if (GS.audioCtx.state==='suspended') GS.audioCtx.resume();
  } catch(e){}
}

function stopAll() {
  if (GS.bgmNode) { try{GS.bgmNode.stop();}catch(e){} GS.bgmNode = null; }
  [...GS.csNodes, ...GS.igMusicNodes].forEach(n => { try{n.stop();}catch(e){} try{n.disconnect();}catch(e){} });
  GS.csNodes = [];
  GS.igMusicNodes = [];
}
function stopBGM()     { stopAll(); }
function stopIgMusic() { stopAll(); }

function startMenuBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain(); master.gain.setValueAtTime(0.06, ctx.currentTime); master.connect(ctx.destination);
    const pad1 = ctx.createOscillator(); pad1.type = 'sine'; pad1.frequency.value = 146.83;
    const pad2 = ctx.createOscillator(); pad2.type = 'triangle'; pad2.frequency.value = 220.00;
    const mel = ctx.createOscillator(), mGain = ctx.createGain();
    mel.type = 'triangle'; mGain.gain.setValueAtTime(0.35, ctx.currentTime);
    const NOTES = [196,220,261.63,293.66,329.63,293.66,261.63,220];
    const now = ctx.currentTime;
    for (let i=0;i<96;i++) mel.frequency.setValueAtTime(NOTES[i%NOTES.length], now+i*0.5);
    const gPad = ctx.createGain(); gPad.gain.setValueAtTime(0.28, ctx.currentTime);
    pad1.connect(gPad); pad2.connect(gPad); gPad.connect(master);
    mel.connect(mGain); mGain.connect(master);
    pad1.start(); pad2.start(); mel.start();
    GS.bgmNode = pad1;
    GS.csNodes = [pad2, mel, gPad, mGain, master];
  } catch(e){}
}

function startCharSelectBGM() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master = ctx.createGain(); master.gain.setValueAtTime(0.09, ctx.currentTime); master.connect(ctx.destination);
    GS.csNodes.push(master);
    const ARP = [261.63,329.63,392,523.25,659.25,523.25,392,329.63];
    const arp = ctx.createOscillator(), aGain = ctx.createGain();
    arp.type='square'; aGain.gain.setValueAtTime(0.28, ctx.currentTime);
    const now=ctx.currentTime, aDur=0.12;
    for(let i=0;i<120;i++) arp.frequency.setValueAtTime(ARP[i%ARP.length], now+i*aDur);
    arp.connect(aGain); aGain.connect(master); arp.start(now);
    GS.csNodes.push(arp,aGain);
    const bass1=ctx.createOscillator(), bass2=ctx.createOscillator(), bGain=ctx.createGain();
    bass1.type='sawtooth'; bass1.frequency.value=65.41;
    bass2.type='sawtooth'; bass2.frequency.value=98.00;
    bGain.gain.setValueAtTime(0.22,ctx.currentTime);
    bass1.connect(bGain); bass2.connect(bGain); bGain.connect(master);
    bass1.start(now); bass2.start(now);
    GS.csNodes.push(bass1,bass2,bGain);
    const BEAT=60/160;
    for(let i=0;i<120;i++){
      const ht=now+i*BEAT*0.5;
      const hbuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.02),ctx.sampleRate);
      const hd=hbuf.getChannelData(0);
      for(let s=0;s<hd.length;s++) hd[s]=(Math.random()*2-1)*Math.pow(1-s/hd.length,1.5);
      const hs=ctx.createBufferSource(), hg=ctx.createGain();
      hs.buffer=hbuf; hg.gain.setValueAtTime(0.05,ht); hs.connect(hg); hg.connect(master); hs.start(ht);
      GS.csNodes.push(hs,hg);
    }
    GS.bgmNode = arp;
  } catch(e){}
}

function startInGameMusic() {
  ensureAudio(); stopAll();
  if (!GS.audioCtx) return;
  const ctx = GS.audioCtx;
  try {
    const master=ctx.createGain(); master.gain.setValueAtTime(0.10,ctx.currentTime); master.connect(ctx.destination);
    GS.igMusicNodes.push(master);
    const H1=[293.66,311.13,369.99,392.00,440.00,466.16,554.37,587.33];
    const H2=H1.map(f=>f*2), H0=H1.map(f=>f/2);
    const MOT=[0,2,3,2,1,0,4,3,2,3,5,4,3,2,1,0,6,5,4,3,2,1,0,7];
    const DUR=[.12,.08,.11,.08,.12,.16,.11,.08,.12,.11,.16,.11,.08,.12,.08,.16,.11,.08,.12,.11,.12,.08,.12,.20];
    function schedMel(freqs,startT,gv,wave){
      const o=ctx.createOscillator(),g=ctx.createGain(); o.type=wave||'sawtooth'; g.gain.setValueAtTime(gv,startT);
      let t=startT;
      for(let rep=0;rep<28;rep++){ MOT.forEach((si,i)=>{ o.frequency.setValueAtTime(freqs[si],t); t+=DUR[i]||0.11; }); }
      o.connect(g); g.connect(master); o.start(startT); GS.igMusicNodes.push(o,g);
    }
    const now=ctx.currentTime;
    schedMel(H1,now,0.40,'sawtooth'); schedMel(H2,now+0.05,0.18,'triangle'); schedMel(H0,now,0.20,'sawtooth');
    const B=60/145;
    for(let i=0;i<160;i++){
      const bt=now+i*B;
      if(i%4===0||i%4===2){
        const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(220,bt); o.frequency.exponentialRampToValueAtTime(48,bt+0.10);
        g.gain.setValueAtTime(0.48,bt); g.gain.exponentialRampToValueAtTime(0.001,bt+0.14); o.connect(g); g.connect(master); o.start(bt); o.stop(bt+0.16); GS.igMusicNodes.push(o,g);
      }
      if(i%4===1){
        const o=ctx.createOscillator(),g=ctx.createGain(); o.type='triangle'; o.frequency.setValueAtTime(1100,bt); o.frequency.exponentialRampToValueAtTime(550,bt+0.04);
        g.gain.setValueAtTime(0.24,bt); g.gain.exponentialRampToValueAtTime(0.001,bt+0.06); o.connect(g); g.connect(master); o.start(bt); o.stop(bt+0.07); GS.igMusicNodes.push(o,g);
      }
    }
    const drone=ctx.createOscillator(), dg=ctx.createGain();
    drone.type='sawtooth'; drone.frequency.value=69.30; dg.gain.setValueAtTime(0.07,now);
    drone.connect(dg); dg.connect(master); drone.start(now); GS.igMusicNodes.push(drone,dg);
    GS.bgmNode = drone;
  } catch(e){}
}

function playSynthSFX(type) {
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  try{
    const o=ctx.createOscillator(),g=ctx.createGain();
    if(type==='bark'){
      o.type='sawtooth'; o.frequency.setValueAtTime(180,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+0.15); g.gain.setValueAtTime(0.15,ctx.currentTime);
    } else {
      o.type='triangle'; o.frequency.setValueAtTime(400,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(700,ctx.currentTime+0.2); g.gain.setValueAtTime(0.12,ctx.currentTime);
    }
    g.gain.linearRampToValueAtTime(0.01,ctx.currentTime+0.2); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.25);
  } catch(e){}
}

function playWinJingle(){
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(); const t=ctx.currentTime+i*0.22;
    o.type='square'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.10,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.3);
  });
}

function playLoseJingle(){
  ensureAudio(); if(!GS.audioCtx) return;
  const ctx=GS.audioCtx;
  [440,392,349.23,261.63].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(); const t=ctx.currentTime+i*0.28;
    o.type='sawtooth'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.34);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.36);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §4  ROUTER
═══════════════════════════════════════════════════════════════════ */
function changeScreen(screenId) {
  if (GS.gameLoopId) { cancelAnimationFrame(GS.gameLoopId); GS.gameLoopId = null; }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const target=document.getElementById(`screen-${screenId}`);
  if(target) target.classList.add('active');
  GS.screen=screenId;

  if      (screenId==='mainmenu')   { stopAll(); startMenuBGM(); }
  else if (screenId==='charselect') { stopAll(); startCharSelectBGM(); }
  else if (screenId==='game')       { stopAll(); setupGameMap(); startInGameMusic(); GS.timer.running=true; GS.timer.lastMs=performance.now(); GS.gameLoopId=requestAnimationFrame(gameLoop); }
}

/* ═══════════════════════════════════════════════════════════════════
   §5  SELECCIÓN DE PERSONAJE
═══════════════════════════════════════════════════════════════════ */
function selectCharacter(charId) {
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

function bindCharCards() {
  document.querySelectorAll('.quad').forEach(card=>{
    const id=card.getAttribute('data-char');
    card.addEventListener('click',()=>{ ensureAudio(); selectCharacter(id); });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   §6  SETUP DEL MAPA
═══════════════════════════════════════════════════════════════════ */
function setupGameMap() {
  GS.player.x=150; GS.player.y=150; GS.player.isHidden=false;
  GS.vet.x=1100; GS.vet.y=800; GS.vet.mode='patrol';
  GS.vet.patrolTarget={x:800,y:600}; GS.vet.patrolTimer=0; GS.vet.lostTimer=0;
  GS.hidingObjects=[]; GS.gameResult=null; GS.isPaused=false;
  GS.particles=[]; GS.ambient=[];
  GS.explosion={active:false,timer:0,duration:100,shakeFrames:0};
  GS.timer={seconds:20,msAcc:0,lastMs:performance.now(),running:true};
  GS.goal={x:1430,y:80,radius:52};

  const id=GS.char?GS.char.id:'molly';

  if(id==='molly'){
    GS.hidingObjects=[
      {x:190,y:170,w:280,h:145,label:'BED',      color:'#8a5cf6',type:'bed'     },
      {x:670,y:405,w:320,h:125,label:'SOFA',     color:'#7c4dff',type:'couch'   },
      {x:1080,y:175,w:155,h:215,label:'CABINET',color:'#5e35b1',type:'cabinet' },
      {x:375,y:675,w:215,h:135,label:'BED 2',   color:'#8a5cf6',type:'bed'     },
      {x:875,y:835,w:280,h:125,label:'SOFA 2',  color:'#7c4dff',type:'couch'   },
      {x:190,y:875,w:155,h:195,label:'WARDROBE',color:'#5e35b1',type:'cabinet' },
    ];
  } else if(id==='agata'){
    GS.hidingObjects=[
      {x:265,y:185,w:100,h:280,label:'TRUNK',  color:'#5d4037',type:'trunk'},
      {x:600,y:365,w:240,h:115,label:'BUSH',   color:'#2e7d32',type:'bush' },
      {x:965,y:185,w:110,h:295,label:'TRUNK',  color:'#5d4037',type:'trunk'},
      {x:385,y:685,w:255,h:125,label:'BUSH',   color:'#388e3c',type:'bush' },
      {x:1135,y:585,w:95,h:275,label:'TRUNK',  color:'#4e342e',type:'trunk'},
      {x:685,y:835,w:215,h:115,label:'BUSH',   color:'#2e7d32',type:'bush' },
    ];
  } else if(id==='martin'){
    GS.hidingObjects=[
      {x:235,y:185,w:320,h:95, label:'WALL',  color:'#795548',type:'wall'  },
      {x:735,y:305,w:80, h:240,label:'COLUMN',color:'#8d6e63',type:'column'},
      {x:935,y:165,w:80, h:240,label:'COLUMN',color:'#8d6e63',type:'column'},
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
   §7  RENDER PIPELINE
═══════════════════════════════════════════════════════════════════ */
function seedAmbient(id) {
  GS.ambient = [];
  const W=GS.map.width, H=GS.map.height;
  if(id==='agata'){
    for(let i=0;i<40;i++) GS.ambient.push({
      x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.4, vy:-.2-Math.random()*.4,
      size:2+Math.random()*3, alpha:0.4+Math.random()*0.5, type:'spore'
    });
  } else if(id==='michi'){
    for(let i=0;i<35;i++) GS.ambient.push({
      x:Math.random()*W, y:H-20+Math.random()*80, vx:(Math.random()-.5)*.5, vy:-0.5-Math.random()*0.8,
      size:4+Math.random()*8, alpha:0.35+Math.random()*0.3, type:'bubble'
    });
  }
}

function updateAmbient() {
  const W=GS.map.width, H=GS.map.height;
  GS.ambient.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.y<-20) p.y=H+10;
    if(p.x<0) p.x=W; if(p.x>W) p.x=0;
  });
}

function renderAmbient(ctx) {
  GS.ambient.forEach(p=>{
    ctx.save(); ctx.globalAlpha=p.alpha;
    if(p.type==='spore'){
      ctx.fillStyle='#86efac'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    } else {
      ctx.strokeStyle='rgba(100,220,255,0.7)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(180,240,255,0.15)'; ctx.fill();
    }
    ctx.restore();
  });
}

function renderBackground(ctx) {
  const id=GS.char?GS.char.id:'molly';
  const W=GS.map.width, H=GS.map.height;

  if(id==='molly'){
    ctx.fillStyle='#4a2f1a'; ctx.fillRect(0,0,W,H);
    const PLANK=70;
    for(let row=0;row<Math.ceil(H/PLANK);row++){
      ctx.fillStyle=(row%2===0)?'#5d3a1a':'#6b4423'; ctx.fillRect(0,row*PLANK,W,PLANK);
      ctx.fillStyle='rgba(40,18,8,0.25)'; ctx.fillRect(0,row*PLANK,W,3);
    }
    ctx.fillStyle='#e8d5c4'; ctx.fillRect(0,0,W,45); ctx.fillRect(0,H-45,W,45); ctx.fillRect(0,0,45,H); ctx.fillRect(W-45,0,45,H);
    ctx.fillStyle='#4a148c'; ctx.fillRect(280,320,760,440);
  } else if(id==='agata'){
    ctx.fillStyle='#064e3b'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#022c22'; ctx.fillRect(0,0,W,40); ctx.fillRect(0,H-40,W,40); ctx.fillRect(0,0,40,H); ctx.fillRect(W-40,0,40,H);
  } else if(id==='martin'){
    const grad=ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,'#fef9c3'); grad.addColorStop(1,'#ca8a04');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#92400e'; ctx.fillRect(0,0,W,40); ctx.fillRect(0,H-40,W,40); ctx.fillRect(0,0,40,H); ctx.fillRect(W-40,0,40,H);
  } else {
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(6,182,212,0.22)'; ctx.lineWidth=1.5;
    for(let r=0;r<=H;r+=72){ ctx.beginPath(); ctx.moveTo(0,r); ctx.lineTo(W,r); ctx.stroke(); }
    for(let c=0;c<=W;c+=72){ ctx.beginPath(); ctx.moveTo(c,0); ctx.lineTo(c,H); ctx.stroke(); }
  }
}

function renderHidingObject(ctx, obj) {
  const {x,y,w,h,color,type}=obj;
  ctx.save();
  if(type==='bed'){
    ctx.fillStyle='#6d4c41'; ctx.fillRect(x,y+h*0.72,w,h*0.28);
    ctx.fillStyle='#7c4dff'; ctx.fillRect(x+8,y,w-16,h*0.72);
    ctx.fillStyle='#fff'; ctx.fillRect(x+12,y+10,w*0.3,h*0.2);
  } else if(type==='couch'){
    ctx.fillStyle='#5e35b1'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#4527a0'; ctx.fillRect(x,y,w,h*0.35);
  } else if(type==='bush'){
    ctx.fillStyle='#1e5e2a'; ctx.beginPath(); ctx.roundRect(x,y,w,h,15); ctx.fill();
  } else {
    ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
  }
  ctx.restore();
}

function drawExitPortal(ctx) {
  const g = GS.goal;
  ctx.save();
  let grad = ctx.createRadialGradient(g.x, g.y, 5, g.x, g.y, g.radius);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#00e86a'); grad.addColorStop(1, 'rgba(0,232,106,0)');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   §8  KABOOM SYSTEM
═══════════════════════════════════════════════════════════════════ */
function triggerKaboom(px, py) {
  GS.explosion.active = true;
  GS.explosion.timer = GS.explosion.duration;
  GS.explosion.shakeFrames = 22;
  GS.particles = [];
  for(let i=0;i<150;i++){
    GS.particles.push({
      x: px, y: py,
      vx: (Math.random()-0.5)*14, vy: (Math.random()-0.5)*14,
      size: 2+Math.random()*5, alpha: 1,
      color: ['#ff3b30','#ff9500','#ffcc00','#ffffff'][Math.floor(Math.random()*4)]
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   §9  GAME LOOP & LOGIC
═══════════════════════════════════════════════════════════════════ */
function updateGame() {
  if (GS.screen !== 'game' || GS.isPaused) return;

  if (GS.timer.running && !GS.explosion.active) {
    const now = performance.now();
    let diff = (now - GS.timer.lastMs) / 1000;
    GS.timer.lastMs = now;
    GS.timer.seconds -= diff;
    if(GS.timer.seconds <= 0) {
      GS.timer.seconds = 0; GS.timer.running = false; GS.gameResult = 'lose';
      playLoseJingle(); triggerKaboom(GS.player.x, GS.player.y);
    }
  }

  if (GS.explosion.active) {
    GS.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.015; });
    GS.explosion.timer--;
    if (GS.explosion.shakeFrames > 0) GS.explosion.shakeFrames--;
    if (GS.explosion.timer <= 0) { GS.explosion.active = false; showEndGameScreen(); }
    return;
  }

  // Movimiento e Inputs del jugador (Soporte diagonal e integral)
  let baseSpeed = GS.char ? GS.char.speed : 4.2;
  let moveX = 0, moveY = 0;
  if (GS.keys['ArrowUp'] || GS.keys['w']) moveY -= 1;
  if (GS.keys['ArrowDown'] || GS.keys['s']) moveY += 1;
  if (GS.keys['ArrowLeft'] || GS.keys['a']) moveX -= 1;
  if (GS.keys['ArrowRight'] || GS.keys['d']) moveX += 1;

  // Normalizar vector diagonal
  if (moveX !== 0 && moveY !== 0) { moveX *= 0.7071; moveY *= 0.7071; }
  
  GS.player.x += moveX * baseSpeed;
  GS.player.y += moveY * baseSpeed;

  // Colisiones estructurales contra los bordes del mapa
  if (GS.player.x < 55) GS.player.x = 55;
  if (GS.player.x > GS.map.width - 55) GS.player.x = GS.map.width - 55;
  if (GS.player.y < 55) GS.player.y = 55;
  if (GS.player.y > GS.map.height - 55) GS.player.y = GS.map.height - 55;

  // Detección exacta de Escondites
  let hide = false;
  for(let obj of GS.hidingObjects){
    if(GS.player.x > obj.x && GS.player.x < obj.x + obj.w && GS.player.y > obj.y && GS.player.y < obj.y + obj.h){
      hide = true; break;
    }
  }
  GS.player.isHidden = hide;

  // Inteligencia Artificial de la Veterinaria
  if (!GS.player.isHidden) {
    let dx = GS.player.x - GS.vet.x, dy = GS.player.y - GS.vet.y;
    let angle = Math.atan2(dy, dx);
    GS.vet.x += Math.cos(angle) * GS.vet.speed;
    GS.vet.y += Math.sin(angle) * GS.vet.speed;
  } else {
    // Si está oculto, camina lento hacia su último punto de patrulla conocido
    let dx = GS.vet.patrolTarget.x - GS.vet.x, dy = GS.vet.patrolTarget.y - GS.vet.y;
    if(Math.hypot(dx,dy) < 15) {
      GS.vet.patrolTarget = { x: 200 + Math.random()*1200, y: 200 + Math.random()*800 };
    } else {
      let angle = Math.atan2(dy, dx);
      GS.vet.x += Math.cos(angle) * (GS.vet.speed * 0.5);
      GS.vet.y += Math.sin(angle) * (GS.vet.speed * 0.5);
    }
  }

  // Colisiones críticas e hitboxes
  let distVet = Math.hypot(GS.player.x - GS.vet.x, GS.player.y - GS.vet.y);
  if (distVet < 42 && !GS.explosion.active) {
    GS.gameResult = 'lose'; GS.timer.running = false;
    playLoseJingle(); triggerKaboom(GS.player.x, GS.player.y);
  }

  let distGoal = Math.hypot(GS.player.x - GS.goal.x, GS.player.y - GS.goal.y);
  if (distGoal < GS.goal.radius) {
    GS.gameResult = 'win'; GS.timer.running = false;
    playWinJingle(); showEndGameScreen();
  }

  GS.proximity = Math.max(0, Math.min(1.0, (550 - distVet)/550));
  updateAmbient();
}

function renderGame() {
  const canvas = document.getElementById('gameCanvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (GS.explosion.active && GS.explosion.shakeFrames > 0) {
    ctx.translate((Math.random()-0.5)*16, (Math.random()-0.5)*16);
  }

  let camX = GS.player.x - canvas.width / 2;
  let camY = GS.player.y - canvas.height / 2;
  camX = Math.max(0, Math.min(GS.map.width - canvas.width, camX));
  camY = Math.max(0, Math.min(GS.map.height - canvas.height, camY));
  ctx.translate(-camX, -camY);

  renderBackground(ctx);
  GS.hidingObjects.forEach(obj => renderHidingObject(ctx, obj));
  drawExitPortal(ctx);
  renderAmbient(ctx);

  if (!GS.explosion.active) {
    // Dibujar Veterinaria
    if(GS.images.vet) ctx.drawImage(GS.images.vet, GS.vet.x - 32, GS.vet.y - 32, 64, 64);
    // Dibujar Personaje
    let pKey = GS.char ? GS.char.id : 'molly';
    if(GS.images[pKey]) {
      ctx.save();
      if(GS.player.isHidden) ctx.globalAlpha = 0.35;
      ctx.drawImage(GS.images[pKey], GS.player.x - 26, GS.player.y - 26, 52, 52);
      ctx.restore();
    }
  } else {
    GS.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size); ctx.restore();
    });
  }
  ctx.restore();

  // Actualizaciones de Interfaz HUD HTML
  const fill = document.getElementById('hudProxFill'); if(fill) fill.style.width = (GS.proximity * 100) + '%';
  const status = document.getElementById('hudStatus'); if(status) status.textContent = GS.player.isHidden ? 'ESCONDIDO' : 'EVADIENDO...';
  const clk = document.getElementById('hudTimer');
  if(clk) {
    clk.textContent = GS.timer.seconds.toFixed(2);
    clk.style.color = GS.timer.seconds <= 5 ? '#ff3b30' : '#00e86a';
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
  stopAll();
  if (GS.gameResult === 'win') {
    alert("✨ ¡VICTORIA! Lograste evadir a la veterinaria y estás a salvo. ✨");
  } else {
    alert("💥 ¡KABOOM! La veterinaria te atrapó.");
  }
  changeScreen('charselect');
}

/* ═══════════════════════════════════════════════════════════════════
   §10  EVENTS & INITIALIZATION
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
