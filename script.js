function drawMap() {
    // Si no hay héroe seleccionado, dibujamos el fondo del menú o uno por defecto
    if (!gameState.selectedHero) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    // Aquí cambiamos el escenario dinámicamente según el personaje
    switch (gameState.selectedHero.id) {
        case 'molly':
            // --- ESCENARIO DE MOLLY: LA CASA ---
            ctx.fillStyle = '#3e2723'; // Suelo de madera
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Dibuja aquí tus muebles o decoraciones de la casa
            break;

        case 'agata':
            // --- ESCENARIO DE AGATA: EL BOSQUE ---
            ctx.fillStyle = '#064e3b'; // Suelo verde bosque
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Dibuja aquí tus árboles o arbustos
            break;

        case 'martin':
            // --- ESCENARIO DE MARTIN: EL DESIERTO ---
            ctx.fillStyle = '#fef08a'; // Arena desértica
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Dibuja aquí tus dunas o ruinas
            break;

        case 'michi':
            // --- ESCENARIO DE MICHI: EL BAÑO ---
            ctx.fillStyle = '#0f172a'; // Azulejos oscuros / laboratorio
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Dibuja aquí tu bañera o estanterías
            break;
            
        default:
            // Fondo por si acaso
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
