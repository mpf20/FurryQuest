/**
 * Furry Escapades: Outsmart the Vet
 * Código fuente actualizado con escenarios personalizados y personificados por personaje.
 */

const canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
if (!canvas.id) {
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 500;
    document.body.appendChild(canvas);
}
const ctx = canvas.getContext('2d');

// Estado Global del Juego
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

// Configuración de Héroes y sus ambientes específicos personificados
const heroes = {
    molly: {
        id: 'molly',
        name: 'MOLLY',
        title: 'DOG WARRIOR',
        mission: 'Guarda calcetines y esquiva a la Veterinaria!',
        ambient: 'LA CASA (Shiba-Den)',
        reward: 'HUESO',
        hideout: 'Debajo de la cama',
        colors: { primary: '#a855f7', secondary: '#3b0764', bg: '#1e1b4b' }
    },
    agata: {
        id: 'agata',
        name: 'AGATA',
        title: 'FOREST MAGE',
        mission: '¡Huye del cortauñas de la Veterinaria!',
        ambient: 'EL BOSQUE RECONDITO',
        reward: 'PESCADO',
        hideout: 'Troncos de árboles',
        colors: { primary: '#22c55e', secondary: '#052e16', bg: '#022c22' }
    },
    martin: {
        id: 'martin',
        name: 'MARTIN',
        title: 'DESERT KNIGHT',
        mission: '¡Llega al pozo, la sed aumenta!',
        ambient: 'EL DESIERTO (Ruinas)',
        reward: 'PESCADO',
        hideout: 'Dunas de arena',
        colors: { primary: '#eab308', secondary: '#451a03', bg: '#431407' }
    },
    michi: {
        id: 'michi',
        name: 'MICHI',
        title: 'ROGUE ALCHEMIST',
        mission: '¡Evita el jabón, las toallas y el agua!',
        ambient: 'EL BAÑO (Laboratorio)',
        reward: 'PESCADO',
        hideout: 'Estantería de Alquimia',
        colors: { primary: '#06b6d4', secondary: '#083344', bg: '#0f172a' }
    }
};

// Datos del Jugador y Entidades
const player = { x: 400, y: 300, size: 20, speed: 4, dx: 0, dy: 0 };
const vet = { x: 100, y: 100, size: 22, speed: 1.5, angle: 0, visionAngle: Math.PI / 4, visionRange: 150 };

function simulateLoading() {
    if (gameState.screen !== 'loading') return;
    gameState.progress += 2;
    if (gameState.progress >= 100) {
        gameState.progress = 100;
        gameState.screen = 'menu';
    } else {
        setTimeout(simulateLoading, 30);
    }
}

function triggerExplosion(x, y) {
    gameState.explosionActive = true;
    gameState.explosionTimer = 30; 
    gameState.explosionParticles = [];
    const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff'];
    for (let i = 0; i < 60; i++) {
        gameState.explosionParticles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 4 + 2, color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

// =========================================================================
// --- DIBUJO DE ESCENARIOS PERSONALIZADOS (REEMPLAZO DEL FONDO NEGRO) ---
// =========================================================================

function drawMollyAmbient() {
    // Suelo de madera oscura (habitación)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(50, 80, 700, 380);
    
    // Tablones de la madera estilo pixel art
    ctx.strokeStyle = '#271510';
    ctx.lineWidth = 2;
    for (let i = 80; i < 460; i += 30) {
        ctx.beginPath(); ctx.moveTo(50, i); ctx.lineTo(750, i); ctx.stroke();
    }

    // Cama Morada (Escondite funcional bajo la cama)
    ctx.fillStyle = '#512da8'; 
    ctx.fillRect(80, 100, 140, 90);
    ctx.fillStyle = '#d1c4e9'; // Almohada
    ctx.fillRect(80, 100, 40, 90);
    ctx.fillStyle = '#5d4037'; // Soporte de madera
    ctx.fillRect(220, 100, 8, 90);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.fillText("[CAMA ESCONDITE]", 90, 150);

    // Sofá Marrón Desgastado
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(350, 90, 180, 60);
    ctx.fillStyle = '#6d4c41'; // Cojines individuales
    ctx.fillRect(360, 100, 50, 40);
    ctx.fillRect(415, 100, 50, 40);
    ctx.fillRect(470, 100, 50, 40);

    // Mueble/Gabinete Cerrado y Sellado (Tal como especificaste)
    ctx.fillStyle = '#3e2723';
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3;
    ctx.fillRect(620, 120, 80, 120);
    ctx.strokeRect(620, 120, 80, 120);
    ctx.fillStyle = '#eab308'; // Candado amarillo pixel
    ctx.fillRect(655, 170, 10, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText("CERRADO", 632, 110);

    // Calcetines, desorden y Huesos (Objetivo) tirados por la habitación
    const items = [
        {x: 120, y: 300, color: '#64b5f6', label: 'Media'},
        {x: 280, y: 240, color: '#ff8a65', label: 'Ropa'},
        {x: 450, y: 380, color: '#ffffff', label: 'HUESO'},
        {x: 580, y: 320, color: '#ffffff', label: 'HUESO'}
    ];
    items.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, 12, 8);
        ctx.fillStyle = '#ffb74d';
        ctx.font = '8px monospace';
        ctx.fillText(item.label, item.x - 5, item.y - 4);
    });
}

function drawAgataAmbient() {
    // Fondo verde profundo de bosque místico
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(50, 80, 700, 380);

    // Troncos de árboles robustos (Escondites naturales)
    ctx.fillStyle = '#78350f'; 
    ctx.fillRect(80, 80, 60, 140);
    ctx.fillRect(600, 80, 80, 160);
    
    // Copas/Follaje verde
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(110, 80, 60, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(640, 80, 70, 0, Math.PI*2); ctx.fill();

    // Arbustos en primer plano
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.arc(220, 400, 35, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(500, 420, 40, 0, Math.PI*2); ctx.fill();

    // Piedra mágica tallada con la inscripción "META"
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(360, 100, 80, 70);
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px monospace';
    ctx.fillText("META", 385, 140);

    // Hongos pixelados fosforescentes
    const mushrooms = [{x: 180, y: 250}, {x: 290, y: 340}, {x: 550, y: 280}];
    mushrooms.forEach(m => {
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(m.x, m.y, 8, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.fillRect(m.x - 2, m.y, 4, 8);
    });
}

function drawMartinAmbient() {
    // Fondo arenoso desértico
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(50, 80, 700, 380);

    // Líneas onduladas simulando dunas
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.bezierCurveTo(50, 200, 250, 150, 450, 250);
    ctx.bezierCurveTo(450, 250, 600, 320, 750, 220);
    ctx.stroke();

    // Columnas y muros derruidos de piedra arcillosa
    ctx.fillStyle = '#b45309';
    ctx.fillRect(90, 120, 40, 180); 
    ctx.fillRect(620, 250, 90, 40);  

    // Oasis / Pozo antiguo de agua (Tu Meta)
    ctx.fillStyle = '#451a03';
    ctx.beginPath(); ctx.arc(390, 150, 35, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#38bdf8'; // Agua
    ctx.beginPath(); ctx.arc(390, 150, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '10px monospace';
    ctx.fillText("POZO (META)", 335, 210);

    // Cactus del desierto
    const cacti = [{x: 200, y: 360}, {x: 550, y: 130}];
    cacti.forEach(c => {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(c.x, c.y, 10, 40);
        ctx.fillRect(c.x - 10, c.y + 10, 10, 8);
        ctx.fillRect(c.x + 10, c.y + 18, 10, 8);
    });
}

function drawMichiAmbient() {
    // Azulejos del laboratorio del baño alquimista
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(50, 80, 700, 380);

    // Cuadrícula pixelada
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 50; x < 750; x += 40) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 460); ctx.stroke(); }
    for (let y = 80; y < 460; y += 40) { ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(750, y); ctx.stroke(); }

    // Mueble de estantería con pociones químicas
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(70, 100, 120, 150);
    const colors = ['#ec4899', '#3b82f6', '#a855f7', '#22c55e'];
    for(let i=0; i<4; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath(); ctx.arc(90 + (i*24), 140, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(90 + (i*24), 210, 8, 0, Math.PI*2); ctx.fill();
    }

    // Bañera gigante (Peligro de agua letal)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(450, 120, 220, 100);
    ctx.fillStyle = '#bae6fd'; 
    ctx.fillRect(460, 130, 200, 80);

    // Bloque gigante de Jabón químico reactivo
    ctx.fillStyle = '#a7f3d0';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.fillRect(320, 340, 70, 45);
    ctx.strokeRect(320, 340, 70, 45);
    ctx.fillStyle = '#065f46';
    ctx.font = '10px monospace';
    ctx.fillText("JABÓN", 330, 368);
}

// Renderizador condicional según personaje activo
function drawCurrentAmbient() {
    if (!gameState.selectedHero) return;
    switch (gameState.selectedHero.id) {
        case 'molly': drawMollyAmbient(); break;
        case 'agata': drawAgataAmbient(); break;
        case 'martin': drawMartinAmbient(); break;
        case 'michi': drawMichiAmbient(); break;
    }
}

// --- RESTO DE COMPONENTES DEL MOTOR GRÁFICO (CONSERVA TUS IMÁGENES Y SPRITES FIJOS) ---

function drawHUD() {
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = gameState.selectedHero ? gameState.selectedHero.colors.primary : '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(520, 20, 260, 50);
    ctx.strokeRect(520, 20, 260, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(gameState.selectedHero ? gameState.selectedHero.name : 'HERO', 530, 38);
    
    ctx.fillStyle = '#334155';
    ctx.fillRect(530, 48, 120, 12);
    
    if (gameState.vetProximity > 70) ctx.fillStyle = '#ef4444';
    else if (gameState.vetProximity > 40) ctx.fillStyle = '#f97316';
    else ctx.fillStyle = '#22c55e';
    
    ctx.fillRect(530, 48, (gameState.vetProximity / 100) * 120, 12);
    ctx.fillStyle = gameState.vetProximity > 75 ? '#ef4444' : '#22c55e';
    ctx.fillText(gameState.vetStatus, 665, 57);
}

function drawPlayer() {
    if (gameState.explosionActive) {
        gameState.explosionParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        });
        return;
    }
    // Tu Mascota Fija (Se conserva idéntica sin alterar)
    ctx.fillStyle = '#e11d48'; ctx.fillRect(player.x - 12, player.y - 12, 24, 24);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(player.x - 6, player.y + 2, 12, 8);
    ctx.fillStyle = '#b45309';
    ctx.beginPath(); ctx.moveTo(player.x - 10, player.y - 10); ctx.lineTo(player.x - 4, player.y - 16); ctx.lineTo(player.x, player.y - 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(player.x + 10, player.y - 10); ctx.lineTo(player.x + 4, player.y - 16); ctx.lineTo(player.x, player.y - 10); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.fillRect(player.x - 5, player.y - 4, 3, 3); ctx.fillRect(player.x + 2, player.y - 4, 3, 3);
}

function drawVet() {
    if (gameState.explosionActive) return;
    // Cono de Visión de la villana
    ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
    ctx.beginPath(); ctx.moveTo(vet.x, vet.y);
    ctx.arc(vet.x, vet.y, vet.visionRange, vet.angle - vet.visionAngle, vet.angle + vet.visionAngle);
    ctx.closePath(); ctx.fill();

    // Sprite Fijo de la Veterinaria
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(vet.x - 12, vet.y - 10, 24, 30);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(vet.x - 10, vet.y + 20, 20, 8);
    ctx.fillStyle = '#fbcfe8'; ctx.fillRect(vet.x - 8, vet.y - 22, 16, 12);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(vet.x - 6, vet.y - 18, 12, 4);
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
    if (player.x < 65) player.x = 65; if (player.x > 735) player.x = 735;
    if (player.y < 95) player.y = 95; if (player.y > 445) player.y = 445;

    const targetAngle = Math.atan2(player.y - vet.y, player.x - vet.x);
    vet.angle = targetAngle;
    vet.x += Math.cos(vet.angle) * vet.speed; vet.y += Math.sin(vet.angle) * vet.speed;

    const distance = Math.hypot(player.x - vet.x, player.y - vet.y);
    gameState.vetProximity = Math.max(0, Math.min(100, ((600 - distance) / 600) * 100));
    gameState.vetStatus = gameState.vetProximity > 75 ? '¡ALERTA!' : 'EVADIENDO...';

    if (distance < (player.size + vet.size)) { triggerExplosion(player.x, player.y); }
}

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
    else if (gameState.screen === 'game_over' && e.key === 'Enter') {
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

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState.screen === 'loading') {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ec4893'; ctx.font = '20px monospace'; ctx.fillText("FURRY ESCAPADES", 220, 200);
        ctx.fillStyle = '#ffffff'; ctx.fillText("LOADING ASSETS... " + gameState.progress + "%", 280, 260);
        ctx.strokeRect(250, 290, 300, 20); ctx.fillStyle = '#22c55e'; ctx.fillRect(253, 293, (gameState.progress / 100) * 294, 14);
    } else if (gameState.screen === 'menu') {
        ctx.fillStyle = '#0b0f19'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff'; ctx.font = '24px monospace'; ctx.fillText("FURRY ESCAPADES", 240, 150);
        ctx.fillStyle = '#f97316'; ctx.font = '14px monospace'; ctx.fillText("◆ OUTSMART THE VET ◆", 265, 190);
        ctx.fillStyle = '#052e16'; ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.fillRect(300, 300, 200, 45); ctx.strokeRect(300, 300, 200, 45);
        ctx.fillStyle = '#22c55e'; ctx.font = '11px monospace'; ctx.fillText("► JUGAR", 365, 328);
    } else if (gameState.screen === 'character_select') {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const keys = Object.keys(heroes);
        keys.forEach((key, index) => {
            const h = heroes[key]; const xOffset = (index % 2) * 400; const yOffset = Math.floor(index / 2) * 210 + 60;
            ctx.fillStyle = h.colors.bg; ctx.fillRect(xOffset + 10, yOffset, 380, 190);
            ctx.strokeStyle = h.colors.primary; ctx.strokeRect(xOffset + 10, yOffset, 380, 190);
            ctx.fillStyle = '#ffffff'; ctx.font = '12px monospace'; ctx.fillText(h.name, xOffset + 30, yOffset + 30);
            ctx.fillStyle = h.colors.primary; ctx.font = '8px monospace'; ctx.fillText(h.title, xOffset + 30, yOffset + 45);
            ctx.fillStyle = '#cccccc'; ctx.font = '9px monospace'; ctx.fillText("MISIÓN: " + h.mission, xOffset + 30, yOffset + 75);
            ctx.fillText("ENTORNO: " + h.ambient, xOffset + 30, yOffset + 100);
            ctx.fillText("PREMIO: " + h.reward, xOffset + 30, yOffset + 125);
        });
        ctx.fillStyle = '#ffffff'; ctx.font = '16px monospace'; ctx.fillText("SELECCIONA TU HÉROE", 280, 35);
    } else if (gameState.screen === 'playing') {
        drawCurrentAmbient(); drawVet(); drawPlayer(); drawHUD(); updatePhysics();
    } else if (gameState.screen === 'game_over') {
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = '24px monospace'; ctx.fillText("¡KABOOM! CAPTURADO", 220, 200);
        ctx.fillStyle = '#ffffff'; ctx.font = '12px monospace'; ctx.fillText("La Veterinaria te alcanzó y explotaste.", 240, 250);
        ctx.fillText("Presiona ENTER para revivir", 260, 320);
    }
    requestAnimationFrame(gameLoop);
}

simulateLoading();
gameLoop();
