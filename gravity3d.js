import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM Elements ---
const container = document.getElementById('gravityContainer');
const startOrbitBtn = document.getElementById('startOrbitBtn');
const stopOrbitBtn = document.getElementById('stopOrbitBtn');
const resetOrbitBtn = document.getElementById('resetOrbitBtn');
const showSpacetimeCheck = document.getElementById('showSpacetimeCheck'); // Get checkbox

// --- Scene, Camera, Renderer ---
let scene, camera, renderer;
let controls;

// --- Simulation Objects ---
let starMesh, planetMesh;
let orbitLine;

// --- Spacetime Grid Objects --- Added
let spacetimeGridMesh;
let originalGridVertices;
const gridWidth = 500; // Size of the grid plane
const gridHeight = 500;
const gridSegments = 40; // More segments = smoother deformation
const wellStrength = 1500; // How deep the well is (visual effect)
const wellSoftening = 150; // Prevents extreme dip near center (prevents division by zero essentially)

// --- Physics Parameters ---
const G = 50;
const M_STAR = 1000;
const M_PLANET = 1;
const dt = 0.01;

// --- Initial State ---
const initialPlanetPos = new THREE.Vector3(150, 0, 0);
const initialPlanetVel = new THREE.Vector3(0, 15, 5); // Adjusted initial velocity slightly for more 3D orbit
const starPos = new THREE.Vector3(0, 0, 0); // Keep star at origin for grid simplicity

let planet = {
    pos: initialPlanetPos.clone(),
    vel: initialPlanetVel.clone(),
    acc: new THREE.Vector3(0, 0, 0)
};

// --- Orbit Trail ---
const MAX_ORBIT_POINTS = 1000;
let orbitPoints = [];
let orbitGeometry;
let orbitDrawCount = 0;

// --- Animation Control ---
let animationFrameId = null;

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000015); // Dark space blue

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 5000);
    camera.position.set(0, 200, 300); // Adjusted camera view slightly
    camera.lookAt(scene.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = ''; // Clear container
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 2000);
    pointLight.position.copy(starPos); // Put light source at the star
    scene.add(pointLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 1000;

    // Create Objects
    createStar();
    createPlanet();
    createOrbitTrail();
    createSpacetimeGrid(); // <-- Add grid creation

    // Event Listeners
    startOrbitBtn.addEventListener('click', startOrbit);
    stopOrbitBtn.addEventListener('click', stopOrbit);
    resetOrbitBtn.addEventListener('click', resetOrbit);
    showSpacetimeCheck.addEventListener('change', toggleSpacetimeGrid); // <-- Add listener
    window.addEventListener('resize', onWindowResize);

    // Initial Reset
    resetOrbit();
}

// --- Object Creation ---
function createStar() {
    const geometry = new THREE.SphereGeometry(15, 32, 16);
    // Make star slightly emissive to appear bright
    const material = new THREE.MeshStandardMaterial({
        emissive: 0xffffaa, // Yellowish emission
        emissiveIntensity: 0.8,
        color: 0xffdd00 // Base color
    });
    starMesh = new THREE.Mesh(geometry, material);
    starMesh.position.copy(starPos);
    scene.add(starMesh);
}

function createPlanet() {
    const geometry = new THREE.SphereGeometry(5, 16, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077FF, roughness: 0.8, metalness: 0.2 });
    planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.position.copy(planet.pos);
    scene.add(planetMesh);
}

function createOrbitTrail() {
    orbitGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_ORBIT_POINTS * 3);
    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    orbitGeometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 1 });
    orbitLine = new THREE.Line(orbitGeometry, material);
    scene.add(orbitLine);
}

// --- Spacetime Grid Creation --- Added
function createSpacetimeGrid() {
    const geometry = new THREE.PlaneGeometry(gridWidth, gridHeight, gridSegments, gridSegments);
    const material = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa, // Gray color
        wireframe: true,
        transparent: true, // Allow opacity changes
        opacity: 0.3       // Make it semi-transparent
    });

    spacetimeGridMesh = new THREE.Mesh(geometry, material);
    spacetimeGridMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal (on XZ plane)
    spacetimeGridMesh.position.y = -30; // Position it slightly below the orbit plane for visual clarity
    scene.add(spacetimeGridMesh);

    // Store original vertices Y=0 (relative to the mesh's local space before rotation/positioning)
    // We need the original positions in the grid's local XZ plane to calculate distances correctly
    const positions = geometry.attributes.position.array;
    originalGridVertices = new Float32Array(positions.length);
     // We only need X and Z from the original buffer for distance calculation,
     // but copy all 3 for easier indexing later if needed. Y is assumed 0 initially.
    for(let i=0; i< positions.length; i+=3){
        originalGridVertices[i] = positions[i]; // Original X
        originalGridVertices[i+1] = 0;          // Original Y (in local space, before deformation)
        originalGridVertices[i+2] = positions[i+2]; // Original Z
    }

    // Set initial visibility based on checkbox
    spacetimeGridMesh.visible = showSpacetimeCheck.checked;
}


// --- Physics Update (Unchanged) ---
function updatePhysics() {
    const diff = new THREE.Vector3().subVectors(starPos, planet.pos);
    const distSq = diff.lengthSq();
    if (distSq < 25) {
        console.warn("Collision detected!");
        stopOrbit();
        return;
    }
    const dist = Math.sqrt(distSq);
    planet.acc.copy(diff).normalize().multiplyScalar((G * M_STAR) / distSq);
    planet.vel.addScaledVector(planet.acc, dt);
    planet.pos.addScaledVector(planet.vel, dt);
}

// --- Update Visuals ---
function updateVisuals() {
    // Update planet mesh position
    planetMesh.position.copy(planet.pos);

    // Update orbit trail (logic unchanged)
    const positions = orbitGeometry.attributes.position.array;
    const index = orbitDrawCount * 3;
    if (orbitDrawCount < MAX_ORBIT_POINTS) {
        positions[index] = planet.pos.x;
        positions[index + 1] = planet.pos.y;
        positions[index + 2] = planet.pos.z;
        orbitDrawCount++;
        orbitGeometry.setDrawRange(0, orbitDrawCount);
        orbitGeometry.attributes.position.needsUpdate = true;
    } else {
        // Shift points... (unchanged)
         for (let i = 0; i < MAX_ORBIT_POINTS - 1; i++) {
             positions[i*3] = positions[(i+1)*3];
             positions[i*3+1] = positions[(i+1)*3+1];
             positions[i*3+2] = positions[(i+1)*3+2];
        }
        positions[(MAX_ORBIT_POINTS-1)*3] = planet.pos.x;
        positions[(MAX_ORBIT_POINTS-1)*3+1] = planet.pos.y;
        positions[(MAX_ORBIT_POINTS-1)*3+2] = planet.pos.z;
        orbitGeometry.attributes.position.needsUpdate = true;
    }

    // Update Spacetime Grid --- Added
    updateSpacetimeGrid();
}

// --- Spacetime Grid Update Function --- Added
function updateSpacetimeGrid() {
    if (!spacetimeGridMesh || !spacetimeGridMesh.visible) return; // Skip if not visible

    const gridPositions = spacetimeGridMesh.geometry.attributes.position.array;
    const starWorldPos = starMesh.position; // Star position in world space

    for (let i = 0; i < gridPositions.length; i += 3) {
        // Get the original X, Z position of the vertex in its local space
        const originalX = originalGridVertices[i];
        const originalZ = originalGridVertices[i+2];

        // Calculate distance in the XZ plane (plane's local space) from vertex to star's projection
        // Note: Assuming star is at (0, y, 0) in world, its projection onto the grid's local XZ is (0, 0)
        // If star could move off-axis, we'd need to transform its position into the grid's local frame.
        const dx = originalX - 0; // Star's local X projection
        const dz = originalZ - 0; // Star's local Z projection
        const distSqXZ = dx * dx + dz * dz;

        // Calculate the Y displacement (downwards)
        // Using inverse relationship, softened near the center
        const displacementY = -wellStrength / (distSqXZ + wellSoftening);

        // Apply the displacement to the Y coordinate of the vertex buffer
        gridPositions[i + 1] = displacementY; // Y is the vertical axis in the PlaneGeometry buffer
    }

    // Tell Three.js that the geometry needs to be updated
    spacetimeGridMesh.geometry.attributes.position.needsUpdate = true;
    // Optional: Update normals if using lighting that depends on them
    // spacetimeGridMesh.geometry.computeVertexNormals();
}


// --- Animation Loop ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    updatePhysics();
    updateVisuals(); // This now includes updating the grid
    controls.update();
    renderer.render(scene, camera);
}

// --- Control Functions ---
function startOrbit() {
    if (animationFrameId === null) {
        animate();
        console.log("3D Orbit simulation started.");
    }
}

function stopOrbit() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("3D Orbit simulation stopped.");
    }
}

function resetOrbit() {
    stopOrbit();
    planet.pos.copy(initialPlanetPos);
    planet.vel.copy(initialPlanetVel);
    planet.acc.set(0, 0, 0);
    planetMesh.position.copy(planet.pos);

    orbitDrawCount = 0;
    orbitGeometry.setDrawRange(0, 0);
    if(orbitGeometry.attributes.position) orbitGeometry.attributes.position.needsUpdate = true; // Check if exists

    // Reset grid deformation
    resetSpacetimeGrid();
    updateSpacetimeGrid(); // Apply initial (zero) deformation if visible

    // Render one frame
    if (renderer) renderer.render(scene, camera);
    console.log("3D Orbit simulation reset.");
}

// --- Spacetime Grid Control Functions --- Added
function toggleSpacetimeGrid() {
    if (spacetimeGridMesh) {
        spacetimeGridMesh.visible = showSpacetimeCheck.checked;
        if (spacetimeGridMesh.visible) {
            updateSpacetimeGrid(); // Update immediately when made visible
        }
        // Re-render one frame to show the change immediately if stopped
        if (animationFrameId === null && renderer) {
             renderer.render(scene, camera);
        }
    }
}

function resetSpacetimeGrid(){
     if (!spacetimeGridMesh) return;
     const gridPositions = spacetimeGridMesh.geometry.attributes.position.array;
     // Reset Y coordinates to 0 (relative to the plane's position)
     for (let i = 0; i < gridPositions.length; i += 3) {
         gridPositions[i+1] = 0; // Reset Y (vertical deformation)
     }
     spacetimeGridMesh.geometry.attributes.position.needsUpdate = true;
}

// --- Window Resize Handler (Unchanged) ---
function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// --- Start ---
init();
