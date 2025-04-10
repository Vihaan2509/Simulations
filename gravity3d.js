import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM Elements ---
// No buttons/checkboxes needed for fullscreen version
const container = document.getElementById('gravityContainer');
if (!container) {
    console.error("ERROR: gravityContainer div not found!");
    document.body.innerHTML = '<p style="color:red; font-size:2em; text-align:center; padding-top: 20px;">Error: Container not found.</p>';
}

// --- Scene, Camera, Renderer ---
let scene, camera, renderer;
let controls;

// --- Simulation Objects ---
let starMesh, planetMesh; // Star is conceptual now, only planet (Earth) visible
let orbitLine; // Keep orbit trail? Optional for this visual style.

// --- Spacetime Grid Objects ---
let spacetimeGridMesh;
let originalGridVertices;
const gridWidth = 600; // Wider grid
const gridHeight = 600;
const gridSegments = 50; // More segments for smoother curve
const wellStrength = 4000; // Adjust strength of the dip effect
const wellSoftening = 250; // Soften center dip

// --- Physics Parameters ---
// Removed G, M_STAR, M_PLANET - focusing on visual, not accurate orbit physics here
// If orbit is desired, add them back. For now, planet is static or moves simply.
const dt = 0.01; // Time step (if movement is added)

// --- Initial State ---
const planetPos = new THREE.Vector3(0, 0, 0); // Earth at the center for the static visual
// const initialPlanetVel = new THREE.Vector3(0, 0, 0); // No initial velocity for static view

let planet = {
    pos: planetPos.clone(),
    vel: new THREE.Vector3(0, 0, 0), // Start static
    acc: new THREE.Vector3(0, 0, 0)
};

// --- Orbit Trail (Optional - likely remove for static visual) ---
const MAX_ORBIT_POINTS = 1000;
let orbitPoints = [];
let orbitGeometry;
let orbitDrawCount = 0;

// --- Animation Control ---
let animationFrameId = null; // Keep for potential future animation

// --- Texture Loader --- Added
const textureLoader = new THREE.TextureLoader();

// --- Initialization ---
function init() {
    try {
        // Scene
        scene = new THREE.Scene();
        // Black background set by CSS, but can set here too
        scene.background = new THREE.Color(0x000000);

        // Camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(50, aspect, 1, 5000); // Slightly narrower FOV
        // Position camera for an angled top-down view like the image
        camera.position.set(0, gridHeight * 0.6, gridWidth * 0.7);
        camera.lookAt(scene.position); // Look at the center (0,0,0)

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.innerHTML = ''; // Clear container
        container.appendChild(renderer.domElement);

        // Lights
        // Use softer ambient and maybe a top-down directional light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0.2).normalize(); // Mostly from above
        scene.add(directionalLight);

        // Controls (Still useful for user navigation)
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false; // Panning might be weird in this view
        controls.minDistance = 100;
        controls.maxDistance = 2000;
        controls.target.set(0, 0, 0); // Ensure controls focus on Earth

        // Create Objects
        // createStar(); // Don't create star mesh - Earth is the central object
        createPlanet(); // Create Earth
        // createOrbitTrail(); // Optional: Don't create orbit trail for static view
        createSpacetimeGrid(); // Create the grid

        // Event Listeners
        window.addEventListener('resize', onWindowResize);

        // Start Animation Loop --- Changed: Auto-start animation
        animate();
        console.log("Fullscreen Gravity Simulation Initialized");

    } catch(error) {
        console.error("Initialization Error:", error);
         container.innerHTML = `<p style="color:red; font-size:1.5em; padding: 20px;">Error during initialization: ${error.message}</p>`;
    }
}

// --- Object Creation ---
// function createStar() { ... } // Removed

function createPlanet() { // Modified to create Earth
    const geometry = new THREE.SphereGeometry(35, 64, 32); // Earth radius, more segments for detail
    const material = new THREE.MeshStandardMaterial({
        map: textureLoader.load('earthmap.jpg', // Load the texture!
            () => { // Success callback
                 if(renderer && scene && camera) renderer.render(scene, camera); // Render once texture loads
                 console.log("Earth texture loaded.");
            },
            undefined, // Progress callback (optional)
            (err) => { // Error callback
                console.error('Error loading Earth texture:', err);
                // Use a fallback color if texture fails
                material.map = null; // Remove failed map attempt
                material.color.set(0x1E90FF); // Dodger blue fallback
                material.needsUpdate = true;
            }
        ),
        roughness: 0.8,
        metalness: 0.1
    });
    planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.position.copy(planet.pos); // Position at center
    scene.add(planetMesh);
}

// function createOrbitTrail() { ... } // Removed or commented out if not needed

function createSpacetimeGrid() { // Modified for style
    const geometry = new THREE.PlaneGeometry(gridWidth, gridHeight, gridSegments, gridSegments);
    const material = new THREE.LineBasicMaterial({ // Use LineBasicMaterial for simple lines
        color: 0xffffff, // White lines
        linewidth: 1, // Adjust line thickness if needed
        transparent: true,
        opacity: 0.6 // Adjust opacity
    });

    // Create grid using LineSegments for better performance with lines
    spacetimeGridMesh = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material); // Use WireframeGeometry

    spacetimeGridMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal (on XZ plane)
    spacetimeGridMesh.position.y = -15; // Position grid slightly below center (adjust as needed)
    scene.add(spacetimeGridMesh);

    // Store original vertices for deformation calculation
    const positions = geometry.attributes.position.array;
    originalGridVertices = new Float32Array(positions.length);
    for(let i=0; i< positions.length; i+=3){
        originalGridVertices[i] = positions[i];
        originalGridVertices[i+1] = 0; // Local Y is 0 before deformation
        originalGridVertices[i+2] = positions[i+2];
    }

    // Grid is visible by default, no checkbox
}


// --- Physics Update --- (Simplified for static view)
function updatePhysics() {
    // No physics update needed if Earth is static at the center.
    // If you want Earth to move (e.g., drift slightly), add velocity/acceleration updates here.
    // Example (remove if static):
    // planet.pos.addScaledVector(planet.vel, dt);
}

// --- Update Visuals ---
function updateVisuals() {
    // Update planet mesh position (only if it moves)
    // planetMesh.position.copy(planet.pos);

    // Update orbit trail (only if used)
    // ... (orbit trail update logic) ...

    // Update Spacetime Grid Deformation
    updateSpacetimeGrid();
}

// --- Spacetime Grid Update Function --- (Logic largely unchanged)
function updateSpacetimeGrid() {
    if (!spacetimeGridMesh) return;

    // We need to access the vertices of the *original* PlaneGeometry
    // because WireframeGeometry doesn't store them the same way.
    // Let's re-access the underlying geometry's position attribute.
    const gridPositions = spacetimeGridMesh.geometry.attributes.position.array;
    const planetWorldPos = planetMesh.position; // Earth position in world space (should be 0,0,0)

    // Iterate through the original vertices structure
    for (let i = 0; i < originalGridVertices.length; i += 3) {
        const originalX = originalGridVertices[i];
        const originalZ = originalGridVertices[i+2];

        // Calculate distance in the XZ plane from vertex to planet's projection (0,0)
        const dx = originalX - planetWorldPos.x; // Assumes grid origin aligns with planet X
        const dz = originalZ - planetWorldPos.z; // Assumes grid origin aligns with planet Z
        const distSqXZ = dx * dx + dz * dz;

        // Calculate the Y displacement
        const displacementY = -wellStrength / (distSqXZ + wellSoftening);

        // Apply displacement to the corresponding vertex in the LineSegments geometry buffer
        // The WireframeGeometry creates pairs of vertices for each line segment.
        // We need to find the corresponding vertex/vertices in the LineSegments buffer.
        // This direct mapping is complex. A simpler approach is to deform a hidden PlaneGeometry
        // and then generate the WireframeGeometry *each frame*, but that's inefficient.

        // --- Efficient Approach: Deform the original PlaneGeometry's vertices ---
        // Access the PlaneGeometry's position attribute (which WireframeGeometry uses)
        const planeGeomVertices = spacetimeGridMesh.geometry.attributes.position;

        // Apply the displacement to the Y coordinate of the vertex buffer
        // Important: Index `i+1` corresponds to the Y value in the buffer
         planeGeomVertices.setY(i / 3, displacementY); // Use setY for BufferAttribute

    }

    // Tell Three.js that the geometry needs to be updated
    spacetimeGridMesh.geometry.attributes.position.needsUpdate = true;
}


// --- Animation Loop ---
function animate() {
    animationFrameId = requestAnimationFrame(animate); // Loop

    updatePhysics(); // Update internal state (if any)
    updateVisuals(); // Update positions, grid deformation
    controls.update(); // Update camera controls

    renderer.render(scene, camera); // Render the scene
}

// --- Control Functions ---
// Removed start, stop, reset functions tied to buttons
// Removed toggleSpacetimeGrid function

// --- Window Resize Handler --- (Crucial for fullscreen)
function onWindowResize() {
    if (!camera || !renderer || !container) return;

    const width = window.innerWidth; // Use window dimensions
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    // No need to explicitly render here, animation loop handles it
}

// --- Start ---
init(); // Initialize and start the simulation
