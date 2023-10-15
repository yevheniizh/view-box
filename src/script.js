import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'

THREE.ColorManagement.enabled = false

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Debug
 */
// const gui = new dat.GUI()

/**
 * Base
 */
// Nodes
const canvas = document.querySelector('canvas.webgl')
const viewBoxCanvas = document.querySelector('canvas.view-box')
const viewHomeButton = document.querySelector('.view-home')

/**
 * Scene
 */
const scene = new THREE.Scene()

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(-3, 3, 3)
scene.add(camera)

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * View cube
 */
let materials = [];
let texts = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];

let textureLoader = new THREE.TextureLoader();
let c = document.createElement('canvas');
let ctx = c.getContext('2d');

let size = 64;
c.width = size;
c.height = size;

ctx.font = 'bolder 10px "Open sans", Arial';
ctx.textBaseline = 'middle';
ctx.textAlign = 'center';

let mainColor = '#fff';
let otherColor = '#ccc';

let bg = ctx.createLinearGradient(0, 0, 0, size);
bg.addColorStop(0, mainColor);
bg.addColorStop(1, otherColor);

texts.forEach( (text, i) => {
    if (text === 'TOP') {
        ctx.fillStyle = mainColor;
    } else if ( text === 'BOTTOM' ) {
        ctx.fillStyle = otherColor;
    } else {
        ctx.fillStyle = bg;
    }
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    ctx.fillStyle = '#999';
    ctx.fillText(text, size / 2, size / 2);
    materials[i] = new THREE.MeshBasicMaterial({
        map: textureLoader.load(c.toDataURL())
    });
});


const cubeCameraDistance = 1.75;
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials
)
const cubeScene = new THREE.Scene();
const cubeCamera = new THREE.PerspectiveCamera(70, viewBoxCanvas.offsetWidth / viewBoxCanvas.offsetHeight, 0.1, 100);

cubeCamera.rotation.copy(camera.rotation);
const dir = camera.position.clone().sub(controls.target).normalize();
cubeCamera.position.copy(dir.multiplyScalar(cubeCameraDistance));

const cubeRenderer = new THREE.WebGLRenderer({
    canvas: viewBoxCanvas,
    alpha: true,
    antialias: true,
});

cubeRenderer.setSize(viewBoxCanvas.offsetWidth, viewBoxCanvas.offsetHeight)
cubeRenderer.setPixelRatio(window.devicePixelRatio);

cubeScene.add(cube)

let planeMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    color: 0x00c0ff,
    transparent: true,
    opacity: 0,
    depthTest: false
});
let planeSize = 0.7;
let planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);

let A = 0.51;
const planes = [
    { position: { x: 0, y: 0, z: A } },
    { position: { x: 0, y: 0, z: -A } },
    { position: { x: A, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
    { position: { x: -A, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
    { position: { x: 0, y: A, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 } },
    { position: { x: 0, y: -A, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 } },
].map( (plane, i) => {
    const mesh = new THREE.Mesh(planeGeometry, planeMaterial.clone());
    mesh.position.set(plane.position.x, plane.position.y, plane.position.z);
    if (plane.rotation) mesh.rotation.set(plane.rotation.x, plane.rotation.y, plane.rotation.z);
    cubeScene.add(mesh);
    return mesh;
});

/**
 * Mouse
 */
const mouse = new THREE.Vector2(0, 0);
let activePlane = null;

viewBoxCanvas.addEventListener( 'mousemove', (e) => {
    if (activePlane) {
        activePlane.material.opacity = 0;
        activePlane = null;
    }

    mouse.x = e.offsetX / viewBoxCanvas.offsetWidth * 2 - 1; // normalize, get sizes (-1:1)
    mouse.y = -e.offsetY / viewBoxCanvas.offsetHeight * 2 + 1; // normalize, get sizes (-1:1)

    /**
     * Raycaster
     */
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cubeCamera);
    const intersects = raycaster.intersectObjects(planes.concat(cube));
    
    if (intersects.length && intersects[0].object !== cube) {
        activePlane = intersects[0].object;
        activePlane.material.opacity = 0.3;
    }
} );

viewBoxCanvas.addEventListener( 'click', (e) => {
    if (!activePlane) return;

    const distance = camera.position.clone().sub(controls.target).length();
    const newPosition = new THREE.Vector3(0, 0, 0).copy(controls.target);

    if (activePlane.position.x !== 0) {
        newPosition.x += (activePlane.position.x < 0) ? -distance : distance;
    } else if (activePlane.position.y !== 0) {
        newPosition.y += (activePlane.position.y < 0) ? -distance : distance;
    } else if (activePlane.position.z !== 0) {
        newPosition.z += (activePlane.position.z < 0) ? -distance : distance;
    }

    camera.position.copy(newPosition);
} );

viewHomeButton.addEventListener( 'click', () =>  controls.reset());

/**
 * Test sphere
 */
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMapIntensity: 0.5
    })
)
sphere.castShadow = true
sphere.position.y = 0.5
scene.add(sphere)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = -7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = -7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
    
    // Cube renderer
    cubeRenderer.render(cubeScene, cubeCamera)
    cubeCamera.rotation.copy(camera.rotation);
    const dir = camera.position.clone().sub(controls.target).normalize();
    cubeCamera.position.copy(dir.multiplyScalar(cubeCameraDistance));

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()