/**
 * Furry Escapades: Outsmart the Vet
 * Código fuente corregido (Problema de pantalla de carga solucionado)
 */

const canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
if (!canvas.id) {
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 500;
    document.body.appendChild(canvas);
}
const ctx = canvas.getContext('2d');

// --- ESTADO GLOBAL DEL JUEGO ---
const gameState = {
    screen: 'loading', // loading, menu, character_select, playing, game_over
    progress: 0,
    selectedHero: null,
    score: 0,
    paused: false,
    vetProximity: 0,
    vetStatus: 'EVADIENDO...',
    explosionActive: false,
    explosionTimer: 0,
    explosionParticles: []
};

// --- CONFIGURACIÓN DE HÉROES ---
const heroes = {
    molly: {
        id: 'molly',
        name: 'MOLLY',
        title: 'DOG WARRIOR',
        mission: 'Stash clothes & dodge the Vet!',
        ambient: 'THE HOUSE (Shiba-Den)',
        reward: 'BONE',
        colors: { primary: '#a855f7', secondary: '#3b0764', bg: '#1e1b4b' }
    },
    agata: {
        id: 'agata',
        name: 'AGATA',
        title: 'FOREST MAGE',
        mission: 'Flee the Vet\'s nail clippers!',
        ambient: 'THE FOREST',
        reward: 'FISH',
        colors: { primary: '#22c55e', secondary: '#052e16', bg: '#022c22' }
    },
    martin: {
        id: 'martin',
        name: 'MARTIN',
        title: 'DESERT KNIGHT',
        mission: 'Reach the well. Thirst is rising!',
        ambient: 'THE DESERT (Ruins)',
        reward: 'FISH',
        colors: { primary: '#eab308', secondary: '#451a03', bg: '#431407' }
    },
    michi: {
        id: 'michi',
        name: 'MICHI',
        title: 'ROGUE ALCHEMIST',
        mission: 'Avoid soap, towel & wet doom!',
        ambient: 'THE BATHROOM (Lab)',
        reward: 'FISH',
        colors: { primary: '#06b6d4', secondary: '#083344', bg: '#0f172a' }
    }
};

// --- ENTIDADES ---
const player = { x: 400, y: 300, size: 20, speed: 4, dx: 0, dy: 0 };
const vet = { x: 100, y: 100, size: 22, speed: 1.5, angle: 0, visionAngle: Math.PI / 4, visionRange: 150 };

// --- SIMULACIÓN DE CARGA CORREGIDA ---
function updateLoading() {
    if (gameState.screen !== 'loading') return;
    
    // Incrementa el progreso de forma controlada por frames
    if (gameState.progress < 100) {
        gameState.progress += 1; 
    } else {
        gameState.screen = 'menu'; // Pasa automáticamente al menú al llegar a 100
    }
}

function triggerExplosion(x, y) {
    gameState.explosionActive = true;
    gameState.explosionTimer = 30;
    gameState.explosionParticles = [];
    const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff'];
    for (let i = 0; i < 40; i++) {
        gameState.explosionParticles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

// --- ESCENARIOS (RENDER DINÁMICO) ---
function drawMollyAmbient() {
    ctx.fillStyle = '#3e2723'; ctx.fillRect(50, 80, 700, 380);
    ctx.strokeStyle = '#271510'; ctx.lineWidth = 2;
    for (let i = 80; i < 460; i += 30) {
        ctx.beginPath(); ctx.moveTo(50, i); ctx.lineTo(750, i); ctx.stroke();
    }
    ctx.fillStyle = '#512da8'; ctx.fillRect(80, 100, 140, 90);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px monospace'; ctx.fillText("[BED HIDEOUT]", 90, 150);
}

function drawAgataAmbient() {
    ctx.fillStyle = '#064e3b'; ctx.fillRect(50, 80, 700, 380);
    ctx.fillStyle = '#78350f'; ctx.fillRect(80, 80, 60, 140);
    ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(110, 80, 60, 0, Math.PI*2); ctx.fill();
}

function drawMartinAmbient() {
    ctx.fillStyle = '#fef08a'; ctx.fillRect(50, 80, 700, 380);
    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(390, 150, 35, 0, Math.PI*2); ctx.fill();
}

function drawMichiAmbient() {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(50, 80, 700, 380);
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(70, 100, 120, 150);
}

function drawCurrentAmbient() {
    if (!gameState.selectedHero) return;
    if (gameState.selectedHero.id === 'molly') drawMollyAmbient();
    if (gameState.selectedHero.id === 'agata') drawAgataAmbient();
    if (gameState.selectedHero.id === 'martin') drawMartinAmbient();
    if (gameState.selectedHero.id === 'michi') drawMichiAmbient();
}

function drawHUD() {
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = gameState.selectedHero ? gameState.selectedHero.colors.primary : '#ffffff';
    ctx.lineWidth = 2; ctx.fillRect(520, 20, 260, 50); ctx.strokeRect(520, 20, 260, 50);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px monospace';
    ctx.fillText(gameState.selectedHero ? gameState.selectedHero.name : 'HERO', 530, 38);
}

function drawPlayer() {
    if (gameState.explosionActive) {
        gameState.explosionParticles.forEach(p => {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        });
        return;
    }
    ctx.fillStyle = '#f97316'; ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
}

function drawVet() {
    if (gameState.explosionActive) return;
    ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
    ctx.beginPath(); ctx.moveTo(vet.x, vet.y);
    ctx.arc(vet.x, vet.y, vet.visionRange, vet.angle - vet.visionAngle, vet.angle + vet.visionAngle);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(vet.x - 12, vet.y - 10, 24, 30);
}

function updatePhysics() {
    if (gameState.screen !== 'playing') return;
    if (gameState.explosionActive) {
        gameState.explosionParticles.forEach(p => { p.x += p.vx; p.y += p.vy; });
        gameState.explosionTimer--;
        if (gameState.explosionTimer <= 0) { gameState.explosionActive = false; gameState.screen = 'game_over'; }
        return;
    }
    player.x += player.dx; player.y += player.dy;
    
    let targetAngle = Math.atan2(player.y - vet.y, player.x - vet.x);
    vet.angle = targetAngle;
    vet.x += Math.cos(vet.angle) * vet.speed; vet.y += Math.sin(vet.angle) * vet.speed;
    
    let distance = Math.hypot(player.x - vet.x, player.y - vet.y);
    if (distance < (player.size + vet.size)) triggerExplosion(player.x, player.y);
}

// --- EVENTOS / CONTROLES ---
window.addEventListener('keydown', e => {
    if (gameState.screen === 'playing' && !gameState.explosionActive) {
        if (e.key === 'ArrowUp' || e.key === 'w') player.dy = -player.speed;
        if (e.key === 'ArrowDown' || e.key === 's') player.dy = player.speed;
        if (e.key === 'ArrowLeft' || e.key === 'a') player.dx = -player.speed;
        if (e.key === 'ArrowRight' || e.key === 'd') player.dx = player.speed;
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'ArrowDown' || e.key === 's') player.dy = 0;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') player.dx = 0;
    if (gameState.screen === 'menu' && e.key === 'Enter') gameState.screen = 'character_select';
    if (gameState.screen === 'game_over' && e.key === 'Enter') {
        player.x = 400; player.y = 300; vet.x = 100; vet.y = 100; gameState.screen = 'playing';
    }
});

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
    
    if (gameState.screen === 'menu' && clickX > 300 && clickX < 500 && clickY > 300 && clickY < 350) {
        gameState.screen = 'character_select';
    } else if (gameState.screen === 'character_select') {
        if (clickX < 400 && clickY < 250) gameState.selectedHero = heroes.molly;
        if (clickX >= 400 && clickY < 250) gameState.selectedHero = heroes.agata;
        if (clickX < 400 && clickY >= 250) gameState.selectedHero = heroes.martin;
        if (clickX >= 400 && clickY >= 250) gameState.selectedHero = heroes.michi;
        if (gameState.selectedHero) gameState.screen = 'playing';
    }
});

// --- BUCLE PRINCIPAL DE RENDERIZADO (LOOP) ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.screen === 'loading') {
        updateLoading(); // Ejecuta la actualización de carga frame por frame de forma segura
        
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ec4899'; ctx.font = '24px monospace'; ctx.fillText("FURRY ESCAPADES", 260, 200);
        ctx.fillStyle = '#ffffff'; ctx.font = '14px monospace'; ctx.fillText(`LOADING ASSETS... ${gameState.progress}%`, 280, 250);
        
        // Barra de progreso visual
        ctx.strokeStyle = '#ffffff'; ctx.strokeRect(250, 290, 300, 20);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(252, 292, (gameState.progress / 100) * 296, 16);

    } else if (gameState.screen === 'menu') {
        ctx.fillStyle = '#0b0f19'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff'; ctx.font = '28px monospace'; ctx.fillText("FURRY ESCAPADES", 240, 150);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(300, 300, 200, 45);
        ctx.fillStyle = '#ffffff'; ctx.font = '14px monospace'; ctx.fillText("START GAME", 345, 328);

    } else if (gameState.screen === 'character_select') {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        Object.keys(heroes).forEach((key, index) => {
            const h = heroes[key]; const xOffset = (index % 2) * 400; const yOffset = Math.floor(index / 2) * 210 + 60;
            ctx.fillStyle = h.colors.bg; ctx.fillRect(xOffset + 10, yOffset, 380, 190);
            ctx.fillStyle = '#ffffff'; ctx.font = '12px monospace'; ctx.fillText(h.name, xOffset + 30, yOffset + 30);
            ctx.fillStyle = '#aaaaaa'; ctx.font = '10px monospace'; ctx.fillText(h.mission, xOffset + 30, yOffset + 60);
        });
    } else if (gameState.screen === 'playing') {
        drawCurrentAmbient(); drawVet(); drawPlayer(); drawHUD(); updatePhysics();
    } else if (gameState.screen === 'game_over') {
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = '24px monospace'; ctx.fillText("GAME OVER", 330, 200);
    }

    requestAnimationFrame(gameLoop);
}

// Iniciar el bucle de juego directamente
gameLoop();
