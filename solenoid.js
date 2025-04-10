// --- Solenoid Simulation ---
const solenoidCanvas = document.getElementById('solenoidCanvas');
const solenoidCtx = solenoidCanvas.getContext('2d');
const solWidth = solenoidCanvas.width;
const solHeight = solenoidCanvas.height;

// Solenoid Parameters (visual representation)
const solRectHeight = 80;
const solRectWidth = 300;
const solRectX = (solWidth - solRectWidth) / 2;
const solRectY = (solHeight - solRectHeight) / 2;

// Arrow drawing function
function drawArrow(ctx, fromx, fromy, tox, toy, headlen = 10) {
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    // Draw arrowhead
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.strokeStyle = "#0000FF"; // Blue arrows
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawSolenoidField() {
    solenoidCtx.clearRect(0, 0, solWidth, solHeight);
    solenoidCtx.fillStyle = "#f0f0f0"; // Light background for the drawing area
    solenoidCtx.fillRect(0, 0, solWidth, solHeight);


    // Draw Solenoid rectangle
    solenoidCtx.strokeStyle = "red";
    solenoidCtx.lineWidth = 3;
    solenoidCtx.strokeRect(solRectX, solRectY, solRectWidth, solRectHeight);
    // Add some coil lines (visual only)
    solenoidCtx.strokeStyle = "darkred";
    solenoidCtx.lineWidth = 1;
    const numCoils = 15;
    for (let i = 0; i <= numCoils; i++) {
        const x = solRectX + (i / numCoils) * solRectWidth;
        solenoidCtx.beginPath();
        solenoidCtx.moveTo(x, solRectY);
        solenoidCtx.lineTo(x, solRectY + solRectHeight);
        solenoidCtx.stroke();
    }


    // Draw Field Lines (Conceptual)
    const gridSize = 30;
    const arrowLength = 20;

    for (let x = gridSize / 2; x < solWidth; x += gridSize) {
        for (let y = gridSize / 2; y < solHeight; y += gridSize) {
            let bx = 0;
            let by = 0;
            let magnitude = 0;

            // Check if inside the solenoid main body
            if (x > solRectX && x < solRectX + solRectWidth &&
                y > solRectY && y < solRectY + solRectHeight)
            {
                bx = 1; // Field points right (positive x) inside
                by = 0;
                magnitude = 1.0; // Strong field
            } else {
                // Simple model for fringing/outside field (loops back)
                const centerX = solRectX + solRectWidth / 2;
                const centerY = solRectY + solRectHeight / 2;
                const dx = x - centerX;
                const dy = y - centerY;
                const distSq = dx*dx + dy*dy;

                // Field loops around - stronger near ends
                if (x < solRectX || x > solRectX + solRectWidth ) { // Near ends or outside sides
                   const nearLeftEnd = x < centerX;
                   const decay = 50000 / (distSq + 1000); // Make it decay with distance squared

                   // Crude approximation of looping field direction
                   bx = nearLeftEnd ? -Math.abs(dx) : Math.abs(dx); // Points away from center horizontally
                   by = -dy; // Points towards center vertically to loop

                   magnitude = decay * 0.5; // Weaker field outside
                }
                 // Normalize and scale direction vector
                 const len = Math.sqrt(bx*bx + by*by);
                 if (len > 0.01) {
                     bx = bx / len;
                     by = by / len;
                 } else {
                     bx = 0;
                     by = 0;
                     magnitude = 0;
                 }
            }

            if (magnitude > 0.05) { // Only draw if field is strong enough
                const arrowEndX = x + bx * arrowLength * magnitude;
                const arrowEndY = y + by * arrowLength * magnitude;
                drawArrow(solenoidCtx, x, y, arrowEndX, arrowEndY, 6); // Smaller arrowhead
            }
        }
    }
}

// Initial Draw
drawSolenoidField();
