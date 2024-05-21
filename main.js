import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { FlyControls, OrbitControls } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap';

const MAX = 99999999;
const G = .05;
const STARAMT = 5000;
const DEFCAMPOS = [-60, -60, 40];

class StellarObject {
    mesh;
    pos;
    v;
    r;
    mass;

    constructor(mesh, pos, v, r, mass) {
        this.mesh = mesh;
        this.pos = pos;
        this.v = v;
        this.r = r;
        this.mass = mass;
    }

    move(object) {
        const d = getDistance(object, this);
        const newVec = object.pos.sub(this.pos);
        // console.log("newVec x " + newVec.x + " old vec x  " + object.pos.x)
        const f = newVec.setMag((G * ((this.mass * object.mass) / Math.pow(d, 2))));

        this.v.x += f.x / this.mass;
        this.v.y += f.y / this.mass;
        this.v.z += f.z / this.mass;

        // console.log(f);
        this.pos.x += (this.v.x * .1);
        this.pos.y += (this.v.y * .1);
        this.pos.z += (this.v.z * .1);

        this.mesh.position.x = this.pos.x;
        this.mesh.position.y = this.pos.y;
        this.mesh.position.z = this.pos.z;
    }
}

class System {
    mainStar;
    planets;
    constructor(mainStar = null, planets = []) {
        this.mainStar = mainStar;
        this.planets = planets;
    }
}

class Vector3 {
    x;
    y;
    z;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    sub(vector) {
        return new Vector3(this.x + (vector.x * -1), this.y + (vector.y * -1), this.z + (vector.z * -1))
    }

    setMag(magnitude) {
        this.x = this.x * magnitude;
        this.y = this.y * magnitude;
        this.z = this.z * magnitude;
        return new Vector3(this.x, this.y, this.z);
    }

    getMag() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2));
    }

    copy() {
        return new Vector3(this.x, this.y, this.z);
    }
}

//common functions
const getDistance = (m1, m2) => {
    return Math.sqrt(Math.pow((m2.pos.x - m1.pos.x), 2) + Math.pow((m2.pos.y - m1.pos.y), 2) + Math.pow((m2.pos.z - m1.pos.z), 2));
}

const setCameraPosition = (camera, newPos) => {
    camera.position.set(newPos[0], newPos[1], newPos[2]);
    camera.lookAt(0, 0, 0);
}

document.querySelector("#initial-loader-text").style.opacity = 1;



const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, MAX);
camera.name = "MainCam"

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// const planeGeo = new THREE.PlaneGeometry(30, 30);
// const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
// const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
// planeMesh.rotation.x = -0.5 * Math.PI;

const sunTexture = new THREE.TextureLoader().load("./texture/8k_sun.jpg");
const spaceBg = new THREE.TextureLoader().load("./texture/spbg8k.jpg");

const uniforms = {
    u_resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_time: { type: 'f', value: 0.0 },
    texture1: { type: 't', value: sunTexture },
    starType: { type: 'f', value: 999.0 },
    intensity: { type: 'v2', value: new THREE.Vector4(1.0, 1.0, 1.0, 1.0) }
}

const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.querySelector("#vertexshader").textContent,
    fragmentShader: document.querySelector("#fragmentshader").textContent,
});

const SolarSystem = new System();
const sunObj = new StellarObject(new THREE.Mesh(new THREE.IcosahedronGeometry(50, 50), mat), new Vector3(), new Vector3(), 50, 1000);
scene.add(sunObj.mesh);

SolarSystem.mainStar = sunObj;

const flyControls = new FlyControls(camera, renderer.domElement);
const setCamera = (() => {
    setCameraPosition(camera, DEFCAMPOS)
    flyControls.movementSpeed = 50;
    flyControls.rollSpeed = 0.5;
    flyControls.autoForward = false;
    flyControls.dragToLook = false;
})();

const addLights = (() => {
    const ambLight = new THREE.AmbientLight(0xFFFFFFF, 0.1);
    scene.add(ambLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1000, MAX, 1);
    pointLight.position.set(0, 0, 0);

    scene.add(pointLight);
})();


const addPlanets = (() => {
    const earthMap = new THREE.TextureLoader().load("./texture/earthmap1k.jpg");
    const earth = new THREE.Mesh(new THREE.SphereGeometry(10, 10), new THREE.MeshLambertMaterial({ map: earthMap }));

    earth.position.x = 3000;
    earth.position.y = 3000;

    const earthSolar = new StellarObject(earth, new Vector3(earth.position.x, earth.position.y, earth.position.z), new Vector3(10, -10, 0), 10, 50);

    const mercuryMap = new THREE.TextureLoader().load("./texture/8k_mercury.jpg");
    const mercury = new THREE.Mesh(new THREE.SphereGeometry(10, 10), new THREE.MeshLambertMaterial({ map: mercuryMap }));

    mercury.position.x = 1000;
    mercury.position.y = 1000;

    const mercurySolar = new StellarObject(mercury, new Vector3(mercury.position.x, mercury.position.y, mercury.position.z), new Vector3(10, -10, 0), 10, 25);

    const venusMap = new THREE.TextureLoader().load("./texture/8k_venus_surface.jpg");
    const venus = new THREE.Mesh(new THREE.SphereGeometry(10, 10), new THREE.MeshLambertMaterial({ map: venusMap }));

    venus.position.x = 2000;
    venus.position.y = 2000;

    const venusSolar = new StellarObject(venus, new Vector3(venus.position.x, venus.position.y, venus.position.z), new Vector3(10, -20, 0), 10, 45);

    const marsMap = new THREE.TextureLoader().load("./texture/8k_mars.jpg");
    const mars = new THREE.Mesh(new THREE.SphereGeometry(10, 10), new THREE.MeshLambertMaterial({ map: marsMap }));

    mars.position.x = 4000;
    mars.position.y = 4000;

    const marsSolar = new StellarObject(mars, new Vector3(mars.position.x, mars.position.y, mars.position.z), new Vector3(10, -20, 0), 10, 40);


    sunObj.mesh.add(earth);
    sunObj.mesh.add(mercury);
    sunObj.mesh.add(venus);
    sunObj.mesh.add(mars);

    SolarSystem.planets.push(earthSolar);
    SolarSystem.planets.push(mercurySolar);
    SolarSystem.planets.push(venusSolar);
    SolarSystem.planets.push(marsSolar);

})();

function addStars() {

    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 20), mat);
    const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100000));
    sphere.position.set(x, y, z);
    scene.add(sphere);
}

for (let i = 0; i < 200; i++) {
    addStars();
}

const distance = 20000

const getCoordinates = () => {
    const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100000));
    if (x < distance || y < distance || z < distance) {
        return getCoordinates()
    } else {
        return [x, y, z]
    }
}

function addFakeStars() {
    const sphere = new THREE.InstancedMesh(new THREE.SphereGeometry(30, 10), new THREE.MeshBasicMaterial({ map: sunTexture }), STARAMT);
    scene.add(sphere);

    const obj = new THREE.Object3D()
    for (let i = 0; i < STARAMT; i++) {
        const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100000));
        obj.position.set(x, y, z);

        obj.updateMatrix()
        sphere.setMatrixAt(i, obj.matrix)
    }

}

addFakeStars();

const addRotation = (time) => {
    const rotationSpeed = time * 0.00001 * -1;
    SolarSystem.mainStar.mesh.rotation.y = rotationSpeed;

    for (let i = 0; i < SolarSystem.planets.length; i++) {
        SolarSystem.planets[i].mesh.rotation.y = rotationSpeed;
    }
}

const addMovement = (time) => {
    for (let i = 0; i < SolarSystem.planets.length; i++) {
        SolarSystem.planets[i].move(SolarSystem.mainStar);
    }
}

const addTestPlaneMesh = () => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ wireframe: true }));
    plane.position.set(0, 0, 0);
    scene.add(plane)
}

//client side functionalities
document.querySelector("#about").addEventListener("click", () => {

    gsap.to(camera.position, {
        x: DEFCAMPOS[0],
        y: DEFCAMPOS[1],
        z: DEFCAMPOS[2],
        duration: 5,
        onUpdate: () => {
            camera.lookAt(0, 0, 0)
        },
        onComplete: () => {
            camera.lookAt(0, 0, 0)

        }
    });
});

document.querySelector("#projects").addEventListener("click", () => {

    gsap.to(camera.position, {
        x: SolarSystem.planets[2].mesh.position.x,
        y: SolarSystem.planets[2].mesh.position.y,
        z: SolarSystem.planets[2].mesh.position.z,
        duration: 5,
        onUpdate: () => {
            camera.lookAt(SolarSystem.planets[2].mesh.position.x, SolarSystem.planets[2].mesh.position.y, SolarSystem.planets[2].mesh.position.z)
        },
        onComplete: () => {
            camera.lookAt(0, 0, 0)
        }
    });
});

// addTestPlaneMesh()

const clock = new THREE.Clock();

function animate(time) {
    requestAnimationFrame(animate);
    // camera.updateProjectionMatrix();
    addRotation(time);
    addMovement(time);
    flyControls.update(0.01);
    uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}

if (WebGL.isWebGLAvailable()) {
    animate();
} else {
    const warning = WebGL.getErrorMessage();
    document.querySelector('body').appendChild(warning);
}

window.onload = () => {
    document.querySelector("#loading").style.opacity = 0;
    setTimeout(() => {
        document.querySelector("#loading").remove();
    }, 2000);
}