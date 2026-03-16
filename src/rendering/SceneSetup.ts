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
  sun.castShadow = quality === 'high';
  if (sun.castShadow) {
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
  }
  scene.add(sun);

  // Ambient light
  const ambient = new THREE.AmbientLight(0x88aacc, 0.6);
  scene.add(ambient);

  // Hemisphere light for natural sky/ground coloring
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c2e, 0.4);
  scene.add(hemi);
}
