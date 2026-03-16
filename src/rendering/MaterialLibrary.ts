import * as THREE from 'three';
import * as C from '../core/Constants.ts';

let _materials: ReturnType<typeof createMaterials> | null = null;

function createMaterials() {
  return {
    ground: new THREE.MeshLambertMaterial({ color: C.GROUND_COLOR }),
    bark: new THREE.MeshLambertMaterial({ color: C.BARK_COLOR }),
    leaf: new THREE.MeshLambertMaterial({
      color: C.LEAF_COLOR,
      side: THREE.DoubleSide,
    }),
    sawit: new THREE.MeshLambertMaterial({ color: C.SAWIT_COLOR }),
    sawitCap: new THREE.MeshLambertMaterial({ color: C.LEAF_COLOR }),
    golden: new THREE.MeshStandardMaterial({
      color: C.GOLDEN_COLOR,
      emissive: C.GOLDEN_COLOR,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    }),
    snake: new THREE.MeshLambertMaterial({ color: C.SNAKE_COLOR }),
    log: new THREE.MeshLambertMaterial({ color: C.LOG_COLOR }),
    bucket: new THREE.MeshStandardMaterial({
      color: C.BUCKET_COLOR,
      metalness: 0.6,
      roughness: 0.3,
    }),
    shield: new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    }),
    path: new THREE.MeshLambertMaterial({ color: 0x8b7355 }),
  } as const;
}

export function getMaterials() {
  if (!_materials) _materials = createMaterials();
  return _materials;
}

export function disposeMaterials(): void {
  if (!_materials) return;
  for (const mat of Object.values(_materials)) {
    mat.dispose();
  }
  _materials = null;
}
