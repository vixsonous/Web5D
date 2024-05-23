import { uniforms } from "./uniform";
import * as THREE from 'three';

export const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.querySelector("#vertexshader").textContent,
    fragmentShader: document.querySelector("#fragmentshader").textContent,
});