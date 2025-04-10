// --- Gravity Simulation ---
const gravityCanvas = document.getElementById('gravityCanvas');
const gravityCtx = gravityCanvas.getContext('2d');
const gravWidth = gravityCanvas.width;
const gravHeight = gravityCanvas.height;

// Buttons and Checkbox
const startOrbitBtn = document.getElementById('startOrbitBtn');
const stopOrbitBtn = document.getElementById('stopOrbitBtn');
const resetOrbitBtn = document.getElementById('resetOrbitBtn');
const showSpacetimeCheck = document.getElementById('showSpacetimeCheck');


// Simulation Parameters
const G_scaled = 1000; // Scaled G for visual effect, not real units
const M_STAR = 1000;    // Mass of the star (arbitrary units)
const M_PLANET = 1;     // Mass of the planet (arbitrary units)
const PIXELS_PER_UNIT = 1.5; // Scale simulation units to pixels
const dt = 0.005;        // Time step for simulation loop

let planet = { x: 150, y: 0, vx: 0, vy: 2.5 }; // Initial state (relative to center)
let star = { x: 0, y: 0 }; // Star at center
let orbitPath = [];       // To store planet trajectory
let animationFrameId = null; // To control the loop

// Spacetime grid parameters
const gridSpacing = 20;
const gridLines = Math.floor(gravWidth / gridSpacing);
const wellStrength = 15000; // How much the grid dips (visual effect)


// --- Coordinate Transformation ---
function simToCanvas(simX, simY) {
    return {
        x: gravWidth / 2 + simX * PIXELS_PER_UNIT,
        y: gravHeight / 2 - simY * PIXELS_PER_UNIT // Y is inverted in canvas
    };
}

// --- Drawing Functions ---
function drawStar() {
    const canvasPos = simToCanvas(star.x, star.y);
    gravityCtx.beginPath();
    gravityCtx.arc(canvasPos.x, canvasPos.y, 10, 0, 2 * Math.PI); // Radius 10 pixels
    gravityCtx.fillStyle = "yellow";
    gravityCtx.fill();
    gravityCtx.closePath();
}

function drawPlanet() {
    const canvasPos = simToCanvas(planet.x, planet.y);
    gravityCtx.beginPath();
    gravityCtx.arc(canvasPos.x, canvasPos.y, 5, 0, 2 * Math.PI); // Radius 5 pixels
    gravityCtx.fillStyle = "blue";
    gravityCtx.fill();
    gravityCtx.closePath();
}

function drawOrbitPath() {
    if (orbitPath.length < 2) return;
    gravityCtx.beginPath();
    const startPos = simToCanvas(orbitPath[0].x, orbitPath[0].y);
    gravityCtx.moveTo(startPos.x, startPos.y);
    for (let i = 1; i < orbitPath.length; i++) {
        const pos = simToCanvas(orbitPath[i].x, orbitPath[i].y);
        gravityCtx.lineTo(pos.x, pos.y);
    }
    gravityCtx.strokeStyle = "rgba(0, 0, 255, 0.5)"; // Semi-transparent blue
    gravityCtx.lineWidth = 1;
    gravityCtx.stroke();
}

function drawSpacetimeGrid() {
    gravityCtx.strokeStyle = "rgba(100, 100, 100, 0.5)"; // Light gray grid
    gravityCtx.lineWidth = 0.5;
    const starCanvasPos = simToCanvas(star.x, star.y);

    for (let i = 0; i <= gridLines; i++) {
        // Vertical lines
        gravityCtx.beginPath();
        let startX = i * gridSpacing;
        let startY = 0;
        gravityCtx.moveTo(startX, startY);
        for (let y = 1; y <= gravHeight; y++) {
            let currentX = startX;
            let currentY = y;
             // Calculate distance from star IN CANVAS COORDINATES for visual effect
            let dx = currentX - starCanvasPos.x;
            let dy = currentY - starCanvasPos.y;
            let distSq = dx * dx + dy * dy;
            let offsetFactor = wellStrength / (distSq + 100); // Avoid division by zero, +100 softens the center
            let offsetX = dx * offsetFactor / Math.sqrt(distSq + 1); // Normalized direction * offset
            let offsetY = dy * offsetFactor / Math.sqrt(distSq + 1);

            gravityCtx.lineTo(currentX - offsetX, currentY - offsetY); // Draw segment towards star
        }
        gravityCtx.stroke();

        // Horizontal lines (similar logic)
         gravityCtx.beginPath();
         let startY_h = i * gridSpacing;
         let startX_h = 0;
         gravityCtx.moveTo(startX_h, startY_h);
         for(let x = 1; x <= gravWidth; x++){
            let currentX = x;
            let currentY = startY_h;
            let dx = currentX - starCanvasPos.x;
            let dy = currentY - starCanvasPos.y;
            let distSq = dx * dx + dy * dy;
            let offsetFactor = wellStrength / (distSq + 100);
            let offsetX = dx * offsetFactor / Math.sqrt(distSq + 1);
            let offsetY = dy * offsetFactor / Math.sqrt(distSq + 1);
            gravityCtx.lineTo(currentX - offsetX, currentY - offsetY);
         }
         gravityCtx.stroke();
    }
}


// --- Physics Update ---
function updateOrbit() {
    // Calculate distance and direction vector from planet to star
    const dx = star.x - planet.x;
    const dy = star.y - planet.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < 1) { // Avoid division by zero / extreme forces
        console.warn("Planet too close to star!");
        stopOrbit();
        return;
    }

    // Calculate gravitational force magnitude
    const forceMag = (G_scaled * M_STAR * M_PLANET) / distSq;

    // Calculate force components
    const forceX = forceMag * (dx / dist);
    const forceY = forceMag * (dy / dist);

    // Calculate acceleration (a = F/m)
    const accelX = forceX / M_PLANET;
    const accelY = forceY / M_PLANET;

    // Update velocity (Euler method)
    planet.vx += accelX * dt;
    planet.vy += accelY * dt;

    // Update position
    planet.x += planet.vx * dt;
    planet.y += planet.vy * dt;

    // Store path (limit length for performance)
    orbitPath.push({ x: planet.x, y: planet.y });
    if (orbitPath.length > 1000) {
        orbitPath.shift(); // Remove oldest point
    }
}

// --- Animation Loop ---
function gameLoop() {
    // Clear canvas
    gravityCtx.clearRect(0, 0, gravWidth, gravHeight);
    gravityCtx.fillStyle = "#111111"; // Dark background for space
    gravityCtx.fillRect(0, 0, gravWidth, gravHeight);


    // Update physics
    updateOrbit();

    // Draw elements
    if (showSpacetimeCheck.checked) {
        drawSpacetimeGrid();
    }
    drawOrbitPath();
    drawStar();
    drawPlanet();

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Control Functions ---
function startOrbit() {
    if (animationFrameId === null) { // Prevent multiple loops
        if (orbitPath.length === 0) { // Reset if starting from scratch
            resetOrbit();
        }
        animationFrameId = requestAnimationFrame(gameLoop);
        console.log("Orbit simulation started.");
    }
}

function stopOrbit() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("Orbit simulation stopped.");
    }
}

function resetOrbit() {
    stopOrbit();
    planet = { x: 150, y: 0, vx: 0, vy: 2.5 }; // Reset to initial state
    orbitPath = [];
    // Initial draw after reset
    gravityCtx.clearRect(0, 0, gravWidth, gravHeight);
    gravityCtx.fillStyle = "#111111";
    gravityCtx.fillRect(0, 0, gravWidth, gravHeight);
    if (showSpacetimeCheck.checked) {
        drawSpacetimeGrid();
    }
     drawOrbitPath();
    drawStar();
    drawPlanet();
    console.log("Orbit simulation reset.");
}

// --- Event Listeners ---
startOrbitBtn.addEventListener('click', startOrbit);
stopOrbitBtn.addEventListener('click', stopOrbit);
resetOrbitBtn.addEventListener('click', resetOrbit);
showSpacetimeCheck.addEventListener('change', resetOrbit); // Redraw grid immediately on change

// Initial draw on page load
resetOrbit(); // Draw the initial state
