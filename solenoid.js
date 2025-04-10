import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TubeGeometry } from 'three'; // Explicit import might be needed depending on setup

// --- DOM Elements ---
const container = document.getElementById('solenoidContainer');

// --- Scene, Camera, Renderer ---
let scene, camera, renderer;
let controls;

// --- Solenoid Parameters ---
const solRadius = 30;
const solLength = 150;
const solTurns = 25;
const wireThickness = 2;

// --- Initialization ---
function initSolenoid() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeff); // Lighter background for contrast

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 1, 2000);
    camera.position.set(solLength * 0.8, solRadius * 2, solLength * 1.1); // Position camera for good view
    camera.lookAt(0, 0, 0); // Look at the center

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = true; // Allow panning
    controls.target.set(0, 0, 0); // Ensure controls focus on the origin

    // Create Objects
    createSolenoidCoil();
    createFieldLines();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);

    // Start Animation Loop
    animateSolenoid();
}

// --- Custom Helix Curve ---
class HelixCurve extends THREE.Curve {
    constructor(radius = 1, length = 1, turns = 1) {
        super();
        this.radius = radius;
        this.length = length;
        this.turns = turns;
    }

    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const angle = 2 * Math.PI * this.turns * t;
        const z = this.length * (t - 0.5); // Center Z at 0
        const x = this.radius * Math.cos(angle);
        const y = this.radius * Math.sin(angle);

        return optionalTarget.set(x, y, z);
    }
}

// --- Object Creation ---
function createSolenoidCoil() {
    const helixPath = new HelixCurve(solRadius, solLength, solTurns);
    const tubularSegments = 200; // More segments for smoother curve
    const radialSegments = 8;   // Segments around the wire tube
    const geometry = new TubeGeometry(helixPath, tubularSegments, wireThickness, radialSegments, false);
    // const material = new THREE.MeshBasicMaterial({ color: 0xB87333 }); // Copper color (Basic)
     const material = new THREE.MeshStandardMaterial({ color: 0xB87333, roughness: 0.4, metalness: 0.6 }); // Copper color (Standard)

    const solenoidMesh = new THREE.Mesh(geometry, material);
    scene.add(solenoidMesh);
}

function createFieldLines() {
    const fieldLineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 }); // Blue lines
    const numLinesInside = 5;
    const numLinesOutside = 8;
    const lineSegments = 50; // Segments per line

    // --- Inside Field Lines (Straight) ---
    for (let i = 0; i < numLinesInside; i++) {
        const radius = (solRadius * 0.8 * (i + 1)) / numLinesInside; // Spread lines inside
        const points = [];
        points.push(new THREE.Vector3(0, radius, -solLength / 2 - 10)); // Start slightly before
        points.push(new THREE.Vector3(0, radius, solLength / 2 + 10));  // End slightly after
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, fieldLineMaterial);
        // Rotate lines around Z axis (only need Y offset if we rotate around Z)
        line.rotation.z = (i / numLinesInside) * Math.PI * 2;
        scene.add(line);
    }

     // --- Outside Field Lines (Curved - Conceptual Splines) ---
    for (let i = 0; i < numLinesOutside; i++) {
        const startZ = -solLength * 0.45;
        const endZ = solLength * 0.45;
        const midRadius = solRadius * (1.5 + i * 0.3); // Spread loops outwards

        // Define points for a spline curve looping outside
        const curvePoints = [
            new THREE.Vector3(0, 0, startZ),              // Start point near center axis inside one end
            new THREE.Vector3(solRadius * 0.7, 0, startZ), // Point towards edge
            new THREE.Vector3(midRadius, 0, 0),           // Farthest point outwards at Z=0
            new THREE.Vector3(solRadius * 0.7, 0, endZ),   // Point back towards edge at other end
            new THREE.Vector3(0, 0, endZ)                 // End point near center axis inside other end
        ];

        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const points = curve.getPoints(lineSegments);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, fieldLineMaterial);

        // Rotate the entire curve around the Z-axis
        line.rotation.z = (i / numLinesOutside) * Math.PI * 2;

        scene.add(line);
    }
}

// --- Animation Loop ---
function animateSolenoid() {
    requestAnimationFrame(animateSolenoid);

    // Update controls
    controls.update();

    // Render the scene
    renderer.render(scene, camera);
}

// --- Window Resize Handler ---
function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.render(scene, camera); // Re-render on resize
}

// --- Start ---
initSolenoid();
