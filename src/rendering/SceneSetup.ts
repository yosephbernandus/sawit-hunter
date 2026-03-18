import * as THREE from 'three';
import { SKY_COLOR, FOG_COLOR, FOG_NEAR_HIGH, FOG_FAR_HIGH, FOG_NEAR_LOW, FOG_FAR_LOW } from '../core/Constants.ts';
import type { QualityTier } from '../utils/DeviceDetect.ts';

export function setupScene(scene: THREE.Scene, quality: QualityTier): void {
  scene.background = new THREE.Color(SKY_COLOR);

  const fogNear = quality === 'high' ? FOG_NEAR_HIGH : FOG_NEAR_LOW;
  const fogFar = quality === 'high' ? FOG_FAR_HIGH : FOG_FAR_LOW;
  scene.fog = new THREE.Fog(FOG_COLOR, fogNear, fogFar);

  // Directional light (sun)
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(10, 20, 10);
  if (quality === 'high') {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
  }
  scene.add(sun);

  // On low-end, merge ambient + hemisphere into one brighter ambient
  if (quality === 'high') {
    scene.add(new THREE.AmbientLight(0x88aacc, 0.6));
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x4a7c2e, 0.4));
  } else {
    scene.add(new THREE.AmbientLight(0x99bbdd, 0.9));
  }
}

const _skyFrom = new THREE.Color();
const _fogFrom = new THREE.Color();
const _tmpSky = new THREE.Color();
const _tmpFog = new THREE.Color();

/** Lerp sky and fog colors. Call with alpha=0 at start, alpha=1 at end. */
export function lerpEnvironment(
  scene: THREE.Scene,
  fromSky: number,
  fromFog: number,
  toSky: number,
  toFog: number,
  alpha: number,
): void {
  _skyFrom.set(fromSky);
  _tmpSky.set(toSky);
  (scene.background as THREE.Color).copy(_skyFrom).lerp(_tmpSky, alpha);

  if (scene.fog instanceof THREE.Fog) {
    _fogFrom.set(fromFog);
    _tmpFog.set(toFog);
    scene.fog.color.copy(_fogFrom).lerp(_tmpFog, alpha);
  }
}
