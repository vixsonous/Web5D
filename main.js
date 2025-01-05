import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader, OrbitControls, RGBELoader } from 'three/examples/jsm/Addons.js';
import { TEXTDEF } from './constants';
import { uniforms } from '/public/shaderfiles/uniform';
import { shaders } from '/public/shaderfiles/shadermaterial';
import gsap from 'gsap';
import { earthClouds, earthEmission, earthNormalMap, earthRoughness, earthTexture, earthTopography, marsTexture, mercuryTexture, sunTexture, venusTexture } from '/public/texture/texture-loader';

const _GVAR = {
    currentNearObjectIndex: 0,
    objectTexts: [
        `<h1 id="about-description-text"><span id="first-letter">T</span>his is a red box</h1>`,
        `<h1 id="about-description-text"><span id="first-letter">T</span>his is a yellow box</h1>`
    ],
    DEFCAMPOS: [-200, 0, 0],
    STARAMT: 50000,
    G: .05,
    MAX: 99999999,
    starDetailSize: 100,
}

class StellarObject {
    mesh;
    pos;
    v;
    r;
    mass;
    objects;
    group;

    constructor(mesh, pos, v, r, mass, objects = [], group = null) {
        this.mesh = mesh;
        this.pos = pos;
        this.v = v;
        this.r = r;
        this.mass = mass;
        this.objects = objects;
        this.group = group;
    }

    move(object) {
        const d = getDistance(object.pos, this.pos);
        const newVec = object.pos.sub(this.pos);
        // console.log("newVec x " + newVec.x + " old vec x  " + object.pos.x)
        const f = newVec.setMag((_GVAR.G * ((this.mass * object.mass) / Math.pow(d, 2))));

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
    objects;
    constructor(mainStar = null, planets = [], objects = []) {
        this.mainStar = mainStar;
        this.planets = planets;
        this.objects = objects;
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

    copy() {
        return new Vector3(this.x, this.y, this.z);
    }
}

//common functions
const getDistance = (m1, m2) => {
    return Math.sqrt(Math.pow((m2.x - m1.x), 2) + Math.pow((m2.y - m1.y), 2) + Math.pow((m2.z - m1.z), 2));
}

const setCameraPosition = (camera, newPos) => {
    camera.position.set(newPos[0], newPos[1], newPos[2]);
    camera.lookAt(0, 0, 0);
}

const getMag = (vector) => {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2));
}

const getRotatedVelocityVector = (coordinates) => {
    const planetVel = new THREE.Vector3(coordinates.x, coordinates.y, coordinates.z);
    planetVel.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    const f = Math.sqrt((_GVAR.G * .0005) * SolarSystem.mainStar.mass / getMag(coordinates))

    return new THREE.Vector3(planetVel.x * f, planetVel.y * f, planetVel.z * f);
}

if (document.querySelector("#initial-loader-text")) document.querySelector("#initial-loader-text").style.opacity = 1;

// initialzing scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, _GVAR.MAX);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//initialize star
const SolarSystem = new System();

const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: shaders.sunVertexShader,
    fragmentShader: shaders.sunFragmentShader,
});

const starMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(100, _GVAR.starDetailSize), mat);
starMesh.add(
    new THREE.Mesh(new THREE.IcosahedronGeometry(100, _GVAR.starDetailSize), new THREE.MeshBasicMaterial({ color: 0xFFFFFF })).scale.setScalar(2)
)

const sunLayerSize = 2;
// for (let i = 0; i < sunLayerSize; i++) {
//     starMesh.add(
//         new THREE.Mesh(new THREE.IcosahedronGeometry(100, _GVAR.starDetailSize), new THREE.ShaderMaterial({
//             uniforms,
//             vertexShader: shaders[`layer${parseInt(i) + 2}Vertexshader`],
//             fragmentShader: shaders[`layer${parseInt(i) + 2}Fragmentshader`],
//             blending: THREE.AdditiveBlending
//         }))
//     )

// }

const sunObj = new StellarObject(starMesh, new Vector3(), new Vector3(), 50, 1000);
scene.add(sunObj.mesh);

SolarSystem.mainStar = sunObj;

const flyControls = new OrbitControls(camera, renderer.domElement);
const pivot = new THREE.Object3D();
const yaw = new THREE.Object3D();
const pitch = new THREE.Object3D();

const setCamera = (() => {
    setCameraPosition(camera, _GVAR.DEFCAMPOS);

    pivot.position.set(0, 0, 0)
    scene.add(pivot);
    pivot.add(yaw);
    yaw.add(pitch);
    pitch.add(camera);
    camera.lookAt(0, 0, 0)

    flyControls.movementSpeed = 50;
    flyControls.rollSpeed = 0.5;
    flyControls.autoForward = false;
    flyControls.dragToLook = false;
})();

const addLights = (() => {

    scene.add(new THREE.AmbientLight(0xFFFFFF, .009))
    const pointLight = new THREE.PointLight(0xFFFFFF, 10000, _GVAR.MAX, 1);
    pointLight.position.set(0, 0, 0);

    SolarSystem.mainStar.mesh.add(pointLight);
})();

const createPlanetInstance = (map, radius, mass, coordinates, rotation) => {
    const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 50), new THREE.MeshLambertMaterial({ map: map }));

    const newVel = getRotatedVelocityVector(coordinates);
    planet.position.set(coordinates.x, coordinates.y, coordinates.z)
    planet.rotation.z = rotation;

    return new StellarObject(planet, new Vector3(planet.position.x, planet.position.y, planet.position.z), newVel, radius, mass);
}

const instantiateObjectToObject = (objects, index, color) => {

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(50, 30), new THREE.MeshStandardMaterial({ color: color }));
    objects[index] = mesh;
    scene.add(mesh);
}

const createEarth = (map, radius, mass, coordinates) => {
    const earthGroup = new THREE.Group();

    const cloudsMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 50), new THREE.MeshPhongMaterial({
        map: earthClouds,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.9
    }));

    const atmosphere = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 50), new THREE.MeshPhongMaterial({
        color: 0x0098e1,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8

    }));

    atmosphere.scale.setScalar(1.040);
    cloudsMesh.scale.setScalar(1.025);

    const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 100), new THREE.MeshPhongMaterial({
        map: earthTexture,
        emissive: 0xFFFFFF,
        emissiveMap: earthEmission,
        emissiveIntensity: 1,
        normalMap: earthNormalMap,
        displacementMap: earthTopography,
        displacementScale: 3,
    }));

    earthGroup.add(atmosphere);
    planet.rotation.z = -23.4 * Math.PI / 180;
    earthGroup.add(planet);
    cloudsMesh.name = "cloud";
    earthGroup.add(cloudsMesh);
    // earthGroup.position.set(coordinates.x, coordinates.y, coordinates.z)
    planet.position.set(coordinates.x, coordinates.y, coordinates.z)
    scene.add(earthGroup)

    console.log(getRotatedVelocityVector(coordinates))
    return new StellarObject(planet, new Vector3(planet.position.x, planet.position.y, planet.position.z), getRotatedVelocityVector(coordinates), radius, mass, [], earthGroup);
}


const instantiatePlanets = (() => {

    const mercurySolar = createPlanetInstance(mercuryTexture, 40, 20, new THREE.Vector3(6000, 0, 6000), -25);
    const venusSolar = createPlanetInstance(venusTexture, 65, 45, new THREE.Vector3(12000, 0, -12000), 30);
    const earthSolar = createEarth(earthTexture, 70, 50, new THREE.Vector3(18000, 0, 18000));
    const marsSolar = createPlanetInstance(marsTexture, 60, 40, new THREE.Vector3(24000, 0, -24000), -50);

    instantiateObjectToObject(SolarSystem.objects, 0, "red");
    instantiateObjectToObject(SolarSystem.objects, 1, "yellow");

    scene.add(mercurySolar.mesh);
    scene.add(venusSolar.mesh);
    // scene.add(earthSolar.mesh);
    scene.add(marsSolar.mesh);

    SolarSystem.planets.push(mercurySolar);
    SolarSystem.planets.push(venusSolar);
    SolarSystem.planets.push(earthSolar);
    SolarSystem.planets.push(marsSolar);

})();

const PROJECTPLANET = SolarSystem.planets[2].mesh;
const PROJECTPLANETGROUP = SolarSystem.planets[2].group.children;

function addStars() {

    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 20), mat);
    const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100000));
    sphere.position.set(x, y, z);
    scene.add(sphere);
}

// for (let i = 0; i < 200; i++) {
//     addStars();
// }

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
    const sphere = new THREE.InstancedMesh(new THREE.SphereGeometry(10, 5), new THREE.MeshBasicMaterial({ map: sunTexture }), _GVAR.STARAMT);
    scene.add(sphere);

    const obj = new THREE.Object3D()
    for (let i = 0; i < _GVAR.STARAMT; i++) {
        const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100000));
        obj.position.set(x, y, z);

        // // const z = THREE.MathUtils.randFloatSpread(100000)
        // const r = THREE.MathUtils.randInt(SolarSystem.mainStar.r + 10000, 100000);
        // const theta = THREE.MathUtils.randFloatSpread(Math.PI * 2);
        // const vecPos = new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), THREE.MathUtils.randFloatSpread(100000));
        // obj.position.set(vecPos.x, vecPos.y, vecPos.z);


        obj.updateMatrix()
        sphere.setMatrixAt(i, obj.matrix)
    }

}

addFakeStars();

const addRotation = (delta) => {
    const rotationSpeed = delta * 0.05 * -1 || 0;
    SolarSystem.mainStar.mesh.rotation.y = SolarSystem.mainStar.mesh.rotation.y + rotationSpeed;

    // Apply the combined rotation to the mesh

    for (let i = 0; i < SolarSystem.planets.length; i++) {
        SolarSystem.planets[i].mesh.rotation.y = SolarSystem.planets[i].mesh.rotation.y + rotationSpeed;
        if (SolarSystem.planets[i].group != null) {
            for (let j = 0; j < SolarSystem.planets[i].group.children.length; j++) {
                let tempRotSpeed = SolarSystem.planets[i].group.children[j].name == "cloud" ? rotationSpeed * 3 : rotationSpeed;
                SolarSystem.planets[i].group.children[j].rotation.y = SolarSystem.planets[i].group.children[j].rotation.y + (tempRotSpeed);
            }
        }
    }

    searchNearestObject()
}

const addMovement = (time) => {
    const worldP = new THREE.Vector3();
    for (let i = 0; i < SolarSystem.planets.length; i++) {
        SolarSystem.planets[i].move(SolarSystem.mainStar);
        // SolarSystem.mainStar.move(SolarSystem.planets[i]);

        if (SolarSystem.planets[i].group != null) {
            SolarSystem.planets[i].mesh.getWorldPosition(worldP);
            for (let j = 0; j < SolarSystem.planets[i].group.children.length; j++) {
                SolarSystem.planets[i].group.children[j].position.set(worldP.x, worldP.y, worldP.z)
            }
        }
    }
}

const addTestPlaneMesh = () => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ wireframe: true }));
    plane.position.set(0, 0, 0);
    scene.add(plane)
}
class FollowCamera {
    constructor(_params) {
        this._camera = _params.camera;
        this._target = _params.target;
        this._targetReached = _params.targetReached;
        this._camSpeed = _params.camSpeed;
    }
}

const changeHtml = (html) => {
    const doc = document.querySelector("#about-description");
    doc.style.opacity = 0;
    setTimeout(() => {
        doc.style.opacity = 1;
        if (html) doc.innerHTML = "";
    }, 1000);
}

const cams = new FollowCamera({
    camera: camera,
    target: SolarSystem.mainStar.mesh,
    targetReached: true,
    camSpeed: 0
})

const clock = new THREE.Clock();

const objectOrbit = (objectToOrbit, objectOrbitting, index, coords, rotation) => {
    const v = new THREE.Vector3();
    cams._camera.getWorldPosition(v)
    objectOrbitting.position.set(coords.x, coords.y, coords.z);
    objectOrbitting.rotation.set(rotation.x, rotation.y, rotation.z);
    objectOrbitting.lookAt(v);

    const v2 = new THREE.Vector3();

    objectToOrbit.getWorldPosition(v2);

    if (Math.abs(v.sub(v2).x) < 500) {
        objectOrbitting.visible = true;
    } else {
        objectOrbitting.visible = false;
    }

    objectToOrbit.add(objectOrbitting)
}

const v = new THREE.Vector3();
const inputVelocity = new THREE.Vector3();
const euler = new THREE.Vector3();
const quaternion = new THREE.Quaternion();

let d = 0;

const searchNearestObject = () => {
    const worldCoords = new THREE.Vector3();
    const camCoords = new THREE.Vector3();
    const nearestCoords = new THREE.Vector3();

    cams._camera.getWorldPosition(camCoords);

    SolarSystem.objects[_GVAR.currentNearObjectIndex].getWorldPosition(nearestCoords);
    for (let i = 0; i < SolarSystem.objects.length; i++) {
        SolarSystem.objects[i].getWorldPosition(worldCoords);
        if (getDistance(worldCoords, camCoords) < getDistance(nearestCoords, camCoords)) {

            _GVAR.currentNearObjectIndex = i;

            if (cams._target == PROJECTPLANET) {
                changeHtml(_GVAR.objectTexts[_GVAR.currentNearObjectIndex]);
            }
            break;
        }
    }
}

const _InitDocumentFunctions = (() => {

    if (document.querySelector("#about")) {
        document.querySelector("#about").addEventListener("click", () => {

            SolarSystem.mainStar.mesh.position.set(0.0000000000001, 0.0000000000001, 0.0000000000001);
            cams._target = SolarSystem.mainStar.mesh;
            cams._camSpeed = 0;
            cams._camera.position.x = -200;

            changeHtml(TEXTDEF.about);
        });
    }

    if (document.querySelector("#services")) {
        document.querySelector("#services").addEventListener("click", () => {

            SolarSystem.planets[1].mesh.material.map = sunTexture;
            SolarSystem.planets[1].mesh.material.needsUpdate = true;
            cams._target = SolarSystem.planets[1].mesh;
            cams._camSpeed = 0;

            changeHtml(_GVAR.objectTexts[_GVAR.currentNearObjectIndex])
        });
    }

    if (document.querySelector("#projects")) {
        document.querySelector("#projects").addEventListener("click", () => {

            cams._target = PROJECTPLANET;
            cams._camSpeed = 0;
            // cams._camera.position.x = -150;

            changeHtml(_GVAR.objectTexts[_GVAR.currentNearObjectIndex])
        });
    }

    if (document.querySelector("#contact")) {
        document.querySelector("#contact").addEventListener("click", () => {

            cams._target = SolarSystem.planets[3].mesh;
            cams._camSpeed = 0;

            changeHtml(TEXTDEF.contact);
        });
    }

    window.addEventListener("wheel", (e) => {
        // e.deltaY < 0 ? 'scroll up' : 'scroll down'
        if (cams._target == PROJECTPLANET) {

            gsap.to(PROJECTPLANET.rotation, {
                y: PROJECTPLANET.rotation.y + (e.deltaY * .003),
                duration: 1,
            });
            for (let i = 0; i < PROJECTPLANETGROUP.length; i++) {
                gsap.to(PROJECTPLANETGROUP[i].rotation, {
                    y: PROJECTPLANETGROUP[i].rotation.y + (e.deltaY * .003),
                    duration: 1,
                });
            }

            searchNearestObject();

        }
    });

})();



function animate(time) {
    requestAnimationFrame(animate);
    // camera.updateProjectionMatrix();

    d = clock.getDelta();

    inputVelocity.set(0, 0, 0);
    addRotation(d);
    addMovement(time);

    // apply camera rotation to inputVelocity
    // euler.y = yaw.rotation.y;
    // quaternion.setFromEuler(euler);
    // inputVelocity.applyQuaternion(quaternion);
    cams._target.getWorldPosition(v);

    if (cams._camSpeed < 1) cams._camSpeed += d * .02;

    if (v.x) {
        pivot.position.lerp(v, cams._camSpeed);
        flyControls.target.lerp(v, cams._camSpeed);
        // Use the direction vector to set camera rotation
    }
    camera.updateMatrixWorld();
    flyControls.update();


    // Yellow box and red box
    // objectOrbit(PROJECTPLANET, SolarSystem.objects[0], 0, new THREE.Vector3(0, 0, 100), new THREE.Vector3(0, 0, 0));
    // objectOrbit(PROJECTPLANET, SolarSystem.objects[1], 1, new THREE.Vector3(100, 0, 0), new THREE.Vector3(0, 100, 0));

    //check if there are intersection

    // flyControls.update(0.01);
    uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}


if (WebGL.isWebGLAvailable()) {
    animate();
} else {
    const warning = WebGL.getErrorMessage();
    document.querySelector('body').appendChild(warning);
}

window.onload = async () => {
    document.querySelector("#loading").style.opacity = 0;
    setTimeout(() => {
        document.querySelector("#loading").remove();
        document.querySelector("#afterloading").style.opacity = 1;
    }, 2000);
}