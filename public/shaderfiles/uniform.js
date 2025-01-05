import * as THREE from 'three';
import { sunTexture, earthTexture } from '/texture/texture-loader';

export const uniforms = {
    u_resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_time: { type: 'f', value: 0.0 },
    texture1: { type: 't', value: sunTexture },
    earthTexture: { type: 't', value: earthTexture },
    starType: { type: 'f', value: 999.0 },
    intensity: { type: 'v2', value: new THREE.Vector4(1.0, 1.0, 1.0, 1.0) }
}

