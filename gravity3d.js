import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM Elements ---
const container = document.getElementById('gravityContainer');
const startOrbitBtn = document.getElementById('startOrbitBtn');
const stopOrbitBtn = document.getElementById('stopOrbitBtn');
const resetOrbitBtn = document.getElementById('resetOrbitBtn');

// --- Scene, Camera, Renderer ---
let scene, camera, renderer;
let controls; // For mouse interaction

// --- Simulation Objects ---
let starMesh, planetMesh;
let orbitLine; // To draw the trail

// --- Physics Parameters ---
const G = 50;         // Gravitational constant (tuned for visualization)
const M_STAR = 1000;    // Mass of star (visual units)
const M_PLANET = 1;     // Mass of planet (visual units)
const dt = 0.01;        // Time step

// --- Initial State ---
const initialPlanetPos = new THREE.Vector3(150, 0, 0); // Start further out in 3D
const initialPlanetVel = new THREE.Vector3(0, 0, 15);   // Initial velocity in z-direction for XY plane orbit
const starPos = new THREE.Vector3(0, 0, 0);

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
    scene.background = new THREE.Color(0x111122); // Dark space blue

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 5000);
    camera.position.set(0, 150, 250); // Position camera to view the scene
    camera.lookAt(scene.position); // Look at the center

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement); // Add canvas to div

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Soft white light
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 2000); // Light from near the star
    pointLight.position.set(0, 50, 50);
    scene.add(pointLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 1000;

    // Create Objects
    createStar();
    createPlanet();
    createOrbitTrail();

    // Event Listeners
    startOrbitBtn.addEventListener('click', startOrbit);
    stopOrbitBtn.addEventListener('click', stopOrbit);
    resetOrbitBtn.addEventListener('click', resetOrbit);
    window.addEventListener('resize', onWindowResize);

    // Initial Reset
    resetOrbit();
}

// --- Object Creation ---
function createStar() {
    const geometry = new THREE.SphereGeometry(15, 32, 16); // Larger radius for star
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00, wireframe: false }); // Yellow, simple material
    // Alternative: Emissive material for glow
    // const material = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 1 });
    starMesh = new THREE.Mesh(geometry, material);
    starMesh.position.copy(starPos);
    scene.add(starMesh);
}

function createPlanet() {
    const geometry = new THREE.SphereGeometry(5, 16, 8); // Smaller planet
    const material = new THREE.MeshStandardMaterial({ color: 0x0077FF, roughness: 0.8, metalness: 0.2 }); // Blueish, slightly rough
    planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.position.copy(planet.pos);
    scene.add(planetMesh);
}

function createOrbitTrail() {
    orbitGeometry = new THREE.BufferGeometry();
    // Pre-allocate buffer large enough for MAX_ORBIT_POINTS
    const positions = new Float32Array(MAX_ORBIT_POINTS * 3); // x, y, z for each point
    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    orbitGeometry.setDrawRange(0, 0); // Initially draw nothing

    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 1 }); // Cyan color trail
    orbitLine = new THREE.Line(orbitGeometry, material);
    scene.add(orbitLine);
}


// --- Physics Update (3D) ---
function updatePhysics() {
    // Vector from planet to star
    const diff = new THREE.Vector3().subVectors(starPos, planet.pos);
    const distSq = diff.lengthSq();

    if (distSq < 25) { // Collision check (approx radius squared)
        console.warn("Collision detected!");
        stopOrbit();
        return;
    }

    const dist = Math.sqrt(distSq);

    // Force magnitude: F = G * M * m / r^2
    const forceMag = (G * M_STAR * M_PLANET) / distSq;

    // Acceleration: a = F / m_planet = G * M_STAR / r^2 * (direction vector)
    planet.acc.copy(diff).normalize().multiplyScalar((G * M_STAR) / distSq);

    // Update velocity: v_new = v_old + a * dt
    planet.vel.addScaledVector(planet.acc, dt);

    // Update position: p_new = p_old + v_new * dt
    planet.pos.addScaledVector(planet.vel, dt);
}

// --- Update Visuals ---
function updateVisuals() {
    // Update planet mesh position
    planetMesh.position.copy(planet.pos);

    // Update orbit trail
    const positions = orbitGeometry.attributes.position.array;
    const index = orbitDrawCount * 3;

    if (orbitDrawCount < MAX_ORBIT_POINTS) {
        positions[index] = planet.pos.x;
        positions[index + 1] = planet.pos.y;
        positions[index + 2] = planet.pos.z;
        orbitDrawCount++;
        orbitGeometry.setDrawRange(0, orbitDrawCount); // Update how much of the line to draw
        orbitGeometry.attributes.position.needsUpdate = true; // Important! Tell Three.js buffer changed
    } else {
        // Shift points if buffer is full (less efficient but works)
        for (let i = 0; i < MAX_ORBIT_POINTS - 1; i++) {
             positions[i*3] = positions[(i+1)*3];
             positions[i*3+1] = positions[(i+1)*3+1];
             positions[i*3+2] = positions[(i+1)*3+2];
        }
        positions[(MAX_ORBIT_POINTS-1)*3] = planet.pos.x;
        positions[(MAX_ORBIT_POINTS-1)*3+1] = planet.pos.y;
        positions[(MAX_ORBIT_POINTS-1)*3+2] = planet.pos.z;
        orbitGeometry.attributes.position.needsUpdate = true;
        // Draw range stays at MAX_ORBIT_POINTS
    }
}


// --- Animation Loop ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Update physics state
    updatePhysics();

    // Update visual representation
    updateVisuals();

    // Update camera controls
    controls.update();

    // Render the scene
    renderer.render(scene, camera);
}

// --- Control Functions ---
function startOrbit() {
    if (animationFrameId === null) { // Prevent multiple loops
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
    // Reset physics state
    planet.pos.copy(initialPlanetPos);
    planet.vel.copy(initialPlanetVel);
    planet.acc.set(0, 0, 0);

    // Reset visual state
    planetMesh.position.copy(planet.pos);

    // Reset orbit trail
    orbitDrawCount = 0;
    orbitGeometry.setDrawRange(0, 0);
    orbitGeometry.attributes.position.needsUpdate = true; // Clear the line visually
    orbitPoints = []; // Also clear intermediate array if used

    // Render one frame to show the reset state
    renderer.render(scene, camera);
    console.log("3D Orbit simulation reset.");
}

// --- Window Resize Handler ---
function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.render(scene, camera); // Render on resize
}

// --- Start ---
init();
