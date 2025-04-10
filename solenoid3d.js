import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TubeGeometry } from 'three'; // Core import is usually sufficient

// --- DOM Elements ---
const container = document.getElementById('solenoidContainer');
if (!container) {
    console.error("ERROR: Solenoid container div not found!");
}

// --- Scene, Camera, Renderer ---
let scene, camera, renderer;
let controls;

// --- Solenoid Parameters ---
const solRadius = 30;
const solLength = 150;
const solTurns = 25;
const wireThickness = 2.5; // Slightly thicker

// --- Initialization ---
function initSolenoid() {
    try {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeeeeff); // Light background

        // Camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(60, aspect, 1, 2000);
         // Pull camera back further, raise it slightly
        camera.position.set(0, solRadius * 1.5, solLength * 1.5);
        camera.lookAt(0, 0, 0); // Explicitly look at origin

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.innerHTML = ''; // Clear container before appending
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Slightly brighter directional
        directionalLight.position.set(50, 100, 75); // Adjust light position
        scene.add(directionalLight);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.screenSpacePanning = true;
        controls.target.set(0, 0, 0); // Set target to origin

        // Helpers
        const axesHelper = new THREE.AxesHelper(solLength * 0.75); // Add axes for orientation
        scene.add(axesHelper);

        // Create Objects
        createSolenoidCoil();
        createFieldLines(); // Try creating lines

        // Event Listeners
        window.addEventListener('resize', onWindowResize);

        // Start Animation Loop
        animateSolenoid();
        console.log("Solenoid 3D scene initialized.");

    } catch (error) {
        console.error("Error during solenoid initialization:", error);
        container.innerHTML = '<p style="color:red;">Error initializing 3D solenoid. Check console.</p>';
    }
}

// --- Custom Helix Curve (Unchanged) ---
class HelixCurve extends THREE.Curve {
    constructor(radius = 1, length = 1, turns = 1) {
        super();
        this.radius = radius;
        this.length = length;
        this.turns = turns;
    }
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const angle = 2 * Math.PI * this.turns * t;
        const z = this.length * (t - 0.5);
        const x = this.radius * Math.cos(angle);
        const y = this.radius * Math.sin(angle);
        return optionalTarget.set(x, y, z);
    }
}

// --- Object Creation ---
function createSolenoidCoil() {
    try {
        const helixPath = new HelixCurve(solRadius, solLength, solTurns);
        const tubularSegments = 300; // Increased segments
        const radialSegments = 10;
        const geometry = new TubeGeometry(helixPath, tubularSegments, wireThickness, radialSegments, false);
        const material = new THREE.MeshStandardMaterial({
            color: 0xB87333, // Copper
            roughness: 0.4,
            metalness: 0.6
        });
        const solenoidMesh = new THREE.Mesh(geometry, material);
        scene.add(solenoidMesh);
        console.log("Solenoid coil created.");
    } catch(error) {
        console.error("Error creating solenoid coil:", error);
    }
}

function createFieldLines() {
    try {
        const fieldLineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 1 }); // Thinner lines maybe?
        const numLinesInside = 6;
        const numLinesOutside = 9;
        const lineSegments = 64;

        // --- Inside Field Lines (Axis-aligned) ---
        const insideGroup = new THREE.Group(); // Group lines for rotation
        for (let i = 0; i < numLinesInside; i++) {
            const radius = (solRadius * 0.85 * (i + 1)) / numLinesInside; // Spread lines inside
            const points = [];
            // Extend lines slightly beyond the coil visually
            points.push(new THREE.Vector3(radius, 0, -solLength / 2 - 15));
            points.push(new THREE.Vector3(radius, 0, solLength / 2 + 15));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, fieldLineMaterial);
            line.rotation.z = (i / numLinesInside) * Math.PI * 2; // Rotate around Z
            insideGroup.add(line);
        }
         // **Important:** Rotate the group so lines are along Z axis if coil helix is along Z
        insideGroup.rotation.x = Math.PI / 2; // Rotate group to align lines with Z axis
        // scene.add(insideGroup); // Let's add lines individually for now to simplify debug

        // Add inside lines directly (simpler debug) - Aligned along X initially
         for (let i = 0; i < numLinesInside; i++) {
            const radius = (solRadius * 0.85 * i) / (numLinesInside -1); // Spread lines inside, including center
            const linePoints = [];
            // Lines along Z axis
            linePoints.push(new THREE.Vector3(radius, 0, -solLength / 2 - 15));
            linePoints.push(new THREE.Vector3(radius, 0, solLength / 2 + 15));
            const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMesh = new THREE.Line(lineGeom, fieldLineMaterial);
             // Rotate this specific line around the Z-axis to distribute radially
            lineMesh.rotation.z = (i / numLinesInside) * Math.PI * 2;
            scene.add(lineMesh);
        }


        // --- Outside Field Lines (Curved Splines) ---
        for (let i = 0; i < numLinesOutside; i++) {
            const startZ = -solLength * 0.5; // Start/end closer to coil ends
            const endZ = solLength * 0.5;
            const midRadius = solRadius * (1.4 + i * 0.4); // More outward spread

            // Simpler curve: less sharp turns
            const curvePoints = [
                new THREE.Vector3(solRadius*0.8, 0, startZ),       // Start near edge
                new THREE.Vector3(midRadius, 0, 0),            // Peak radius at center Z
                new THREE.Vector3(solRadius*0.8, 0, endZ)        // End near edge
            ];

            const curve = new THREE.CatmullRomCurve3(curvePoints);
            const points = curve.getPoints(lineSegments);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, fieldLineMaterial);

            // Rotate the entire curve around the Z-axis
            line.rotation.z = (i / numLinesOutside) * Math.PI * 2;
            scene.add(line);
        }
         console.log("Field lines created.");

    } catch(error) {
        console.error("Error creating field lines:", error);
    }

}

// --- Animation Loop ---
function animateSolenoid() {
    // Check if renderer exists before proceeding
    if (!renderer) {
        console.warn("Renderer not available in animateSolenoid loop.");
        return;
    }
    requestAnimationFrame(animateSolenoid);

    controls.update(); // Update controls
    renderer.render(scene, camera); // Render the scene
}

// --- Window Resize Handler ---
function onWindowResize() {
    if (!camera || !renderer || !container) return; // Check if objects exist

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    // No need to re-render here if the animation loop is running
}

// --- Start ---
// Wait for the container element to be ready
if (document.readyState === 'loading') { // Loading hasn't finished yet
    document.addEventListener('DOMContentLoaded', initSolenoid);
} else { // `DOMContentLoaded` has already fired
    initSolenoid();
}
